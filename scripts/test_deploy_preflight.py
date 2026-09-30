import importlib.util
import json
from pathlib import Path
import tempfile
import unittest

spec = importlib.util.spec_from_file_location('deploy_preflight', Path(__file__).with_name('deploy_preflight.py'))
m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m)
H = 'a' * 40
OK_PR = {'number': 9, 'tree_equal': True, 'head_conclusions': {'quality': 'success'}}


def cr(name, started, status='completed', conclusion='success', rid=1):
    return {'name': name, 'started_at': started, 'status': status, 'conclusion': conclusion, 'id': rid,
            'html_url': 'https://github.com/o/r/actions/runs/%d/job/1' % (1000 + rid)}


class Decide(unittest.TestCase):
    def refuse(self, *args):
        with self.assertRaises(m.Refuse) as cm:
            m.decide(*args)
        return str(cm.exception)

    def test_direct_success(self):
        self.assertEqual(m.decide(H, H, [], {'quality': 'success'}, None), 'direct')

    def test_head_not_origin(self):
        self.assertTrue(self.refuse(H, 'b' * 40, [], {'quality': 'success'}, None).startswith('head_not_origin_main'))

    def test_dirty_inputs(self):
        self.assertIn('deploy_inputs_differ_from_head', self.refuse(H, H, ['intake-beta/public/app.js'], {'quality': 'success'}, None))

    def test_check_failed_or_pending(self):
        self.assertIn('check_not_success', self.refuse(H, H, [], {'quality': 'failure'}, OK_PR))
        self.assertIn('check_not_success', self.refuse(H, H, [], {'quality': None}, OK_PR))

    def test_no_run_no_pr(self):
        self.assertEqual(self.refuse(H, H, [], {}, None), 'no_check_run_for_head')

    def test_pr_fallback(self):
        self.assertEqual(m.decide(H, H, [], {}, OK_PR), 'via_pr_9')
        self.assertEqual(self.refuse(H, H, [], {}, dict(OK_PR, tree_equal=False)), 'pr_head_tree_differs')
        self.assertEqual(self.refuse(H, H, [], {}, dict(OK_PR, head_conclusions={'quality': 'failure'})), 'pr_head_check_not_success')

    def test_invalid_head(self):
        self.assertEqual(self.refuse('HEAD', 'HEAD', [], {'quality': 'success'}, None), 'head_not_sha')


class CheckRunOrdering(unittest.TestCase):
    """統合レビュー指摘1: 古い success が新しい pending を上書きしてはいけない。"""
    def test_newer_pending_wins_over_older_success(self):
        runs = {'check_runs': [cr('quality', '2026-09-25T08:00:00Z', rid=1),
                               cr('quality', '2026-09-25T09:00:00Z', status='in_progress', conclusion=None, rid=2)]}
        conc, run_id = m.newest_conclusions(runs)
        self.assertIsNone(conc['quality'])
        with self.assertRaises(m.Refuse):
            m.decide(H, H, [], conc, OK_PR)

    def test_order_in_response_does_not_matter(self):
        a = {'check_runs': [cr('quality', '2026-09-25T09:00:00Z', status='queued', conclusion=None, rid=2), cr('quality', '2026-09-25T08:00:00Z', rid=1)]}
        b = {'check_runs': list(reversed(a['check_runs']))}
        self.assertEqual(m.newest_conclusions(a)[0], m.newest_conclusions(b)[0])
        self.assertIsNone(m.newest_conclusions(a)[0]['quality'])

    def test_newer_success_after_older_failure(self):
        runs = {'check_runs': [cr('quality', '2026-09-25T08:00:00Z', conclusion='failure', rid=1), cr('quality', '2026-09-25T09:00:00Z', rid=2)]}
        conc, run_id = m.newest_conclusions(runs)
        self.assertEqual(conc['quality'], 'success'); self.assertEqual(run_id, '1002')

    def test_completed_but_not_success_is_not_success(self):
        conc, _ = m.newest_conclusions({'check_runs': [cr('quality', '2026-09-25T08:00:00Z', conclusion='cancelled')]})
        self.assertEqual(conc['quality'], 'cancelled')


