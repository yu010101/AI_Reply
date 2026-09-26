"""--verify の手順書どおりの判定を、実 receipt(a8385dc) と合成した配備一覧で固定する。wrangler は呼ばない。"""
import importlib.util
import json
import unittest
from pathlib import Path

HERE = Path(__file__).resolve().parent
spec = importlib.util.spec_from_file_location('deploy_preflight', HERE / 'deploy_preflight.py')
m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m)
R = json.loads((HERE / 'fixtures' / 'approval' / 'receipt-a8385dc.json').read_text())
OLD = {'created_on': '2026-09-25T07:43:59.836581Z', 'versions': [{'version_id': 'v-old', 'percentage': 100}]}  # 現行本番(2026-09-26 読取)と同じ時刻
MSG = 'git=%s ci=%s cfg=%s bundle=%s basis=direct' % (R['head'], R['ci_run_id'], R['cfg_sha'][:12], R['bundle_sha'][:12])


def dep(created, vid='v-new', pct=100):
    return {'created_on': created, 'versions': [{'version_id': vid, 'percentage': pct}]}


def ver(vid='v-new', tag=R['head'][:12], msg=MSG):
    return {'id': vid, 'annotations': {'workers/tag': tag, 'workers/message': msg}}


class VerifyProcedure(unittest.TestCase):
    def run_v(self, deps, vers):
        return m.verify_against_receipt(R, json.dumps(deps), json.dumps(vers))

    def test_before_deploy_current_production_is_refused(self):
        with self.assertRaises(m.Refuse) as cm:
            self.run_v([OLD], [{'id': 'v-old', 'annotations': {'workers/triggered_by': 'version_upload'}}])
        self.assertEqual(str(cm.exception), 'latest_deployment_not_after_preflight')

    def test_expected_after_exec(self):
        r = self.run_v([OLD, dep('2026-09-26T07:10:00.1234567Z')], [ver()])
        self.assertTrue(r['verify'])
        self.assertEqual(r['tag'], 'a8385dc1a536')

    def test_someone_else_deployed_other_bundle(self):
        r = self.run_v([OLD, dep('2026-09-26T07:10:00Z')], [ver(msg=MSG.replace('bundle=' + R['bundle_sha'][:12], 'bundle=000000000000'))])
        self.assertFalse(r['verify'])
        self.assertFalse(r['checks']['bundle'])

    def test_manual_deploy_without_annotation(self):
        r = self.run_v([OLD, dep('2026-09-26T07:10:00Z')], [{'id': 'v-new', 'annotations': {}}])
        self.assertFalse(r['verify'])

    def test_gradual_rollout_is_not_verified(self):
        d = {'created_on': '2026-09-26T07:10:00Z', 'versions': [{'version_id': 'v-new', 'percentage': 50}, {'version_id': 'v-old', 'percentage': 50}]}
        with self.assertRaises(m.Refuse) as cm:
            self.run_v([OLD, d], [ver()])
        self.assertEqual(str(cm.exception), 'deployment_not_single_version')


if __name__ == '__main__':
    unittest.main()
