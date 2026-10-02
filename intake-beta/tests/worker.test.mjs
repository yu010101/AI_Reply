import test, {beforeEach, afterEach} from 'node:test';
const realNow=Date.now;
beforeEach(()=>{Date.now=()=>Date.parse('2026-09-25T00:00:00Z');});
afterEach(()=>{Date.now=realNow;});
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import worker, {boundedJSON,validInput,validEvent,FUNNEL_EVENTS,EVENT_DAILY_CAP,AI_UNTIL,validTrial,TRIAL_LIMITS,TRIAL_CAPS,trialNotice,validLoopEvent,maskSecrets,tokenMatches,loopEventOut,LOOP_VERSION,LOOP_ERROR_TYPES,LOOP_CAPS,LOOP_TEXT_MAX,validPickStat,pickStatRows,PICK_CAPS,TIME_BUCKETS,REPORT_MIN,REPORT_DAYS,REPORT_STEPS,STORE_CAPS,NOTICE_MAX,validNotice,medianFromBuckets,classifyItems,validClassify,purgeExpired,purgePlan,monthsBefore,PURGE_LIMIT,PURGE_CRON,RETENTION_MONTHS} from '../worker.mjs';
import {createHash} from 'node:crypto';
const logs=[];const realWarn=console.warn,realError=console.error;
beforeEach(()=>{logs.length=0;console.warn=(...a)=>logs.push(['warn',...a]);console.error=(...a)=>logs.push(['error',...a]);});
afterEach(()=>{console.warn=realWarn;console.error=realError;});
const origin='https://hitokoto.example';
const day=new Date().toISOString().slice(0,10);
class Quota {
  constructor(initial={}) {this.rows=new Map(Object.entries(initial));this.bindings=[];}
  prepare(sql) {const self=this;return {bind(...values){self.bindings.push(values);return {
    async all(){return {results:values.filter(k=>self.rows.has(k)).map(key=>({key,count:self.rows.get(key)}))};},
    async first(){assert.match(sql,/ON CONFLICT\(key\) DO UPDATE SET count=count\+1 WHERE count < \?/);const [key,limit]=values;const n=self.rows.get(key)||0;if(n>=limit)return null;self.rows.set(key,n+1);return {count:n+1};},
    async run(){if(/^UPDATE quota SET count=MAX\(count-1,0\) WHERE key=\?$/.test(sql)){const [key]=values;self.rows.set(key,Math.max((self.rows.get(key)||0)-1,0));return {success:true};}assert.match(sql,/DELETE FROM quota/);return {success:true};}
  };}};}
}
// Real SQLite (D1 is SQLite) so the reserve/release/cleanup SQL is executed, not re-implemented by the mock.
async function sqliteQuota() {
  const emit=process.emitWarning;process.emitWarning=(w,...rest)=>String(w).includes('SQLite')?undefined:emit.call(process,w,...rest);
  let mod;try{mod=await import('node:sqlite');}catch{return null;}finally{process.emitWarning=emit;}
  const db=new mod.DatabaseSync(':memory:');db.exec(readFileSync(new URL('../schema.sql',import.meta.url),'utf8'));
  return {db,rows(){return Object.fromEntries(db.prepare('SELECT key,count FROM quota ORDER BY key').all().map(r=>[r.key,r.count]));},
    async batch(list){const out=[];for(const st of list)out.push(await st.run());return out;},
    prepare(sql){const st=db.prepare(sql);return {bind(...v){return {async first(){return st.get(...v)??null;},async all(){return {results:st.all(...v)};},async run(){const r=st.run(...v);return {success:true,meta:{changes:Number(r.changes)}};}};}};}};
}
function setup(initial={}) {const db=new Quota(initial),calls=[];return {db,calls,env:{QUOTA:db,QUOTA_SALT:'test-only-salt',AI:{async run(model,input){calls.push({model,input});return {response:JSON.parse(input.messages[1].content).text+'。'};}}}};}
// Simulates the read-then-write window: the SELECT pre-check reports no ceiling while reserve() sees the real rows.
function staleRead(s) {const prep=s.db.prepare.bind(s.db);s.db.prepare=sql=>sql.startsWith('SELECT')?{bind(){return {async all(){return {results:[]};}};}}:prep(sql);return s;}
function request(data={text:'接客がよかった',storeName:'架空デモ'},extra={}) {return new Request(origin+'/api/draft',{method:'POST',headers:{origin,'content-type':'application/json','cf-connecting-ip':'192.0.2.4',...extra},body:JSON.stringify(data)});}
async function invoke(req,env) {const pending=[];const r=await worker.fetch(req,env,{waitUntil(p){pending.push(p);}});await Promise.allSettled(pending);return {status:r.status,body:await r.json()};}
test('valid input limits and control characters',()=>{for(const v of [null,{}, {text:' ',storeName:'s'},{text:'a'.repeat(601),storeName:'s'},{text:'x',storeName:'a'.repeat(81)},{text:'bad\u0000',storeName:'s'}])assert.ok(!validInput(v));assert.ok(validInput({text:'不満\nもある',storeName:'s'}));});
test('bounded body rejects invalid UTF8 and oversize streamed bytes',async()=>{await assert.rejects(boundedJSON(new Request(origin,{method:'POST',body:new Uint8Array([255])})));await assert.rejects(boundedJSON(new Request(origin,{method:'POST',body:' '.repeat(4097)})),/large/);});
test('origin, method, MIME, JSON rejected before AI',async()=>{const s=setup();assert.equal((await invoke(request(undefined,{origin:'https://evil.example'}),s.env)).status,403);assert.equal((await invoke(request(undefined,{'content-type':'text/plain'}),s.env)).status,415);assert.equal((await invoke(new Request(origin+'/api/draft'),s.env)).status,405);assert.equal((await invoke(new Request(origin+'/api/draft',{method:'POST',headers:{origin,'content-type':'application/json'},body:'{'}),s.env)).status,400);assert.equal(s.calls.length,0);});
test('missing bindings and IP preserve original trimmed feedback',async()=>{for(const key of ['AI','QUOTA','QUOTA_SALT']){const s=setup();delete s.env[key];assert.deepEqual((await invoke(request({text:'  不満があります  ',storeName:'s'}),s.env)).body,{draft:'不満があります',mode:'fallback'});assert.equal(s.calls.length,0);}const s=setup();const req=request();req.headers.delete('cf-connecting-ip');assert.equal((await invoke(req,s.env)).body.mode,'fallback');assert.equal(s.calls.length,0);});
test('same IP has max 10 AI attempts under concurrency',async()=>{const s=setup();const responses=await Promise.all(Array.from({length:25},()=>invoke(request(),s.env)));assert.equal(s.calls.length,10);assert.equal(responses.filter(r=>r.body.mode==='ai').length,10);assert.equal(s.db.rows.get('total'),10);});
test('global daily and lifetime ceilings hold with distinct IPs',async()=>{for(const [key,ceiling] of [['day:'+day,100],['total',1000]]){const s=setup({[key]:ceiling-2});await Promise.all(Array.from({length:15},(_,i)=>invoke(request(undefined,{'cf-connecting-ip':'192.0.2.'+(i+10)}),s.env)));assert.equal(s.calls.length,2);assert.equal(s.db.rows.get(key),ceiling);}});
test('D1 outage prevents AI and stores no raw personal input',async()=>{const s=setup();await invoke(request(),s.env);assert.ok(!JSON.stringify(s.db.bindings).includes('192.0.2.4'));assert.ok(!JSON.stringify(s.db.bindings).includes('架空デモ'));assert.ok(!JSON.stringify(s.db.bindings).includes('接客'));s.env.QUOTA={prepare(){throw Error('offline');}};assert.equal((await invoke(request(),s.env)).body.mode,'fallback');assert.equal(s.calls.length,1);});
test('AI failures and unsafe output preserve feedback',async()=>{for(const output of ['', 'https://bad.example', '5つ星です','a'.repeat(801),null]){const s=setup();s.env.AI.run=async()=>({response:output});assert.deepEqual((await invoke(request({text:'不満です',storeName:'s'}),s.env)).body,{draft:'不満です',mode:'fallback'});}const s=setup();s.env.AI.run=async()=>{throw Error('model offline');};assert.equal((await invoke(request(),s.env)).body.mode,'fallback');});
test('AI timeout returns original at 10 seconds (mock clock)',async()=>{const s=setup();s.env.AI.run=()=>new Promise(()=>{});const old=globalThis.setTimeout;let timeout;globalThis.setTimeout=(fn,ms)=>{if(ms!==10000)return old(fn,ms);timeout=ms;queueMicrotask(fn);return 0;};try{assert.equal((await invoke(request(),s.env)).body.mode,'fallback');assert.equal(timeout,10000);}finally{globalThis.setTimeout=old;}});
test('API never sends a browser fetch or Google POST',async()=>{const old=globalThis.fetch;globalThis.fetch=()=>{throw Error('Unexpected network');};try{const s=setup();assert.equal((await invoke(request(),s.env)).body.mode,'ai');assert.equal(s.calls.length,1);}finally{globalThis.fetch=old;}});
test('static response has restrictive security policy',async()=>{const r=await worker.fetch(new Request(origin),{ASSETS:{fetch:async()=>new Response('<h1>demo</h1>')}},{});assert.match(r.headers.get('content-security-policy'),/connect-src 'self'/);assert.match(r.headers.get('content-security-policy'),/frame-ancestors 'none'/);assert.equal(r.headers.get('referrer-policy'),'no-referrer');});
test('meaning reversal and invented recommendation must fall back',async()=>{for(const output of ['最高でした。また来たい','不満です。また来ます','満足です']){const s=setup();s.env.AI.run=async()=>({response:output});assert.deepEqual((await invoke(request({text:'不満です',storeName:'s'}),s.env)).body,{draft:'不満です',mode:'fallback'});}});
test('punctuation and whitespace only remain eligible',async()=>{const s=setup();s.env.AI.run=async()=>({response:'「不満です。改善してほしい。」'});assert.deepEqual((await invoke(request({text:'不満です 改善してほしい',storeName:'s'}),s.env)).body,{draft:'「不満です。改善してほしい。」',mode:'ai'});});
test('unterminated body is bounded by a read deadline',async()=>{const old=globalThis.setTimeout;let timeout,cancelled=false;globalThis.setTimeout=(fn,ms)=>{timeout=ms;queueMicrotask(fn);return 0;};try{const body=new ReadableStream({start(c){c.enqueue(new TextEncoder().encode('{'));},cancel(){cancelled=true;}});await assert.rejects(boundedJSON(new Request(origin,{method:'POST',body,duplex:'half'})));assert.equal(timeout,3000);assert.equal(cancelled,true);}finally{globalThis.setTimeout=old;}});

test("expiry stops AI even with all bindings available",async()=>{Date.now=()=>AI_UNTIL;const s=setup();assert.equal((await invoke(request(),s.env)).body.mode,"fallback");assert.equal(s.calls.length,0);});
test('AI stays on until the provisional end (2027-03-31 JST) and past the old 2026-10-09 stop',async()=>{assert.equal(AI_UNTIL,Date.parse('2027-03-31T15:00:00Z'));for(const at of ['2026-10-09T00:00:00Z','2027-03-31T14:59:59Z']){Date.now=()=>Date.parse(at);const s=setup();assert.equal((await invoke(request(),s.env)).body.mode,'ai',at);assert.equal(s.calls.length,1);}});

test('refused reservation releases rows already held: total and ip do not drain when day is exhausted',async()=>{const s=staleRead(setup({['day:'+day]:100,total:500}));await Promise.all(Array.from({length:20},(_,i)=>invoke(request(undefined,{'cf-connecting-ip':'192.0.2.'+(i+50)}),s.env)));assert.equal(s.calls.length,0);assert.equal(s.db.rows.get('total'),500);assert.equal(s.db.rows.get('day:'+day),100);for(const [key,count] of s.db.rows)if(key.startsWith('ip:'))assert.equal(count,0,key);});
test('refused total releases the ip row so the user keeps their attempts',async()=>{const s=staleRead(setup({total:1000}));assert.equal((await invoke(request(),s.env)).body.mode,'fallback');assert.equal(s.calls.length,0);for(const [key,count] of s.db.rows)if(key.startsWith('ip:'))assert.equal(count,0,key);assert.equal(s.db.rows.get('total'),1000);});
test('rejected model output keeps quota consumed (no refund after the model ran)',async()=>{const s=setup();s.env.AI.run=async()=>({response:'https://bad.example'});assert.equal((await invoke(request(),s.env)).body.mode,'fallback');assert.equal(s.db.rows.get('total'),1);assert.equal(s.db.rows.get('day:'+day),1);});
test('reserve, release and cleanup SQL behave on real SQLite',async(t)=>{const q=await sqliteQuota();if(!q)return t.skip('node:sqlite unavailable');const s=setup();s.env.QUOTA=q;q.db.exec("INSERT INTO quota VALUES ('day:"+day+"',100),('day:2026-09-20',7),('ip:2026-09-20:old',3),('total',40)");
  assert.equal((await invoke(request(),s.env)).body.mode,'fallback');assert.equal(s.calls.length,0);let rows=q.rows();assert.equal(rows.total,40,'total released after day refused');assert.equal(Object.entries(rows).filter(([k,v])=>k.startsWith('ip:'+day)&&v!==0).length,0,'ip row released');
  q.db.exec("UPDATE quota SET count=0 WHERE key='day:"+day+"'");assert.equal((await invoke(request(),s.env)).body.mode,'ai');rows=q.rows();assert.equal(rows.total,41);assert.equal(rows['day:'+day],1);assert.equal(rows['day:2026-09-20'],undefined,'stale day row purged');assert.equal(rows['ip:2026-09-20:old'],undefined,'stale ip row purged');assert.equal(Object.keys(rows).filter(k=>k.startsWith('ip:'+day)).length,1,'today ip row kept');});
test('ALLOWED_ORIGINS list replaces the same-origin default',async()=>{const s=setup();s.env.ALLOWED_ORIGINS='https://kuchikomi.example, https://hitokoto.example';assert.equal((await invoke(request(undefined,{origin:'https://kuchikomi.example'}),s.env)).status,200);assert.equal((await invoke(request(),s.env)).status,200);assert.equal((await invoke(request(undefined,{origin:'https://evil.example'}),s.env)).status,403);const req=request();req.headers.delete('origin');assert.equal((await invoke(req,s.env)).status,403);s.env.ALLOWED_ORIGINS='https://other.example';assert.equal((await invoke(request(),s.env)).status,403,'url.origin is not implied once the list is set');s.env.ALLOWED_ORIGINS='';assert.equal((await invoke(request(),s.env)).status,200,'empty list falls back to url.origin');});
test('markup is refused before AI; prose punctuation is returned verbatim under the plain-text contract',async()=>{for(const text of ['<b>最高</b>','a<script>x</script>','x > y','<'])assert.equal((await invoke(request({text,storeName:'s'}),setup().env)).status,400,text);let s=setup();assert.equal((await invoke(request({text:'ok',storeName:'<s>'}),s.env)).status,400);assert.equal(s.calls.length,0);s=setup();delete s.env.AI;const text=`A&W "最高" 'good' &amp;`;assert.deepEqual((await invoke(request({text,storeName:'s'}),s.env)).body,{draft:text,mode:'fallback'});const app=readFileSync(new URL('../public/app.js',import.meta.url),'utf8');assert.ok(app.includes("function showResult(text,note){$('draft-text').value=text;")&&app.includes('showResult(draft,'),'client renders draft through textarea.value');assert.ok(!/innerHTML\s*=[^;]*(draft|cand|tidied)/.test(app),'client never assigns draft or candidates to innerHTML');assert.ok(!/insertAdjacentHTML|outerHTML\s*=/.test(app));});
test('bidi, zero-width, separators, C1, DEL, BOM and lone surrogates are refused; emoji sequences and newlines pass',()=>{for(const bad of ['\u{202e}','\u{200b}','\u{200c}','\u{200e}','\u{202a}','\u{2060}','\u{2064}','\u{2028}','\u{2029}','\u{7f}','\u{85}','\u{9f}','\u{feff}','\ud800','\udfff'])assert.ok(!validInput({text:'最高でした'+bad+'worst',storeName:'s'}),JSON.stringify(bad));assert.ok(!validInput({text:'ok',storeName:'x\u{202e}y'}));for(const good of ['😀','👨\u{200d}👩\u{200d}👧','❤\u{fe0f}','\t','\n','\r\n','＜＞＆','A&W','"x" \'y\''])assert.ok(validInput({text:'最高'+good+'でした',storeName:'s'}),JSON.stringify(good));});
test('failures are logged with reason codes only, never body or IP',async()=>{const s=setup();s.env.QUOTA={prepare(){throw Error('D1_ERROR: offline 192.0.2.4');}};await invoke(request({text:'秘密の本文',storeName:'架空デモ'}),s.env);const err=logs.filter(l=>l[0]==='error');assert.equal(err.length,1);assert.equal(err[0][1],'draft_fallback');assert.equal(err[0][2],'error');assert.equal(err[0][3],'Error');assert.ok(!JSON.stringify(logs).includes('192.0.2.4')&&!JSON.stringify(logs).includes('D1_ERROR'),'message must not be logged');const t=setup();t.env.AI.run=async()=>{throw Error('model offline');};await invoke(request(),t.env);assert.equal(logs.filter(l=>l[0]==='error').length,2);const u=setup();u.env.AI.run=async()=>({response:'5つ星です'});await invoke(request({text:'不満です',storeName:'s'}),u.env);assert.deepEqual(logs.at(-1),['warn','draft_fallback','ai_rejected_number','']);const v=setup({total:1000});await invoke(request(),v.env);assert.deepEqual(logs.at(-1),['warn','draft_fallback','ceiling','']);const v2=staleRead(setup({total:1000}));await invoke(request(),v2.env);assert.deepEqual(logs.at(-1),['warn','draft_fallback','quota_total','']);const w=setup();delete w.env.AI;await invoke(request(),w.env);assert.deepEqual(logs.at(-1),['warn','draft_fallback','bindings','']);const flat=JSON.stringify(logs.filter(l=>l[2]!=='error'));for(const secret of ['秘密の本文','架空デモ','接客','192.0.2.4'])assert.ok(!flat.includes(secret),secret);logs.length=0;const x=setup();await invoke(request(),x.env);assert.equal(logs.length,0,'success path logs nothing');});


// instruction-025 A: anonymous funnel counts
function eventRequest(body={event:'view'},extra={}) {return new Request(origin+'/api/event',{method:'POST',headers:{origin,'content-type':'application/json','cf-connecting-ip':'192.0.2.4',...extra},body:typeof body==='string'?body:JSON.stringify(body)});}
test('event: each allowed step adds one to ev:<day>:<step> only, and never touches AI quota rows',async()=>{const s=setup({total:7});for(const ev of FUNNEL_EVENTS){const r=await invoke(eventRequest({event:ev}),s.env);assert.equal(r.status,200);assert.deepEqual(r.body,{recorded:true});}
  for(const ev of FUNNEL_EVENTS)assert.equal(s.db.rows.get('ev:'+day+':'+ev),1,ev);assert.equal(s.db.rows.get('total'),7);assert.deepEqual([...s.db.rows.keys()].filter(k=>!k.startsWith('ev:')),['total']);assert.equal(s.calls.length,0);
  for(const b of s.db.bindings)for(const v of b)assert.ok(!String(v).includes('192.0.2.4'),'ip must not be bound');});
