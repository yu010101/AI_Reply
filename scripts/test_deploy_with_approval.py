import datetime as dt
import importlib.util
import io
import json
import os
import shutil
import tempfile
import unittest
from pathlib import Path
from types import SimpleNamespace

HERE = Path(__file__).resolve().parent
spec = importlib.util.spec_from_file_location('deploy_with_approval', HERE / 'deploy_with_approval.py')
w = importlib.util.module_from_spec(spec); spec.loader.exec_module(w)
FX = HERE / 'fixtures' / 'approval'
RECEIPT_BYTES = (FX / 'receipt-a8385dc.json').read_bytes()
NOW = dt.datetime(2026, 9, 26, 7, 5, tzinfo=dt.timezone.utc)  # receipt 06:52:56Z / 承認 07:00Z の5分後


class FakeRun:
    """deploy_preflight.py の呼び出しを記録し、wrangler も preflight も実際には動かさない。
    判定(非exec)呼出しでは new_receipt を書き込める（main が進んだ後の再判定を模す）。"""
    def __init__(self, root, preflight_allow=True, exec_rc=0, verify_ok=True, new_receipt=None):
        self.root, self.calls, self.allow, self.exec_rc, self.verify_ok, self.new_receipt = root, [], preflight_allow, exec_rc, verify_ok, new_receipt

    def __call__(self, args, cwd=None, capture_output=False, text=False):
        self.calls.append(args)
        if '--exec' in args:
            return SimpleNamespace(returncode=self.exec_rc, stdout='')
        if '--verify' in args:
            return SimpleNamespace(returncode=0 if self.verify_ok else 1, stdout=json.dumps({'verify': self.verify_ok}))
        if self.new_receipt is not None:
            (self.root / '.quality' / 'preflight-receipt.json').write_bytes(self.new_receipt)
        if self.allow:
            return SimpleNamespace(returncode=0, stdout=json.dumps({'allow': True}))
        return SimpleNamespace(returncode=1, stdout=json.dumps({'allow': False, 'reason': 'head_not_origin_main'}))

    def stages(self):
        return ['exec' if '--exec' in c else 'verify' if '--verify' in c else 'preflight' for c in self.calls]


class Base(unittest.TestCase):
    def setUp(self):
        self.root = Path(tempfile.mkdtemp())
        # 利用者単位の台帳は本物の ~ を触らないよう試験ごとの一時場所へ差し替える
        self.home = Path(tempfile.mkdtemp())
        self._user_ledger, w.USER_LEDGER = w.USER_LEDGER, self.home / '.deploy-approvals' / 'deploy-approval-used.log'
        self.addCleanup(setattr, w, 'USER_LEDGER', self._user_ledger)
        self.addCleanup(shutil.rmtree, self.home, True)
        (self.root / '.quality').mkdir()
        (self.root / '.quality' / 'preflight-receipt.json').write_bytes(RECEIPT_BYTES)

    def tearDown(self):
        shutil.rmtree(self.root)

    def run_(self, **kw):
        return FakeRun(self.root, **kw)

    def place(self, name):
        dst = self.root / '.quality' / 'deploy-approval.json'
        shutil.copy(FX / name, dst)
        return dst

    def go(self, argv, run, stdin='', isatty=True, now=NOW):
        out = io.StringIO()
        rc = w.main(['--root', str(self.root)] + argv, run=run, stdin=io.StringIO(stdin), stdout=out, isatty=isatty, now=now)
        return rc, json.loads(out.getvalue().strip().splitlines()[-1])