class ConfigDerivedInputs(unittest.TestCase):
    """統合レビュー指摘3: wrangler が読む入力とハッシュ対象がずれてはいけない。"""
    def make(self, cfg, files):
        d = tempfile.TemporaryDirectory(); root = Path(d.name)
        (root / 'intake-beta').mkdir(parents=True)
        (root / 'intake-beta/wrangler.json').write_text(json.dumps(cfg))
        for rel, body in files.items():
            p = root / rel; p.parent.mkdir(parents=True, exist_ok=True); p.write_text(body)
        return d, root

    def test_inputs_follow_config_not_fixed_paths(self):
        d, root = self.make({'main': 'src/w.mjs', 'assets': {'directory': './site'}},
                            {'intake-beta/src/w.mjs': 'x', 'intake-beta/site/index.html': 'y', 'intake-beta/worker.mjs': 'decoy', 'intake-beta/public/index.html': 'decoy'})
        with d:
            inputs, cfg_sha = m.deploy_inputs(root)
            self.assertEqual(inputs, ['intake-beta/src/w.mjs', 'intake-beta/site'])
            before = m.bundle_sha(root, inputs)
            (root / 'intake-beta/worker.mjs').write_text('changed decoy')
            self.assertEqual(before, m.bundle_sha(root, inputs))
            (root / 'intake-beta/site/index.html').write_text('changed real')
            self.assertNotEqual(before, m.bundle_sha(root, inputs))

    def test_missing_main_or_input_refused(self):
        d, root = self.make({'assets': {'directory': './public'}}, {'intake-beta/public/a': '1'})
        with d:
            with self.assertRaises(m.Refuse) as cm:
                m.deploy_inputs(root)
            self.assertEqual(str(cm.exception), 'config_no_main')
        d, root = self.make({'main': 'nope.mjs'}, {})
        with d:
            with self.assertRaises(m.Refuse) as cm:
                m.deploy_inputs(root)
            self.assertTrue(str(cm.exception).startswith('config_input_missing'))

    def test_input_outside_repo_refused(self):
        d, root = self.make({'main': '../../../etc/hosts'}, {})
        with d:
            with self.assertRaises(m.Refuse):
                m.deploy_inputs(root)

    def test_scheduled_worker_requires_matching_cron(self):
        worker = "export const PURGE_CRON='17 18 * * *';\nexport default {async scheduled(c,e,x){}, async fetch(){}}\n"
        d, root = self.make({'main': 'worker.mjs'}, {'intake-beta/worker.mjs': worker})
        with d:
            with self.assertRaises(m.Refuse) as cm:
                m.deploy_inputs(root)
            self.assertEqual(str(cm.exception), 'config_cron_missing:17 18 * * *')
        d, root = self.make({'main': 'worker.mjs', 'triggers': {'crons': ['0 0 * * *']}}, {'intake-beta/worker.mjs': worker})
        with d:
            with self.assertRaises(m.Refuse):
                m.deploy_inputs(root)
        d, root = self.make({'main': 'worker.mjs', 'triggers': {'crons': ['17 18 * * *']}}, {'intake-beta/worker.mjs': worker})
        with d:
            self.assertEqual(m.deploy_inputs(root)[0], ['intake-beta/worker.mjs'])
        d, root = self.make({'main': 'worker.mjs'}, {'intake-beta/worker.mjs': 'export default {async fetch(){}}\n'})
        with d:
            self.assertEqual(m.deploy_inputs(root)[0], ['intake-beta/worker.mjs'])

    def test_scheduled_detected_in_every_spelling(self):
        # PR #14 Devin r3 nit: 'async scheduled(' の文字列一致だけだと、async なし・空白・プロパティ書きの scheduled を見落とし通してしまう
        spellings = [
            'export default {async scheduled (c,e,x){}, async fetch(){}}',
            'export default {scheduled(c,e,x){ return 1 }, fetch(){}}',
            'export default {async  scheduled\n(c,e,x){}, fetch(){}}',
            'export default {scheduled: async function(c,e,x){}, fetch(){}}',
            'export default {scheduled: function (c){}, fetch(){}}',
            'export default {scheduled: async (c,e,x)=>{}, fetch(){}}',
            'export default {scheduled:(c)=>{}, fetch(){}}',
            'export default {scheduled: c=>{}, fetch(){}}',
            'export default {"scheduled": async (c)=>{}, fetch(){}}',
        ]
        for body in spellings:
            d, root = self.make({'main': 'worker.mjs'}, {'intake-beta/worker.mjs': body + '\n'})
            with d:
                with self.assertRaises(m.Refuse, msg=body) as cm:
                    m.deploy_inputs(root)
                self.assertEqual(str(cm.exception), 'scheduled_without_purge_cron_decl', body)
        # 似た名前（scheduledTime など）や scheduled の無い Worker には何も求めない
        for body in ['export default {async fetch(r){ const t=r.scheduledTime; return t }}', 'export default {async fetch(){ const unscheduled=1 }}']:
            d, root = self.make({'main': 'worker.mjs'}, {'intake-beta/worker.mjs': body + '\n'})
            with d:
                self.assertEqual(m.deploy_inputs(root)[0], ['intake-beta/worker.mjs'], body)

    def test_unreadable_main_is_refused_not_skipped(self):
        # PR #14 Devin r3 nit: main が読めない（OSError）ときに cron 検査を飛ばして通すと fail-open になる
        d, root = self.make({'main': 'worker.mjs'}, {'intake-beta/worker.mjs/index.mjs': 'export default {async scheduled(){}}\n'})
        with d:
            with self.assertRaises(m.Refuse) as cm:
                m.deploy_inputs(root)
            self.assertEqual(str(cm.exception), 'config_main_unreadable')

    def test_repo_wrangler_config_carries_purge_cron(self):
        # リポジトリに入れた本番の wrangler 設定そのものが、Worker の PURGE_CRON と同じ定時実行を持つ（PR #14 Codex r3/r4 指摘）
        root = Path(__file__).resolve().parents[1]
        inputs, _ = m.deploy_inputs(root)
        self.assertEqual(inputs, ['intake-beta/worker.mjs', 'intake-beta/public'])
        cfg = json.loads((root / 'intake-beta/wrangler.json').read_text())
        src = (root / 'intake-beta/worker.mjs').read_text()
        self.assertIn(m.CRON_DECL.search(src).group(1), cfg['triggers']['crons'])

    def test_repo_slug(self):
        self.assertEqual(m.repo_slug('git@github.com:yu010101/AI_Reply.git'), 'yu010101/AI_Reply')
        with self.assertRaises(m.Refuse):
            m.repo_slug('https://example.invalid/x/y.git')