test('event: unknown step, extra keys, arrays, text and store names are refused and nothing is stored',async()=>{const s=setup();for(const body of [{event:'post'},{event:'view',storeName:'架空デモ'},{event:'view',text:'本文'},['view'],{},'"view"','{',{event:'VIEW'}]){const r=await invoke(eventRequest(body),s.env);assert.equal(r.status,400,JSON.stringify(body));}assert.equal(s.db.rows.size,0);assert.ok(!validEvent(null));assert.ok(validEvent({event:'direct'}));});
test('event: same origin, POST and JSON gates as /api/draft',async()=>{const s=setup();assert.equal((await invoke(eventRequest(undefined,{origin:'https://evil.example'}),s.env)).status,403);assert.equal((await invoke(eventRequest(undefined,{'content-type':'text/plain'}),s.env)).status,415);assert.equal((await invoke(new Request(origin+'/api/event'),s.env)).status,405);assert.equal((await invoke(eventRequest(' '.repeat(4097)),s.env)).status,413);assert.equal(s.db.rows.size,0);});
test('event: daily cap per step and missing D1 binding answer recorded:false without error',async()=>{const s=setup({['ev:'+day+':copy']:EVENT_DAILY_CAP-1});assert.deepEqual((await invoke(eventRequest({event:'copy'}),s.env)).body,{recorded:true});assert.deepEqual((await invoke(eventRequest({event:'copy'}),s.env)).body,{recorded:false});assert.equal(s.db.rows.get('ev:'+day+':copy'),EVENT_DAILY_CAP);
  const n=setup();delete n.env.QUOTA;const r=await invoke(eventRequest(),n.env);assert.equal(r.status,200);assert.deepEqual(r.body,{recorded:false});
  const e=setup();e.env.QUOTA={prepare(){throw Error('D1_ERROR: offline 192.0.2.4');}};assert.deepEqual((await invoke(eventRequest(),e.env)).body,{recorded:false});const err=logs.filter(l=>l[0]==='error');assert.equal(err.length,1);assert.deepEqual(err[0].slice(1),['event_error','Error']);});
test('event rows survive the 3-day draft cleanup on real SQLite',async(t)=>{const q=await sqliteQuota();if(!q)return t.skip('node:sqlite unavailable');const s=setup();s.env.QUOTA=q;q.db.exec("INSERT INTO quota VALUES ('ev:2026-09-01:view',12),('day:2026-09-01',3)");
  assert.deepEqual((await invoke(eventRequest({event:'google'}),s.env)).body,{recorded:true});assert.equal((await invoke(request(),s.env)).body.mode,'ai');const rows=q.rows();assert.equal(rows['ev:2026-09-01:view'],12);assert.equal(rows['ev:'+day+':google'],1);assert.equal(rows['day:2026-09-01'],undefined);assert.equal(rows.total,1);});

