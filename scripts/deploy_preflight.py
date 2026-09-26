#!/usr/bin/env python3
"""deploy_preflight.py — 配備対象を CI 検査済み SHA に縛る前段。配備は --exec のときだけ、同一プロセスで再検証してから行う。

背景（2026-09-25 実測）: reviews.radineer.asia の Worker 5版は全てローカル wrangler から配備され、
最後の配備 07:43:59Z は最初の CI 実行 08:19:45Z より前だった。版注釈(tag/message)が無く、
配備後に「どの検査済み SHA が動いているか」を照合できなかった。

第2便での修正（統合レビュー指摘）:
 - check-run は名前ごとに started_at が最新の1件だけを見る。未完了(pending/in_progress)は success ではない。
 - 配備入力は wrangler 設定の main / assets.directory から導く（固定パスとハッシュ対象のずれを無くす）。
 - 判定結果を receipt に残し、--exec は fetch と check-run 照会からやり直して同じ判定になることを確かめ、
   コマンドは receipt から再生せず現在の状態から組み直す。--verify は receipt より新しい配備だけを対象にする
   （ゲート後改変・receipt 改竄によるコマンド差し替え・古い origin/main・「最新をそのまま採用」を塞ぐ）。

判定（全て満たさなければ非0で停止し、wrangler コマンドを出さない）:
 1. HEAD == origin/main（fetch 後）。
 2. 配備入力（設定の main と assets.directory 配下）が HEAD と一致（差分・未追跡なし）。
 3. HEAD の最新 check-run `quality` が completed かつ success。HEAD に run が無いマージコミットは、
    merge_commit_sha==HEAD の PR の head が同条件を満たし、かつ HEAD と PR head の tree が同一のときだけ許す。
 4. 意図的に未追跡の wrangler.json は sha256 を config 識別子として注釈へ入れる。

ネットワークは git fetch / gh api / wrangler の読取のみ（--exec を除く）。秘密値・account id は出力しない。
"""
import argparse
import datetime as dt
import hashlib
import json
import re
import subprocess
import sys
from pathlib import Path

CONFIG = 'intake-beta/wrangler.json'
CHECK_NAME = 'quality'
SHA40 = re.compile(r'^[0-9a-f]{40}$')
DEFAULT_RECEIPT = '.quality/preflight-receipt.json'
RECEIPT_MAX_AGE_SEC = 30 * 60


class Refuse(Exception):
    """配備を出してはいけない理由。メッセージは短い機械可読コード。"""


def sh(args, cwd, timeout=90):
    p = subprocess.run(args, cwd=str(cwd), capture_output=True, text=True, timeout=timeout)
    if p.returncode:
        raise Refuse('command_failed:%s:%s' % (' '.join(args[:2]), p.stderr.strip()[:160]))
    return p.stdout


def now_utc():
    return dt.datetime.now(dt.timezone.utc).replace(microsecond=0).isoformat()


def parse_iso(s):
    if not s:
        return None
    s = s.replace('Z', '+00:00')
    if '.' in s:  # Cloudflare は 6〜7桁の小数秒を返す
        head, tail = s.split('.', 1)
        frac = re.match(r'\d+', tail).group(0)
        s = head + '.' + frac[:6].ljust(6, '0') + tail[len(frac):]
    return dt.datetime.fromisoformat(s)


def repo_slug(origin_url):
    m = re.search(r'github\.com[:/]([^/\s]+/[^/\s.]+)', origin_url or '')
    if not m:
        raise Refuse('origin_not_github')
    return m.group(1)


def deploy_inputs(root, config=CONFIG):
    """wrangler 設定から実際にアップロードされる入力を導く。固定パスを信用しない。"""
    root = Path(root)
    cfg = root / config
    if not cfg.is_file():
        raise Refuse('config_missing:' + config)
    try:
        data = json.loads(cfg.read_bytes())
    except ValueError:
        raise Refuse('config_invalid_json:' + config)
    main = data.get('main')
    if not isinstance(main, str) or not main:
        raise Refuse('config_no_main')
    base = cfg.parent
    inputs = [(base / main).resolve()]
    assets = (data.get('assets') or {}).get('directory')
    if assets:
        inputs.append((base / assets).resolve())
    rels = []
    for p in inputs:
        try:
            rel = p.relative_to(root.resolve()).as_posix()
        except ValueError:
            raise Refuse('config_input_outside_repo')
        if not p.exists():
            raise Refuse('config_input_missing:' + rel)
        rels.append(rel)
    return rels, hashlib.sha256(cfg.read_bytes()).hexdigest()


def bundle_sha(root, inputs):
    """配備入力の内容ハッシュ。順序固定・相対パス込みで決定論的。"""
    root = Path(root)
    files = []
    for rel in inputs:
        p = root / rel
        if p.is_dir():
            files += sorted(x for x in p.rglob('*') if x.is_file())
        elif p.is_file():
            files.append(p)
        else:
            raise Refuse('deploy_input_missing:' + rel)
    h = hashlib.sha256()
    for f in files:
        h.update(str(f.relative_to(root)).encode()); h.update(b'\0')
        h.update(f.read_bytes()); h.update(b'\0')
    return h.hexdigest()