class ReceiptAndExec(unittest.TestCase):
    """統合レビュー指摘4: 判定後の改変を配備してはいけない。"""
    R = {'head': H, 'cfg_sha': 'c' * 64, 'bundle_sha': 'b' * 64, 'issued_at': '2026-09-25T10:00:00+00:00'}
    CUR = {'head': H, 'origin_main': H, 'cfg_sha': 'c' * 64, 'bundle_sha': 'b' * 64, 'dirty': []}

    def test_unchanged_within_window(self):
        self.assertTrue(m.revalidate(self.R, self.CUR, now_iso='2026-09-25T10:05:00+00:00'))

    def test_bundle_changed_after_preflight(self):
        with self.assertRaises(m.Refuse) as cm:
            m.revalidate(self.R, dict(self.CUR, bundle_sha='d' * 64), now_iso='2026-09-25T10:05:00+00:00')
        self.assertEqual(str(cm.exception), 'changed_since_preflight:bundle_sha')

    def test_config_changed_after_preflight(self):
        with self.assertRaises(m.Refuse):
            m.revalidate(self.R, dict(self.CUR, cfg_sha='e' * 64), now_iso='2026-09-25T10:05:00+00:00')

    def test_dirty_or_moved_head_at_exec(self):
        with self.assertRaises(m.Refuse):
            m.revalidate(self.R, dict(self.CUR, dirty=['intake-beta/public/app.js']), now_iso='2026-09-25T10:05:00+00:00')
        with self.assertRaises(m.Refuse):
            m.revalidate(dict(self.R, head='f' * 40), dict(self.CUR, head='f' * 40), now_iso='2026-09-25T10:05:00+00:00')

    def test_command_is_rebuilt_not_replayed(self):
        # Devin レビュー指摘: receipt の command を書き換えても、現在の状態から組み直したコマンドと一致しなければ実行しない
        good = ['wrangler', 'deploy', '--config', m.CONFIG, '--tag', H[:12], '--message', 'git=x']
        forged = ['wrangler', 'deploy', '--config', 'prod/wrangler.json', '--env', 'prod']
        self.assertTrue(m.revalidate(dict(self.R, command=good), self.CUR, now_iso='2026-09-25T10:05:00+00:00', expected_command=good))
        self.assertTrue(m.revalidate(dict(self.R, command=['/opt/wrangler'] + good[1:]), self.CUR, now_iso='2026-09-25T10:05:00+00:00', expected_command=good))
        with self.assertRaises(m.Refuse) as cm:
            m.revalidate(dict(self.R, command=forged), self.CUR, now_iso='2026-09-25T10:05:00+00:00', expected_command=good)
        self.assertEqual(str(cm.exception), 'command_changed_since_preflight')
        with self.assertRaises(m.Refuse):
            m.revalidate(self.R, self.CUR, now_iso='2026-09-25T10:05:00+00:00', expected_command=good)  # receipt に command が無い

    def test_exec_path_regathers_instead_of_replaying(self):
        src = Path(m.__file__).read_text()
        self.assertNotIn("receipt['command'][1:]", src)
        exec_block = src.split('if a.exec:')[1].split('g = gather(root)')[0]
        self.assertNotIn('snapshot(root)', exec_block)

    def test_expired_receipt(self):
        with self.assertRaises(m.Refuse) as cm:
            m.revalidate(self.R, self.CUR, now_iso='2026-09-25T11:00:01+00:00')
        self.assertEqual(str(cm.exception), 'preflight_receipt_expired')