class ApprovalFile(Base):
    def test_ok_runs_exec_then_verify_without_rerunning_preflight(self):
        p, run = self.place('approval-ok.json'), self.run_()
        rc, out = self.go(['--approval-file', str(p)], run)
        self.assertEqual((rc, out['ok'], out['approval']), (0, True, 'file'))
        self.assertEqual(run.stages(), ['exec', 'verify'])

    def test_same_file_twice_is_refused(self):
        p = self.place('approval-ok.json')
        self.go(['--approval-file', str(p)], self.run_())
        run = self.run_()
        rc, out = self.go(['--approval-file', str(p)], run)
        self.assertEqual((rc, out['reason']), (1, 'approval_already_used'))
        self.assertNotIn('exec', run.stages())

    def test_copy_or_hardlink_of_used_approval_is_refused(self):
        # Codex/Devin の反例: 改名後の .used を再指定・ハードリンクで二度目の exec に進めた
        p = self.place('approval-ok.json')
        link = self.root / '.quality' / 'again.json'
        os.link(p, link)
        copy = self.root / 'copy.json'; shutil.copy(p, copy)
        self.go(['--approval-file', str(p)], self.run_())
        for q in (link, copy):
            run = self.run_()
            rc, out = self.go(['--approval-file', str(q)], run)
            self.assertEqual((rc, out['reason']), (1, 'approval_already_used'), q)
            self.assertNotIn('exec', run.stages())

    def test_exec_failure_still_consumes(self):
        p = self.place('approval-ok.json')
        self.go(['--approval-file', str(p)], self.run_(exec_rc=1))
        rc, out = self.go(['--approval-file', str(p)], self.run_())
        self.assertEqual(out['reason'], 'approval_already_used')

    def test_approval_for_old_receipt_does_not_match_new_receipt(self):
        # Devin 反例: A を承認後に main が B へ進み receipt が作り直された → 承認は B の receipt に一致しない
        p = self.place('approval-ok.json')
        newer = json.loads(RECEIPT_BYTES); newer['issued_at'] = '2026-09-26T07:02:00+00:00'
        (self.root / '.quality' / 'preflight-receipt.json').write_text(json.dumps(newer))
        run = self.run_()
        rc, out = self.go(['--approval-file', str(p)], run)
        self.assertEqual((rc, out['reason']), (1, 'approval_mismatch:receipt_sha256'))
        self.assertNotIn('exec', run.stages())

    def refused(self, fixture, reason, now=NOW):
        p, run = self.place(fixture), self.run_()
        rc, out = self.go(['--approval-file', str(p)], run, now=now)
        self.assertEqual((rc, out['reason']), (1, reason))
        self.assertNotIn('exec', run.stages())
        self.assertFalse((self.root / w.USED_LEDGER).exists())  # 拒否時は台帳に載せない

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
        run = self.run_()
        rc, out = self.go(['--approval-file', str(link)], run)
        self.assertEqual(out['reason'], 'approval_is_symlink_or_unreadable')
        self.assertNotIn('exec', run.stages())

    def test_receipt_pointed_at_used_ledger_is_refused_before_preflight(self):
        # Codex PR#10 審査の反例: --prepare --receipt <台帳> で台帳を上書きし、同じ承認で再度 exec に進めた
        p = self.place('approval-ok.json')
        self.go(['--approval-file', str(p)], self.run_())
        ledger = (self.root / w.USED_LEDGER).read_bytes()
        os.link(self.root / w.USED_LEDGER, self.root / '.quality' / 'alias.json')
        for argv in (['--receipt', w.USED_LEDGER, '--prepare'], ['--receipt', './.quality/../.quality/deploy-approval-used.log', '--prepare'],
                     ['--receipt', '.quality/DEPLOY-APPROVAL-USED.LOG', '--prepare'], ['--receipt', '.quality/alias.json', '--prepare'],
                     ['--receipt', w.USED_LEDGER, '--approval-file', str(p)]):
            run = self.run_()
            rc, out = self.go(argv, run)
            self.assertEqual((rc, out['reason']), (1, 'receipt_is_used_ledger'), argv)
            self.assertEqual(run.stages(), [])
        self.assertEqual((self.root / w.USED_LEDGER).read_bytes(), ledger)
        run = self.run_()
        rc, out = self.go(['--approval-file', str(p)], run)
        self.assertEqual((rc, out['reason']), (1, 'approval_already_used'))
        self.assertNotIn('exec', run.stages())

    def test_same_approval_copied_to_another_checkout_is_refused(self):
        # Codex PR#10 第5回審査: 同じ receipt と承認を別の checkout B に写すと、B の台帳が空なので再び exec に進めた
        p = self.place('approval-ok.json')
        rc, out = self.go(['--approval-file', str(p)], self.run_())
        self.assertEqual((rc, out['ok']), (0, True))
        other = Path(tempfile.mkdtemp()); self.addCleanup(shutil.rmtree, other, True)
        (other / '.quality').mkdir()
        (other / '.quality' / 'preflight-receipt.json').write_bytes(RECEIPT_BYTES)
        shutil.copy(FX / 'approval-ok.json', other / 'approval.json')
        run = FakeRun(other)
        out_io = io.StringIO()
        rc = w.main(['--root', str(other), '--approval-file', str(other / 'approval.json')], run=run, stdin=io.StringIO(''),
                    stdout=out_io, isatty=True, now=NOW)
        self.assertEqual((rc, json.loads(out_io.getvalue().strip().splitlines()[-1])['reason']), (1, 'approval_already_used'))
        self.assertNotIn('exec', run.stages())
        self.assertFalse((other / w.USED_LEDGER).exists() and (other / w.USED_LEDGER).read_bytes())

    def test_hardlinked_ledgers_do_not_deadlock_and_record_once(self):
        # Codex PR#10 第6回審査: 同じ実体の台帳2本を別々に flock して自己デッドロックした
        w.USER_LEDGER.parent.mkdir(parents=True)
        w.USER_LEDGER.write_bytes(b'')
        os.link(w.USER_LEDGER, self.root / w.USED_LEDGER)
        import threading
        res = {}
        t = threading.Thread(target=lambda: res.setdefault('r', w.consume(self.root, 'f' * 64)), daemon=True)
        t.start(); t.join(10)
        self.assertFalse(t.is_alive(), 'consume がロック待ちで止まった')
        self.assertEqual(res.get('r'), True)
        self.assertEqual(w.USER_LEDGER.read_bytes(), b'f' * 64 + b'\n')
        with self.assertRaises(w.Deny):
            w.consume(self.root, 'f' * 64)

    def test_receipt_must_be_json_directly_under_quality(self):
        # Codex PR#10 第4回審査: 入れ子の別 checkout の台帳を名指しできた
        p = self.place('approval-ok.json')
        for rel in ('A/.quality/deploy-approval-used.log', 'A/.quality/r.json', '.quality/other.log', 'r.json'):
            run = self.run_()
            rc, out = self.go(['--receipt', rel, '--prepare'], run)
            self.assertEqual((rc, out['reason']), (1, 'receipt_location_invalid'), rel)
            self.assertEqual(run.stages(), [])

    def test_receipt_outside_root_refused(self):
        p, run = self.place('approval-ok.json'), self.run_()
        rc, out = self.go(['--receipt', '../x.json', '--approval-file', str(p)], run)
        self.assertEqual((rc, out['reason']), (1, 'receipt_outside_root'))
        self.assertEqual(run.stages(), [])


