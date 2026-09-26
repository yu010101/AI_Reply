import datetime as dt
import importlib.util
import io
import json
import shutil
import tempfile
import unittest
from pathlib import Path
from types import SimpleNamespace

HERE = Path(__file__).resolve().parent
spec = importlib.util.spec_from_file_location('deploy_with_approval', HERE / 'deploy_with_approval.py')
w = importlib.util.module_from_spec(spec); spec.loader.exec_module(w)
FX = HERE / 'fixtures' / 'approval'
RECEIPT = json.loads((FX / 'receipt-a8385dc.json').read_text())
NOW = dt.datetime(2026, 9, 26, 7, 5, tzinfo=dt.timezone.utc)  # receipt 06:52:56Z / 承認 07:00Z の5分後


class FakeRun:
    """deploy_preflight.py の呼び出しを記録し、wrangler も preflight も実際には動かさない。"""
    def __init__(self, preflight_allow=True, exec_rc=0, verify_ok=True):
        self.calls, self.allow, self.exec_rc, self.verify_ok = [], preflight_allow, exec_rc, verify_ok

    def __call__(self, args, cwd=None, capture_output=False, text=False):
        self.calls.append(args)
        if '--exec' in args:
            return SimpleNamespace(returncode=self.exec_rc, stdout='')
        if '--verify' in args:
            return SimpleNamespace(returncode=0 if self.verify_ok else 1, stdout=json.dumps({'verify': self.verify_ok}))
        if self.allow:
            return SimpleNamespace(returncode=0, stdout=json.dumps({'allow': True}))
        return SimpleNamespace(returncode=1, stdout=json.dumps({'allow': False, 'reason': 'head_not_origin_main'}))

    def stages(self):
        return ['exec' if '--exec' in c else 'verify' if '--verify' in c else 'preflight' for c in self.calls]


class Base(unittest.TestCase):
    def setUp(self):
        self.root = Path(tempfile.mkdtemp())
        (self.root / '.quality').mkdir()
        (self.root / '.quality' / 'preflight-receipt.json').write_text(json.dumps(RECEIPT))

    def tearDown(self):
        shutil.rmtree(self.root)

    def place(self, name):
        dst = self.root / '.quality' / 'deploy-approval.json'
        shutil.copy(FX / name, dst)
        return dst

    def go(self, argv, run, stdin='', isatty=True):
        out = io.StringIO()
        rc = w.main(['--root', str(self.root)] + argv, run=run, stdin=io.StringIO(stdin), stdout=out, isatty=isatty, now=NOW)
        return rc, json.loads(out.getvalue().strip().splitlines()[-1])


class ApprovalFile(Base):
    def test_ok_runs_exec_then_verify_and_consumes_file(self):
        p, run = self.place('approval-ok.json'), FakeRun()
        rc, out = self.go(['--approval-file', str(p)], run)
        self.assertEqual((rc, out['ok'], out['approval']), (0, True, 'file'))
        self.assertEqual(run.stages(), ['preflight', 'exec', 'verify'])
        self.assertFalse(p.exists())
        self.assertEqual(len(list(p.parent.glob('deploy-approval.json.used-*'))), 1)

    def test_replay_after_consumption_is_refused(self):
        p = self.place('approval-ok.json')
        self.go(['--approval-file', str(p)], FakeRun())
        run = FakeRun()
        rc, out = self.go(['--approval-file', str(p)], run)
        self.assertEqual((rc, out['reason']), (1, 'approval_missing'))
        self.assertNotIn('exec', run.stages())

    def refused(self, fixture, reason, now=NOW):
        p, run = self.place(fixture), FakeRun()
        out = io.StringIO()
        rc = w.main(['--root', str(self.root), '--approval-file', str(p)], run=run, stdout=out, now=now)
        res = json.loads(out.getvalue().strip())
        self.assertEqual((rc, res['reason']), (1, reason))
        self.assertNotIn('exec', run.stages())
        self.assertTrue(p.exists())  # 拒否時は消費しない

    def test_wrong_head(self):
        self.refused('approval-wrong-head.json', 'approval_mismatch:head')

    def test_wrong_bundle(self):
        self.refused('approval-wrong-bundle.json', 'approval_mismatch:bundle_sha12')

    def test_approval_older_than_receipt(self):
        self.refused('approval-before-receipt.json', 'approval_before_receipt')

    def test_expired(self):
        self.refused('approval-ok.json', 'approval_expired_or_future', now=NOW + dt.timedelta(minutes=40))

    def test_future_dated(self):
        self.refused('approval-ok.json', 'approval_expired_or_future', now=NOW - dt.timedelta(minutes=10))

    def test_naive_time(self):
        self.refused('approval-no-tz.json', 'approval_time_invalid')

    def test_symlink_refused(self):
        real = self.root / 'elsewhere.json'
        shutil.copy(FX / 'approval-ok.json', real)
        link = self.root / '.quality' / 'deploy-approval.json'
        link.symlink_to(real)
        run = FakeRun()
        rc, out = self.go(['--approval-file', str(link)], run)
        self.assertEqual(out['reason'], 'approval_is_symlink')
        self.assertNotIn('exec', run.stages())


class Interactive(Base):
    def test_yes_on_tty(self):
        run = FakeRun()
        rc, out = self.go(['--interactive'], run, stdin=(FX / 'interactive-yes.txt').read_text())
        self.assertEqual((rc, out['approval']), (0, 'interactive'))
        self.assertEqual(run.stages(), ['preflight', 'exec', 'verify'])

    def test_y_is_not_yes(self):
        run = FakeRun()
        rc, out = self.go(['--interactive'], run, stdin=(FX / 'interactive-y.txt').read_text())
        self.assertEqual((rc, out['reason']), (1, 'not_approved'))
        self.assertNotIn('exec', run.stages())

    def test_no_tty_refused_even_with_yes(self):
        run = FakeRun()
        rc, out = self.go(['--interactive'], run, stdin='yes\n', isatty=False)
        self.assertEqual(out['reason'], 'interactive_requires_tty')
        self.assertNotIn('exec', run.stages())


class Gates(Base):
    def test_preflight_refusal_stops_before_approval(self):
        p, run = self.place('approval-ok.json'), FakeRun(preflight_allow=False)
        rc, out = self.go(['--approval-file', str(p)], run)
        self.assertEqual(out['reason'], 'preflight_refused:head_not_origin_main')
        self.assertEqual(run.stages(), ['preflight'])
        self.assertTrue(p.exists())

    def test_exec_failure_skips_verify(self):
        p, run = self.place('approval-ok.json'), FakeRun(exec_rc=1)
        rc, out = self.go(['--approval-file', str(p)], run)
        self.assertEqual(out['reason'], 'exec_failed_rc_1')
        self.assertEqual(run.stages(), ['preflight', 'exec'])

    def test_verify_failure_is_nonzero(self):
        p, run = self.place('approval-ok.json'), FakeRun(verify_ok=False)
        rc, out = self.go(['--approval-file', str(p)], run)
        self.assertEqual((rc, out['reason']), (1, 'verify_failed'))

    def test_mode_is_required(self):
        with self.assertRaises(SystemExit):
            w.main(['--root', str(self.root)], run=FakeRun())

    def test_wrapper_never_calls_wrangler_directly(self):
        p, run = self.place('approval-ok.json'), FakeRun()
        self.go(['--approval-file', str(p)], run)
        self.assertTrue(all(str(w.PREFLIGHT) in c for c in run.calls))
        self.assertFalse(any(c[0] == 'wrangler' for c in run.calls))


if __name__ == '__main__':
    unittest.main()