// LP 試用店舗募集: POST /api/trial (4 fields -> D1 trial_applications, rate limited through quota rows)
const trialOk={storeName:'架空の喫茶店',name:'山田 花子',contact:'owner@example.com',message:'レジ横に置いてみたいです。\n平日昼が中心です。'};
function trialRequest(body=trialOk,extra={}) {return new Request(origin+'/api/trial',{method:'POST',headers:{origin,'content-type':'application/json','cf-connecting-ip':'192.0.2.9',...extra},body:typeof body==='string'?body:JSON.stringify(body)});}
async function trialEnv(t){const q=await sqliteQuota();if(!q){t.skip('node:sqlite unavailable');return null;}return {q,env:{QUOTA:q,QUOTA_SALT:'test-only-salt'}};}
// distinct content per call: the same four fields within TRIAL_DEDUP_MS are one application (see the dedup test below)
const trialNo=i=>({...trialOk,message:trialOk.message+' #'+i});
const trialRows=q=>q.db.prepare('SELECT store_name,contact_name,contact,message,status,created_at FROM trial_applications ORDER BY id').all().map(r=>({...r}));
test('trial: valid application is stored with the four fields only, and no IP anywhere in D1',async(t)=>{const s=await trialEnv(t);if(!s)return;
  const r=await invoke(trialRequest(),s.env);assert.equal(r.status,200);assert.deepEqual(r.body,{ok:true});
  const rows=trialRows(s.q);assert.equal(rows.length,1);assert.deepEqual({...rows[0],created_at:undefined},{store_name:trialOk.storeName,contact_name:trialOk.name,contact:trialOk.contact,message:trialOk.message,status:'new',created_at:undefined});assert.match(rows[0].created_at,/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
  const dump=JSON.stringify(s.q.db.prepare('SELECT * FROM quota').all())+JSON.stringify(s.q.db.prepare('SELECT * FROM trial_applications').all());assert.ok(!dump.includes('192.0.2.9'));
  assert.equal(s.q.rows()['trday:'+day],1);assert.equal(s.q.rows().trtotal,1);assert.equal(s.q.rows().total,undefined,'AI quota untouched');
  const phone=await invoke(trialRequest({...trialOk,contact:'090-1234-5678',message:''},{'cf-connecting-ip':'192.0.2.10'}),s.env);assert.equal(phone.status,200);
  const wide=await invoke(trialRequest({...trialOk,contact:'０９０ー１２３４ー５６７８'},{'cf-connecting-ip':'192.0.2.11'}),s.env);assert.equal(wide.status,200,'full-width phone number is accepted');});
test('trial: invalid fields are refused with 400 and nothing is stored',async(t)=>{const s=await trialEnv(t);if(!s)return;
  const bad=[{},[],null,'"x"',{...trialOk,extra:'x'},{storeName:'a',name:'b',contact:'c@example.com'},{...trialOk,storeName:''},{...trialOk,name:'   '},{...trialOk,storeName:'a'.repeat(TRIAL_LIMITS.storeName+1)},{...trialOk,name:'a'.repeat(TRIAL_LIMITS.name+1)},{...trialOk,contact:'a@b.'+'c'.repeat(TRIAL_LIMITS.contact)},{...trialOk,message:'a'.repeat(TRIAL_LIMITS.message+1)},
    {...trialOk,contact:'電話してください'},{...trialOk,contact:'12345'},{...trialOk,name:'山田\n花子'},{...trialOk,storeName:'<b>店</b>'},{...trialOk,message:'hi\u202e'},{...trialOk,contact:7},{...trialOk,website:3}];
  for(const body of bad){const r=await invoke(trialRequest(body),s.env);assert.equal(r.status,400,JSON.stringify(body));assert.deepEqual(r.body,{error:'invalid_input'});}
  assert.equal(trialRows(s.q).length,0);assert.deepEqual(s.q.rows(),{});
  assert.equal((await invoke(trialRequest(JSON.stringify({...trialOk,message:'a'.repeat(5000)})),s.env)).status,413);});
test('trial: same sender is limited per day, other senders continue, daily and lifetime caps hold',async(t)=>{const s=await trialEnv(t);if(!s)return;
  const codes=[];for(let i=0;i<TRIAL_CAPS.perSenderDay+2;i++)codes.push((await invoke(trialRequest(trialNo(i)),s.env)).status);
  assert.deepEqual(codes,[...Array(TRIAL_CAPS.perSenderDay).fill(200),429,429]);assert.equal(trialRows(s.q).length,TRIAL_CAPS.perSenderDay);
  assert.equal((await invoke(trialRequest(trialNo(10),{'cf-connecting-ip':'198.51.100.7'}),s.env)).status,200);
  assert.equal(s.q.rows()['trday:'+day],TRIAL_CAPS.perSenderDay+1,'refused attempts released the day row');
  s.q.db.exec("UPDATE quota SET count="+TRIAL_CAPS.day+" WHERE key='trday:"+day+"'");const r=await invoke(trialRequest(trialNo(11),{'cf-connecting-ip':'198.51.100.8'}),s.env);assert.equal(r.status,429);assert.deepEqual(r.body,{error:'rate_limited'});
  assert.equal(Object.entries(s.q.rows()).filter(([k,v])=>k.startsWith('trip:')&&v===0).length,1,'sender row released when the day cap refused');
  s.q.db.exec("UPDATE quota SET count=0 WHERE key='trday:"+day+"'; UPDATE quota SET count="+TRIAL_CAPS.total+" WHERE key='trtotal'");assert.equal((await invoke(trialRequest(trialNo(12),{'cf-connecting-ip':'198.51.100.9'}),s.env)).status,429);
  assert.equal(trialRows(s.q).length,TRIAL_CAPS.perSenderDay+1);});
test('trial: concurrent bursts from one sender store at most the per-sender cap',async(t)=>{const s=await trialEnv(t);if(!s)return;
  const r=await Promise.all(Array.from({length:12},(_,i)=>invoke(trialRequest(trialNo(i)),s.env)));assert.equal(r.filter(x=>x.status===200).length,TRIAL_CAPS.perSenderDay);assert.equal(trialRows(s.q).length,TRIAL_CAPS.perSenderDay);});
test('trial: same Origin, POST and JSON gates as the other APIs',async(t)=>{const s=await trialEnv(t);if(!s)return;
  assert.equal((await invoke(trialRequest(undefined,{origin:'https://evil.example'}),s.env)).status,403);assert.equal((await invoke(trialRequest(undefined,{'content-type':'text/plain'}),s.env)).status,415);assert.equal((await invoke(new Request(origin+'/api/trial'),s.env)).status,405);assert.equal(trialRows(s.q).length,0);});
test('trial: filled hidden field answers ok but stores nothing and uses no quota',async(t)=>{const s=await trialEnv(t);if(!s)return;
  const r=await invoke(trialRequest({...trialOk,website:'https://spam.example'}),s.env);assert.equal(r.status,200);assert.deepEqual(r.body,{ok:true});assert.equal(trialRows(s.q).length,0);assert.deepEqual(s.q.rows(),{});
  assert.equal((await invoke(trialRequest({...trialOk,website:''}),s.env)).status,200);assert.equal(trialRows(s.q).length,1);});
test('trial: missing binding, salt or IP answers 503; insert failure releases quota and logs a reason code only',async(t)=>{const s=await trialEnv(t);if(!s)return;
  for(const env of [{QUOTA_SALT:'x'},{QUOTA:s.q}]){assert.equal((await invoke(trialRequest(),env)).status,503);}const req=trialRequest();req.headers.delete('cf-connecting-ip');assert.equal((await invoke(req,s.env)).status,503);
  s.q.db.exec('DROP TABLE trial_applications');const r=await invoke(trialRequest(),s.env);assert.equal(r.status,503);assert.deepEqual(r.body,{error:'unavailable'});
  for(const [k,v] of Object.entries(s.q.rows()))assert.equal(v,0,k+' released');
  const err=logs.filter(l=>l[0]==='error');assert.equal(err.length,1);assert.equal(err[0][1],'trial_error');assert.ok(!JSON.stringify(err).includes('example.com')&&!JSON.stringify(err).includes('山田'));});
test('trial: stale sender/day rows are purged after 3 days; AI and event rows are kept',async(t)=>{const s=await trialEnv(t);if(!s)return;s.q.db.exec("INSERT INTO quota VALUES ('trip:2026-09-20:old',3),('trday:2026-09-20',9),('ev:2026-09-20:view',4),('total',5)");
  assert.equal((await invoke(trialRequest(),s.env)).status,200);const rows=s.q.rows();assert.equal(rows['trip:2026-09-20:old'],undefined);assert.equal(rows['trday:2026-09-20'],undefined);assert.equal(rows['ev:2026-09-20:view'],4);assert.equal(rows.total,5);});
test('trial: migration file and schema.sql define the same trial_applications table',async(t)=>{let mod;try{mod=await import('node:sqlite');}catch{return t.skip('node:sqlite unavailable');}
  const cols=file=>{const db=new mod.DatabaseSync(':memory:');db.exec(readFileSync(new URL(file,import.meta.url),'utf8'));return JSON.stringify(db.prepare("PRAGMA table_info(trial_applications)").all());};
  assert.equal(cols('../migrations/0001_trial_applications.sql'),cols('../schema.sql'));assert.ok(cols('../schema.sql').includes('store_name'));
  assert.ok(!/^\s*(DROP|DELETE|UPDATE|ALTER|INSERT)\b/im.test(readFileSync(new URL('../migrations/0001_trial_applications.sql',import.meta.url),'utf8').replace(/--.*$/gm,'')),'migration only adds');});
test('trial: validTrial normalizes whitespace and keeps the message optional',()=>{assert.deepEqual(validTrial({storeName:' 店 ',name:' 名 ',contact:' a@example.jp ',message:''}),{storeName:'店',name:'名',contact:'a@example.jp',message:''});assert.equal(validTrial({...trialOk,website:'x'}),'honeypot');});
test('trial: a release that fails halfway is never repeated, so the per-sender count cannot drop below what was stored',async(t)=>{const s=await trialEnv(t);if(!s)return;
  s.q.db.exec("INSERT INTO quota VALUES ('trday:"+day+"',"+TRIAL_CAPS.day+")");const prep=s.q.prepare.bind(s.q);let releases=0;
  s.q.prepare=sql=>{if(sql.startsWith('UPDATE quota SET count=MAX')){releases++;throw Error('D1_ERROR: flaky');}return prep(sql);};
  const r=await invoke(trialRequest(),s.env);assert.ok([429,503].includes(r.status));assert.equal(releases,1,'released once only');
  s.q.prepare=prep;const sender=Object.entries(s.q.rows()).find(([k])=>k.startsWith('trip:'));assert.equal(sender[1],1,'failed release leaves the row counted (safe side)');assert.equal(trialRows(s.q).length,0);});

// Slack notice for a saved application (SLACK_WEBHOOK_URL secret). Never sent for real here: globalThis.fetch is replaced.
const HOOK='https://hooks.slack.test/services/T000/B000/fictional';
async function withFetch(impl,fn){const old=globalThis.fetch;const calls=[];globalThis.fetch=async(url,init)=>{calls.push({url:String(url),init});return impl(url,init);};try{await fn(calls);}finally{globalThis.fetch=old;}}
test('trial notice: without SLACK_WEBHOOK_URL nothing is fetched',async(t)=>{const s=await trialEnv(t);if(!s)return;
  await withFetch(()=>new Response('ok'),async calls=>{const r=await invoke(trialRequest(),s.env);assert.equal(r.status,200);assert.deepEqual(r.body,{ok:true});
    s.env.SLACK_WEBHOOK_URL='';assert.equal((await invoke(trialRequest(undefined,{'cf-connecting-ip':'192.0.2.20'}),s.env)).status,200);assert.equal(calls.length,0);});});
test('trial notice: sent once per saved application, with the store name and receipt number only',async(t)=>{const s=await trialEnv(t);if(!s)return;s.env.SLACK_WEBHOOK_URL=HOOK;
  await withFetch(()=>new Response('ok'),async calls=>{
    s.q.db.exec("INSERT INTO trial_applications (created_at,store_name,contact_name,contact) VALUES ('2026-09-01T00:00:00.000Z','既存','x','x@example.com')");
    const app={...trialOk,storeName:'架空の喫茶 A&B',message:'レジ横に置きたい。電話は夜がいいです'};
    const r=await invoke(trialRequest(app),s.env);assert.equal(r.status,200);assert.deepEqual(r.body,{ok:true});
    assert.equal(calls.length,1);const [c]=calls;assert.equal(c.url,HOOK);assert.equal(c.init.method,'POST');assert.notEqual(c.init.redirect,'error');assert.equal(c.init.redirect,'manual');
    const id=s.q.db.prepare('SELECT id FROM trial_applications WHERE store_name=?').get(app.storeName).id;assert.equal(id,2);
    const body=JSON.parse(c.init.body);assert.deepEqual(Object.keys(body),['text']);assert.deepEqual(body,trialNotice(app.storeName,id));
    assert.equal(body.text,'ひとことβ 試用の申し込み：店名「架空の喫茶 A&amp;B」 受付番号 2');
    for(const secret of [app.name,'山田','花子',app.contact,'owner@','example.com',app.message,'レジ横','電話','192.0.2.9'])assert.ok(!c.init.body.includes(secret),'notice leaks '+secret);
    // nothing is logged on success
    assert.equal(logs.length,0,JSON.stringify(logs));});});
test('trial notice: a failing or refusing webhook never changes the answer, and logs no content',async(t)=>{const s=await trialEnv(t);if(!s)return;s.env.SLACK_WEBHOOK_URL=HOOK;
  let n=0;
  for(const impl of [()=>{throw new TypeError('network down owner@example.com');},()=>Promise.reject(new Error('D1? no: 架空の喫茶店')),()=>new Response('no',{status:500}),()=>new Response('',{status:302,headers:{location:'https://elsewhere.example/'}})]){
    await withFetch(impl,async calls=>{const r=await invoke(trialRequest(trialNo(n),{'cf-connecting-ip':'198.51.100.'+(n++)}),s.env);assert.equal(r.status,200);assert.deepEqual(r.body,{ok:true});assert.equal(calls.length,1);});}
  assert.equal(trialRows(s.q).length,4);
  const errs=logs.filter(l=>l[0]==='error');assert.deepEqual(errs.map(l=>l[1]),Array(4).fill('trial_notify_failed'));assert.deepEqual(errs.map(l=>l[2]),['TypeError','Error','500','302']);
  const flat=JSON.stringify(logs);for(const secret of ['架空の喫茶店','山田','owner@example.com','レジ横',HOOK,'network down'])assert.ok(!flat.includes(secret),'log leaks '+secret);});
test('trial notice: not sent for the hidden-field trap, invalid input, rate limits or a failed save',async(t)=>{const s=await trialEnv(t);if(!s)return;s.env.SLACK_WEBHOOK_URL=HOOK;
  await withFetch(()=>new Response('ok'),async calls=>{
    assert.deepEqual((await invoke(trialRequest({...trialOk,website:'https://spam.example'}),s.env)).body,{ok:true});
    assert.equal((await invoke(trialRequest({...trialOk,contact:'x'}),s.env)).status,400);
    for(let i=0;i<TRIAL_CAPS.perSenderDay;i++)assert.equal((await invoke(trialRequest(trialNo(i)),s.env)).status,200);
    assert.equal(calls.length,TRIAL_CAPS.perSenderDay,'one per saved application');
    assert.equal((await invoke(trialRequest(trialNo(99)),s.env)).status,429);
    s.q.db.exec('DROP TABLE trial_applications');assert.equal((await invoke(trialRequest(undefined,{'cf-connecting-ip':'198.51.100.77'}),s.env)).status,503);
    assert.equal(calls.length,TRIAL_CAPS.perSenderDay,'no notice without a saved row');});});

// 改善ループの受け口: POST /api/loop-event → D1 loop_events（日ごと・指紋ごとの件数）、GET /api/loop-events → tools/loop events.py
const LOOP_ERR={kind:'error',screen:'customer',version:LOOP_VERSION,error_type:'TypeError',frame:'app.js:renderPick',fp:'0a1b2c3d'};
const LOOP_CFB={kind:'feedback',screen:'customer-edit',version:LOOP_VERSION,category:'confusing'};
const LOOP_OFB={kind:'feedback',screen:'create',version:LOOP_VERSION,category:'bug',text:'印刷が2枚になる'};
function loopRequest(body=LOOP_ERR,extra={}) {return new Request(origin+'/api/loop-event',{method:'POST',headers:{origin,'content-type':'application/json','cf-connecting-ip':'192.0.2.30',...extra},body:typeof body==='string'?body:JSON.stringify(body)});}
const loopRows=q=>q.db.prepare('SELECT * FROM loop_events ORDER BY id').all().map(r=>({...r}));
const TOKEN='t'.repeat(40);
function loopGet(query='',auth='Bearer '+TOKEN,method='GET') {return new Request(origin+'/api/loop-events'+query,{method,headers:auth?{authorization:auth}:{}});}
const dayOf=ms=>new Date(ms).toISOString().slice(0,10);
test('loop-event: the three accepted shapes, and every extra or free-text field is refused (not dropped) with nothing stored',async(t)=>{const s=await trialEnv(t);if(!s)return;
  assert.deepEqual(validLoopEvent(LOOP_ERR),{kind:'error',screen:'customer',version:LOOP_VERSION,error_type:'TypeError',frame:'app.js:renderPick',category:null,text:null});
  assert.equal(validLoopEvent({...LOOP_ERR,frame:undefined}),null,'frame, when present, must be a string');const {frame:_f,...noFrame}=LOOP_ERR;assert.equal(validLoopEvent(noFrame).frame,null);
  assert.deepEqual(validLoopEvent(LOOP_CFB),{kind:'feedback',screen:'customer-edit',version:LOOP_VERSION,error_type:null,frame:null,category:'confusing',text:null});
  assert.equal(validLoopEvent(LOOP_OFB).text,'印刷が2枚になる');const {text:_t,...noText}=LOOP_OFB;assert.equal(validLoopEvent(noText).text,null);assert.equal(validLoopEvent({...LOOP_OFB,text:'   '}).text,null);
  const bad=[null,[],'x',{},{...LOOP_ERR,message:'Cannot read x of 架空の喫茶店'},{...LOOP_ERR,stack:'at f (https://hitokoto.example/app.js:1:1)'},{...LOOP_ERR,url:'https://hitokoto.example/?store=架空'},{...LOOP_ERR,storeName:'架空'},{...LOOP_ERR,date:'2026-09-25'},{...LOOP_ERR,text:'x'},
    {...LOOP_ERR,screen:'admin'},{...LOOP_ERR,screen:'customer-edit'},{...LOOP_ERR,error_type:'Cannot read properties of null'},{...LOOP_ERR,error_type:'MyError'},{...LOOP_ERR,fp:'xyz'},{...LOOP_ERR,fp:'0a1b2c3d4'},{...LOOP_ERR,version:''},{...LOOP_ERR,version:'v 1'},{...LOOP_ERR,version:'a'.repeat(41)},
    {...LOOP_ERR,frame:'evil.js:f'},{...LOOP_ERR,frame:'app.js:<anonymous>'},{...LOOP_ERR,frame:'app.js:https://x.example'},{...LOOP_ERR,frame:'app.js:'},{...LOOP_ERR,frame:'app.js:f g'},{...LOOP_ERR,frame:7},
    {...LOOP_CFB,text:'使いにくい'},{...LOOP_CFB,category:'bug'},{...LOOP_CFB,screen:'customer'},{...LOOP_CFB,fp:'0a1b2c3d'},{...LOOP_CFB,storeName:'架空'},
    {...LOOP_OFB,category:'good'},{...LOOP_OFB,text:'a'.repeat(LOOP_TEXT_MAX+1)},{...LOOP_OFB,text:'<b>x</b>'},{...LOOP_OFB,text:'x‮'},{...LOOP_OFB,text:3},{...LOOP_OFB,screen:'privacy'},{...LOOP_OFB,contact:'a@example.com'},{...LOOP_OFB,kind:'error'},{...LOOP_OFB,kind:'other'}];
  for(const body of bad){const r=await invoke(loopRequest(body),s.env);assert.equal(r.status,400,JSON.stringify(body));assert.deepEqual(r.body,{error:'invalid_input'});}
  assert.equal(loopRows(s.q).length,0);assert.deepEqual(s.q.rows(),{});
  assert.equal(validLoopEvent({...LOOP_OFB,text:'あ'.repeat(LOOP_TEXT_MAX)}).text.length,LOOP_TEXT_MAX);});
test('loop-event: same Origin, POST, JSON and size gates as the other APIs',async(t)=>{const s=await trialEnv(t);if(!s)return;
  assert.equal((await invoke(loopRequest(undefined,{origin:'https://evil.example'}),s.env)).status,403);assert.equal((await invoke(loopRequest(undefined,{'content-type':'text/plain'}),s.env)).status,415);
  assert.equal((await invoke(new Request(origin+'/api/loop-event'),s.env)).status,405);assert.equal((await invoke(loopRequest(JSON.stringify({...LOOP_OFB,text:'a'.repeat(5000)})),s.env)).status,413);
  assert.equal((await invoke(loopRequest('{'),s.env)).status,400);assert.equal(loopRows(s.q).length,0);});
test('loop-event: stores kind/screen/version/type/frame/category and the server day only; no IP, store name, message or URL anywhere in D1',async(t)=>{const s=await trialEnv(t);if(!s)return;
  for(const body of [LOOP_ERR,LOOP_CFB,LOOP_OFB]){const r=await invoke(loopRequest(body),s.env);assert.equal(r.status,200);assert.deepEqual(r.body,{recorded:true});}
  const rows=loopRows(s.q);assert.equal(rows.length,3);const today=dayOf(Date.now());
  assert.deepEqual(rows.map(r=>[r.day,r.product,r.kind,r.screen,r.version,r.error_type,r.frame,r.category,r.text_masked,r.count]),[
    [today,'hitokoto-beta','error','customer',LOOP_VERSION,'TypeError','app.js:renderPick',null,null,1],
    [today,'hitokoto-beta','feedback','customer-edit',LOOP_VERSION,null,null,'confusing',null,1],
    [today,'hitokoto-beta','feedback','create',LOOP_VERSION,null,null,'bug','印刷が2枚になる',1]]);
  for(const r of rows)assert.match(r.fp,/^[0-9a-f]{16}$/);assert.ok(!rows.some(r=>r.fp.startsWith('0a1b2c3d')),'fp is computed by the server, not taken from the client');
  const dump=JSON.stringify(s.q.db.prepare('SELECT * FROM quota').all())+JSON.stringify(rows);assert.ok(!dump.includes('192.0.2.30'),'no IP');
  assert.deepEqual(Object.keys(s.q.rows()).map(k=>k.split(':')[0]).sort(),['lfip','lpday','lpip']);
  assert.equal(s.q.db.prepare('SELECT count(*) n FROM trial_applications').get().n,0);assert.equal(s.q.rows().total,undefined,'AI quota untouched');});
test('loop-event: the same (day, kind, fingerprint) adds to one row; a different frame, screen, version or day is its own row',async(t)=>{const s=await trialEnv(t);if(!s)return;
  for(let i=0;i<3;i++)assert.equal((await invoke(loopRequest({...LOOP_ERR,fp:'0000000'+i},{'cf-connecting-ip':'198.51.100.'+i}),s.env)).status,200);
  let rows=loopRows(s.q);assert.equal(rows.length,1);assert.equal(rows[0].count,3);
  await invoke(loopRequest({...LOOP_ERR,frame:'compose.js:build'}),s.env);await invoke(loopRequest({...LOOP_ERR,screen:'create'}),s.env);await invoke(loopRequest({...LOOP_ERR,version:'2026.10.01-1'}),s.env);
  const {frame:_f,...noFrame}=LOOP_ERR;await invoke(loopRequest(noFrame),s.env);
  for(let i=0;i<2;i++)await invoke(loopRequest(LOOP_CFB),s.env);
  Date.now=()=>Date.parse('2026-09-26T00:00:01Z');await invoke(loopRequest(LOOP_ERR),s.env);
  rows=loopRows(s.q);assert.deepEqual(rows.map(r=>[r.day,r.screen,r.frame,r.version,r.count]),[
    ['2026-09-25','customer','app.js:renderPick',LOOP_VERSION,3],['2026-09-25','customer','compose.js:build',LOOP_VERSION,1],['2026-09-25','create','app.js:renderPick',LOOP_VERSION,1],
    ['2026-09-25','customer','app.js:renderPick','2026.10.01-1',1],['2026-09-25','customer',null,LOOP_VERSION,1],['2026-09-25','customer-edit',null,LOOP_VERSION,2],['2026-09-26','customer','app.js:renderPick',LOOP_VERSION,1]]);});
test('loop-event: per sender per day (customer 20, owner 5), the daily total, and a row ceiling; refused attempts release what they held',async(t)=>{const s=await trialEnv(t);if(!s)return;
  const codes=[];for(let i=0;i<LOOP_CAPS.perSenderDay+2;i++)codes.push((await invoke(loopRequest(LOOP_CFB),s.env)).status);
  assert.deepEqual(codes,[...Array(LOOP_CAPS.perSenderDay).fill(200),429,429]);assert.equal(loopRows(s.q)[0].count,LOOP_CAPS.perSenderDay);
  assert.equal(s.q.rows()['lpday:'+dayOf(Date.now())],LOOP_CAPS.perSenderDay,'refused attempts released the day row');
  const own=[];for(let i=0;i<LOOP_CAPS.ownerPerSenderDay+1;i++)own.push((await invoke(loopRequest({...LOOP_OFB,text:'意見'+i}),s.env)).status);
  assert.deepEqual(own,[...Array(LOOP_CAPS.ownerPerSenderDay).fill(200),429],'owner feedback has its own smaller per-sender cap');
  assert.equal((await invoke(loopRequest(LOOP_CFB,{'cf-connecting-ip':'198.51.100.40'}),s.env)).status,200,'another sender continues');
  s.q.db.exec("UPDATE quota SET count="+LOOP_CAPS.day+" WHERE key='lpday:"+dayOf(Date.now())+"'");const r=await invoke(loopRequest(LOOP_CFB,{'cf-connecting-ip':'198.51.100.41'}),s.env);assert.equal(r.status,429);assert.deepEqual(r.body,{error:'rate_limited'});
  assert.equal(Object.entries(s.q.rows()).filter(([k,v])=>k.startsWith('lpip:')&&v===0).length,1,'sender row released when the day cap refused');
  const conc=await Promise.all(Array.from({length:30},()=>invoke(loopRequest(LOOP_ERR,{'cf-connecting-ip':'198.51.100.50'}),{...s.env,QUOTA:s.q})));assert.equal(conc.filter(x=>x.status===200).length,0,'day cap holds under concurrency');
  s.q.db.exec("UPDATE quota SET count=0 WHERE key='lpday:"+dayOf(Date.now())+"'");s.q.db.exec("UPDATE loop_events SET count="+LOOP_CAPS.row+" WHERE category='confusing'");
  assert.equal((await invoke(loopRequest(LOOP_CFB,{'cf-connecting-ip':'198.51.100.42'}),s.env)).status,200);assert.equal(s.q.db.prepare("SELECT count FROM loop_events WHERE category='confusing'").get().count,LOOP_CAPS.row,'a row stops at the ceiling');});
test('loop-event: without D1, salt or IP nothing is stored and the answer is recorded:false; stale sender rows are purged after 3 days',async(t)=>{const s=await trialEnv(t);if(!s)return;
  for(const env of [{QUOTA_SALT:'x'},{QUOTA:s.q}]){const r=await invoke(loopRequest(),env);assert.equal(r.status,200);assert.deepEqual(r.body,{recorded:false});}
  const req=loopRequest();req.headers.delete('cf-connecting-ip');assert.deepEqual((await invoke(req,s.env)).body,{recorded:false});assert.equal(loopRows(s.q).length,0);
  s.q.db.exec("INSERT INTO quota VALUES ('lpip:2026-09-20:old',3),('lfip:2026-09-20:old',2),('lpday:2026-09-20',9),('trday:2026-09-20',1),('ev:2026-09-20:view',4)");
  assert.equal((await invoke(loopRequest(),s.env)).status,200);const rows=s.q.rows();for(const k of ['lpip:2026-09-20:old','lfip:2026-09-20:old','lpday:2026-09-20'])assert.equal(rows[k],undefined,k);assert.equal(rows['ev:2026-09-20:view'],4);assert.equal(rows['trday:2026-09-20'],1,'other features keep their own cleanup');
  s.q.db.exec('DROP TABLE loop_events');const r=await invoke(loopRequest(LOOP_CFB,{'cf-connecting-ip':'198.51.100.60'}),s.env);assert.equal(r.status,503);for(const [k,v] of Object.entries(s.q.rows()))if(k.includes('198'))assert.equal(v,0);
  const err=logs.filter(l=>l[0]==='error');assert.deepEqual(err.map(l=>l.slice(1)),[['loop_error','Error']]);});
test('loop-event: the owner\'s words are masked before they are saved (mail, phone, URL, keys), and the raw values are nowhere in D1',async(t)=>{const s=await trialEnv(t);if(!s)return;
  const raw='連絡は owner@example.com か ０９０－１２３４－５６７８ へ。https://g.page/r/abc/review と kuchikomi.jp が変。sk-abcdefghijklmnop12 '+'AKIA'+'ABCDEFGHIJKLMNOP';
  assert.equal((await invoke(loopRequest({...LOOP_OFB,text:raw}),s.env)).status,200);
  const saved=loopRows(s.q)[0].text_masked;
  assert.equal(saved,'連絡は [MASKED:EMAIL] か [MASKED:PHONE] へ。[MASKED:URL] と [MASKED:URL] が変。[MASKED:KEY] [MASKED:KEY]');
  const dump=JSON.stringify(s.q.db.prepare('SELECT * FROM loop_events').all());for(const secret of ['owner@','example.com','1234','5678','g.page','kuchikomi','sk-abc','AK'+'IA'])assert.ok(!dump.includes(secret),secret);
  assert.equal(maskSecrets('090 1234 5678'),'[MASKED:PHONE]');assert.equal(maskSecrets('(03)1234-5678'),'([MASKED:PHONE]');assert.equal(maskSecrets('www.example.org/x?y=1'),'[MASKED:URL]');
  assert.equal(maskSecrets('ghp_'+'a'.repeat(20)),'[MASKED:KEY]');assert.equal(maskSecrets('xo'+'xb-123456789-abc'),'[MASKED:KEY]');assert.equal(maskSecrets('a'.repeat(40)),'[MASKED:LONG]');
  assert.equal(maskSecrets('印刷が2枚になる。料金は2,980円？10月1日から'),'印刷が2枚になる。料金は2,980円?10月1日から','ordinary short numbers are kept (NFKC only)');
  assert.ok(maskSecrets('a@b.co '.repeat(40)).length<=2*LOOP_TEXT_MAX);});
test('loop-event: server-side failures are counted with reason codes only (draft, trial, event); expected fallbacks are not; recording never changes the answer',async(t)=>{const s=await trialEnv(t);if(!s)return;
  s.env.AI={async run(){throw new TypeError('model offline 架空デモ');}};assert.equal((await invoke(request(undefined,{'cf-connecting-ip':'192.0.2.70'}),s.env)).body.mode,'fallback');
  s.env.AI={async run(){return {response:'https://bad.example'};}};assert.equal((await invoke(request(undefined,{'cf-connecting-ip':'192.0.2.71'}),s.env)).body.mode,'fallback');
  s.q.db.exec("INSERT OR REPLACE INTO quota VALUES ('total',1000)");assert.equal((await invoke(request(undefined,{'cf-connecting-ip':'192.0.2.72'}),s.env)).body.mode,'fallback');
  const noAI={QUOTA:s.q,QUOTA_SALT:'x'};assert.equal((await invoke(request(),noAI)).body.mode,'fallback');
  s.q.db.exec('DROP TABLE trial_applications');assert.equal((await invoke(trialRequest(),s.env)).status,503);
  const ev=setup();ev.env.QUOTA={prepare(sql){if(sql.startsWith('INSERT INTO quota'))throw new RangeError('D1_ERROR 192.0.2.4');return s.q.prepare(sql);}};assert.deepEqual((await invoke(eventRequest(),ev.env)).body,{recorded:false});
  const rows=loopRows(s.q);assert.deepEqual(rows.map(r=>[r.kind,r.screen,r.error_type,r.frame,r.category,r.text_masked,r.version,r.count]).sort(),[
    ['error','api-draft','draft_bindings',null,null,null,LOOP_VERSION,1],['error','api-draft','draft_ceiling',null,null,null,LOOP_VERSION,1],['error','api-draft','draft_error.TypeError',null,null,null,LOOP_VERSION,1],
    ['error','api-event','event_error.RangeError',null,null,null,LOOP_VERSION,1],['error','api-trial','trial_error.Error',null,null,null,LOOP_VERSION,1]]);
  const dump=JSON.stringify(rows);for(const secret of ['架空','192.0.2','bad.example','model offline','D1_ERROR'])assert.ok(!dump.includes(secret),secret);
  // a broken loop table must not change any answer, nor add log lines
  s.q.db.exec('DROP TABLE loop_events; DELETE FROM quota');logs.length=0;s.env.AI={async run(){throw new Error('x');}};assert.equal((await invoke(request(undefined,{'cf-connecting-ip':'192.0.2.73'}),s.env)).body.mode,'fallback');
  assert.deepEqual(logs.map(l=>l.slice(0,3)),[['error','draft_fallback','error']]);});
test('loop-event: a failing Slack notice is counted with its status or error class only',async(t)=>{const s=await trialEnv(t);if(!s)return;s.env.SLACK_WEBHOOK_URL=HOOK;
  for(const [i,impl] of [()=>new Response('no',{status:500}),()=>{throw new TypeError('down owner@example.com');}].entries())await withFetch(impl,async()=>{assert.equal((await invoke(trialRequest(trialNo(i),{'cf-connecting-ip':'198.51.100.8'+i}),s.env)).status,200);});
  assert.deepEqual(loopRows(s.q).map(r=>[r.screen,r.error_type]),[['api-trial','trial_notify_http_500'],['api-trial','trial_notify_failed.TypeError']]);});
test('loop-events GET: 404 without a (32+ char) LOOP_EVENTS_TOKEN, 401 without the right Bearer, 405 for other methods',async(t)=>{const s=await trialEnv(t);if(!s)return;
  for(const tok of [undefined,'','short-token'])assert.equal((await invoke(loopGet(),{...s.env,LOOP_EVENTS_TOKEN:tok})).status,404,String(tok));
  s.env.LOOP_EVENTS_TOKEN=TOKEN;
  for(const auth of ['',TOKEN,'Bearer '+TOKEN.slice(1),'Bearer '+TOKEN+'x','bearer '+TOKEN,'Basic '+TOKEN,'Bearer  '+TOKEN,'Bearer t'])assert.equal((await invoke(loopGet('',auth),s.env)).status,401,auth);
  assert.equal((await invoke(loopGet('','Bearer '+TOKEN,'POST'),s.env)).status,405);
  const ok=await worker.fetch(loopGet(),s.env,{waitUntil(){}});assert.equal(ok.status,200);assert.equal(ok.headers.get('cache-control'),'no-store');assert.deepEqual(await ok.json(),[]);
  assert.equal((await invoke(loopGet('?since=2026-02-30'),s.env)).status,400);assert.equal((await invoke(loopGet('?since=yesterday'),s.env)).status,400);});
test('tokenMatches: right answer for equal, prefix, longer, shorter and empty; always hashes both sides (work does not depend on the input)',async()=>{
  const real=crypto.subtle.digest.bind(crypto.subtle);let n=0;crypto.subtle.digest=(...a)=>{n++;return real(...a);};
  try{const cases=[[TOKEN,true],[TOKEN.slice(0,39),false],[TOKEN+'t',false],['',false],['x'.repeat(40),false],['u'+TOKEN.slice(1),false]];
    for(const [given,want] of cases){n=0;assert.equal(await tokenMatches(given,TOKEN),want,given);assert.equal(n,2,'two digests for '+JSON.stringify(given));}}
  finally{crypto.subtle.digest=real;}
  const src=readFileSync(new URL('../worker.mjs',import.meta.url),'utf8');assert.ok(!/LOOP_EVENTS_TOKEN\s*[!=]==?|[!=]==?\s*(?:env\.)?LOOP_EVENTS_TOKEN|===\s*token\b|token\s*===/.test(src.replace(/typeof token!=='string'/,'')),'the token is never compared with ===');});
test('loop-events GET: closed days only, since filter, and each row carries exactly the fields events.py accepts (no text, IP or store name)',async(t)=>{const s=await trialEnv(t);if(!s)return;s.env.LOOP_EVENTS_TOKEN=TOKEN;
  const at=iso=>{Date.now=()=>Date.parse(iso);};
  at('2026-09-23T10:00:00Z');await invoke(loopRequest(LOOP_ERR),s.env);await invoke(loopRequest({...LOOP_OFB,text:'owner@example.com に返事して。架空の喫茶店'}),s.env);
  at('2026-09-24T10:00:00Z');for(let i=0;i<3;i++)await invoke(loopRequest(LOOP_CFB,{'cf-connecting-ip':'198.51.100.9'+i}),s.env);
  at('2026-09-25T00:05:00Z');await invoke(loopRequest(LOOP_ERR),s.env);
  at('2026-09-25T00:05:00Z');let body=(await invoke(loopGet('?since=2026-09-01'),s.env)).body;assert.deepEqual(body.map(r=>r.first_seen.slice(0,10)),['2026-09-23','2026-09-23'],'within 10 minutes after midnight the day before is still open');
  at('2026-09-25T12:00:00Z');body=(await invoke(loopGet('?since=2026-09-01'),s.env)).body;
  assert.deepEqual(body,[
    {product:'hitokoto-beta',kind:'error',fingerprint:'customer:TypeError:app.js:renderPick',screen:'customer',version:LOOP_VERSION,count:1,first_seen:'2026-09-23T00:00:00Z',last_seen:'2026-09-23T23:59:59Z',impact:'failure'},
    {product:'hitokoto-beta',kind:'feedback',fingerprint:'create:bug',screen:'create',version:LOOP_VERSION,count:1,first_seen:'2026-09-23T00:00:00Z',last_seen:'2026-09-23T23:59:59Z',impact:'request'},
    {product:'hitokoto-beta',kind:'feedback',fingerprint:'customer-edit:confusing',screen:'customer-edit',version:LOOP_VERSION,count:3,first_seen:'2026-09-24T00:00:00Z',last_seen:'2026-09-24T23:59:59Z',impact:'request'}]);
  const flat=JSON.stringify(body);for(const secret of ['MASKED','owner','架空','198.51','192.0.2','text'])assert.ok(!flat.includes(secret),secret);
  assert.deepEqual((await invoke(loopGet('?since=2026-09-24'),s.env)).body.map(r=>r.fingerprint),['customer-edit:confusing']);
  assert.equal((await invoke(loopGet(),s.env)).body.length,3,'default window is the last 7 days');
  assert.deepEqual((await invoke(loopGet('?since=2026-09-24'),s.env)).body,(await invoke(loopGet('?since=2026-09-24'),s.env)).body,'a closed day reads the same every time');
  assert.deepEqual(loopEventOut({day:'2026-09-01',kind:'error',screen:'api-trial',version:'v1',error_type:'trial_error.Error',frame:null,category:null,count:2}).fingerprint,'api-trial:trial_error.Error');});
test('loop: public/loop.js sends the same version and error types the worker accepts, is loaded before app.js, and the page keeps its CSP',()=>{
  const js=readFileSync(new URL('../public/loop.js',import.meta.url),'utf8');const html=readFileSync(new URL('../public/index.html',import.meta.url),'utf8');
  assert.equal(/const VERSION='([^']+)'/.exec(js)[1],LOOP_VERSION);assert.deepEqual(JSON.parse(/const ERROR_TYPES=(\[[^\]]+\])/.exec(js)[1].replace(/'/g,'"')),LOOP_ERROR_TYPES);
  const scripts=[...html.matchAll(/<script src="([^"]+)"/g)].map(m=>m[1]);assert.deepEqual(scripts,['loop.js','qrcode.min.js','compose.js','app.js']);
  assert.ok(!/message|\.stack\b[^;]*post|location\.href|document\.URL/.test(js.replace(/\/\/.*$/gm,'').replace(/err\.stack:''\)/,'')),'loop.js never reads the message or the page URL into a request');
  const fb=html.slice(html.indexOf('id="customer-fb"'),html.indexOf('</details>',html.indexOf('id="customer-fb"')));assert.ok(fb.length>100&&!/<textarea|<input(?![^>]*type="radio")/.test(fb),'customer feedback has no free-text field');});