class Prepare(Base):
    def test_prepare_runs_preflight_only_and_prints_template(self):
        run = self.run_()
        rc, out = self.go(['--prepare'], run)
        self.assertEqual((rc, out['stage']), (0, 'prepared'))
        self.assertEqual(run.stages(), ['preflight'])
        t = out['approval_template']
        self.assertEqual(t['receipt_sha256'], out['receipt_sha256'])
        self.assertEqual(t['head'], json.loads(RECEIPT_BYTES)['head'])
        self.assertFalse((self.root / w.USED_LEDGER).exists())


class Interactive(Base):
    def test_yes_on_tty(self):
        run = self.run_()
        rc, out = self.go(['--interactive'], run, stdin=(FX / 'interactive-yes.txt').read_text())
        self.assertEqual((rc, out['approval']), (0, 'interactive'))
        self.assertEqual(run.stages(), ['preflight', 'exec', 'verify'])

    def test_y_is_not_yes(self):
        run = self.run_()
        rc, out = self.go(['--interactive'], run, stdin=(FX / 'interactive-y.txt').read_text())
        self.assertEqual((rc, out['reason']), (1, 'not_approved'))
        self.assertNotIn('exec', run.stages())

    def test_no_tty_refused_even_with_yes(self):
        run = self.run_()
        rc, out = self.go(['--interactive'], run, stdin='yes\n', isatty=False)
        self.assertEqual(out['reason'], 'interactive_requires_tty')
        self.assertNotIn('exec', run.stages())