class ExecPinnedReceipt(unittest.TestCase):
    """承認した receipt と exec 時に読む receipt の中身が違えば、fetch・判定に入る前に拒否する。"""
    def run_main(self, root, expect):
        import io, contextlib, sys
        called = []
        orig = m.gather
        m.gather = lambda r: called.append(r) or (_ for _ in ()).throw(AssertionError('gather must not run'))
        argv, sys.argv = sys.argv, ['deploy_preflight.py', '--root', str(root), '--exec', '--expect-receipt-sha256', expect]
        out = io.StringIO()
        try:
            with contextlib.redirect_stdout(out):
                rc = m.main()
        finally:
            sys.argv, m.gather = argv, orig
        return rc, json.loads(out.getvalue().strip().splitlines()[-1]), called

    def test_swapped_receipt_is_refused_before_gather(self):
        import hashlib
        root = Path(tempfile.mkdtemp()); (root / '.quality').mkdir()
        approved = json.dumps({'head': H, 'issued_at': '2026-09-25T10:00:00+00:00'}).encode()
        (root / m.DEFAULT_RECEIPT).write_bytes(json.dumps({'head': 'b' * 40, 'issued_at': '2026-09-25T10:01:00+00:00'}).encode())
        rc, out, called = self.run_main(root, hashlib.sha256(approved).hexdigest())
        self.assertEqual((rc, out['allow'], out['reason']), (1, False, 'receipt_changed_since_approval'))
        self.assertEqual(called, [])