test('loop: migration 0002 and schema.sql define the same loop_events table; the migration only adds',async(t)=>{let mod;try{mod=await import('node:sqlite');}catch{return t.skip('node:sqlite unavailable');}
  const cols=file=>{const db=new mod.DatabaseSync(':memory:');db.exec(readFileSync(new URL(file,import.meta.url),'utf8'));return JSON.stringify([db.prepare("PRAGMA table_info(loop_events)").all(),db.prepare("SELECT sql FROM sqlite_master WHERE tbl_name='loop_events' AND sql IS NOT NULL ORDER BY name").all().map(r=>r.sql.replace(/\s+/g,' ').replace(/\( /g,'(').replace(/ \)/g,')'))]);};
  assert.equal(cols('../migrations/0002_loop_events.sql'),cols('../schema.sql'));assert.ok(cols('../schema.sql').includes('text_masked'));
  const sql=readFileSync(new URL('../migrations/0002_loop_events.sql',import.meta.url),'utf8').replace(/--.*$/gm,'');assert.ok(!/^\s*(DROP|DELETE|UPDATE|ALTER|INSERT)\b/im.test(sql),'migration only adds');assert.ok(!/quota|trial_applications/.test(sql),'other tables untouched');
  const db=new mod.DatabaseSync(':memory:');db.exec(readFileSync(new URL('../schema.sql',import.meta.url),'utf8'));
  assert.throws(()=>db.exec("INSERT INTO loop_events (day,product,kind,screen,version,fp,text_masked) VALUES ('2026-09-25','hitokoto-beta','error','customer','v','0123456789abcdef','x')"),/CHECK/,'text only on owner feedback rows');});

// 選択の件数: POST /api/pick-stat → D1 pick_stats（日付・業種・話題・評価・細目ごとの件数）、GET /api/pick-stats（同じ Bearer・締まった日だけ）
const PICK={kind:'food',picks:[{topic:'wait',rating:'concern',details:['serving']},{topic:'dish',rating:'good',details:['temp','taste']},{topic:'drink',rating:'ok'}]};
function pickRequest(body=PICK,extra={}) {return new Request(origin+'/api/pick-stat',{method:'POST',headers:{origin,'content-type':'application/json','cf-connecting-ip':'192.0.2.40',...extra},body:typeof body==='string'?body:JSON.stringify(body)});}
const pickRows=q=>q.db.prepare('SELECT day,kind,topic,rating,detail,count FROM pick_stats ORDER BY day,kind,topic,rating,detail').all().map(r=>[r.day,r.kind,r.topic,r.rating,r.detail,r.count]);
function pickGet(query='',auth='Bearer '+TOKEN,method='GET') {return new Request(origin+'/api/pick-stats'+query,{method,headers:auth?{authorization:auth}:{}});}
test('pick-stat: only {kind, picks:[{topic, rating, details?}]} from the fixed table is accepted; any other key or value is refused (not dropped) and nothing is stored',async(t)=>{const s=await trialEnv(t);if(!s)return;
  assert.deepEqual(validPickStat(PICK),{kind:'food',picks:[{topic:'dish',rating:'good',details:['taste','temp']},{topic:'drink',rating:'ok',details:[]},{topic:'wait',rating:'concern',details:['serving']}]});
  assert.deepEqual(pickStatRows(validPickStat(PICK)),[['food','dish','good',''],['food','dish','good','taste'],['food','dish','good','temp'],['food','drink','ok',''],['food','wait','concern',''],['food','wait','concern','serving']]);
  const one=PICK.picks[0];
  const bad=[null,[],'x',{},{kind:'food'},{picks:PICK.picks},{...PICK,storeName:'架空の喫茶店'},{...PICK,text:'料理がよかった'},{...PICK,addition:'コーヒーは熱かった'},{...PICK,review:'https://g.page/r/x/review'},{...PICK,url:'https://hitokoto.example/?store=架空'},{...PICK,day:'2026-09-01'},{...PICK,lang:'ja'},
    {...PICK,kind:'bar'},{...PICK,kind:'FOOD'},{...PICK,kind:['food']},{...PICK,picks:[]},{...PICK,picks:'dish'},{...PICK,picks:[null]},{...PICK,picks:[[one]]},
    {...PICK,picks:[{...one,text:'待った'}]},{...PICK,picks:[{...one,storeName:'架空'}]},{...PICK,picks:[{topic:'wait'}]},{...PICK,picks:[{rating:'good'}]},
    {...PICK,picks:[{...one,topic:'result'}]},{...PICK,picks:[{...one,rating:'great'}]},{...PICK,picks:[{...one,details:['cut']}]},{...PICK,picks:[{...one,details:['serving','serving']}]},{...PICK,picks:[{...one,details:'serving'}]},
    {...PICK,picks:[one,{...one,rating:'good'}]},{kind:'food',picks:[...Array.from({length:8},(_,i)=>({topic:['dish','drink','service','ambience','wait','price','location','clarity'][i],rating:'good'}))]}];
  for(const body of bad){const r=await invoke(pickRequest(body),s.env);assert.equal(r.status,400,JSON.stringify(body));assert.deepEqual(r.body,{error:'invalid_input'});}
  assert.deepEqual(pickRows(s.q),[]);assert.deepEqual(s.q.rows(),{});
  for(const kind of ['general','food','beauty','retail'])assert.ok(validPickStat({kind,picks:[{topic:'price',rating:'ok',details:[]}]}),kind);});
test('pick-stat: same Origin, POST, JSON and size gates as the other APIs',async(t)=>{const s=await trialEnv(t);if(!s)return;
  assert.equal((await invoke(pickRequest(undefined,{origin:'https://evil.example'}),s.env)).status,403);assert.equal((await invoke(pickRequest(undefined,{'content-type':'text/plain'}),s.env)).status,415);
  assert.equal((await invoke(new Request(origin+'/api/pick-stat'),s.env)).status,405);assert.equal((await invoke(pickRequest(JSON.stringify({...PICK,pad:'a'.repeat(5000)})),s.env)).status,413);
  assert.equal((await invoke(pickRequest('{'),s.env)).status,400);assert.deepEqual(pickRows(s.q),[]);});
test('pick-stat: stores (server day, kind, topic, rating, detail) counts only; the same choices add up; no IP, store name or text anywhere in D1',async(t)=>{const s=await trialEnv(t);if(!s)return;
  for(let i=0;i<2;i++){const r=await invoke(pickRequest(PICK,{'cf-connecting-ip':'198.51.100.'+i}),s.env);assert.equal(r.status,200);assert.deepEqual(r.body,{recorded:true});}
  assert.equal((await invoke(pickRequest({kind:'food',picks:[{topic:'dish',rating:'good',details:['taste']},{topic:'location',rating:'concern',details:['parking','station']}]}),s.env)).status,200);
  assert.equal((await invoke(pickRequest({kind:'beauty',picks:[{topic:'counseling',rating:'good'}]}),s.env)).status,200);
  Date.now=()=>Date.parse('2026-09-26T00:00:01Z');assert.equal((await invoke(pickRequest({kind:'food',picks:[{topic:'dish',rating:'good'}]}),s.env)).status,200);
  assert.deepEqual(pickRows(s.q),[
    ['2026-09-25','beauty','counseling','good','',1],
    ['2026-09-25','food','dish','good','',3],['2026-09-25','food','dish','good','taste',3],['2026-09-25','food','dish','good','temp',2],
    ['2026-09-25','food','drink','ok','',2],
    ['2026-09-25','food','location','concern','',1],['2026-09-25','food','location','concern','parking',1],['2026-09-25','food','location','concern','station',1],
    ['2026-09-25','food','wait','concern','',2],['2026-09-25','food','wait','concern','serving',2],
    ['2026-09-26','food','dish','good','',1]]);
  const dump=JSON.stringify(s.q.db.prepare('SELECT * FROM pick_stats').all())+JSON.stringify(s.q.db.prepare('SELECT * FROM quota').all());
  for(const secret of ['192.0.2.40','198.51.100','架空','http'])assert.ok(!dump.includes(secret),secret);
  assert.deepEqual([...new Set(Object.keys(s.q.rows()).map(k=>k.split(':')[0]))].sort(),['psday','psip']);
  assert.equal(s.q.db.prepare('SELECT count(*) n FROM loop_events').get().n,0);assert.equal(s.q.db.prepare('SELECT count(*) n FROM trial_applications').get().n,0);assert.equal(s.q.rows().total,undefined,'AI quota untouched');});
test('pick-stat: per sender per day, the daily total and a row ceiling; refused attempts release what they held; stale sender rows are purged after 3 days',async(t)=>{const s=await trialEnv(t);if(!s)return;
  const one={kind:'general',picks:[{topic:'service',rating:'good'}]};
  const codes=[];for(let i=0;i<PICK_CAPS.perSenderDay+2;i++)codes.push((await invoke(pickRequest(one),s.env)).status);
  assert.deepEqual(codes,[...Array(PICK_CAPS.perSenderDay).fill(200),429,429]);assert.equal(pickRows(s.q)[0][5],PICK_CAPS.perSenderDay);
  assert.equal(s.q.rows()['psday:'+dayOf(Date.now())],PICK_CAPS.perSenderDay,'refused attempts released the day row');
  assert.equal((await invoke(pickRequest(one,{'cf-connecting-ip':'198.51.100.40'}),s.env)).status,200,'another sender continues');
  s.q.db.exec("UPDATE quota SET count="+PICK_CAPS.day+" WHERE key='psday:"+dayOf(Date.now())+"'");const r=await invoke(pickRequest(one,{'cf-connecting-ip':'198.51.100.41'}),s.env);assert.equal(r.status,429);assert.deepEqual(r.body,{error:'rate_limited'});
  assert.equal(Object.entries(s.q.rows()).filter(([k,v])=>k.startsWith('psip:')&&v===0).length,1,'sender row released when the day cap refused');
  s.q.db.exec("UPDATE quota SET count=0 WHERE key='psday:"+dayOf(Date.now())+"'");s.q.db.exec('UPDATE pick_stats SET count='+PICK_CAPS.row);
  assert.equal((await invoke(pickRequest(one,{'cf-connecting-ip':'198.51.100.42'}),s.env)).status,200);assert.equal(pickRows(s.q)[0][5],PICK_CAPS.row,'a row stops at the ceiling');
  s.q.db.exec("INSERT INTO quota VALUES ('psip:2026-09-20:old',3),('psday:2026-09-20',9),('lpday:2026-09-20',1),('ev:2026-09-20:view',4)");
  assert.equal((await invoke(pickRequest(one,{'cf-connecting-ip':'198.51.100.43'}),s.env)).status,200);const rows=s.q.rows();
  for(const k of ['psip:2026-09-20:old','psday:2026-09-20'])assert.equal(rows[k],undefined,k);assert.equal(rows['lpday:2026-09-20'],1,'other features keep their own cleanup');assert.equal(rows['ev:2026-09-20:view'],4);});
test('pick-stat: without D1, salt or IP nothing is stored (recorded:false); a failed save answers 503, releases the quota and is counted as api-pick with its error class only',async(t)=>{const s=await trialEnv(t);if(!s)return;
  for(const env of [{QUOTA_SALT:'x'},{QUOTA:s.q}]){const r=await invoke(pickRequest(),env);assert.equal(r.status,200);assert.deepEqual(r.body,{recorded:false});}
  const req=pickRequest();req.headers.delete('cf-connecting-ip');assert.deepEqual((await invoke(req,s.env)).body,{recorded:false});assert.deepEqual(pickRows(s.q),[]);
  s.q.db.exec('DROP TABLE pick_stats');const r=await invoke(pickRequest(PICK,{'cf-connecting-ip':'198.51.100.60'}),s.env);assert.equal(r.status,503);assert.deepEqual(r.body,{recorded:false});
  for(const [k,v] of Object.entries(s.q.rows()))if(k.startsWith('ps'))assert.equal(v,0,k);
  assert.deepEqual(loopRows(s.q).map(x=>[x.screen,x.error_type]),[['api-pick','pick_error.Error']]);
  assert.deepEqual(logs.filter(l=>l[0]==='error').map(l=>l.slice(1)),[['pick_error','Error']]);});
test('pick-stats GET: token gate like /api/loop-events; closed days only; since filter; rows carry only day/kind/topic/rating/detail/count; truncation is reported',async(t)=>{const s=await trialEnv(t);if(!s)return;
  for(const tok of [undefined,'','short-token'])assert.equal((await invoke(pickGet(),{...s.env,LOOP_EVENTS_TOKEN:tok})).status,404,String(tok));
  s.env.LOOP_EVENTS_TOKEN=TOKEN;
  for(const auth of ['',TOKEN,'Bearer '+TOKEN.slice(1),'Bearer '+TOKEN+'x','bearer '+TOKEN])assert.equal((await invoke(pickGet('',auth),s.env)).status,401,auth);
  assert.equal((await invoke(pickGet('','Bearer '+TOKEN,'POST'),s.env)).status,405);assert.equal((await invoke(pickGet('?since=2026-02-30'),s.env)).status,400);
  const at=iso=>{Date.now=()=>Date.parse(iso);};
  at('2026-09-23T10:00:00Z');await invoke(pickRequest(),s.env);
  at('2026-09-24T10:00:00Z');await invoke(pickRequest({kind:'beauty',picks:[{topic:'result',rating:'good',details:['cut']}]}),s.env);
  at('2026-09-25T00:05:00Z');await invoke(pickRequest(),s.env);
  let body=(await invoke(pickGet('?since=2026-09-01'),s.env)).body;assert.deepEqual([...new Set(body.rows.map(r=>r.day))],['2026-09-23'],'within 10 minutes after midnight the day before is still open');
  at('2026-09-25T12:00:00Z');body=(await invoke(pickGet('?since=2026-09-01'),s.env)).body;
  assert.deepEqual(body,{product:'hitokoto-beta',since:'2026-09-01',before:'2026-09-25',truncated:false,rows:[
    {day:'2026-09-23',kind:'food',topic:'dish',rating:'good',detail:'',count:1},{day:'2026-09-23',kind:'food',topic:'dish',rating:'good',detail:'taste',count:1},{day:'2026-09-23',kind:'food',topic:'dish',rating:'good',detail:'temp',count:1},
    {day:'2026-09-23',kind:'food',topic:'drink',rating:'ok',detail:'',count:1},{day:'2026-09-23',kind:'food',topic:'wait',rating:'concern',detail:'',count:1},{day:'2026-09-23',kind:'food',topic:'wait',rating:'concern',detail:'serving',count:1},
    {day:'2026-09-24',kind:'beauty',topic:'result',rating:'good',detail:'',count:1},{day:'2026-09-24',kind:'beauty',topic:'result',rating:'good',detail:'cut',count:1}]});
  assert.deepEqual((await invoke(pickGet('?since=2026-09-24'),s.env)).body.rows.map(r=>r.kind),['beauty','beauty']);
  assert.deepEqual((await invoke(pickGet('?since=2026-09-24'),s.env)).body,(await invoke(pickGet('?since=2026-09-24'),s.env)).body,'a closed day reads the same every time');
  s.q.db.exec("WITH RECURSIVE n(i) AS (SELECT 1 UNION ALL SELECT i+1 FROM n WHERE i<"+(PICK_CAPS.readRows+5)+") INSERT INTO pick_stats (day,kind,topic,rating,detail,count) SELECT '2026-09-22','general','service','good','d'||i,1 FROM n");
  body=(await invoke(pickGet('?since=2026-09-01'),s.env)).body;assert.equal(body.truncated,true);assert.equal(body.rows.length,PICK_CAPS.readRows);});
test('pick-stat: migration 0003 and schema.sql define the same pick_stats table; the migration only adds; the table refuses values outside the fixed shape',async(t)=>{let mod;try{mod=await import('node:sqlite');}catch{return t.skip('node:sqlite unavailable');}
  const cols=file=>{const db=new mod.DatabaseSync(':memory:');db.exec(readFileSync(new URL(file,import.meta.url),'utf8'));return JSON.stringify([db.prepare("PRAGMA table_info(pick_stats)").all(),db.prepare("SELECT sql FROM sqlite_master WHERE tbl_name='pick_stats' AND sql IS NOT NULL ORDER BY name").all().map(r=>r.sql.replace(/\s+/g,' ').replace(/\( /g,'(').replace(/ \)/g,')'))]);};
  assert.equal(cols('../migrations/0003_pick_stats.sql'),cols('../schema.sql'));
  const sql=readFileSync(new URL('../migrations/0003_pick_stats.sql',import.meta.url),'utf8').replace(/--.*$/gm,'');assert.ok(!/^\s*(DROP|DELETE|UPDATE|ALTER|INSERT)\b/im.test(sql),'migration only adds');assert.ok(!/quota|trial_applications|loop_events/.test(sql),'other tables untouched');
  const db=new mod.DatabaseSync(':memory:');db.exec(readFileSync(new URL('../schema.sql',import.meta.url),'utf8'));
  for(const bad of ["('2026-09-25','bar','dish','good','',1)","('2026-09-25','food','dish','great','',1)","('2026-09-25','food','料理','good','',1)","('x','food','dish','good','',1)","('2026-09-25','food','dish','good','"+'a'.repeat(21)+"',1)"])
    assert.throws(()=>db.exec('INSERT INTO pick_stats (day,kind,topic,rating,detail,count) VALUES '+bad),/CHECK/,bad);});
test('pick-stat: public/app.js sends only {kind, picks} to /api/pick-stat, once per session, after the candidates are shown',()=>{
  const app=readFileSync(new URL('../public/app.js',import.meta.url),'utf8');const fn=app.slice(app.indexOf('function sendPickStat'),app.indexOf('function openWriteOwn'));
  assert.ok(fn.includes("const body={kind:Object.hasOwn(Compose.TOPICS,kind)?kind:'general',picks:[...picks].map(([topic,p])=>({topic,rating:p.rating,details:[...p.details]}))};"),fn);
  assert.ok(!/storeName|reviewUrl|tidied|addition|location|candidateTexts/.test(fn),'no store name, link or text near the pick counts');assert.ok(/hk-pick-stat/.test(fn));
  assert.ok(/if\(!renderCandidates\(\)\)return;\n\s*sendPickStat\(\);/.test(app),'sent right after the candidates are built');});