def newest_conclusions(check_runs_json):
    """名前ごとに started_at（同点なら id）が最新の1件だけを採る。未完了は None。
    古い success が新しい pending を上書きしないための正規化。"""
    newest, run_id = {}, None
    for r in check_runs_json.get('check_runs', []):
        name = r.get('name')
        key = (r.get('started_at') or '', r.get('id') or 0)
        if name in newest and newest[name][0] >= key:
            continue
        conclusion = r.get('conclusion') if r.get('status') == 'completed' else None
        newest[name] = (key, conclusion, r.get('html_url') or '')
    out = {}
    for name, (key, conclusion, url) in newest.items():
        out[name] = conclusion
        m = re.search(r'/actions/runs/(\d+)', url)
        if name == CHECK_NAME and m:
            run_id = m.group(1)
    return out, run_id


def check_runs(slug, sha, cwd):
    out = sh(['gh', 'api', 'repos/%s/commits/%s/check-runs?filter=all&per_page=100' % (slug, sha)], cwd)
    return newest_conclusions(json.loads(out))


def decide(head, origin_main, dirty, check_conclusions, pr_fallback):
    if not SHA40.match(head or ''):
        raise Refuse('head_not_sha')
    if head != origin_main:
        raise Refuse('head_not_origin_main')
    if dirty:
        raise Refuse('deploy_inputs_differ_from_head:' + ','.join(sorted(dirty)[:5]))
    if check_conclusions.get(CHECK_NAME) == 'success':
        return 'direct'
    if CHECK_NAME in check_conclusions:
        raise Refuse('check_not_success:%s' % check_conclusions.get(CHECK_NAME))
    if not pr_fallback:
        raise Refuse('no_check_run_for_head')
    if not pr_fallback.get('tree_equal'):
        raise Refuse('pr_head_tree_differs')
    if pr_fallback.get('head_conclusions', {}).get(CHECK_NAME) != 'success':
        raise Refuse('pr_head_check_not_success')
    return 'via_pr_%s' % pr_fallback.get('number')


def snapshot(root):
    """HEAD・origin/main・配備入力の汚れ・cfg/bundle ハッシュ。判定と --exec の再検証で同じ関数を使う。"""
    root = Path(root)
    head = sh(['git', 'rev-parse', 'HEAD'], root).strip()
    origin = sh(['git', 'rev-parse', 'origin/main'], root).strip()
    inputs, cfg_sha = deploy_inputs(root)
    status = sh(['git', 'status', '--porcelain', '--untracked-files=all', '--', *inputs], root)
    dirty = [line[3:] for line in status.splitlines() if line.strip()]
    return {'head': head, 'origin_main': origin, 'inputs': inputs, 'dirty': dirty,
            'cfg_sha': cfg_sha, 'bundle_sha': bundle_sha(root, inputs)}


def gather(root):
    root = Path(root)
    sh(['git', 'fetch', '--quiet', 'origin'], root)
    g = snapshot(root)
    g.update({'conclusions': {}, 'run_id': None, 'fallback': None})
    if g['head'] != g['origin_main'] or g['dirty']:
        return g  # decide() が拒否する。GitHub に無い HEAD へ問い合わせない
    slug = repo_slug(sh(['git', 'remote', 'get-url', 'origin'], root))
    conclusions, run_id = check_runs(slug, g['head'], root)
    fallback = None
    if CHECK_NAME not in conclusions:
        prs = json.loads(sh(['gh', 'api', 'repos/%s/commits/%s/pulls' % (slug, g['head'])], root))
        for pr in prs:
            if pr.get('merge_commit_sha') != g['head']:
                continue
            pr_head = pr['head']['sha']
            tree_head = sh(['git', 'rev-parse', g['head'] + '^{tree}'], root).strip()
            tree_pr = sh(['git', 'rev-parse', pr_head + '^{tree}'], root).strip()
            head_conc, run_id = check_runs(slug, pr_head, root)
            fallback = {'number': pr.get('number'), 'tree_equal': tree_head == tree_pr,
                        'head_conclusions': head_conc}
            break
    return dict(g, conclusions=conclusions, run_id=run_id, fallback=fallback)


def build_command(wrangler, g, basis):
    msg = 'git=%s ci=%s cfg=%s bundle=%s basis=%s' % (
        g['head'], g['run_id'] or 'unknown', g['cfg_sha'][:12], g['bundle_sha'][:12], basis)
    return [wrangler, 'deploy', '--config', CONFIG, '--tag', g['head'][:12], '--message', msg]


