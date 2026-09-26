import importlib.util
import json
from pathlib import Path
import subprocess
import tempfile
import unittest

spec=importlib.util.spec_from_file_location('quality_gate',Path(__file__).with_name('quality_gate.py'));q=importlib.util.module_from_spec(spec);spec.loader.exec_module(q)
class QualityGate(unittest.TestCase):
 def setUp(self):
  self.tmp=tempfile.TemporaryDirectory();self.root=Path(self.tmp.name);self.write('src/original.ts','export const original = 7;');self.write('intake-beta/public/app.js','const newFeature = 8;');self.manifest={'owner':'team','task_id':'test','acceptance':['Works without external writes'],'reuse':[{'path':'src/original.ts','decision':'extend elsewhere','reason':'Reviewed existing behavior'}],'changed_files':['intake-beta/public/app.js']};self.git('init','-q');self.git('config','user.name','test');self.git('config','user.email','fixture@example.invalid');self.git('add','src');self.git('commit','-qm','base');self.base=self.git('rev-parse','HEAD').strip()
 def tearDown(self):self.tmp.cleanup()
 def git(self,*args):return subprocess.check_output(['git','-C',str(self.root),*args],stderr=subprocess.DEVNULL,text=True)
 def write(self,path,text):p=self.root/path;p.parent.mkdir(parents=True,exist_ok=True);p.write_text(text);return p
 def run_gate(self,base=None):self.write('.quality/change.json',json.dumps(self.manifest));return q.gate(self.root,base=base)
 def rules(self,result):return [x['rule'] for x in result['errors']]
 def test_shared_pattern_union(self):
  examples=['ghu_'+'A'*35,'password="'+'A'*24+'"','AIza'+'A'*30,'sk-ant-'+'A'*30,'ASIA'+'A'*16]
  for secret in examples:
   self.write('intake-beta/public/app.js',secret)
   result=self.run_gate();self.assertIn('secret_pattern_shared',self.rules(result));self.assertNotIn(secret,json.dumps(result))
 def test_definition_missing(self):
  with self.assertRaises(ValueError):q.load_secret_rules(self.root/'missing')
 def test_definition_truncated(self):
  path=self.write('truncated.regex',q.SECRET_RULES[0][1].pattern+'\n')
  with self.assertRaises(ValueError):q.load_secret_rules(path)
 def test_definition_symlink(self):
  target=self.write('target','pattern');link=self.root/'link';link.symlink_to(target)
  with self.assertRaises(ValueError):q.load_secret_rules(link)
 def test_normal(self):self.assertTrue(self.run_gate()['ok'])
 def test_missing_manifest(self):self.assertFalse(q.gate(self.root)['ok'])
 def test_missing_reuse(self):self.manifest['reuse']=[];self.assertIn('manifest_required_reuse',self.rules(self.run_gate()))
 def test_escape(self):self.manifest['changed_files']=['../outside.js'];self.assertIn('changed_path_invalid',self.rules(self.run_gate()))
 def test_symlink_parent(self):outside=self.root/'elsewhere';outside.mkdir();(outside/'x.js').write_text('x');(self.root/'intake-beta/link').symlink_to(outside,target_is_directory=True);self.manifest['changed_files']=['intake-beta/link/x.js'];self.assertIn('changed_path_invalid',self.rules(self.run_gate()))
 def test_copy(self):self.write('intake-beta/public/app.js','export const original = 7;');self.assertIn('normalized_code_clone',self.rules(self.run_gate()))
 def test_whitespace_clone(self):self.write('intake-beta/public/app.js','export\n const original=7 ;');self.assertIn('normalized_code_clone',self.rules(self.run_gate()))
 def test_preexisting_clone_not_new(self):self.write('src/oldcopy.ts','export const original = 7;');self.assertTrue(self.run_gate()['ok'])
 def test_secret_value_not_printed(self):secret='sk_'+'live_'+'A'*24;self.write('intake-beta/public/app.js','const key="'+secret+'";');r=self.run_gate();self.assertIn('secret_pattern_shared',self.rules(r));self.assertNotIn(secret,json.dumps(r))
 def test_secret_file(self):self.write('intake-beta/.env','not-printed');self.manifest['changed_files']=['intake-beta/.env'];self.assertIn('secret_file_not_allowed',self.rules(self.run_gate()))
 def test_tracked_template_allowed_but_scanned(self):
  self.write('.env.example','API_KEY=your-key');self.git('add','.env.example');self.assertTrue(self.run_gate()['ok']);secret='sk_'+'live_'+'B'*24;self.write('.env.example',secret);self.assertIn('secret_pattern_shared',self.rules(self.run_gate()))
 def test_tracked_secret_outside_scope(self):self.write('.env','not-printed');self.git('add','.env');self.assertIn('tracked_secret_file',self.rules(self.run_gate()))
 def test_diff_omission(self):self.manifest['changed_files'].append('.quality/change.json');self.write('intake-beta/other.js','different();');self.assertIn('git_change_missing_from_manifest',self.rules(self.run_gate(self.base)))
 def test_diff_complete(self):self.manifest['changed_files'].append('.quality/change.json');self.assertTrue(self.run_gate(self.base)['ok'])
 def test_deleted_scope_file_rejected(self):self.git('add','intake-beta/public/app.js');self.git('commit','-qm','tracked');base=self.git('rev-parse','HEAD').strip();(self.root/'intake-beta/public/app.js').unlink();self.assertFalse(self.run_gate(base)['ok'])
 def test_absolute_path(self):self.manifest['changed_files']=[str(self.root/'intake-beta/public/app.js')];self.assertFalse(self.run_gate()['ok'])
 def test_empty_base_is_not_a_silent_skip(self):self.manifest['changed_files'].append('.quality/change.json');r=self.run_gate('');self.assertFalse(r['ok']);self.assertIn('base_missing_or_invalid',self.rules(r))
 def test_all_zero_base_from_branch_creation_push_rejected(self):self.manifest['changed_files'].append('.quality/change.json');self.assertIn('base_missing_or_invalid',self.rules(self.run_gate('0'*40)))
 def test_scope(self):self.manifest['changed_files']=['src/original.ts'];self.assertIn('changed_file_outside_initial_scope',self.rules(self.run_gate()))
 def test_fixed_vendor_exclusion(self):self.write('intake-beta/public/qrcode.min.js','export const original = 7;');self.assertTrue(self.run_gate()['ok'])
 def test_no_arbitrary_baseline_exemption(self):self.write('intake-beta/public/app.js','export const original = 7;');self.manifest['baseline_exclusions']=['intake-beta/public/app.js'];self.assertIn('normalized_code_clone',self.rules(self.run_gate()))
if __name__=='__main__':unittest.main()