class ReceiptLoadFollowUps(unittest.TestCase):
    """PR#8 審査の追補: --exec はハッシュ必須・--verify もハッシュ照合・BOM付きは拒否・読み込み競合は receipt_missing。"""
    def run_main(self, root, args):
        import io, contextlib, sys
        called = []
        orig_g, orig_sh = m.gather, m.sh
        m.gather = lambda r: called.append('gather') or (_ for _ in ()).throw(AssertionError('gather must not run'))
        m.sh = lambda *a, **k: called.append('sh') or (_ for _ in ()).throw(AssertionError('wrangler must not run'))
        argv, sys.argv = sys.argv, ['deploy_preflight.py', '--root', str(root)] + args
        out = io.StringIO()
        try:
            with contextlib.redirect_stdout(out):
                rc = m.main()
        finally:
            sys.argv, m.gather, m.sh = argv, orig_g, orig_sh
        return rc, json.loads(out.getvalue().strip().splitlines()[-1]), called

    def root_with(self, raw):
        root = Path(tempfile.mkdtemp()); (root / '.quality').mkdir()
        (root / m.DEFAULT_RECEIPT).write_bytes(raw)
        return root

    def sha(self, raw):
        import hashlib
        return hashlib.sha256(raw).hexdigest()

    GOOD = json.dumps({'head': H, 'issued_at': '2026-09-25T10:00:00+00:00'}).encode()

    def test_exec_without_pin_is_refused_before_gather(self):
        rc, out, called = self.run_main(self.root_with(self.GOOD), ['--exec'])
        self.assertEqual((rc, out['reason'], called), (1, 'exec_requires_expect_receipt_sha256', []))

    def test_bom_receipt_is_refused_even_when_hash_matches(self):
        raw = b'\xef\xbb\xbf' + self.GOOD
        rc, out, called = self.run_main(self.root_with(raw), ['--exec', '--expect-receipt-sha256', self.sha(raw)])
        self.assertEqual((rc, out['reason'], called), (1, 'receipt_invalid_json', []))
        rc, out, called = self.run_main(self.root_with(raw), ['--verify'])
        self.assertEqual((rc, out['reason'], called), (1, 'receipt_invalid_json', []))

    def test_non_object_or_non_utf8_receipt_is_refused(self):
        for raw in (b'[1, 2]', b'\xff\xfe{}', b'not json'):
            rc, out, called = self.run_main(self.root_with(raw), ['--exec', '--expect-receipt-sha256', self.sha(raw)])
            self.assertEqual((rc, out['reason'], called), (1, 'receipt_invalid_json', []), raw)

    def test_verify_with_mismatched_pin_does_not_query_wrangler(self):
        root = self.root_with(json.dumps({'head': 'b' * 40, 'issued_at': '2026-09-25T10:01:00+00:00'}).encode())
        rc, out, called = self.run_main(root, ['--verify', '--expect-receipt-sha256', self.sha(self.GOOD)])
        self.assertEqual((rc, out['reason'], called), (1, 'receipt_changed_since_approval', []))

    def test_missing_loop_or_fifo_receipt_is_a_refusal_not_a_traceback_or_hang(self):
        # Codex 反証: 確認後の差し替え（循環リンク=ELOOP, FIFO=open で停止）は、確認と読込を1回の open にして塞ぐ
        import os
        for make in ('missing', 'loop', 'fifo', 'dir'):
            root = self.root_with(self.GOOD); rp = root / m.DEFAULT_RECEIPT; rp.unlink()
            if make == 'loop':
                rp.symlink_to(rp.name)
            elif make == 'fifo':
                os.mkfifo(str(rp))
            elif make == 'dir':
                rp.mkdir()
            rc, out, called = self.run_main(root, ['--exec', '--expect-receipt-sha256', self.sha(self.GOOD)])
            self.assertEqual((rc, out['reason'], called), (1, 'receipt_missing:' + m.DEFAULT_RECEIPT, []), make)

    def test_receipt_is_read_with_one_nofollow_open(self):
        # 確認(is_file/is_symlink)と読込を分けない: 読込関数だけで symlink を辿らないこと
        root = self.root_with(self.GOOD)
        real = root / 'same.json'; real.write_bytes(self.GOOD)
        link = root / 'link.json'; link.symlink_to(real)
        self.assertIsNone(m.read_nofollow_regular(link))
        self.assertEqual(m.read_nofollow_regular(real), self.GOOD)
        src = Path(m.__file__).read_text().split('def load_receipt(')[1].split('\ndef ')[0]
        self.assertNotIn('is_file()', src); self.assertNotIn('read_bytes()', src)

    def test_symlinked_receipt_is_refused(self):
        root = self.root_with(self.GOOD)
        real = root / 'elsewhere.json'; real.write_bytes(self.GOOD)
        (root / m.DEFAULT_RECEIPT).unlink(); (root / m.DEFAULT_RECEIPT).symlink_to(real)
        rc, out, called = self.run_main(root, ['--exec', '--expect-receipt-sha256', self.sha(self.GOOD)])
        self.assertEqual((rc, out['reason'], called), (1, 'receipt_missing:' + m.DEFAULT_RECEIPT, []))