class Gates(Base):
    def test_preflight_refusal_stops_before_approval(self):
        run = self.run_(preflight_allow=False)
        rc, out = self.go(['--interactive'], run, stdin='yes\n')
        self.assertEqual(out['reason'], 'preflight_refused:head_not_origin_main')
        self.assertEqual(run.stages(), ['preflight'])

    def test_exec_failure_skips_verify(self):
        p, run = self.place('approval-ok.json'), self.run_(exec_rc=1)
        rc, out = self.go(['--approval-file', str(p)], run)
        self.assertEqual(out['reason'], 'exec_failed_rc_1')
        self.assertEqual(run.stages(), ['exec'])

    def test_verify_failure_is_nonzero(self):
        p, run = self.place('approval-ok.json'), self.run_(verify_ok=False)
        rc, out = self.go(['--approval-file', str(p)], run)
        self.assertEqual((rc, out['reason']), (1, 'verify_failed'))

    def test_mode_is_required(self):
        with self.assertRaises(SystemExit):
            w.main(['--root', str(self.root)], run=self.run_())

    def test_exec_is_pinned_to_the_approved_receipt_hash(self):
        # Devin 反例: 台帳記録後・exec 前に receipt を差し替える → exec 側がハッシュ不一致で拒否できるよう承認ハッシュを渡す
        p, run = self.place('approval-ok.json'), self.run_()
        rc, out = self.go(['--approval-file', str(p)], run)
        ex = [c for c in run.calls if '--exec' in c][0]
        self.assertEqual(ex[ex.index('--expect-receipt-sha256') + 1], out['receipt_sha256'])

    def test_verify_is_pinned_to_the_approved_receipt_hash(self):
        # Devin 追補1: 配備後に receipt を差し替えて verify を偽らせない
        p, run = self.place('approval-ok.json'), self.run_()
        rc, out = self.go(['--approval-file', str(p)], run)
        self.assertEqual(rc, 0)
        ve = [c for c in run.calls if '--verify' in c][0]
        self.assertEqual(ve[ve.index('--expect-receipt-sha256') + 1], out['receipt_sha256'])

    def test_bom_receipt_is_refused_before_ledger_and_exec(self):
        # Codex 追補: bytes のまま json.loads すると BOM 付きを受け入れていた
        (self.root / '.quality' / 'preflight-receipt.json').write_bytes(b'\xef\xbb\xbf' + RECEIPT_BYTES)
        p, run = self.place('approval-ok.json'), self.run_()
        rc, out = self.go(['--approval-file', str(p)], run)
        self.assertEqual((rc, out['reason']), (1, 'receipt_invalid_json'))
        self.assertEqual(run.calls, [])
        self.assertFalse((self.root / w.USED_LEDGER).exists())

    def test_missing_loop_fifo_or_symlinked_receipt_is_a_denial(self):
        # Devin 追補3 + Codex 反証: 確認と読込を1回の open(O_NOFOLLOW) にし、差し替え後も traceback・停止しない
        rp = self.root / '.quality' / 'preflight-receipt.json'
        for make in ('missing', 'loop', 'fifo', 'same_content_symlink'):
            if rp.is_symlink() or rp.exists():
                rp.unlink()
            if make == 'loop':
                rp.symlink_to(rp.name)
            elif make == 'fifo':
                os.mkfifo(str(rp))
            elif make == 'same_content_symlink':
                real = self.root / 'real.json'; real.write_bytes(RECEIPT_BYTES); rp.symlink_to(real)
            p, run = self.place('approval-ok.json'), self.run_()
            rc, out = self.go(['--approval-file', str(p)], run)
            self.assertEqual((rc, out['reason']), (1, 'receipt_missing'), make)
            self.assertEqual(run.calls, [], make)
            self.assertFalse((self.root / w.USED_LEDGER).exists(), make)

    def test_wrapper_never_calls_wrangler_directly(self):
        p, run = self.place('approval-ok.json'), self.run_()
        self.go(['--approval-file', str(p)], run)
        self.assertTrue(all(str(w.PREFLIGHT) in c for c in run.calls))
        self.assertFalse(any(c[0] == 'wrangler' for c in run.calls))


if __name__ == '__main__':
    unittest.main()
