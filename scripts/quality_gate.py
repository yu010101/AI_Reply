#!/usr/bin/env python3
"""Deterministic change/reuse/clone/secret gate; complements existing linters.
No network, model, executable project configuration, or baseline exemptions.
"""
import argparse
import hashlib
import json
from pathlib import Path, PurePosixPath
import re
import subprocess

CODE = {'.js','.jsx','.ts','.tsx','.mjs','.cjs','.py','.css','.html'}
# Build products, dependencies and immutable vendor artifacts are not authored code.
EXCLUDED_DIRS = {'node_modules','.git','.next','.open-next','dist','build','coverage','__pycache__','vendor','archive','archives'}
EXCLUDED_FILES = {'intake-beta/public/qrcode.min.js'}  # pinned MIT upstream artifact
ENV_TEMPLATES = {'.env.example','.env.sample','.env.template'}
GOVERNANCE = {'AGENTS.md','CLAUDE.md','CONTRIBUTING.md','package.json','package-lock.json','tsconfig.json','next-env.d.ts','.gitignore','.eslintrc.json','.eslintrc.js','eslint.config.mjs','jest.config.js','scripts/quality_gate.py','scripts/test_quality_gate.py'}
SECRET_DEFINITION_SHA256 = "582affe53ff190b3e3b42e759638baaca0ad2b4287e430c50fa5e04ee5d1876a"

def load_secret_rules(path=None):
 path=Path(path) if path is not None else Path(__file__).resolve().parent.parent/'.quality/secret_patterns.regex'
 if path.is_symlink() or not path.is_file():raise ValueError('secret_definition_missing_or_unsafe')
 with path.open('rb') as f:raw=f.read(262145)
 if len(raw)>262144 or hashlib.sha256(raw).hexdigest()!=SECRET_DEFINITION_SHA256:raise ValueError('secret_definition_sha_mismatch')
 lines=raw.decode('utf-8').splitlines()
 if not lines or any(not line.strip() for line in lines):raise ValueError('secret_definition_empty')
 return [('shared',re.compile(line)) for line in lines]

SECRET_RULES = load_secret_rules()

def safe_path(root, raw, file_only=True):
 if not isinstance(raw,str) or not raw or '\\' in raw or '\x00' in raw:raise ValueError('invalid_relative_path')
 p=PurePosixPath(raw)
 if p.is_absolute() or '..' in p.parts or str(p)!=raw or raw=='.':raise ValueError('unsafe_relative_path')
 target=root
 for part in p.parts:
  target=target/part
  if target.is_symlink():raise ValueError('symlink_not_allowed')
 if not target.exists() or (file_only and not target.is_file()):raise ValueError('missing_path')
 return target

def in_scope(path):
 return path.startswith(('intake-beta/','.quality/','.github/workflows/')) or path in GOVERNANCE or path in ENV_TEMPLATES

def excluded(path):
 return bool(set(PurePosixPath(path).parts)&EXCLUDED_DIRS) or path in EXCLUDED_FILES

def secret_file(path):
 p=PurePosixPath(path); name=p.name.lower()
 return (name=='.env' or (name.startswith('.env.') and name not in ENV_TEMPLATES) or name in {'credentials.json','service-account.json','id_rsa','id_ed25519','auth.json'} or p.suffix.lower() in {'.pem','.key','.p12','.pfx'} or any(x in {'.ssh','.aws'} for x in p.parts))

def git(root,args):
 p=subprocess.run(['git','-C',str(root),*args],stdout=subprocess.PIPE,stderr=subprocess.PIPE,timeout=20)
 if p.returncode:raise ValueError('git_query_failed')
 return p.stdout

def actual_changes(root,base):
 if not re.fullmatch(r'[0-9a-fA-F]{40}',base):raise ValueError('base_must_be_full_git_sha')
 git(root,['cat-file','-e',base+'^{commit}'])
 # Includes staged/unstaged edits against base, and newly created files.
 paths=git(root,['diff','--name-only','-z',base,'--'])+git(root,['ls-files','--others','--exclude-standard','-z'])
 return {s.decode('utf-8') for s in paths.split(b'\0') if s}