class ReceiptWrite(unittest.TestCase):
    """Codex 反証(第2版): 判定モードの receipt 書込が symlink を辿り、FIFO で止まっていた。rename で置き換える。"""
    G = {'head': H, 'origin_main': H, 'dirty': [], 'conclusions': {'quality': 'success'}, 'fallback': None,
         'cfg_sha': 'c' * 64, 'bundle_sha': 'b' * 64, 'inputs': ['intake-beta/worker.mjs'], 'run_id': 1}

    def judge(self, root):
        import io, contextlib, sys
        og, od = m.gather, m.decide
        m.gather, m.decide = (lambda r: dict(self.G)), (lambda *a: 'direct')
        argv, sys.argv = sys.argv, ['deploy_preflight.py', '--root', str(root)]
        out = io.StringIO()
        try:
            with contextlib.redirect_stdout(out):
                rc = m.main()
        finally:
            sys.argv, m.gather, m.decide = argv, og, od
        return rc, json.loads(out.getvalue().strip().splitlines()[-1])

    def test_receipt_at_used_ledger_is_refused_and_ledger_untouched(self):
        # Codex PR#10 審査: 判定モードの receipt 書込が使用済み承認台帳を置き換えていた
        import io, contextlib, os, sys
        root = Path(tempfile.mkdtemp())
        led = root / m.USED_LEDGER
        led.parent.mkdir(parents=True)
        led.write_bytes(b'a' * 64 + b'\n')
        os.link(led, root / '.quality' / 'alias.json')
        for rel in (m.USED_LEDGER, '.quality/../.quality/deploy-approval-used.log', '.quality/DEPLOY-APPROVAL-USED.LOG', '.quality/alias.json'):
            argv, sys.argv = sys.argv, ['deploy_preflight.py', '--root', str(root), '--receipt', rel]
            og, od = m.gather, m.decide
            m.gather, m.decide = (lambda r: dict(self.G)), (lambda *a: 'direct')
            out = io.StringIO()
            try:
                with contextlib.redirect_stdout(out):
                    rc = m.main()
            finally:
                sys.argv, m.gather, m.decide = argv, og, od
            self.assertEqual((rc, json.loads(out.getvalue().strip().splitlines()[-1])['reason']), (1, 'receipt_is_used_ledger'), rel)
        self.assertEqual(led.read_bytes(), b'a' * 64 + b'\n')

    def test_receipt_outside_root_is_refused(self):
        # Codex PR#10 第3回審査: 別 checkout A の台帳を --root B --receipt <A の絶対パス> で書き換えられた
        import io, contextlib, sys
        a_root, b_root = Path(tempfile.mkdtemp()), Path(tempfile.mkdtemp())
        led = a_root / m.USED_LEDGER
        led.parent.mkdir(parents=True)
        led.write_bytes(b'a' * 64 + b'\n')
        for rel in (str(led), '../' + a_root.name + '/' + m.USED_LEDGER, str(a_root / 'x.json')):
            argv, sys.argv = sys.argv, ['deploy_preflight.py', '--root', str(b_root), '--receipt', rel]
            og, od = m.gather, m.decide
            m.gather, m.decide = (lambda r: dict(self.G)), (lambda *a: 'direct')
            out = io.StringIO()
            try:
                with contextlib.redirect_stdout(out):
                    rc = m.main()
            finally:
                sys.argv, m.gather, m.decide = argv, og, od
            self.assertEqual((rc, json.loads(out.getvalue().strip().splitlines()[-1]).get('reason')), (1, 'receipt_outside_root'), rel)
        self.assertEqual(led.read_bytes(), b'a' * 64 + b'\n')
        self.assertFalse((a_root / 'x.json').exists())

    def test_receipt_must_be_json_directly_under_quality(self):
        # Codex PR#10 第4回審査: root 内に入れ子の別 checkout A があると A/.quality/deploy-approval-used.log を名指しできた
        import io, contextlib, sys
        root = Path(tempfile.mkdtemp())
        led = root / 'A' / m.USED_LEDGER
        led.parent.mkdir(parents=True)
        led.write_bytes(b'a' * 64 + b'\n')
        for rel in ('A/' + m.USED_LEDGER, 'A/.quality/r.json', '.quality/other.log', '.quality/.hidden.json', 'r.json', '.quality/..'):
            argv, sys.argv = sys.argv, ['deploy_preflight.py', '--root', str(root), '--receipt', rel]
            og, od = m.gather, m.decide
            m.gather, m.decide = (lambda r: dict(self.G)), (lambda *a: 'direct')
            out = io.StringIO()
            try:
                with contextlib.redirect_stdout(out):
                    rc = m.main()
            finally:
                sys.argv, m.gather, m.decide = argv, og, od
            self.assertEqual((rc, json.loads(out.getvalue().strip().splitlines()[-1]).get('reason')), (1, 'receipt_location_invalid'), rel)
        self.assertEqual(led.read_bytes(), b'a' * 64 + b'\n')
        self.assertFalse((root / 'A' / '.quality' / 'r.json').exists())

    def test_writes_plain_utf8_receipt_that_exec_can_load(self):
        root = Path(tempfile.mkdtemp())
        rc, out = self.judge(root)
        rp = root / m.DEFAULT_RECEIPT
        self.assertEqual((rc, out['allow']), (0, True))
        raw = rp.read_bytes()
        self.assertFalse(raw.startswith(b'\xef\xbb\xbf'))
        self.assertEqual(m.load_receipt(rp, m.DEFAULT_RECEIPT)['head'], H)
        self.assertEqual([x.name for x in rp.parent.iterdir()], [rp.name])  # 一時ファイルを残さない

    def test_symlink_at_receipt_path_is_replaced_not_followed(self):
        root = Path(tempfile.mkdtemp()); (root / '.quality').mkdir()
        victim = root / 'victim.txt'; victim.write_bytes(b'keep')
        (root / m.DEFAULT_RECEIPT).symlink_to(victim)
        rc, out = self.judge(root)
        self.assertEqual(rc, 0)
        self.assertEqual(victim.read_bytes(), b'keep')
        self.assertFalse((root / m.DEFAULT_RECEIPT).is_symlink())

    def test_fifo_at_receipt_path_does_not_hang(self):
        import os
        root = Path(tempfile.mkdtemp()); (root / '.quality').mkdir()
        os.mkfifo(str(root / m.DEFAULT_RECEIPT))
        rc, out = self.judge(root)  # 旧実装はここで読み手待ちのまま止まる
        self.assertEqual(rc, 0)
        self.assertTrue((root / m.DEFAULT_RECEIPT).is_file())

    def test_directory_at_receipt_path_is_a_refusal(self):
        root = Path(tempfile.mkdtemp()); (root / m.DEFAULT_RECEIPT).mkdir(parents=True)
        (root / m.DEFAULT_RECEIPT / 'x').write_bytes(b'')
        rc, out = self.judge(root)
        self.assertEqual((rc, out['allow'], out['reason']), (1, False, 'receipt_unwritable:' + m.DEFAULT_RECEIPT))
        self.assertEqual(sorted(x.name for x in (root / '.quality').iterdir()), ['preflight-receipt.json'])