// ③ 時間と離脱（匿名）・① 店ごとの声の報告と札・② 自由記述の AI 分類
const sha=v=>createHash('sha256').update(v).digest('hex');
function apiReq(path,body,ip='192.0.2.70',extra={}){return new Request(origin+path,{method:'POST',headers:{origin,'content-type':'application/json','cf-connecting-ip':ip,...extra},body:typeof body==='string'?body:JSON.stringify(body)});}
const allRows=q=>JSON.stringify(['stores','store_picks','store_steps','funnel_times','pick_stats','loop_events','quota','trial_applications'].map(t=>q.db.prepare('SELECT * FROM '+t).all()));
async function newStore(s,kind='food',ip='192.0.2.70'){const r=await invoke(apiReq('/api/store',{kind},ip),s.env);assert.equal(r.status,200,JSON.stringify(r.body));return r.body;}
const report=async(s,token,ip='192.0.2.71')=>invoke(apiReq('/api/report',{token},ip),s.env);
test('store: issues a 16-byte random sid and a 32-byte random token; D1 keeps sid, SHA-256(token), kind and day only; the two are independent and never derived from the store',async(t)=>{const s=await trialEnv(t);if(!s)return;
  const a=await newStore(s),b=await newStore(s,'food');
  assert.match(a.sid,/^[A-Za-z0-9_-]{22}$/);assert.match(a.token,/^[A-Za-z0-9_-]{43}$/);assert.deepEqual(Object.keys(a).sort(),['sid','token']);
  assert.notEqual(a.sid,b.sid);assert.notEqual(a.token,b.token);assert.ok(!a.token.includes(a.sid)&&!a.sid.includes(a.token.slice(0,8)));
  const rows=s.q.db.prepare('SELECT * FROM stores ORDER BY rowid').all().map(r=>({...r}));
  assert.deepEqual(rows[0],{sid:a.sid,token_hash:sha(a.token),kind:'food',created_day:dayOf(Date.now()),last_used_day:dayOf(Date.now())});
  const dump=allRows(s.q);assert.ok(!dump.includes(a.token)&&!dump.includes(b.token),'the token itself is never stored');assert.ok(!dump.includes('192.0.2.70'));
  // entropy: 200 sids/tokens are all distinct and use the whole alphabet (not derived from anything fixed)
  const ids=new Set(),toks=new Set();for(let i=0;i<200;i++){ids.add((await import('../worker.mjs')).newStoreId());toks.add((await import('../worker.mjs')).newReportToken());}
  assert.equal(ids.size,200);assert.equal(toks.size,200);assert.ok(new Set([...toks].join('')).size>=60,'base64url alphabet in use');
  for(const body of [{kind:'bar'},{kind:'food',storeName:'架空の喫茶店'},{kind:'food',review:'https://g.page/r/x/review'},{},[]])assert.equal((await invoke(apiReq('/api/store',body),s.env)).status,400,JSON.stringify(body));
  assert.equal((await invoke(apiReq('/api/store',{kind:'food'},'192.0.2.70',{origin:'https://evil.example'}),s.env)).status,403);
  const codes=[];for(let i=0;i<STORE_CAPS.perSenderDay+1;i++)codes.push((await invoke(apiReq('/api/store',{kind:'general'},'198.51.100.90'),s.env)).status);
  assert.deepEqual(codes,[...Array(STORE_CAPS.perSenderDay).fill(200),429]);
  const n={QUOTA:s.q};assert.equal((await invoke(apiReq('/api/store',{kind:'food'}),n)).status,503,'no salt: nothing issued');});
test('report: the token is checked by its hash; a wrong or made-up token gets 404 and a malformed one 400; the token is only read from the POST body',async(t)=>{const s=await trialEnv(t);if(!s)return;
  const a=await newStore(s);
  assert.equal((await report(s,a.token)).status,200);
  const flip=a.token.slice(0,-1)+(a.token.endsWith('A')?'B':'A');
  for(const tok of [flip,'A'.repeat(43),a.sid+'A'.repeat(21)])assert.equal((await report(s,tok)).status,404,tok);
  for(const body of [{token:a.token.slice(1)},{token:a.token+'x'},{token:a.token,sid:a.sid},{},{token:1}])assert.equal((await invoke(apiReq('/api/report',body),s.env)).status,400,JSON.stringify(body));
  assert.equal((await invoke(new Request(origin+'/api/report?token='+a.token),s.env)).status,405,'no GET with the token in the URL');});
test('report: fewer than REPORT_MIN candidate views shows nothing but "not enough"; after that each cell under REPORT_MIN is null; only this store, only the last 4 weeks, only a sid issued for the same kind',async(t)=>{const s=await trialEnv(t);if(!s)return;
  const a=await newStore(s,'food'),other=await newStore(s,'food');
  const pick=(sid,picks,ip)=>invoke(apiReq('/api/pick-stat',{kind:'food',picks,sid},ip),s.env);
  const W={topic:'wait',rating:'concern',details:['serving']},D={topic:'dish',rating:'good'};
  for(let i=0;i<REPORT_MIN-1;i++)assert.equal((await pick(a.sid,[W,D],'198.51.100.'+i)).status,200);
  let r=(await report(s,a.token)).body;assert.deepEqual(r,{kind:'food',since:dayOf(Date.now()-(REPORT_DAYS-1)*86400000),days:REPORT_DAYS,min:REPORT_MIN,enough:false,settings:{route:false,consentAt:null,line:'',instagram:''}});  // 管理画面: the settings come along
  await pick(a.sid,[W,{topic:'drink',rating:'ok'}],'198.51.100.50');
  for(let i=0;i<3;i++)await pick(other.sid,[{topic:'price',rating:'concern'}],'198.51.100.6'+i);
  await invoke(apiReq('/api/pick-stat',{kind:'beauty',picks:[{topic:'result',rating:'good'}],sid:a.sid}),s.env);  // kind mismatch: not this store's
  await pick('Z'.repeat(22),[W],'198.51.100.70');  // never issued: nothing stored
  r=(await report(s,a.token)).body;assert.equal(r.enough,true);assert.equal(r.responses,REPORT_MIN);
  const row=id=>r.topics.find(x=>x.topic===id);
  assert.deepEqual(row('wait'),{topic:'wait',good:null,ok:null,concern:REPORT_MIN});assert.deepEqual(row('dish'),{topic:'dish',good:null,ok:null,concern:null},'4 of 5 is under the minimum: hidden');
  assert.deepEqual(row('price'),{topic:'price',good:null,ok:null,concern:null},'another store never leaks in');
  assert.deepEqual(r.topics.map(x=>x.topic),['dish','drink','service','ambience','wait','price','location']);
  assert.deepEqual(r.steps.map(x=>x.step),REPORT_STEPS);
  assert.equal(s.q.db.prepare("SELECT count(*) n FROM store_picks WHERE sid='"+'Z'.repeat(22)+"'").get().n,0);
  // the 4-week window: rows older than REPORT_DAYS are left out
  s.q.db.exec("UPDATE store_picks SET day='2026-08-01' WHERE sid='"+a.sid+"' AND topic='drink'");s.q.db.exec("UPDATE store_steps SET day='2026-08-01' WHERE sid='"+a.sid+"'");
  assert.equal((await report(s,a.token)).body.enough,false,'old counts do not keep the report open');
  // pick-stat without sid (older QRs) keeps working and writes nothing per store
  const before=s.q.db.prepare('SELECT count(*) n FROM store_picks').get().n;
  assert.equal((await invoke(apiReq('/api/pick-stat',{kind:'food',picks:[D]}),s.env)).status,200);assert.equal(s.q.db.prepare('SELECT count(*) n FROM store_picks').get().n,before);
  for(const bad of [{kind:'food',picks:[D],sid:'short'},{kind:'food',picks:[D],sid:a.token}])assert.equal((await invoke(apiReq('/api/pick-stat',bad),s.env)).status,400);});
test('report: per-sender daily cap; a failed read releases the slot and is counted as api-report',async(t)=>{const s=await trialEnv(t);if(!s)return;
  const a=await newStore(s);const codes=[];for(let i=0;i<61;i++)codes.push((await report(s,a.token,'198.51.100.99')).status);
  assert.deepEqual([...new Set(codes.slice(0,60))],[200]);assert.equal(codes[60],429);
  s.q.db.exec('DROP TABLE store_steps');assert.equal((await report(s,a.token,'198.51.100.98')).status,503);
  assert.equal(Object.entries(s.q.rows()).filter(([k,v])=>k.startsWith('rpip:')&&v===0).length,1,'released');
  assert.deepEqual(loopRows(s.q).map(x=>[x.screen,x.error_type]),[['api-report','report_error.Error']]);});
test('notice: the owner\'s one line (≤ NOTICE_MAX) is returned with secrets masked; wording that asks for ratings or reviews is refused; nothing is stored',async(t)=>{const s=await trialEnv(t);if(!s)return;
  const a=await newStore(s,'food');const n=(topic,text)=>invoke(apiReq('/api/notice',{token:a.token,topic,text}),s.env);
  const before=allRows(s.q).replace(/"count":\d+/g,'');
  let r=await n('wait','待ち時間を短くするため、注文の受け方を変えました');assert.equal(r.status,200);assert.deepEqual(r.body,{topic:'wait',text:'待ち時間を短くするため、注文の受け方を変えました'});
  r=await n('wait','ご意見は owner@example.com へ');assert.deepEqual(r.body,{topic:'wait',text:'ご意見は [MASKED:EMAIL] へ'});
  for(const bad of ['高評価をお願いします','★5をつけてね','星5つで','5つ星','⭐️','口コミを書いてください','クチコミ','レビューお待ちしています','Googleに投稿','満点を','評価してね','ＲＥＶＩＥＷ'])
    {r=await n('wait','待ち時間を直しました。'+bad);assert.equal(r.status,400,bad);assert.deepEqual(r.body,{error:'asks_for_rating'},bad);}
  for(const bad of ['a'.repeat(NOTICE_MAX+1),'一行目\n二行目','<b>直した</b>','',' '])assert.deepEqual((await n('wait',bad)).body,{error:'invalid_input'},JSON.stringify(bad));
  assert.equal((await n('result','直しました')).status,400,'topic of another kind');assert.equal((await n('bar','直しました')).status,400);
  assert.equal((await invoke(apiReq('/api/notice',{token:'A'.repeat(43),topic:'wait',text:'直しました'}),s.env)).status,404);
  assert.equal((await invoke(apiReq('/api/notice',{token:a.token,topic:'wait',text:'直しました',store:'x'}),s.env)).status,400);
  assert.ok(!allRows(s.q).includes('注文の受け方')&&!allRows(s.q).includes('owner@'),'the sign text is not stored');
  assert.deepEqual(validNotice({token:a.token,topic:'wait',text:'  ＡＢＣを直しました '},'food'),{topic:'wait',text:'ABCを直しました'});});
test('event: {event, sec?, sid?} only; the first send carries the time bucket (counted in funnel_times) and the sid (counted for that store when issued); no IP or text anywhere',async(t)=>{const s=await trialEnv(t);if(!s)return;
  const a=await newStore(s,'food');const ev=(body,ip='192.0.2.80')=>invoke(apiReq('/api/event',body,ip),s.env);
  for(const b of [{event:'view',sec:'0-10',sid:a.sid},{event:'rating',sec:'10-20',sid:a.sid},{event:'rated',sec:'30-60',sid:a.sid},{event:'copy',sec:'120+'},{event:'copy'},{event:'view',sec:'0-10',sid:'Z'.repeat(22)}])
    assert.deepEqual((await ev(b)).body,{recorded:true},JSON.stringify(b));
  for(const b of [{event:'view',sec:'5'},{event:'view',sec:10},{event:'view',sid:a.sid},{event:'view',sec:'0-10',sid:'x'},{event:'view',sec:'0-10',storeName:'架空'},{event:'topic',sec:'0-10'},{event:'view',sec:'0-10',sid:a.sid,text:'x'}])
    assert.equal((await ev(b)).status,400,JSON.stringify(b));
  const ft=s.q.db.prepare('SELECT step,bucket,count FROM funnel_times ORDER BY step,bucket').all().map(r=>[r.step,r.bucket,r.count]);
  assert.deepEqual(ft,[['copy','120+',1],['rated','30-60',1],['rating','10-20',1],['view','0-10',2]]);
  assert.equal(s.q.rows()['ev:'+day+':copy'],2,'every send still counts in ev:');
  const st=s.q.db.prepare('SELECT sid,step,count FROM store_steps ORDER BY step').all().map(r=>[r.sid,r.step,r.count]);
  assert.deepEqual(st,[[a.sid,'rated',1],[a.sid,'rating',1],[a.sid,'view',1]],'the made-up sid wrote nothing');
  assert.ok(!allRows(s.q).includes('192.0.2.80'));
  for(const b of TIME_BUCKETS)assert.ok(validEvent({event:'view',sec:b}));});
test('funnel-stats GET: LOOP_EVENTS_TOKEN gate; per step the reach (first sends), all sends, the bucket counts and a median estimated from the buckets; closed days only',async(t)=>{const s=await trialEnv(t);if(!s)return;
  const get=(q='',auth='Bearer '+TOKEN)=>invoke(new Request(origin+'/api/funnel-stats'+q,{headers:auth?{authorization:auth}:{}}),s.env);
  assert.equal((await get()).status,404);s.env.LOOP_EVENTS_TOKEN=TOKEN;assert.equal((await get('','Bearer x')).status,401);
  s.q.db.exec("INSERT INTO funnel_times VALUES ('2026-09-23','view','0-10',10),('2026-09-23','cands','10-20',2),('2026-09-23','cands','20-30',4),('2026-09-24','cands','30-60',4),('2026-09-25','cands','0-10',50),('2026-09-24','google','120+',3)");
  s.q.db.exec("INSERT INTO quota VALUES ('ev:2026-09-23:view',12),('ev:2026-09-24:cands',11),('ev:2026-09-25:view',9),('psday:2026-09-24',3)");
  Date.now=()=>Date.parse('2026-09-25T12:00:00Z');const r=(await get('?since=2026-09-20')).body;
  assert.equal(r.before,'2026-09-25');const step=id=>r.steps.find(x=>x.step===id);
  assert.deepEqual(step('view'),{step:'view',reach:10,sends:12,buckets:{'0-10':10,'10-20':0,'20-30':0,'30-60':0,'60-120':0,'120+':0},median_sec_estimate:5,median_at_least_sec:null});
  assert.deepEqual({...step('cands'),buckets:undefined},{step:'cands',reach:10,sends:11,buckets:undefined,median_sec_estimate:27.5,median_at_least_sec:null});
  assert.deepEqual([step('google').median_sec_estimate,step('google').median_at_least_sec],[null,120]);
  assert.match(r.note,/estimated from the bucket counts/);
  assert.deepEqual(medianFromBuckets({}),{median_sec_estimate:null,median_at_least_sec:null});
  assert.deepEqual(medianFromBuckets({'10-20':1,'20-30':1}),{median_sec_estimate:20,median_at_least_sec:null});});
test('classify: only checked items survive: known topic and rating ids, known details, one per topic, and quote that is really in the customer\'s text',()=>{
  const text='料理はとてもおいしかった。でも待ち時間が長くて、駐車場もせまい';
  const out=JSON.stringify({items:[
    {topic:'dish',rating:'good',details:['taste','spicy'],quote:'料理はとてもおいしかった'},
    {topic:'wait',rating:'concern',details:[],quote:'待ち時間が 長くて'},
    {topic:'location',rating:'concern',details:['parking'],quote:'駐車場が広い'},
    {topic:'service',rating:'good',details:[],quote:'店員さんが親切'},
    {topic:'dish',rating:'concern',details:[],quote:'料理'},
    {topic:'result',rating:'good',quote:'料理'},{topic:'price',rating:'great',quote:'料理'},{topic:'price',rating:'ok'}]});
  assert.deepEqual(classifyItems('food',text,'```json\n'+out+'\n```'),[{topic:'dish',rating:'good',details:['taste'],quote:'料理はとてもおいしかった'},{topic:'wait',rating:'concern',details:[],quote:'待ち時間が 長くて'}]);
  for(const bad of ['', 'not json','{"items":"x"}','[]',null])assert.deepEqual(classifyItems('food',text,bad),[]);
  assert.ok(validClassify({kind:'food',text:'よかった'}));for(const b of [{kind:'food',text:''},{kind:'food',text:'a'.repeat(201)},{kind:'bar',text:'x'},{kind:'food',text:'x',storeName:'s'},{kind:'food',text:'<b>'}])assert.equal(validClassify(b),null,JSON.stringify(b));});
test('classify API: same AI quota, stop date and fallback as /api/draft; the text is never stored or logged; without AI nothing is preselected',async(t)=>{const s=await trialEnv(t);if(!s)return;
  const text='料理はおいしかったが、待ち時間が長かった 架空の本文';let seen;
  s.env.AI={async run(model,input){seen=input;return {response:JSON.stringify({items:[{topic:'dish',rating:'good',details:[],quote:'料理はおいしかった'},{topic:'wait',rating:'concern',details:[],quote:'待ち時間が長かった'},{topic:'price',rating:'good',details:[],quote:'安かった'}]})};}};
  const c=(body,ip='192.0.2.90')=>invoke(apiReq('/api/classify',body,ip),s.env);
  let r=await c({kind:'food',text});assert.deepEqual(r.body,{picks:[{topic:'dish',rating:'good',details:[],quote:'料理はおいしかった'},{topic:'wait',rating:'concern',details:[],quote:'待ち時間が長かった'}],mode:'ai'});
  assert.match(seen.messages[0].content,/"topic":"dish"/);assert.equal(JSON.parse(seen.messages[1].content).text,text);
  assert.equal(s.q.rows().total,1,'one AI call takes one from the shared quota');
  for(let i=0;i<9;i++)await c({kind:'food',text});r=await c({kind:'food',text});assert.deepEqual(r.body,{picks:[],mode:'fallback'},'the 11th call from one sender falls back (10 per sender per day, shared with /api/draft)');
  const d=await invoke(request({text:'ok',storeName:'s'},{'cf-connecting-ip':'192.0.2.90'}),s.env);assert.equal(d.body.mode,'fallback','/api/draft shares the same per-sender quota');
  Date.now=()=>AI_UNTIL;seen=null;r=await c({kind:'food',text},'198.51.100.5');assert.deepEqual(r.body,{picks:[],mode:'fallback'});assert.equal(seen,null,'no AI after the stop date');Date.now=()=>Date.parse('2026-09-25T00:00:00Z');
  s.env.AI={async run(){throw Error('model offline '+text);}};r=await c({kind:'food',text},'198.51.100.6');assert.deepEqual(r.body,{picks:[],mode:'fallback'});
  assert.ok(!allRows(s.q).includes('架空の本文')&&!allRows(s.q).includes('料理'),'text never stored');assert.ok(!JSON.stringify(logs).includes('架空')&&!JSON.stringify(logs).includes('offline'),'text never logged');
  assert.deepEqual(loopRows(s.q).map(x=>[x.screen,x.error_type]),[['api-classify','classify_error.Error']],'only the failure is counted (per-sender quota is expected), with its class name only');
  for(const body of [{kind:'food'},{kind:'food',text,storeName:'s'}])assert.equal((await c(body)).status,400);});
test('store report: migrations 0004+0005 and schema.sql define the same four tables; the migration only adds; CHECKs refuse other steps and buckets',async(t)=>{let mod;try{mod=await import('node:sqlite');}catch{return t.skip('node:sqlite unavailable');}
  const tables=['funnel_times','stores','store_picks','store_steps'];
  const cols=(...files)=>{const db=new mod.DatabaseSync(':memory:');for(const file of files)db.exec(readFileSync(new URL(file,import.meta.url),'utf8'));return JSON.stringify(tables.map(t=>[db.prepare('PRAGMA table_info('+t+')').all(),db.prepare("SELECT sql FROM sqlite_master WHERE tbl_name=? AND sql IS NOT NULL ORDER BY name").all(t).map(r=>r.sql.replace(/\s+/g,' ').replace(/\( /g,'(').replace(/ \)/g,')').replace(/ ,/g,','))]));};
  assert.equal(cols('../migrations/0004_store_report.sql','../migrations/0005_store_last_used.sql'),cols('../schema.sql'));
  const sql=readFileSync(new URL('../migrations/0004_store_report.sql',import.meta.url),'utf8').replace(/--.*$/gm,'');assert.ok(!/^\s*(DROP|DELETE|UPDATE|ALTER|INSERT)\b/im.test(sql));assert.ok(!/\b(quota|trial_applications|loop_events|pick_stats)\b/.test(sql));
  const db=new mod.DatabaseSync(':memory:');db.exec(readFileSync(new URL('../schema.sql',import.meta.url),'utf8'));
  for(const bad of ["INSERT INTO funnel_times VALUES ('2026-09-25','topic','0-10',1)","INSERT INTO funnel_times VALUES ('2026-09-25','view','5',1)","INSERT INTO stores VALUES ('short','"+'a'.repeat(64)+"','food','2026-09-25',NULL)","INSERT INTO stores VALUES ('"+'A'.repeat(22)+"','XYZ','food','2026-09-25',NULL)","INSERT INTO stores VALUES ('"+'A'.repeat(22)+"','"+'a'.repeat(64)+"','food','2026-09-25','9/25')"])assert.throws(()=>db.exec(bad),/CHECK/,bad);});