def gate(root,manifest='.quality/change.json',base=None):
 root=Path(root).resolve();errors=[];changed=[];scanned=0;tracked_templates=[]
 def fail(rule,path=None):
  errors.append({'rule':rule,**({'path':path} if path is not None else {})})
 try:
  mp=safe_path(root,manifest);data=json.loads(mp.read_text())
  if not isinstance(data,dict):raise ValueError('manifest_not_object')
 except (ValueError,OSError,UnicodeError):return {'ok':False,'errors':[{'rule':'manifest_missing_or_invalid'}]}
 for key in ('owner','task_id'):
  if not isinstance(data.get(key),str) or not data[key].strip():fail('manifest_required_'+key)
 ac=data.get('acceptance')
 if not isinstance(ac,list) or not ac or any(not isinstance(x,str) or not x.strip() for x in ac):fail('manifest_required_acceptance')
 reuse=data.get('reuse')
 if not isinstance(reuse,list) or not reuse:fail('manifest_required_reuse')
 else:
  for r in reuse:
   if not isinstance(r,dict) or any(not isinstance(r.get(k),str) or not r[k].strip() for k in ('path','decision','reason')):fail('invalid_reuse_evidence');continue
   try:safe_path(root,r['path'],file_only=False)
   except ValueError:fail('reuse_path_invalid')
 raw=data.get('changed_files')
 if not isinstance(raw,list) or not raw or any(not isinstance(x,str) for x in raw):fail('manifest_required_changed_files')
 else:
  if len(set(raw))!=len(raw):fail('duplicate_changed_file_entry')
  for path in raw:
   try:safe_path(root,path)
   except ValueError:fail('changed_path_invalid');continue
   if not in_scope(path):fail('changed_file_outside_initial_scope',path)
   changed.append(path)
 if base is not None:
  # 空文字・全ゼロ(新規ブランチの push)・非SHAは「照合できない」であって「照合不要」ではない。
  if not re.fullmatch(r'[0-9a-fA-F]{40}',base or '') or set(base)=={'0'}:fail('base_missing_or_invalid')
 if base and not any(e.get('rule')=='base_missing_or_invalid' for e in errors):
  try:
   actual=actual_changes(root,base)
   for path in sorted(actual):
    if in_scope(path) and path not in changed:fail('git_change_missing_from_manifest',path)
   # A secret can never hide behind the initial feature scope.
   for path in sorted(actual):
    if secret_file(path):fail('secret_file_in_git_changes',path)
  except (ValueError,OSError,UnicodeError,subprocess.TimeoutExpired):fail('git_base_check_failed')
 try:
  for rawpath in git(root,['ls-files','-z']).split(b'\0'):
   if rawpath:
    tracked=rawpath.decode()
    if secret_file(tracked):fail('tracked_secret_file',tracked)
    elif PurePosixPath(tracked).name in ENV_TEMPLATES:tracked_templates.append(tracked)
 except (ValueError,OSError,UnicodeError,subprocess.TimeoutExpired):fail('git_tracked_files_unavailable')
 for path in sorted(set(changed+tracked_templates)):
  if secret_file(path):fail('secret_file_not_allowed',path);continue
  try:
   p=safe_path(root,path)
   if p.stat().st_size>4*1024*1024:fail('changed_file_too_large_for_secret_scan',path);continue
   rawbytes=p.read_bytes()
   # Binary assets have no text credential scan; secret file names still fail.
   text=rawbytes.decode('utf-8',errors='replace')
   for name,pattern in SECRET_RULES:
    if pattern.search(text):fail('secret_pattern_'+name,path)
  except (ValueError,OSError):fail('changed_file_unreadable',path)
 candidates=set(changed)
 for name in ('src','intake-beta'):
  folder=root/name
  if folder.exists():
   for p in folder.rglob('*'):
    rel=p.relative_to(root).as_posix()
    if p.is_file() and not excluded(rel):candidates.add(rel)
 groups={}
 for path in sorted(candidates):
  if excluded(path) or PurePosixPath(path).suffix not in CODE:continue
  try:
   p=safe_path(root,path)
   if p.stat().st_size>4*1024*1024:fail('code_too_large_to_compare',path);continue
   text=p.read_text();normalized=re.sub(r'\s+','',text)
   if not normalized:continue
   digest=hashlib.sha256(normalized.encode()).hexdigest();groups.setdefault(digest,[]).append(path);scanned+=1
  except (ValueError,OSError,UnicodeError):fail('code_scan_unreadable',path)
 for paths in groups.values():
  if len(paths)>1 and set(paths)&set(changed):errors.append({'rule':'normalized_code_clone','paths':paths})
 return {'ok':not errors,'errors':errors,'changed_files_count':len(changed),'code_files_scanned':scanned,'base_checked':base is not None,'clone_scope':['src','intake-beta','manifest changed files'],'fixed_exclusions':{'directories':sorted(EXCLUDED_DIRS),'files':sorted(EXCLUDED_FILES)},'secret_detection':'limited patterns; no secret values printed; not a guarantee of all secret detection','lint_replacement':False}

def main():
 ap=argparse.ArgumentParser();ap.add_argument('--root',default=str(Path(__file__).resolve().parents[1]));ap.add_argument('--manifest',default='.quality/change.json');ap.add_argument('--base');a=ap.parse_args();result=gate(a.root,a.manifest,a.base);print(json.dumps(result,ensure_ascii=False,indent=2));return 0 if result['ok'] else 1
if __name__=='__main__':raise SystemExit(main())
