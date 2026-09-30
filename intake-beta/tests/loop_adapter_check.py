"""Feeds the real GET /api/loop-events output (tests/loop_sample.mjs) to Radineer/tickets tools/loop/events.py
(read_product_events, unchanged) and checks that no row is rejected, that the fields survive, and that reading the same
output again yields the same event ids (no double counting). LOOP_TOOLS points at the tickets checkout's tools/ directory.
Prints a JSON summary; exit 0 on success. Read-only: no network, no GitHub, no state file.
"""
import io,json,os,subprocess,sys
from pathlib import Path
R=Path(__file__).resolve().parents[1]
TOOLS=Path(os.environ.get('LOOP_TOOLS',Path.home()/'tasks/feedback-loop/tickets-wt/tools'))
def main():
 if not (TOOLS/'loop'/'events.py').is_file():print(json.dumps({'skipped':'events.py not found at '+str(TOOLS)}));return 2
 sys.dont_write_bytecode=True;sys.path.insert(0,str(TOOLS))
 from loop import events
 out=subprocess.run(['node',str(R/'tests'/'loop_sample.mjs')],capture_output=True,text=True,check=True).stdout
 rows=json.loads(out)
 evs,rejects=events.read_product_events(io.StringIO(out))
 assert rejects==[],rejects
 assert len(evs)==len(rows)==5,(len(evs),len(rows))
 for row,ev in zip(rows,evs):
  assert ev['fp_key']==json.dumps(['hitokoto-beta',row['kind'],row['fingerprint']],ensure_ascii=False,separators=(',',':')),ev['fp_key']
  assert (ev['count'],ev['screen'],ev['version'],ev['kind'])==(row['count'],row['screen'],row['version'],row['kind'])
  assert ev['summary'] is None and ev['product_hint']=={'slug':'hitokoto-beta'}
  assert ev['impact']==('failure' if row['kind']=='error' else 'request')
 again,_=events.read_product_events(io.StringIO(out))
 assert [e['event_id'] for e in evs]==[e['event_id'] for e in again],'same output, same event ids'
 flat=json.dumps(evs,ensure_ascii=False)
 for secret in ('owner@','example.com','192.0.2','架空デモ','model offline','印刷','料金','MASKED'):assert secret not in flat,secret
 print(json.dumps({'events_py':str(TOOLS/'loop'/'events.py'),'get_rows':rows,'rejects':rejects,
   'events':[{k:e[k] for k in ('event_id','fp_key','kind','count','first_seen','last_seen','impact','screen','version','summary')} for e in evs]},ensure_ascii=False,indent=1))
 return 0
if __name__=='__main__':raise SystemExit(main())