test('app.js: the events carry only {event, sec?, sid?}; the pick counts add sid only from the QR; #create sends only the kind to /api/store',()=>{
  const app=readFileSync(new URL('../public/app.js',import.meta.url),'utf8');
  const tr=app.slice(app.indexOf('function track('),app.indexOf('function reach('));assert.ok(tr.includes("const body={event};")&&!/storeName|reviewUrl|text|picks/.test(tr),tr);
  const is=app.slice(app.indexOf('async function issueStore'),app.indexOf('function showOwnerCopy'));assert.ok(is.includes('JSON.stringify({kind})')&&!/storeName|name|url\b/.test(is.replace('res.json','')),is);
  const pf=app.slice(app.indexOf('function preparePoster'),app.indexOf('function preparePoster')+600);assert.ok(!/report|token/.test(pf),'the poster never gets the report link');});

// ---- 保存期間（DECISIONS.md「保存期間・表示基準」）: scheduled() の削除。今日 = 2026-09-25（beforeEach）。
// 期限: 13か月 → 2025-08-25、6か月 → 2026-03-25、1年 → 2025-09-25。境界の日は残し、その前の日は消える。
async function retentionEnv(t){const s=await trialEnv(t);if(!s)return null;s.q.db.exec('PRAGMA foreign_keys = ON');return s;}  // D1 は外部キーを強制する
const infos=[];const realLog=console.log;
beforeEach(()=>{infos.length=0;console.log=(...a)=>infos.push(a);});afterEach(()=>{console.log=realLog;});
async function runScheduled(env,now=Date.now()){const pending=[];await worker.scheduled({scheduledTime:now,cron:PURGE_CRON},env,{waitUntil(p){pending.push(p);}});await Promise.all(pending);}
const SID=c=>c.repeat(22),HASH=c=>c.repeat(64);
function addStore(db,sid,created,last){db.prepare('INSERT INTO stores (sid,token_hash,kind,created_day,last_used_day) VALUES (?,?,?,?,?)').run(sid,HASH(sid[0].toLowerCase()==sid[0]?'a':'b').slice(0,63)+sid[0].toLowerCase().replace(/[^0-9a-f]/,'c'),'food',created,last);}
const loopRow=(db,day,fp,text)=>db.prepare("INSERT INTO loop_events (day,product,kind,screen,version,fp,category,text_masked) VALUES (?,'hitokoto-beta',?,?,'v1',?,?,?)").run(day,text===null?'error':'feedback',text===null?'customer':'lp',fp,text===null?null:'idea',text);
const days=(db,table,where='')=>db.prepare('SELECT day FROM '+table+(where?' WHERE '+where:'')+' ORDER BY day').all().map(r=>r.day);
test('retention: cutoffs are calendar months in UTC days (13 / 6 / 12), month ends are clamped, and the plan uses them',()=>{
  assert.deepEqual(RETENTION_MONTHS,{counts:13,ownerText:6,storeIdle:12});
  assert.deepEqual(purgePlan(Date.parse('2026-09-25T00:00:00Z')).cutoffs,{counts:'2025-08-25',ownerText:'2026-03-25',storeIdle:'2025-09-25'});
  assert.deepEqual(purgePlan(Date.parse('2026-09-25T23:59:59Z')).cutoffs,{counts:'2025-08-25',ownerText:'2026-03-25',storeIdle:'2025-09-25'},'UTC day, not JST');
  assert.equal(monthsBefore('2026-03-31',1),'2026-02-28');assert.equal(monthsBefore('2028-02-29',12),'2027-02-28');assert.equal(monthsBefore('2026-01-15',13),'2024-12-15');assert.equal(monthsBefore('2026-08-31',6),'2026-02-28');
  assert.match(PURGE_CRON,/^\d{1,2} \d{1,2} \* \* \*$/,'once a day');});
test('retention: each table keeps the boundary day and loses the day before it (13 months; owner text 6 months, whole row); quota rows are not touched',async(t)=>{const s=await retentionEnv(t);if(!s)return;const db=s.q.db;
  addStore(db,SID('A'),'2025-01-01','2026-09-20');
  for(const d of ['2025-08-24','2025-08-25','2026-09-24']){
    db.prepare("INSERT INTO funnel_times VALUES (?,'view','0-10',1)").run(d);
    db.prepare("INSERT INTO pick_stats VALUES (?,'food','dish','good','',1)").run(d);
    db.prepare("INSERT INTO store_picks VALUES (?,?,'dish','good','',1)").run(SID('A'),d);
    db.prepare("INSERT INTO store_steps VALUES (?,?,'view',1)").run(SID('A'),d);}
  loopRow(db,'2025-08-24','e000000000000001',null);loopRow(db,'2025-08-25','e000000000000002',null);loopRow(db,'2026-03-24','e000000000000003',null);
  loopRow(db,'2026-03-24','f000000000000001','[MASKED:EMAIL] の表示が遅い');loopRow(db,'2026-03-25','f000000000000002','ボタンが小さい');
  db.exec("INSERT INTO quota VALUES ('total',5),('trtotal',2),('ev:2025-08-24:view',3),('ev:2025-08-25:view',4),('ev:2025-08-24:cands',1),('ip:2026-09-24:h',2),('trip:2026-09-21:h',1)");
  await runScheduled(s.env);
  for(const tb of ['funnel_times','pick_stats','store_picks','store_steps'])assert.deepEqual(days(db,tb),['2025-08-25','2026-09-24'],tb);
  assert.deepEqual(days(db,'loop_events','text_masked IS NULL'),['2025-08-25','2026-03-24'],'rows without text: 13 months');
  assert.deepEqual(db.prepare('SELECT day, fp, text_masked FROM loop_events WHERE text_masked IS NOT NULL').all().map(r=>({...r})),[{day:'2026-03-25',fp:'f000000000000002',text_masked:'ボタンが小さい'}],'owner text: the whole row (text and the fp made from it) goes after 6 months');
  assert.equal(db.prepare("SELECT count(*) n FROM loop_events WHERE fp='f000000000000001'").get().n,0);
  assert.equal(db.prepare('SELECT count(*) n FROM stores').get().n,1,'a store in use stays');
  assert.deepEqual(s.q.rows(),{'ev:2025-08-25:view':4,'ip:2026-09-24:h':2,total:5,trtotal:2},'ev: step counts: 13 months by the day in the key; lifetime counters stay; rate-limit rows older than 3 days go daily (trip:2026-09-21), newer ones stay');
  const line=infos.find(a=>a[0]==='retention_purge');assert.ok(line,'one summary line');
  const out=JSON.parse(line[1]);const rate=Object.fromEntries(Object.entries(out.deleted).filter(([k])=>k.startsWith('quota_rate_')));for(const k of Object.keys(rate))delete out.deleted[k];assert.equal(rate.quota_rate_trip,1);assert.equal(Object.values(rate).reduce((a,b)=>a+b,0),1);assert.deepEqual(out,{deleted:{funnel_times:1,pick_stats:1,quota_ev:2,store_picks:1,store_steps:1,store_held_picks:0,store_route_counts:0,loop_events:1,loop_events_owner_text:1,store_picks_idle_store:0,store_steps_idle_store:0,store_held_picks_idle_store:0,store_route_counts_idle_store:0,store_settings_idle_store:0,store_route_log_idle_store:0,stores:0},more:[],failed:[]});  // 0006 tables added (管理画面)
  const all=JSON.stringify([infos,logs]);for(const secret of ['MASKED','遅い','ボタン',SID('A'),'2025-08-24','2026-03-24'])assert.ok(!all.includes(secret),'log has table names and counts only: '+secret);});
test('retention: a store goes 1 year after it was last used (last_used_day, else created_day), with its store_picks/store_steps first; the day of the boundary stays',async(t)=>{const s=await retentionEnv(t);if(!s)return;const db=s.q.db;
  addStore(db,SID('A'),'2024-01-01','2025-09-24');  // idle: 1 day past the year
  addStore(db,SID('B'),'2024-01-01','2025-09-25');  // exactly one year: stays
  addStore(db,SID('C'),'2025-09-24',null);          // never used since 0004: created_day counts
  addStore(db,SID('D'),'2025-09-25',null);
  for(const sid of ['A','B','C','D'].map(SID)){db.prepare("INSERT INTO store_picks VALUES (?,'2025-09-20','dish','good','',1)").run(sid);db.prepare("INSERT INTO store_steps VALUES (?,'2025-09-20','picks',1)").run(sid);}
  await runScheduled(s.env);
  assert.deepEqual(db.prepare('SELECT sid FROM stores ORDER BY sid').all().map(r=>r.sid),[SID('B'),SID('D')]);
  for(const tb of ['store_picks','store_steps'])assert.deepEqual(db.prepare('SELECT DISTINCT sid FROM '+tb+' ORDER BY sid').all().map(r=>r.sid),[SID('B'),SID('D')],tb);
  const out=JSON.parse(infos.find(a=>a[0]==='retention_purge')[1]);assert.equal(out.deleted.stores,2);assert.equal(out.deleted.store_picks_idle_store,2);assert.equal(out.deleted.store_steps_idle_store,2);assert.deepEqual(out.failed,[]);});
test('retention: at most PURGE_LIMIT rows per statement; the rest waits for the next day, and a store is removed only after its rows are gone (no foreign key error)',async(t)=>{const s=await retentionEnv(t);if(!s)return;const db=s.q.db;
  assert.equal(PURGE_LIMIT,5000);
  for(let i=0;i<7;i++)db.prepare("INSERT INTO funnel_times VALUES (?,'view','0-10',1)").run('2024-0'+(i+1)+'-01');
  addStore(db,SID('A'),'2024-01-01','2025-01-01');for(let i=0;i<5;i++)db.prepare("INSERT INTO store_picks VALUES (?,?,'dish','good','',1)").run(SID('A'),'2025-09-0'+(i+1));
  const runs=[];for(let i=0;i<4;i++)runs.push(await purgeExpired(s.q,Date.now(),3));
  assert.deepEqual(runs.map(r=>r.deleted.funnel_times),[3,3,1,0]);assert.deepEqual(runs.map(r=>r.more.includes('funnel_times')),[true,true,false,false]);
  assert.deepEqual(runs.map(r=>r.deleted.store_picks_idle_store),[3,2,0,0]);assert.deepEqual(runs.map(r=>r.deleted.stores),[0,1,0,0],'the store waits until its picks are gone');
  assert.ok(runs.every(r=>r.failed.length===0),JSON.stringify(runs.map(r=>r.failed)));
  assert.equal(db.prepare('SELECT count(*) n FROM funnel_times').get().n,0);assert.equal(db.prepare('SELECT count(*) n FROM stores').get().n,0);});
test('retention: one failing statement is logged by table name only and the other tables are still purged; no D1 binding logs and returns',async(t)=>{const s=await retentionEnv(t);if(!s)return;const db=s.q.db;
  db.prepare("INSERT INTO funnel_times VALUES ('2024-01-01','view','0-10',1)").run();db.prepare("INSERT INTO pick_stats VALUES ('2024-01-01','food','dish','good','',1)").run();
  const prep=s.q.prepare.bind(s.q);const broken={...s.q,prepare:sql=>sql.includes('FROM funnel_times')?{bind(){return {async run(){throw new TypeError('D1_ERROR: secret detail 2024-01-01');}};}}:prep(sql)};
  await runScheduled({QUOTA:broken});
  assert.equal(db.prepare('SELECT count(*) n FROM funnel_times').get().n,1);assert.equal(db.prepare('SELECT count(*) n FROM pick_stats').get().n,0);
  assert.deepEqual(logs.filter(l=>l[1]==='retention_purge_failed'),[['error','retention_purge_failed','funnel_times','TypeError']]);
  assert.ok(!JSON.stringify([logs,infos]).includes('secret detail'));assert.deepEqual(JSON.parse(infos.find(a=>a[0]==='retention_purge')[1]).failed,['funnel_times']);
  logs.length=0;await runScheduled({});assert.deepEqual(logs,[['error','retention_purge_failed','bindings']]);});
test('retention: last_used_day is set when the store is made, and moved to today by a pick, a stage and the owner opening the report; at most one write per store per day',async(t)=>{const s=await retentionEnv(t);if(!s)return;const db=s.q.db;
  Date.now=realNow;  // /api/event dates by new Date() (the real clock), so every route here runs on the real clock
  const a=await newStore(s,'food');const today=dayOf(Date.now());const last=()=>db.prepare('SELECT last_used_day d FROM stores WHERE sid=?').get(a.sid).d;
  assert.equal(last(),today);
  const writes=[];const prep=s.q.prepare.bind(s.q);s.q.prepare=sql=>{const st=prep(sql);if(!sql.startsWith('UPDATE stores'))return st;return {bind(...v){const b=st.bind(...v);return {...b,async run(){const r=await b.run();writes.push(r.meta.changes);return r;}};}};};
  const old=()=>db.prepare("UPDATE stores SET last_used_day='2025-01-01' WHERE sid=?").run(a.sid);
  old();assert.equal((await invoke(apiReq('/api/pick-stat',{kind:'food',picks:[{topic:'dish',rating:'good'}],sid:a.sid},'198.51.100.1'),s.env)).status,200);assert.equal(last(),today,'pick');
  old();assert.equal((await invoke(apiReq('/api/pick-stat',{kind:'beauty',picks:[{topic:'result',rating:'good'}],sid:a.sid},'198.51.100.2'),s.env)).status,200);assert.equal(last(),'2025-01-01','a sid sent with another kind is not this store');
  old();assert.equal((await invoke(apiReq('/api/event',{event:'view',sec:'0-10',sid:a.sid},'198.51.100.3'),s.env)).status,200);assert.equal(last(),today,'stage');
  old();assert.equal((await report(s,a.token)).status,200);assert.equal(last(),today,'report');
  writes.length=0;await report(s,a.token);await invoke(apiReq('/api/pick-stat',{kind:'food',picks:[{topic:'dish',rating:'good'}],sid:a.sid},'198.51.100.4'),s.env);await invoke(apiReq('/api/event',{event:'view',sec:'0-10',sid:a.sid},'198.51.100.5'),s.env);
  assert.deepEqual(writes,[0,0,0],'same day: the UPDATE matches no row, nothing is written');
  const n=await invoke(apiReq('/api/report',{token:'Q'.repeat(43)}),s.env);assert.equal(n.status,404);assert.equal(last(),today);});
test('retention: migration 0005 adds last_used_day to stores and marks stores that already exist as used on the day it is applied (never older)',async(t)=>{let mod;try{mod=await import('node:sqlite');}catch{return t.skip('node:sqlite unavailable');}
  const sql=readFileSync(new URL('../migrations/0005_store_last_used.sql',import.meta.url),'utf8');const bare=sql.replace(/--.*$/gm,'').trim();
  assert.ok(!/\b(DROP|DELETE|INSERT)\b/i.test(bare));assert.ok(!/\b(quota|trial_applications|loop_events|pick_stats|funnel_times|store_picks|store_steps)\b/.test(bare));
  const db=new mod.DatabaseSync(':memory:');db.exec(readFileSync(new URL('../migrations/0004_store_report.sql',import.meta.url),'utf8'));
  db.prepare("INSERT INTO stores VALUES (?,?,'food','2024-01-01')").run(SID('A'),HASH('a'));db.exec(sql);
  const today=new Date().toISOString().slice(0,10);  // SQLite date('now') is the real UTC day
  assert.deepEqual({...db.prepare('SELECT created_day, last_used_day FROM stores').get()},{created_day:'2024-01-01',last_used_day:today});});
test('retention: privacy.html and the LP state the same periods as the code, and no TODO is left',()=>{
  const privacy=readFileSync(new URL('../public/privacy.html',import.meta.url),'utf8'),lp=readFileSync(new URL('../public/index.html',import.meta.url),'utf8');
  assert.ok(!/TODO/.test(privacy),'no TODO left in privacy.html');
  const list=privacy.slice(privacy.indexOf('<dl class="retention-list">'),privacy.indexOf('</dl>'));
  const when=Object.fromEntries([...list.matchAll(/<dt>([^<]+)<\/dt>[\s\S]*?いつ消すか<\/span>([^<]+)<\/dd>/g)].map(m=>[m[1],m[2]]));
  assert.deepEqual(Object.keys(when),['試用のお申し込み','時間の計測（利用状況の件数）','話題の件数','お店ごとの報告','お店の設定','店主のご意見','エラーの記録','連打対策']);  // お店の設定: 0006 (管理画面)
  assert.equal(when['お店の設定'],'お店の登録と一緒に、最後に使われた日から'+(m0=>m0.storeIdle/12)(RETENTION_MONTHS)+'年');
  const m=RETENTION_MONTHS;
  for(const k of ['時間の計測（利用状況の件数）','話題の件数','エラーの記録'])assert.equal(when[k],'記録した日から'+m.counts+'か月',k);
  assert.ok(when['お店ごとの報告'].startsWith('件数は記録した日から'+m.counts+'か月。')&&when['お店ごとの報告'].includes('最後に使われた日から'+(m.storeIdle/12)+'年'));
  assert.equal(when['店主のご意見'],'受け取ってから'+m.ownerText+'か月');assert.equal(when['連打対策'],'3日後');
  assert.ok(when['試用のお申し込み'].startsWith('試用期間の終了から1年。'));
  assert.ok(privacy.includes('ご意見の内容は、受け取ってから'+m.ownerText+'か月で削除します。'));
  assert.ok(lp.includes('エラーの記録は'+m.counts+'か月、店主のご意見は'+m.ownerText+'か月、お店の登録と設定は最後に使われてから1年で、毎日自動で削除します。'));});
test('retention: when the last-used write fails, the report answers 503 (the owner can retry) and the failure is counted, never silently skipped',async(t)=>{const s=await retentionEnv(t);if(!s)return;
  const a=await newStore(s,'food');const prep=s.q.prepare.bind(s.q);
  s.q.prepare=sql=>sql.startsWith('UPDATE stores SET last_used_day')?{bind(){return {async run(){throw new TypeError('D1_ERROR');}};}}:prep(sql);
  assert.equal((await report(s,a.token)).status,503);
  assert.equal(s.q.db.prepare("SELECT count(*) n FROM loop_events WHERE screen='api-report' AND error_type='report_error.TypeError'").get().n,1);});

test('連打対策の行は API が使われない日が続いても毎日3日で消える（接頭辞は worker 内の LIKE と一致）', async () => {
  const src=(await import('node:fs')).readFileSync(new URL('../worker.mjs', import.meta.url),'utf8');
  const likes=[...src.matchAll(/LIKE '([a-z]+):%'/g)].map(m=>m[1]).filter(p=>p!=='ev');
  const mod=await import('../worker.mjs');
  assert.deepEqual([...new Set(likes)].sort(),[...mod.RATE_KEY_PREFIXES].sort());
  const now=Date.parse('2026-10-10T00:00:00Z');
  const plan=mod.purgePlan(now);
  for(const p of mod.RATE_KEY_PREFIXES){
    const step=plan.steps.find(s=>s[0]==='quota_rate_'+p);
    assert.ok(step,p);
    assert.equal(step[2],p+':2026-10-07');
    // 3日前の日付のキーは残り、それより前は消える（文字列の大小）
    assert.ok((p+':2026-10-06:x') < step[2]);
    assert.ok(!((p+':2026-10-07:x') < step[2]));
  }
});

