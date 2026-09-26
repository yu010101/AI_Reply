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
