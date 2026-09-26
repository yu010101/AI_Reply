#!/usr/bin/env python3
"""deploy_with_approval.py — deploy_preflight.py --exec を本人承認ゲートの後ろに置く wrapper（候補）。

流れ: (1) preflight を判定のみで実行し receipt を作る → (2) 本人承認 → (3) preflight --exec
（exec 側が fetch・CI照会・判定をやり直す）→ (4) preflight --verify。
この wrapper は wrangler を直接呼ばない。配備コマンドは常に deploy_preflight.py --exec が組み直す。

承認は2方式のどちらかを明示指定（既定なし）:
 --interactive     端末(TTY)で receipt の要約を見た本人が `yes` と打つ。TTY でなければ拒否。
 --approval-file P 本人が置いた JSON。receipt の head / bundle_sha12 / cfg_sha12 と一致し、
                   approved_at が receipt 発行以後かつ 30 分以内であること。使ったら .used-<時刻> へ改名（再利用不可）。
限界: どちらも「人間が操作した」ことを暗号的には証明しない。TTY は pty を作れるエージェントなら偽装でき、
ファイルはエージェントでも書ける。承認の実体は運用規則（エージェントは承認ファイルを書かない・yes を打たない）で守る。
"""
import argparse
import datetime as dt
import json
import subprocess
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
PREFLIGHT = HERE / 'deploy_preflight.py'
DEFAULT_RECEIPT = '.quality/preflight-receipt.json'
APPROVAL_MAX_AGE_SEC = 30 * 60


class Deny(Exception):
    pass


def parse_iso(s):
    if not isinstance(s, str) or not s:
        return None
    try:
        t = dt.datetime.fromisoformat(s.replace('Z', '+00:00'))
    except ValueError:
        return None
    return t if t.tzinfo else None


def summary(receipt):
    return {'head': receipt.get('head'), 'bundle_sha12': (receipt.get('bundle_sha') or '')[:12],
            'cfg_sha12': (receipt.get('cfg_sha') or '')[:12], 'ci_run_id': receipt.get('ci_run_id'),
            'basis': receipt.get('basis'), 'issued_at': receipt.get('issued_at')}


def check_approval_file(receipt, path, now=None):
    """承認ファイルが receipt に束縛され、新しく、実ファイルであることを確かめる。純粋関数（改名は呼び出し側）。"""
    p = Path(path)
    if p.is_symlink():
        raise Deny('approval_is_symlink')
    if not p.is_file():
        raise Deny('approval_missing')
    try:
        a = json.loads(p.read_text())
    except ValueError:
        raise Deny('approval_invalid_json')
    if not isinstance(a, dict):
        raise Deny('approval_invalid_json')
    s = summary(receipt)
    for k in ('head', 'bundle_sha12', 'cfg_sha12'):
        if not s[k] or a.get(k) != s[k]:
            raise Deny('approval_mismatch:' + k)
    approved, issued = parse_iso(a.get('approved_at')), parse_iso(receipt.get('issued_at'))
    now = now or dt.datetime.now(dt.timezone.utc)
    if not approved or not issued:
        raise Deny('approval_time_invalid')
    if approved < issued:
        raise Deny('approval_before_receipt')
    if approved > now or (now - approved).total_seconds() > APPROVAL_MAX_AGE_SEC:
        raise Deny('approval_expired_or_future')
    return True


def check_interactive(receipt, stdin, stdout, isatty):
    if not isatty:
        raise Deny('interactive_requires_tty')
    stdout.write(json.dumps(summary(receipt), ensure_ascii=False, indent=1) + '\n')
    stdout.write('この内容で本番へ配備するなら yes と入力: ')
    stdout.flush()
    answer = (stdin.readline() or '').strip()
    stdout.write('\n')
    if answer != 'yes':
        raise Deny('not_approved')
    return True


def run_json(run, args, cwd):
    p = run(args, cwd=str(cwd), capture_output=True, text=True)
    lines = [l for l in (p.stdout or '').splitlines() if l.startswith('{')]
    try:
        return p.returncode, (json.loads(lines[-1]) if lines else {})
    except ValueError:
        return p.returncode, {}


def main(argv=None, run=subprocess.run, stdin=sys.stdin, stdout=sys.stdout, isatty=None, now=None):
    ap = argparse.ArgumentParser(description=__doc__.split('\n')[0])
    ap.add_argument('--root', default=str(HERE.parent))
    ap.add_argument('--receipt', default=DEFAULT_RECEIPT)
    g = ap.add_mutually_exclusive_group(required=True)
    g.add_argument('--interactive', action='store_true')
    g.add_argument('--approval-file')
    a = ap.parse_args(argv)
    root = Path(a.root)
    py = sys.executable or 'python3'
    base = [py, str(PREFLIGHT), '--root', str(root), '--receipt', a.receipt]
    out = {'stage': 'preflight'}
    try:
        rc, res = run_json(run, base, root)
        if rc != 0 or not res.get('allow'):
            raise Deny('preflight_refused:%s' % res.get('reason'))
        receipt = json.loads((root / a.receipt).read_text())
        out['stage'] = 'approval'
        if a.interactive:
            check_interactive(receipt, stdin, stdout, stdin.isatty() if isatty is None else isatty)
            out['approval'] = 'interactive'
        else:
            ap_path = Path(a.approval_file)
            if not ap_path.is_absolute():
                ap_path = root / ap_path
            check_approval_file(receipt, ap_path, now=now)
            stamp = (now or dt.datetime.now(dt.timezone.utc)).strftime('%Y%m%dT%H%M%SZ')
            ap_path.rename(ap_path.with_name(ap_path.name + '.used-' + stamp))  # 再利用させない
            out['approval'] = 'file'
        out['stage'] = 'exec'
        p = run(base + ['--exec'], cwd=str(root))
        out['exec_rc'] = p.returncode
        if p.returncode != 0:
            raise Deny('exec_failed_rc_%d' % p.returncode)
        out['stage'] = 'verify'
        rc, ver = run_json(run, base + ['--verify'], root)
        out['verify'] = ver
        if rc != 0:
            raise Deny('verify_failed')
    except Deny as e:
        out.update(ok=False, reason=str(e))
        stdout.write(json.dumps(out, ensure_ascii=False) + '\n')
        return 1
    out['ok'] = True
    stdout.write(json.dumps(out, ensure_ascii=False) + '\n')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
