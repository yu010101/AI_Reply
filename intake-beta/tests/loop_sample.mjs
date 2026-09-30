// Prints what GET /api/loop-events returns after one of each kind of event was posted "yesterday" (UTC), run through the real
// worker on an in-memory SQLite built from schema.sql. Used by tests/loop_adapter_check.py to feed tools/loop/events.py. No network.
import {readFileSync} from 'node:fs';
import worker, {LOOP_VERSION} from '../worker.mjs';
const emit=process.emitWarning;process.emitWarning=(w,...r)=>String(w).includes('SQLite')?undefined:emit.call(process,w,...r);
const {DatabaseSync}=await import('node:sqlite');process.emitWarning=emit;
const db=new DatabaseSync(':memory:');db.exec(readFileSync(new URL('../schema.sql',import.meta.url),'utf8'));
const QUOTA={prepare(sql){const st=db.prepare(sql);return {bind(...v){return {async first(){return st.get(...v)??null;},async all(){return {results:st.all(...v)};},async run(){st.run(...v);return {success:true};}};}};}};
const TOKEN='sample-token-'+'x'.repeat(32),origin='https://hitokoto.example';
const env={QUOTA,QUOTA_SALT:'sample-salt',LOOP_EVENTS_TOKEN:TOKEN};
const call=async req=>{const p=[];const r=await worker.fetch(req,env,{waitUntil(x){p.push(x);}});await Promise.allSettled(p);return r;};
const post=(path,body,ip)=>call(new Request(origin+path,{method:'POST',headers:{origin,'content-type':'application/json','cf-connecting-ip':ip},body:JSON.stringify(body)}));
const realNow=Date.now,now=realNow();Date.now=()=>now-2*86400000;  // 2日前: GET は「10分前の時点で締まった日」だけを返すので、1日前だと UTC 0:00〜0:10 に0件になる
await post('/api/loop-event',{kind:'error',screen:'customer',version:LOOP_VERSION,error_type:'TypeError',frame:'app.js:renderPick',fp:'0a1b2c3d'},'192.0.2.1');
await post('/api/loop-event',{kind:'error',screen:'customer',version:LOOP_VERSION,error_type:'TypeError',frame:'app.js:renderPick',fp:'0a1b2c3d'},'192.0.2.2');
await post('/api/loop-event',{kind:'feedback',screen:'customer-candidates',version:LOOP_VERSION,category:'confusing'},'192.0.2.3');
await post('/api/loop-event',{kind:'feedback',screen:'create',version:LOOP_VERSION,category:'bug',text:'印刷が2枚になる。連絡は owner@example.com'},'192.0.2.4');
await post('/api/loop-event',{kind:'feedback',screen:'lp',version:LOOP_VERSION,category:'idea',text:'料金の説明がもう少しほしい'},'192.0.2.5');
env.AI={async run(){throw new TypeError('model offline');}};
await post('/api/draft',{text:'不満です',storeName:'架空デモ'},'192.0.2.6');
Date.now=realNow;
const r=await call(new Request(origin+'/api/loop-events?since='+new Date(now-3*86400000).toISOString().slice(0,10),{headers:{authorization:'Bearer '+TOKEN}}));
if(r.status!==200)throw new Error('GET status '+r.status);
process.stdout.write(JSON.stringify(await r.json(),null,1)+'\n');