// ---- PR #14 / #13 審査の軽い指摘（fix/hitokoto-review-nits） ----
test('report token: the row found by SHA-256 is checked again against the computed hash (constant time); a lookup that returns another row is 404',async(t)=>{const s=await trialEnv(t);if(!s)return;
  const a=await newStore(s);assert.equal((await report(s,a.token)).status,200);
  // simulate a lookup that hands back a row whose hash is not the one asked for (index/collation fault): must not open the report
  const prep=s.q.prepare.bind(s.q);s.q.prepare=sql=>{const st=prep(sql);if(/FROM stores WHERE token_hash = \?/.test(sql))return {bind(){return st.bind(sha(a.token));}};return st;};
  const wrong=await report(s,'A'.repeat(43));assert.equal(wrong.status,404,JSON.stringify(wrong.body));assert.deepEqual(wrong.body,{error:'not_found'});
  assert.equal((await report(s,a.token)).status,200,'the right token still opens it');
  const src=readFileSync(new URL('../worker.mjs',import.meta.url),'utf8');const fn=src.slice(src.indexOf('async function storeFor'),src.indexOf('export async function storeReport'));
  assert.match(fn,/tokenMatches\(/,'storeFor compares the stored hash with tokenMatches');});
test('operator GETs (/api/loop-events, /api/pick-stats, /api/funnel-stats) share a daily call cap in quota; refused and unauthorised calls do not use it; old rows are purged',async(t)=>{const s=await trialEnv(t);if(!s)return;
  const mod=await import('../worker.mjs');const cap=(mod.OPERATOR_CAPS||{}).day??500;s.env.LOOP_EVENTS_TOKEN=TOKEN;
  const today=dayOf(Date.now());s.q.db.exec("INSERT INTO quota VALUES ('opday:"+today+"',"+(cap-1)+"),('opday:2026-09-01',7)");
  const get=(path,auth='Bearer '+TOKEN)=>invoke(new Request(origin+path,{headers:auth?{authorization:auth}:{}}),s.env);
  assert.equal((await get('/api/loop-events','Bearer x')).status,401);assert.equal(s.q.rows()['opday:'+today],cap-1,'401 does not count');
  assert.equal((await get('/api/loop-events')).status,200);
  for(const p of ['/api/pick-stats','/api/funnel-stats','/api/loop-events']){const r=await get(p);assert.equal(r.status,429,p);assert.deepEqual(r.body,{error:'rate_limited'});}
  assert.equal(s.q.rows()['opday:'+today],cap);assert.equal(s.q.rows()['opday:2026-09-01'],undefined,'stale operator rows purged');
  assert.ok(mod.RATE_KEY_PREFIXES.includes('opday'),'the daily purge knows the new prefix');});
test('trial: the same application sent again within a short time is saved once, notified once, and the repeat uses no quota',async(t)=>{const s=await trialEnv(t);if(!s)return;s.env.SLACK_WEBHOOK_URL=HOOK;
  await withFetch(()=>new Response('ok'),async calls=>{
    assert.deepEqual((await invoke(trialRequest(),s.env)).body,{ok:true});
    const again=await invoke(trialRequest(),s.env);assert.equal(again.status,200);assert.deepEqual(again.body,{ok:true});
    assert.equal(trialRows(s.q).length,1,'double submit is one row');assert.equal(calls.length,1,'one Slack notice');
    assert.equal(s.q.rows().trtotal,1,'repeat released its lifetime slot');assert.equal(s.q.rows()['trday:'+day],1);
    // a burst of the same (new) content from several senders at once: still one row
    const burst={...trialOk,message:'同時に押されたとき'};
    const rs=await Promise.all([0,1,2,3].map(i=>invoke(trialRequest(burst,{'cf-connecting-ip':'198.51.100.'+(40+i)}),s.env)));
    assert.ok(rs.every(r=>r.status===200));assert.equal(trialRows(s.q).filter(r=>r.message===burst.message).length,1);assert.equal(calls.length,2);assert.equal(s.q.rows().trtotal,2);
    // different content is a new application; the same content after the window is a new one too
    assert.equal((await invoke(trialRequest({...trialOk,message:'別の内容'}),s.env)).status,200);assert.equal(trialRows(s.q).length,3);
    const mod=await import('../worker.mjs');const win=mod.TRIAL_DEDUP_MS??600000;const base=Date.now();Date.now=()=>base+win+1000;
    assert.equal((await invoke(trialRequest(undefined,{'cf-connecting-ip':'198.51.100.60'}),s.env)).status,200);assert.equal(trialRows(s.q).length,4,'outside the window it is saved again');});});
test('trial: a repeat is recognised before any quota is reserved: a sender at the daily cap who resends the last application gets 200, and nothing is counted',async(t)=>{const s=await trialEnv(t);if(!s)return;
  for(let i=0;i<TRIAL_CAPS.perSenderDay;i++)assert.equal((await invoke(trialRequest(trialNo(i)),s.env)).status,200);
  const before=s.q.rows();const again=await invoke(trialRequest(trialNo(TRIAL_CAPS.perSenderDay-1)),s.env);
  assert.equal(again.status,200,'crosscheck r1: the resend must not be refused as rate limited');assert.deepEqual(again.body,{ok:true});
  assert.deepEqual(s.q.rows(),before,'no quota row moved');assert.equal(trialRows(s.q).length,TRIAL_CAPS.perSenderDay);
  assert.equal((await invoke(trialRequest(trialNo(50)),s.env)).status,429,'a new application from the same sender is still limited');});
test('trial: trtotal is reserved last, so a 429 never holds it: a failing release on the 429 path cannot leak the lifetime slot',async(t)=>{const s=await trialEnv(t);if(!s)return;
  s.q.db.exec("INSERT INTO quota VALUES ('trday:"+day+"',"+TRIAL_CAPS.day+"),('trtotal',7)");const prep=s.q.prepare.bind(s.q);
  s.q.prepare=sql=>{if(sql.startsWith('UPDATE quota SET count=MAX'))throw Error('D1_ERROR: flaky');return prep(sql);};
  const r=await invoke(trialRequest(),s.env);assert.ok([429,503].includes(r.status));s.q.prepare=prep;assert.equal(s.q.rows().trtotal,7,'trtotal untouched on the day-cap refusal');
  s.q.db.exec("UPDATE quota SET count=0 WHERE key='trday:"+day+"'; UPDATE quota SET count="+TRIAL_CAPS.total+" WHERE key='trtotal'");
  s.q.prepare=sql=>{if(sql.startsWith('UPDATE quota SET count=MAX'))throw Error('D1_ERROR: flaky');return prep(sql);};
  const r2=await invoke(trialRequest(undefined,{'cf-connecting-ip':'198.51.100.61'}),s.env);assert.ok([429,503].includes(r2.status));s.q.prepare=prep;assert.equal(s.q.rows().trtotal,TRIAL_CAPS.total,'refused trtotal is never incremented');
  const src=readFileSync(new URL('../worker.mjs',import.meta.url),'utf8');assert.match(src,/\['trip:'\+day\+':'\+hash,TRIAL_CAPS\.perSenderDay\],\['trday:'\+day,TRIAL_CAPS\.day\],\['trtotal',TRIAL_CAPS\.total\]\]/,'trtotal stays last');});
test('trial notice: a missing receipt number is written as such, never "null", "false" or "undefined"',()=>{
  for(const id of [null,undefined,false,0,-1,1.5,'x'])assert.ok(!/null|false|undefined|NaN/.test(trialNotice('架空の喫茶店',id).text),String(id));
  assert.match(trialNotice('架空の喫茶店',null).text,/受付番号 （不明）$/);assert.equal(trialNotice('架空の喫茶店',12).text,'ひとことβ 試用の申し込み：店名「架空の喫茶店」 受付番号 12');});

// ---- 店主の管理画面（2026-10-02 本人決定。~/tasks/reviews-lp/DECISIONS.md 末尾）----
// ① 画面の最初は「お客さまの声」（話題ごとの よかった/ふつう/気になった・どこが・お店にだけ届いた声）、その下に到達の数字（日ごと）、効果、札、設定。
// ② 振り分け: 店主が選べる・既定オフ・同意制（Google のポリシーの原文とおそれを読んで同意したときだけオン、同意の日時を残す）。オフの店は今と1バイトも変わらない。
// ④ LINE・インスタ: 店主が URL を登録（許可したホスト・形だけ、それ以外は 400）。お客さま画面では評価と関係なく全員に同じボタン（ブラウザ試験 dashboard_browser.py）。
const M=await import('../worker.mjs');
const CMP=(await import('node:module')).createRequire(import.meta.url)('../public/compose.js');
const V=M.ROUTE_CONSENT_VERSION;
const saveSettings=(s,body,ip='192.0.2.72')=>invoke(apiReq('/api/settings',body,ip),s.env);
async function storeConfig(env,query,method='GET'){const pending=[];const r=await worker.fetch(new Request(origin+'/api/store-config'+query,{method}),env,{waitUntil(p){pending.push(p);}});await Promise.allSettled(pending);return {status:r.status,text:await r.text(),headers:r.headers};}
const NOW_ISO=()=>new Date(Date.now()).toISOString().slice(0,19)+'Z';
const allFood=k=>CMP.topicsFor('food').map((topic,i)=>({topic,rating:i<k?'concern':'good',details:i===0?[CMP.detailsFor('food',topic)[0]]:[]}));
test('settings: routing is off by default; turning it on needs consent to the current wording (anything else is 400 and stores nothing); on and off are logged with the time',async(t)=>{const s=await trialEnv(t);if(!s)return;
  assert.match(String(V),/^\d{4}-\d{2}-\d{2}$/,'the consent wording has a dated version');
  const a=await newStore(s,'food');const db=s.q.db;
  assert.deepEqual((await report(s,a.token)).body.settings,{route:false,consentAt:null,line:'',instagram:''},'off by default');
  for(const body of [{token:a.token,route:true},{token:a.token,route:true,consent:'2026-01-01'},{token:a.token,route:true,consent:true},{token:a.token,route:true,consent:''},{token:a.token,route:'yes',consent:V},{token:a.token,route:1,consent:V},{token:a.token,consent:V}]){
    const r=await saveSettings(s,body);assert.equal(r.status,400,JSON.stringify(body));}
  assert.deepEqual((await saveSettings(s,{token:a.token,route:true})).body,{error:'consent_required'});
  assert.equal(db.prepare('SELECT count(*) n FROM store_settings WHERE route_low = 1').get().n,0);assert.equal(db.prepare('SELECT count(*) n FROM store_route_log').get().n,0);
  const at=NOW_ISO();let r=await saveSettings(s,{token:a.token,route:true,consent:V});assert.equal(r.status,200,JSON.stringify(r.body));
  assert.deepEqual(r.body,{settings:{route:true,consentAt:at,line:'',instagram:''}});
  assert.deepEqual({...db.prepare('SELECT * FROM store_settings').get()},{sid:a.sid,route_low:1,route_consent_at:at,route_consent_version:V,line_url:'',instagram_url:''});
  // turning it off needs no consent (and refuses one); the last consent stays on record; a repeated "off" writes no log row
  assert.equal((await saveSettings(s,{token:a.token,route:false,consent:V})).status,400);
  r=await saveSettings(s,{token:a.token,route:false});assert.deepEqual(r.body,{settings:{route:false,consentAt:at,line:'',instagram:''}});
  await saveSettings(s,{token:a.token,route:false});
  assert.deepEqual(db.prepare('SELECT sid, at, action, consent_version FROM store_route_log ORDER BY id').all().map(x=>({...x})),[{sid:a.sid,at,action:'on',consent_version:V},{sid:a.sid,at,action:'off',consent_version:null}]);
  assert.deepEqual((await report(s,a.token)).body.settings,{route:false,consentAt:at,line:'',instagram:''});
  const dump=allRows(s.q)+JSON.stringify(db.prepare('SELECT * FROM store_settings').all())+JSON.stringify(db.prepare('SELECT * FROM store_route_log').all());
  assert.ok(!dump.includes(a.token)&&!dump.includes('192.0.2.72'),'no token or IP is stored with the settings');});
test('settings: the same gates as the report (token in the POST body, origin, method, JSON, per-sender cap shared with the report); unknown keys are refused, not dropped',async(t)=>{const s=await trialEnv(t);if(!s)return;
  const a=await newStore(s,'food');
  for(const body of [{token:a.token},{token:a.token,route:false,extra:1},{token:a.token,line:1},{token:a.token,instagram:null},{route:false},{token:'x',route:false},{token:a.token,sid:a.sid,route:false},[]])
    assert.equal((await saveSettings(s,body)).status,400,JSON.stringify(body));
  const flip=a.token.slice(0,-1)+(a.token.endsWith('A')?'B':'A');assert.equal((await saveSettings(s,{token:flip,route:false})).status,404);
  assert.equal((await invoke(apiReq('/api/settings',{token:a.token,route:false},'192.0.2.72',{origin:'https://evil.example'}),s.env)).status,403);
  assert.equal((await invoke(new Request(origin+'/api/settings'),s.env)).status,405);
  assert.equal((await invoke(apiReq('/api/settings',{token:a.token,route:false},'192.0.2.72',{'content-type':'text/plain'}),s.env)).status,415);
  for(let i=0;i<M.REPORT_CAPS.perSenderDay;i++)assert.equal((await report(s,a.token,'198.51.100.120')).status,200);
  assert.equal((await saveSettings(s,{token:a.token,route:false},'198.51.100.120')).status,429,'one daily cap for the owner page');
  assert.equal(s.q.db.prepare('SELECT count(*) n FROM store_settings').get().n,0,'nothing was saved by refused calls');});
test('settings: LINE and Instagram links: only the allowed hosts and shapes, stored in one canonical form; anything else is 400 and changes nothing',async(t)=>{const s=await trialEnv(t);if(!s)return;
  const ok=[['line','https://lin.ee/AbC123x','https://lin.ee/AbC123x'],['line','https://lin.ee/AbC123x/','https://lin.ee/AbC123x'],['line','https://LIN.EE/AbC123x','https://lin.ee/AbC123x'],
    ['line','https://line.me/R/ti/p/@abc-123','https://line.me/R/ti/p/@abc-123'],['line','https://line.me/R/ti/p/%40abc.shop','https://line.me/R/ti/p/@abc.shop'],
    ['line','https://line.me/R/ti/p/@abc_9?from=page&openQrModal=true','https://line.me/R/ti/p/@abc_9'],
    ['instagram','https://www.instagram.com/kissa.komorebi/','https://www.instagram.com/kissa.komorebi/'],['instagram','https://instagram.com/kissa_komorebi','https://www.instagram.com/kissa_komorebi/'],
    ['instagram','https://www.instagram.com/kissa_komorebi?igsh=abc123&utm_source=qr','https://www.instagram.com/kissa_komorebi/'],['line','',''],['instagram','','']];
  for(const [k,raw,want] of ok)assert.equal(M.validStoreLink(k,raw),want,raw);
  const bad={line:['http://lin.ee/AbC123x','https://lin.ee/','https://lin.ee/a/b','https://evil.example/lin.ee/AbC','https://lin.ee.evil.example/AbC','https://user:pw@lin.ee/AbC','https://lin.ee:8443/AbC','javascript:alert(1)',
      'https://line.me/R/ti/p/~personal','https://line.me/R/msg/text/?hi','https://line.me/R/ti/p/@','https://liff.line.me/123-abc','https://lin.ee/Ab<c','https://www.instagram.com/abc/',' https://lin.ee/AbC','https://lin.ee/AbC‮','https://lin.ee/'+'a'.repeat(200),'lin.ee/AbC'],
    instagram:['http://www.instagram.com/abc/','https://www.instagram.com/','https://www.instagram.com/p/Cxyz/','https://www.instagram.com/reel/Cxyz/','https://www.instagram.com/explore/','https://www.instagram.com/abc/tagged/',
      'https://instagram.com.evil.example/abc','https://m.instagram.com/abc','https://www.instagram.com/'+'a'.repeat(31)+'/','https://www.instagram.com/a%20b/','https://lin.ee/AbC123x','https://instagr.am/abc','https://www.instagram.com:444/abc']};
  const a=await newStore(s,'food');
  for(const [k,list] of Object.entries(bad))for(const raw of list){assert.equal(M.validStoreLink(k,raw),null,k+' '+raw);
    const r=await saveSettings(s,{token:a.token,[k]:raw},'198.51.100.'+(list.indexOf(raw)+1));assert.equal(r.status,400,raw);assert.deepEqual(r.body,{error:'invalid_url'});}
  for(const v of [null,1,{},[]])assert.equal(M.validStoreLink('line',v),null);assert.equal(M.validStoreLink('x','https://lin.ee/AbC'),null);
  assert.equal(s.q.db.prepare('SELECT count(*) n FROM store_settings').get().n,0);
  let r=await saveSettings(s,{token:a.token,line:'https://lin.ee/AbC123x/',instagram:'https://instagram.com/kissa_komorebi'});
  assert.deepEqual(r.body,{settings:{route:false,consentAt:null,line:'https://lin.ee/AbC123x',instagram:'https://www.instagram.com/kissa_komorebi/'}});
  r=await saveSettings(s,{token:a.token,line:''});assert.deepEqual(r.body.settings,{route:false,consentAt:null,line:'',instagram:'https://www.instagram.com/kissa_komorebi/'},'"" clears one link and keeps the other');
  assert.equal(s.q.db.prepare('SELECT count(*) n FROM store_route_log').get().n,0,'links never touch the routing log');});
test('store-config: the customer screen reads only route on/off and the two links; an unknown sid reads like a store with nothing set; GET only; never the consent time or the token',async(t)=>{const s=await trialEnv(t);if(!s)return;
  const a=await newStore(s,'food'),b=await newStore(s,'food');const NONE='{"route":false,"line":"","instagram":""}';
  let c=await storeConfig(s.env,'?s='+a.sid);assert.equal(c.status,200);assert.equal(c.text,NONE);assert.equal(c.headers.get('cache-control'),'no-store');
  assert.equal((await storeConfig(s.env,'?s='+'Z'.repeat(22))).text,NONE,'an unknown sid is not told apart');
  await saveSettings(s,{token:a.token,route:true,consent:V,line:'https://lin.ee/AbC123x'});
  c=await storeConfig(s.env,'?s='+a.sid);assert.equal(c.text,'{"route":true,"line":"https://lin.ee/AbC123x","instagram":""}');
  assert.ok(!c.text.includes(a.token)&&!/\d{4}-\d{2}-\d{2}/.test(c.text),'no token and no consent time');
  assert.equal((await storeConfig(s.env,'?s='+b.sid)).text,NONE,'another store is not affected');
  for(const q of ['','?s=short','?s='+a.token,'?s='+a.sid+'x','?s='+a.sid+'&x=1','?s='+a.sid+'&s='+b.sid])assert.equal((await storeConfig(s.env,q)).status,400,q);
  assert.equal((await storeConfig(s.env,'?s='+a.sid,'POST')).status,405);
  assert.equal((await storeConfig({},'?s='+a.sid)).text,NONE,'without D1 the screen behaves as routing off');
  const prep=s.q.prepare.bind(s.q);s.q.prepare=sql=>sql.includes('FROM store_settings')?{bind(){return {async first(){throw new TypeError('D1_ERROR');}};}}:prep(sql);
  assert.equal((await storeConfig(s.env,'?s='+a.sid)).status,503);s.q.prepare=prep;
  assert.equal(s.q.db.prepare("SELECT count(*) n FROM loop_events WHERE screen='api-store' AND error_type='store_config_error.TypeError'").get().n,1);});