def revalidate(receipt, current, now_iso=None, max_age=RECEIPT_MAX_AGE_SEC, expected_command=None):
    """--exec 直前: receipt と現在の状態が同一で、receipt が新しいことを確認する。純粋関数。
    expected_command は現在の状態から組み直した配備コマンド。receipt 側の command は実行に使わず照合にだけ使う。"""
    for k in ('head', 'cfg_sha', 'bundle_sha'):
        if receipt.get(k) != current.get(k):
            raise Refuse('changed_since_preflight:' + k)
    if expected_command is not None and list(receipt.get('command') or [])[1:] != list(expected_command)[1:]:
        raise Refuse('command_changed_since_preflight')
    if current.get('dirty'):
        raise Refuse('deploy_inputs_dirty_at_exec')
    if current.get('head') != current.get('origin_main'):
        raise Refuse('head_not_origin_main_at_exec')
    issued = parse_iso(receipt.get('issued_at'))
    now = parse_iso(now_iso) if now_iso else dt.datetime.now(dt.timezone.utc)
    if not issued or (now - issued).total_seconds() > max_age or now < issued:
        raise Refuse('preflight_receipt_expired')
    return True


def verify_against_receipt(receipt, deployments_json, versions_json):
    """配備後: receipt より後に作られた最新配備が、receipt の head/bundle/cfg を注釈に持つか。
    receipt より古い配備を『最新だから』と採用しない。"""
    deps = json.loads(deployments_json)
    if not deps:
        raise Refuse('no_deployments')
    latest = max(deps, key=lambda d: parse_iso(d.get('created_on')) or dt.datetime.min.replace(tzinfo=dt.timezone.utc))
    created = parse_iso(latest.get('created_on'))
    issued = parse_iso(receipt.get('issued_at'))
    if not created or not issued or created <= issued:
        raise Refuse('latest_deployment_not_after_preflight')
    vids = [v.get('version_id') for v in latest.get('versions', []) if v.get('percentage') == 100]
    if len(vids) != 1:
        raise Refuse('deployment_not_single_version')
    ann = None
    for v in json.loads(versions_json):
        if v.get('id') == vids[0]:
            ann = v.get('annotations') or {}
            break
    if ann is None:
        raise Refuse('version_not_listed')
    msg = ann.get('workers/message') or ''
    checks = {
        'tag': ann.get('workers/tag') == receipt['head'][:12],
        'bundle': ('bundle=%s' % receipt['bundle_sha'][:12]) in msg,
        'cfg': ('cfg=%s' % receipt['cfg_sha'][:12]) in msg,
    }
    return {'verify': all(checks.values()), 'version_id': vids[0], 'created_on': latest.get('created_on'),
            'checks': checks, 'tag': ann.get('workers/tag')}


def main():
    ap = argparse.ArgumentParser(description=__doc__.split('\n')[0])
    ap.add_argument('--root', default=str(Path(__file__).resolve().parents[1]))
    ap.add_argument('--wrangler', default='wrangler')
    ap.add_argument('--receipt', default=DEFAULT_RECEIPT, help='判定結果の控え（root 相対、追跡しない）')
    ap.add_argument('--exec', action='store_true', help='receipt を再検証してから同一プロセスで wrangler を実行')
    ap.add_argument('--verify', action='store_true', help='配備後: receipt より新しい最新配備の注釈を照合')
    a = ap.parse_args()
    root = Path(a.root)
    rpath = root / a.receipt
    try:
        if a.exec or a.verify:
            if not rpath.is_file():
                raise Refuse('receipt_missing:' + a.receipt)
            receipt = json.loads(rpath.read_text())
        if a.verify:
            deps = sh([a.wrangler, 'deployments', 'list', '--config', CONFIG, '--json'], root)
            vers = sh([a.wrangler, 'versions', 'list', '--config', CONFIG, '--json'], root)
            r = verify_against_receipt(receipt, deps, vers)
            print(json.dumps(r))
            return 0 if r['verify'] else 1
        if a.exec:
            # receipt のコマンドは再生しない。fetch・check-run 照会・判定を今やり直し、同じ結果のときだけ実行する
            g = gather(root)
            basis = decide(g['head'], g['origin_main'], g['dirty'], g['conclusions'], g['fallback'])
            cmd = build_command(a.wrangler, g, basis)
            revalidate(receipt, g, expected_command=cmd)
            print(json.dumps({'exec': True, 'basis': basis, 'command': cmd}))
            return subprocess.run(cmd, cwd=str(root)).returncode
        g = gather(root)
        basis = decide(g['head'], g['origin_main'], g['dirty'], g['conclusions'], g['fallback'])
    except Refuse as e:
        print(json.dumps({'allow': False, 'reason': str(e)}))
        return 1
    cmd = build_command(a.wrangler, g, basis)
    receipt = {'issued_at': now_utc(), 'head': g['head'], 'cfg_sha': g['cfg_sha'], 'bundle_sha': g['bundle_sha'],
               'inputs': g['inputs'], 'ci_run_id': g['run_id'], 'basis': basis, 'command': cmd}
    rpath.parent.mkdir(parents=True, exist_ok=True)
    rpath.write_text(json.dumps(receipt, ensure_ascii=False, indent=1))
    print(json.dumps({'allow': True, 'basis': basis, 'head': g['head'], 'ci_run_id': g['run_id'],
                      'cfg_sha12': g['cfg_sha'][:12], 'bundle_sha12': g['bundle_sha'][:12],
                      'inputs': g['inputs'], 'receipt': a.receipt, 'command': cmd}, ensure_ascii=False))
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
