#!/usr/bin/env python3
"""deploy_with_approval.py — deploy_preflight.py --exec を本人承認ゲートの後ろに置く wrapper。

承認は「どの receipt を承認したか」に束縛する。receipt は判定のたびに issued_at 付きで作り直されるので、
その内容の sha256（receipt_sha256）が承認の対象になる。使った receipt_sha256 は台帳
（.quality/deploy-approval-used.log、追記のみ）に記録し、同じ receipt で二度 exec しない。
ファイル名の改名や置き場所には依存しない（別名・ハードリンク・.used ファイルの再指定でも通らない）。

3方式（どれか必須）:
 --interactive      preflight → 端末(TTY)で要約と receipt_sha256 を見た本人が yes → 台帳記録 → exec → verify
 --prepare          preflight だけ行い、要約と receipt_sha256 と承認ファイルの雛形を出して終わる（exec しない）
 --approval-file P  preflight は再実行しない。既存 receipt の sha256・head/bundle/cfg に一致し、
                    receipt 発行以後かつ 30 分以内の承認なら、台帳記録 → exec → verify。
                    exec 側（deploy_preflight --exec）は fetch・CI照会・判定をやり直し、receipt と
                    今の状態（head/cfg/bundle/コマンド）が一致しなければ拒否する。承認後に main が進めば配備されない。
exec には承認した receipt の sha256 を --expect-receipt-sha256 で渡し、deploy_preflight が読み込んだ中身の
ハッシュが違えば拒否する（承認後から exec までの receipt 差し替えを防ぐ）。
限界: どれも「人間が操作した」ことを暗号的には証明しない。同じユーザー権限でリポジトリに書ける相手は、
台帳の削除や wrangler の直接実行もできるので、この wrapper はそうした相手からは守らない。TTY は pty を作れるエージェントなら偽装でき、
ファイルはエージェントでも書ける。承認の実体は運用規則（エージェントは承認ファイルを書かない・yes を打たない）で守る。
"""
import argparse
import datetime as dt
import hashlib
import json
import os
import stat
import subprocess
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
PREFLIGHT = HERE / 'deploy_preflight.py'
DEFAULT_RECEIPT = '.quality/preflight-receipt.json'
APPROVAL_MAX_AGE_SEC = 30 * 60
USED_LEDGER = '.quality/deploy-approval-used.log'


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


def read_regular_file(path):
    """シンボリックリンクを辿らず、通常ファイルだけを1回の open で読む。"""
    try:
        fd = os.open(str(path), os.O_RDONLY | getattr(os, 'O_NOFOLLOW', 0))
    except FileNotFoundError:
        raise Deny('approval_missing')
    except OSError:
        raise Deny('approval_is_symlink_or_unreadable')
    try:
        if not stat.S_ISREG(os.fstat(fd).st_mode):
            raise Deny('approval_not_regular_file')
        data = b''
        while len(data) <= 65536:
            chunk = os.read(fd, 65537 - len(data))
            if not chunk:
                break
            data += chunk
        return data
    finally:
        os.close(fd)


def check_approval(receipt, receipt_sha, raw, now=None):
    """承認内容が、この receipt（sha256 と head/bundle/cfg）に束縛され、新しいことを確かめる。純粋関数。"""
    if len(raw) > 65536:
        raise Deny('approval_too_large')
    try:
        a = json.loads(raw.decode('utf-8'))
    except (ValueError, UnicodeDecodeError):
        raise Deny('approval_invalid_json')
    if not isinstance(a, dict):
        raise Deny('approval_invalid_json')
    if a.get('receipt_sha256') != receipt_sha:
        raise Deny('approval_mismatch:receipt_sha256')
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


def consume(root, receipt_sha):
    """台帳に receipt_sha256 が無ければ追記する。あれば Deny。exec の前に記録する（exec が失敗しても再利用させない）。"""
    import fcntl
    ledger = root / USED_LEDGER
    ledger.parent.mkdir(parents=True, exist_ok=True)
    try:
        fd = os.open(str(ledger), os.O_RDWR | os.O_CREAT | os.O_APPEND | getattr(os, 'O_NOFOLLOW', 0), 0o600)
    except OSError:
        raise Deny('used_ledger_unusable')
    try:
        fcntl.flock(fd, fcntl.LOCK_EX)
        if not stat.S_ISREG(os.fstat(fd).st_mode):
            raise Deny('used_ledger_unusable')
        os.lseek(fd, 0, os.SEEK_SET)
        seen = b''
        while True:
            chunk = os.read(fd, 65536)
            if not chunk:
                break
            seen += chunk
        if receipt_sha.encode() in seen.split():
            raise Deny('approval_already_used')
        os.write(fd, (receipt_sha + '\n').encode())
        os.fsync(fd)
    finally:
        os.close(fd)
    return True


def receipt_path(root, rel):
    p = (root / rel).resolve()
    if not p.is_relative_to(root.resolve()):
        raise Deny('receipt_outside_root')
    return p


def check_interactive(receipt, receipt_sha, stdin, stdout, isatty):
    if not isatty:
        raise Deny('interactive_requires_tty')
    stdout.write(json.dumps(dict(summary(receipt), receipt_sha256=receipt_sha), ensure_ascii=False, indent=1) + '\n')
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
    g.add_argument('--prepare', action='store_true')
    g.add_argument('--approval-file')
    a = ap.parse_args(argv)
    root = Path(a.root)
    py = sys.executable or 'python3'
    base = [py, str(PREFLIGHT), '--root', str(root), '--receipt', a.receipt]
    out = {'stage': 'receipt'}
    try:
        rpath = receipt_path(root, a.receipt)
        if not a.approval_file:
            out['stage'] = 'preflight'
            rc, res = run_json(run, base, root)
            if rc != 0 or not res.get('allow'):
                raise Deny('preflight_refused:%s' % res.get('reason'))
        if rpath.is_symlink() or not rpath.is_file():
            raise Deny('receipt_missing')
        raw_receipt = rpath.read_bytes()
        try:
            receipt = json.loads(raw_receipt)
        except ValueError:
            raise Deny('receipt_invalid_json')
        receipt_sha = hashlib.sha256(raw_receipt).hexdigest()
        out['receipt_sha256'] = receipt_sha
        if a.prepare:
            s = summary(receipt)
            out.update(ok=True, stage='prepared', summary=s,
                       approval_template={'receipt_sha256': receipt_sha, 'head': s['head'], 'bundle_sha12': s['bundle_sha12'],
                                          'cfg_sha12': s['cfg_sha12'], 'approved_at': '<本人が承認した時刻 ISO8601 UTC>'})
            stdout.write(json.dumps(out, ensure_ascii=False) + '\n')
            return 0
        out['stage'] = 'approval'
        if a.interactive:
            check_interactive(receipt, receipt_sha, stdin, stdout, stdin.isatty() if isatty is None else isatty)
            out['approval'] = 'interactive'
        else:
            ap_path = Path(a.approval_file)
            if not ap_path.is_absolute():
                ap_path = root / ap_path
            check_approval(receipt, receipt_sha, read_regular_file(ap_path), now=now)
            out['approval'] = 'file'
        consume(root, receipt_sha)
        out['stage'] = 'exec'
        p = run(base + ['--exec', '--expect-receipt-sha256', receipt_sha], cwd=str(root))
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