test('pick-stat with routing: only a store whose routing is on counts held/passed, and only a held customer\'s picks go to store_held_picks; the answer is the same bytes either way',async(t)=>{const s=await trialEnv(t);if(!s)return;
  const on=await newStore(s,'food'),off=await newStore(s,'food');const db=s.q.db;const today=dayOf(Date.now());
  await saveSettings(s,{token:on.token,route:true,consent:V});
  assert.equal(CMP.isLow('food',allFood(4)),true);assert.equal(CMP.isLow('food',allFood(3)),false);
  const send=async(sid,picks,ip,kind='food')=>{const r=await worker.fetch(apiReq('/api/pick-stat',{kind,picks,...(sid?{sid}:{})},ip),s.env,{waitUntil(){}});return [r.status,await r.text()];};
  const answers=[await send(on.sid,allFood(4),'198.51.100.1'),await send(on.sid,allFood(3),'198.51.100.2'),await send(off.sid,allFood(7),'198.51.100.3'),await send(off.sid,allFood(0),'198.51.100.4'),await send(null,allFood(7),'198.51.100.5')];
  assert.deepEqual(answers,Array(5).fill([200,'{"recorded":true}']));
  assert.deepEqual(db.prepare('SELECT sid, day, outcome, count FROM store_route_counts ORDER BY outcome').all().map(x=>({...x})),[{sid:on.sid,day:today,outcome:'held',count:1},{sid:on.sid,day:today,outcome:'passed',count:1}]);
  const held=db.prepare('SELECT sid, topic, rating, detail, count FROM store_held_picks ORDER BY topic, detail').all().map(x=>({...x}));
  const want=allFood(4).flatMap(p=>[{sid:on.sid,topic:p.topic,rating:p.rating,detail:'',count:1},...p.details.map(d=>({sid:on.sid,topic:p.topic,rating:p.rating,detail:d,count:1}))]).sort((x,y)=>x.topic<y.topic?-1:x.topic>y.topic?1:x.detail<y.detail?-1:1);
  assert.deepEqual(held,want,'the held customer\'s picks only');
  // a sid sent with another kind is not this store; routing off again → nothing more is counted; the ordinary per-store counts never change
  await send(on.sid,[{topic:'result',rating:'concern'}],'198.51.100.6','beauty');
  await saveSettings(s,{token:on.token,route:false});await send(on.sid,allFood(7),'198.51.100.7');
  assert.equal(db.prepare('SELECT sum(count) n FROM store_route_counts').get().n,2);assert.equal(db.prepare('SELECT count(*) n FROM store_held_picks').get().n,want.length);
  assert.equal(db.prepare("SELECT sum(count) n FROM store_steps WHERE step='picks'").get().n,5,'every send with an issued sid of the same kind is still counted as before');
  assert.equal(db.prepare('SELECT count(*) n FROM store_settings WHERE sid=?').get(off.sid).n,0,'a store that never opened the settings has no row');});
test('pick-stat with routing: a failing routing write is counted and never undoes the ordinary counts or changes the answer',async(t)=>{const s=await trialEnv(t);if(!s)return;
  const on=await newStore(s,'food');await saveSettings(s,{token:on.token,route:true,consent:V});
  const prep=s.q.prepare.bind(s.q);s.q.prepare=sql=>sql.includes('store_route_counts')?{bind(){return {async run(){throw new TypeError('D1_ERROR');}};}}:prep(sql);
  const r=await invoke(apiReq('/api/pick-stat',{kind:'food',picks:allFood(5),sid:on.sid},'198.51.100.9'),s.env);assert.deepEqual([r.status,r.body],[200,{recorded:true}]);s.q.prepare=prep;
  assert.equal(s.q.db.prepare('SELECT count(*) n FROM store_picks').get().n>0,true);assert.equal(s.q.db.prepare('SELECT count(*) n FROM pick_stats').get().n>0,true);
  assert.equal(s.q.db.prepare("SELECT count(*) n FROM loop_events WHERE screen='api-pick' AND error_type='pick_route_error.TypeError'").get().n,1);});
test('report (管理画面): the voice first — "どこが" at or above the minimum, the held voices (count and topics, cells under the minimum hidden) — then the daily reach of view/cands/copy/google; settings always',async(t)=>{const s=await trialEnv(t);if(!s)return;
  const a=await newStore(s,'food'),b=await newStore(s,'food');const db=s.q.db;const d0=dayOf(Date.now()),d1=dayOf(Date.now()-86400000),old=dayOf(Date.now()-M.REPORT_DAYS*86400000);
  const step=(sid,day,st,n)=>db.prepare('INSERT INTO store_steps VALUES (?,?,?,?)').run(sid,day,st,n);
  const pick=(tb,sid,day,topic,rating,detail,n)=>db.prepare('INSERT INTO '+tb+' VALUES (?,?,?,?,?,?)').run(sid,day,topic,rating,detail,n);
  // not enough yet: only the settings come with "not enough" (nothing else leaks)
  let r=(await report(s,a.token)).body;assert.deepEqual(r,{kind:'food',since:dayOf(Date.now()-(M.REPORT_DAYS-1)*86400000),days:M.REPORT_DAYS,min:M.REPORT_MIN,enough:false,settings:{route:false,consentAt:null,line:'',instagram:''}});
  step(a.sid,d0,'picks',6);step(a.sid,d0,'view',9);step(a.sid,d1,'view',4);step(a.sid,d0,'cands',6);step(a.sid,d0,'copy',5);step(a.sid,d1,'google',2);step(a.sid,old,'view',50);step(a.sid,d0,'rating',7);
  pick('store_picks',a.sid,d0,'wait','concern','',6);pick('store_picks',a.sid,d0,'wait','concern','serving',5);pick('store_picks',a.sid,d0,'wait','concern','seating',4);
  pick('store_picks',a.sid,d0,'dish','good','',6);pick('store_picks',a.sid,d0,'dish','good','taste',7);pick('store_picks',a.sid,old,'dish','good','temp',9);
  db.prepare('INSERT INTO store_route_counts VALUES (?,?,?,?)').run(a.sid,d0,'held',5);db.prepare('INSERT INTO store_route_counts VALUES (?,?,?,?)').run(a.sid,d1,'passed',3);db.prepare('INSERT INTO store_route_counts VALUES (?,?,?,?)').run(a.sid,old,'held',9);
  pick('store_held_picks',a.sid,d0,'wait','concern','',5);pick('store_held_picks',a.sid,d0,'price','concern','',4);pick('store_held_picks',a.sid,d0,'wait','concern','serving',5);
  // another store's rows never leak in
  step(b.sid,d0,'picks',30);step(b.sid,d0,'view',30);pick('store_picks',b.sid,d0,'price','concern','tags',30);pick('store_held_picks',b.sid,d0,'price','concern','',30);db.prepare('INSERT INTO store_route_counts VALUES (?,?,?,?)').run(b.sid,d0,'held',30);
  r=(await report(s,a.token)).body;assert.equal(r.enough,true);assert.equal(r.responses,6);
  assert.deepEqual(r.details,[{topic:'dish',rating:'good',detail:'taste',count:7},{topic:'wait',rating:'concern',detail:'serving',count:5}],'only "どこが" counts at or above the minimum, in the screen order; old days are out');
  assert.deepEqual(r.daily,[{day:d1,view:null,cands:null,copy:null,google:null},{day:d0,view:9,cands:6,copy:5,google:null}],'one row per day with any of the four stages, oldest first; under the minimum is null');
  assert.deepEqual(r.route,{held:5,passed:null});
  const hrow=id=>r.held_topics.find(x=>x.topic===id);assert.deepEqual(r.held_topics.map(x=>x.topic),CMP.topicsFor('food'));
  assert.deepEqual(hrow('wait'),{topic:'wait',good:null,ok:null,concern:5});assert.deepEqual(hrow('price'),{topic:'price',good:null,ok:null,concern:null},'4 is under the minimum');
  assert.deepEqual(r.settings,{route:false,consentAt:null,line:'',instagram:''});
  // a store that never routed: no held part at all; once routing is on the part is there even with no counts yet
  db.exec("DELETE FROM store_route_counts WHERE sid='"+b.sid+"'");db.exec("DELETE FROM store_held_picks WHERE sid='"+b.sid+"'");
  r=(await report(s,b.token)).body;assert.equal(r.route,null);assert.equal(r.held_topics,null);
  await saveSettings(s,{token:b.token,route:true,consent:V});r=(await report(s,b.token)).body;assert.deepEqual(r.route,{held:null,passed:null});assert.equal(r.held_topics.length,7);});
test('store settings: migration 0006 and schema.sql define the same four tables; the migration only adds; CHECKs refuse routing on without consent, other URL shapes and outcomes',async(t)=>{let mod;try{mod=await import('node:sqlite');}catch{return t.skip('node:sqlite unavailable');}
  const tables=['store_settings','store_route_log','store_route_counts','store_held_picks'];
  const cols=(...files)=>{const db=new mod.DatabaseSync(':memory:');for(const file of files)db.exec(readFileSync(new URL(file,import.meta.url),'utf8'));return JSON.stringify(tables.map(t=>[db.prepare('PRAGMA table_info('+t+')').all(),db.prepare("SELECT sql FROM sqlite_master WHERE tbl_name=? AND sql IS NOT NULL ORDER BY name").all(t).map(r=>r.sql.replace(/\s+/g,' ').replace(/\( /g,'(').replace(/ \)/g,')').replace(/ ,/g,','))]));};
  const viaMig=cols('../migrations/0004_store_report.sql','../migrations/0005_store_last_used.sql','../migrations/0006_store_settings.sql');assert.ok(viaMig.includes('route_consent_at'));assert.equal(viaMig,cols('../schema.sql'));
  const sql=readFileSync(new URL('../migrations/0006_store_settings.sql',import.meta.url),'utf8').replace(/--.*$/gm,'');
  assert.ok(!/^\s*(DROP|DELETE|UPDATE|ALTER|INSERT)\b/im.test(sql));assert.ok(!/\b(quota|trial_applications|loop_events|pick_stats|funnel_times|store_picks|store_steps)\b/.test(sql),'no other table is touched');
  const db=new mod.DatabaseSync(':memory:');db.exec(readFileSync(new URL('../schema.sql',import.meta.url),'utf8'));
  const S="'"+'A'.repeat(22)+"'";db.exec('INSERT INTO stores VALUES ('+S+",'"+'a'.repeat(64)+"','food','2026-09-25',NULL)");
  db.exec('INSERT INTO store_settings (sid) VALUES ('+S+')');assert.deepEqual({...db.prepare('SELECT route_low, line_url, instagram_url FROM store_settings').get()},{route_low:0,line_url:'',instagram_url:''},'off and empty by default');
  for(const bad of ['UPDATE store_settings SET route_low = 1','UPDATE store_settings SET route_low = 1, route_consent_at = \'2026-09-25T00:00:00Z\'','UPDATE store_settings SET route_low = 2, route_consent_at = \'2026-09-25T00:00:00Z\', route_consent_version = \'v\'',
    "UPDATE store_settings SET route_consent_at = '2026-09-25 00:00'","UPDATE store_settings SET line_url = 'http://lin.ee/x'","UPDATE store_settings SET instagram_url = 'https://evil.example/x'","UPDATE store_settings SET line_url = 'https://"+'a'.repeat(200)+"'",
    'INSERT INTO store_route_log (sid, at, action) VALUES ('+S+",'2026-09-25T00:00:00Z','on')",'INSERT INTO store_route_log (sid, at, action, consent_version) VALUES ('+S+",'2026-09-25T00:00:00Z','off','v')",'INSERT INTO store_route_log (sid, at, action, consent_version) VALUES ('+S+",'2026-09-25T00:00:00Z','maybe','v')",
    'INSERT INTO store_route_counts VALUES ('+S+",'2026-09-25','maybe',1)",'INSERT INTO store_held_picks VALUES ('+S+",'2026-09-25','dish','bad','',1)"])assert.throws(()=>db.exec(bad),/CHECK/,bad);});
test('retention: the settings, the routing log, the held picks and the routing counts go with an idle store (children first, no foreign key error); held/route counts also after 13 months',async(t)=>{const s=await retentionEnv(t);if(!s)return;const db=s.q.db;
  addStore(db,SID('A'),'2024-01-01','2025-09-24');addStore(db,SID('B'),'2024-01-01','2026-09-20');
  for(const sid of ['A','B'].map(SID)){db.prepare("INSERT INTO store_settings VALUES (?,1,'2025-01-01T00:00:00Z','v1','https://lin.ee/AbC','')").run(sid);db.prepare("INSERT INTO store_route_log (sid, at, action, consent_version) VALUES (?,'2025-01-01T00:00:00Z','on','v1')").run(sid);
    for(const d of ['2025-08-24','2025-08-25','2026-09-24']){db.prepare("INSERT INTO store_route_counts VALUES (?,?,'held',1)").run(sid,d);db.prepare("INSERT INTO store_held_picks VALUES (?,?,'dish','concern','',1)").run(sid,d);}}
  await runScheduled(s.env);
  assert.deepEqual(db.prepare('SELECT sid FROM stores').all().map(r=>r.sid),[SID('B')]);
  for(const tb of ['store_settings','store_route_log','store_route_counts','store_held_picks'])assert.deepEqual([...new Set(db.prepare('SELECT sid FROM '+tb).all().map(r=>r.sid))],[SID('B')],tb);
  for(const tb of ['store_route_counts','store_held_picks'])assert.deepEqual(days(db,tb),['2025-08-25','2026-09-24'],tb+': 13 months, boundary kept');
  const out=JSON.parse(infos.find(a=>a[0]==='retention_purge')[1]);assert.deepEqual(out.failed,[]);assert.equal(out.deleted.stores,1);
  for(const k of ['store_settings_idle_store','store_route_log_idle_store'])assert.equal(out.deleted[k],1,k);
  const names=M.purgePlan().steps.map(x=>x[0]);assert.ok(names.indexOf('stores')===names.length-1,'stores last');
  for(const k of ['store_held_picks','store_route_counts','store_held_picks_idle_store','store_route_counts_idle_store','store_settings_idle_store','store_route_log_idle_store'])assert.ok(names.includes(k),k);});
// The baseline the "off" promise is measured against: main at the time of this change (PR #15 merge, in production as version 4a52fbfc).
const OFF_BASELINE='e4e1ebb';
test('routing off: every customer-facing API answers byte for byte like main '+OFF_BASELINE+' and leaves the same rows (a store without settings and a store with routing off but links set)',async(t)=>{
  const {execFileSync}=await import('node:child_process');const {mkdtempSync,writeFileSync,mkdirSync}=await import('node:fs');const {tmpdir}=await import('node:os');const {join}=await import('node:path');
  const repo=new URL('../..',import.meta.url).pathname;const show=p=>execFileSync('git',['show',OFF_BASELINE+':'+p],{cwd:repo});
  const dir=mkdtempSync(join(tmpdir(),'hitokoto-baseline-'));mkdirSync(join(dir,'public'));
  writeFileSync(join(dir,'worker.mjs'),show('intake-beta/worker.mjs'));writeFileSync(join(dir,'public','compose.js'),show('intake-beta/public/compose.js'));
  const base=(await import(new URL('file://'+join(dir,'worker.mjs')).href)).default;
  const runs=[];
  for(const w of [base,worker]){const q=await sqliteQuota();if(!q)return t.skip('node:sqlite unavailable');const db=q.db;
    db.exec("INSERT INTO stores VALUES ('"+SID('F')+"','"+HASH('f')+"','food','2026-09-01','2026-09-01'),('"+SID('G')+"','"+HASH('e')+"','food','2026-09-01','2026-09-01')");
    db.exec("INSERT INTO store_settings (sid, route_low, route_consent_at, route_consent_version, line_url, instagram_url) VALUES ('"+SID('G')+"',0,'2026-09-02T00:00:00Z','"+V+"','https://lin.ee/AbC123x','https://www.instagram.com/kissa/')");
    const env={QUOTA:q,QUOTA_SALT:'test-only-salt'},out=[];
    const call=async(path,body,ip)=>{const r=await w.fetch(apiReq(path,body,ip),env,{waitUntil(){}});out.push([path,r.status,r.headers.get('content-type'),r.headers.get('cache-control'),await r.text()]);};
    for(const [sid,k,ip] of [[SID('F'),7,'198.51.100.1'],[SID('G'),7,'198.51.100.2'],[SID('F'),0,'198.51.100.3'],[null,7,'198.51.100.4']])await call('/api/pick-stat',{kind:'food',picks:allFood(k),...(sid?{sid}:{})},ip);
    for(const [ev,ip] of [[{event:'view',sec:'0-10',sid:SID('F')},'198.51.100.5'],[{event:'google',sec:'30-60',sid:SID('G')},'198.51.100.6'],[{event:'copy'},'198.51.100.7']])await call('/api/event',ev,ip);
    await call('/api/draft',{text:'料理はおいしかった',storeName:'架空デモ'},'198.51.100.8');await call('/api/classify',{kind:'food',text:'料理はおいしかった'},'198.51.100.8');
    await call('/api/loop-event',{kind:'feedback',screen:'customer-edit',version:'v1',category:'confusing'},'198.51.100.9');
    // the only allowed difference: the release label (LOOP_VERSION, raised each deploy) on the server's own failure records (draft/classify
    // without AI here), and their fingerprint, which is a hash that includes that label. Rows sent by the client keep their own version and fp.
    const label=w===base?'2026.09.29-1':M.LOOP_VERSION;
    const dump=['quota','pick_stats','store_picks','store_steps','funnel_times','loop_events','stores','store_settings','store_route_log','store_route_counts','store_held_picks'].map(tb=>[tb,db.prepare('SELECT * FROM '+tb+' ORDER BY rowid').all().map(x=>tb==='loop_events'&&x.version===label?{...x,version:'LOOP_VERSION',fp:'fp(LOOP_VERSION)'}:{...x})]);
    // /api/event dates its rows by the real clock: compare the days as "today" so a run across midnight cannot differ
    runs.push(JSON.stringify([out,dump]).replaceAll(new Date().toISOString().slice(0,10),'TODAY'));}
  assert.equal(runs[1],runs[0]);
  assert.ok(runs[1].includes('store_picks')&&runs[1].includes(SID('G')),'the comparison covers the per-store rows');});
test('LP, privacy and the owner screens no longer promise "no routing", never say the service follows Google\'s policy, and explain the setting with its risk',()=>{
  const read=f=>readFileSync(new URL('../public/'+f,import.meta.url),'utf8');
  for(const f of ['index.html','privacy.html','report.html','app.js','report.js'])for(const w of ['振り分けません','振り分けず','振り分けない','振り分け・特典','低い評価だけを別の窓口に回すしくみはありません','同じGoogleの入口','同じGoogleへの入口','ポリシーに沿','規約に準拠','ポリシーに準拠','準拠しています','気持ちを誘導しない'])
    assert.ok(!read(f).includes(w),f+': '+w);
  const lp=read('index.html'),privacy=read('privacy.html'),rep=read('report.html');
  assert.ok(lp.includes('口コミの削除やビジネスプロフィールの制限を受けるおそれ'),'LP FAQ states the risk');assert.ok(lp.includes('初めはオフ'),'LP says it starts off');
  assert.ok(privacy.includes('id="store-settings"')&&privacy.includes('同意した日時'),'privacy has the settings section');
  // the consent panel quotes Google's policy as published (English original and Google's Japanese page) with the source, and states the risk
  assert.ok(rep.includes('Discourage or prohibit negative reviews, or selectively solicit positive reviews from customers'),'English original');
  assert.ok(rep.includes('顧客からの否定的なクチコミの投稿を妨げたり禁止したり、肯定的なクチコミを選択的に募ったりする行為。'),'Japanese page');
  assert.ok(rep.includes('https://support.google.com/contributionpolicy/answer/7400114'),'source');assert.ok(rep.includes('口コミの削除やビジネスプロフィールの制限'),'risk');
  const rj=read('report.js');assert.ok(rj.includes("const CONSENT_VERSION='"+V+"'"),'the page sends the version the worker expects');});
test('customer screen code: the store config is read by GET with the QR\'s sid only; the LINE/Instagram buttons open in a new tab without referrer; no incentive wording in any language; the page CSP is unchanged',async()=>{
  const app=readFileSync(new URL('../public/app.js',import.meta.url),'utf8');
  const fc=app.slice(app.indexOf('async function loadStoreConfig'),app.indexOf('function applyStoreConfig'));assert.ok(fc.length>0,'loadStoreConfig');
  assert.ok(fc.includes("fetch('/api/store-config?s='+encodeURIComponent(storeId)")&&!/storeName|reviewUrl|picks|text/.test(fc),fc);
  assert.ok(/rel:'noopener noreferrer'/.test(app)&&/target:'_blank'/.test(app));
  const I18N=Function('writingPrompts','"use strict";return ('+app.match(/^const I18N=(\{[\s\S]*?\}\}\});$/m)[1]+');')({});
  const FORBIDDEN=['割引','特典','プレゼント','クーポン','無料','ポイント','景品','お礼','値引','高評価','よい評価','満点','discount','coupon','free','reward','优惠','礼品','免费','할인','쿠폰','무료','혜택'];
  for(const [lang,d] of Object.entries(I18N))for(const k of ['heldTitle','heldNote','snsTitle','snsLine','snsInstagram']){assert.equal(typeof d[k],'string',lang+':'+k);for(const w of FORBIDDEN)assert.ok(!d[k].toLowerCase().includes(w),lang+':'+k+':'+w);}
  const r=await worker.fetch(new Request(origin),{ASSETS:{fetch:async()=>new Response('<h1>x</h1>')}},{});
  assert.equal(r.headers.get('content-security-policy'),"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'");});