class VerifyAfterReceipt(unittest.TestCase):
    """統合レビュー指摘5: deployment を確定できないときに『最新』を採用してはいけない。"""
    R = {'head': H, 'cfg_sha': 'c' * 64, 'bundle_sha': 'b' * 64, 'issued_at': '2026-09-25T10:00:00+00:00'}
    good_msg = 'git=%s ci=1 cfg=%s bundle=%s basis=direct' % (H, 'c' * 12, 'b' * 12)

    def deps(self, created, vid='v2'):
        return json.dumps([{'id': 'd1', 'created_on': '2026-09-25T07:00:00.000000Z', 'versions': [{'version_id': 'v1', 'percentage': 100}]},
                           {'id': 'd2', 'created_on': created, 'versions': [{'version_id': vid, 'percentage': 100}]}])

    def vers(self, tag=H[:12], msg=None):
        return json.dumps([{'id': 'v1', 'annotations': {}}, {'id': 'v2', 'annotations': {'workers/tag': tag, 'workers/message': self.good_msg if msg is None else msg}}])

    def test_good(self):
        r = m.verify_against_receipt(self.R, self.deps('2026-09-25T10:03:00.123456Z'), self.vers())
        self.assertTrue(r['verify']); self.assertEqual(r['version_id'], 'v2')

    def test_latest_older_than_receipt_is_not_adopted(self):
        with self.assertRaises(m.Refuse) as cm:
            m.verify_against_receipt(self.R, self.deps('2026-09-25T09:59:59Z'), self.vers())
        self.assertEqual(str(cm.exception), 'latest_deployment_not_after_preflight')

    def test_tag_or_bundle_mismatch(self):
        self.assertFalse(m.verify_against_receipt(self.R, self.deps('2026-09-25T10:03:00Z'), self.vers(tag='deadbeef0000'))['verify'])
        self.assertFalse(m.verify_against_receipt(self.R, self.deps('2026-09-25T10:03:00Z'), self.vers(msg='git=x bundle=000000000000 cfg=' + 'c' * 12))['verify'])

    def test_split_or_missing(self):
        deps = json.dumps([{'id': 'd', 'created_on': '2026-09-25T10:03:00Z', 'versions': [{'version_id': 'a', 'percentage': 50}, {'version_id': 'b', 'percentage': 50}]}])
        with self.assertRaises(m.Refuse):
            m.verify_against_receipt(self.R, deps, self.vers())
        with self.assertRaises(m.Refuse):
            m.verify_against_receipt(self.R, '[]', self.vers())

    def test_cloudflare_timestamp_precision(self):
        self.assertIsNotNone(m.parse_iso('2026-09-25T07:43:59.836581Z'))
        self.assertIsNotNone(m.parse_iso('2026-09-25T07:43:59.8365811Z'))


if __name__ == '__main__':
    unittest.main()
