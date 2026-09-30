'use strict';
// ① お店の声の報告（店主だけ）。報告用トークンは URL の fragment（#以降。ブラウザはサーバーへ送らない）から読み、
// POST /api/report と /api/notice の本文でだけ送る。表示する数はサーバーが決める（少ない件数は null = 「5件未満」、全体が少なければ enough:false）。
// 「直しました」の札: 店主の文をサーバーで検査（評価・口コミのお願いは拒否、秘密っぽい文字列は伏せ字）した結果だけを札に載せて印刷する。
(function(){
const $=id=>document.getElementById(id);
const Compose=window.HitokotoCompose;
// #t=<token>&g=<Google review link>（古い形 #<token> も読む）
const frag=new URLSearchParams(location.hash.slice(1));const token=frag.get('t')||(location.hash.length===44?location.hash.slice(1):'');let kind='general';
const STEP_LABELS={view:'画面を開いた',classify:'書いた内容から選んだ（AI）',rating:'自分で評価を選んだ',rated:'全部の話題に答えた',cands:'文章の候補を見た',cand:'候補を選んだ',confirm:'内容を確認した',copy:'感想をコピーした',google:'Googleを開いた'};
// 効果の欄 D: the store's Google page from the review link the owner entered (only the shapes #create accepts); otherwise Google Maps in general.
function mapsLink(raw){try{const u=new URL(raw);if(u.protocol!=='https:'||u.username||u.password||u.port)return '';const h=u.hostname.toLowerCase();
  if(h==='g.page'){const m=/^\/(r\/)?([A-Za-z0-9_-]+)\/review\/?$/.exec(u.pathname);return m?'https://g.page/'+(m[1]||'')+m[2]:'';}
  if(h==='search.google.com'&&u.pathname==='/local/writereview'){const id=u.searchParams.get('placeid')||'';return /^[A-Za-z0-9_-]+$/.test(id)?'https://www.google.com/maps/place/?q=place_id:'+id:'';}
  if(h==='maps.app.goo.gl')return /^\/[A-Za-z0-9_-]+\/?$/.test(u.pathname)?u.href:'';
  if(['www.google.com','google.com','www.google.co.jp','maps.google.com'].includes(h)&&/^\/maps(?:\/|$)/.test(u.pathname))return u.href;return '';}catch{return '';}}
// 効果の欄 A: the two numbers stay in this browser only (localStorage, per report link), never sent anywhere.
async function effect(){
  const maps=mapsLink(frag.get('g')||'');if(maps){$('effect-maps').href=maps;}else{$('effect-maps').textContent='Google マップを開く ↗';}
  let key='';try{const h=await crypto.subtle.digest('SHA-256',new TextEncoder().encode('effect:'+token));key='hk-effect-'+Array.from(new Uint8Array(h).slice(0,8),b=>b.toString(16).padStart(2,'0')).join('');}catch{/* no key: numbers are not kept */}
  const load=()=>{try{return JSON.parse(localStorage.getItem(key)||'{}')||{};}catch{return {};}};
  const num=v=>/^\d{1,6}$/.test(String(v).trim())?Number(v):null;
  const show=()=>{const a=num($('effect-start').value),b=num($('effect-today').value);
    $('effect-diff').textContent=a===null||b===null?'':'設置した日から '+(b-a>=0?'+':'')+(b-a)+' 件（'+a+' 件 → '+b+' 件）。ご自身で入力した数字です。';
    try{if(key)localStorage.setItem(key,JSON.stringify({start:$('effect-start').value,today:$('effect-today').value}));}catch{/* storage blocked */}};
  const saved=load();if(saved.start!==undefined)$('effect-start').value=saved.start;if(saved.today!==undefined)$('effect-today').value=saved.today;
  ['effect-start','effect-today'].forEach(id=>$(id).addEventListener('input',show));show();$('effect-card').classList.remove('hidden');
}
const say=(id,text)=>{$(id).textContent=text;};
function post(path,body){return fetch(path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(15000)});}
const cell=n=>n===null?Object.assign(document.createElement('span'),{className:'few',textContent:'5件未満'}):String(n);
function td(content){const c=document.createElement('td');c.append(content);return c;}
function show(r){
  kind=r.kind;
  $('report-min').textContent=String(r.min);document.querySelectorAll('.report-min-inline').forEach(e=>{e.textContent=String(r.min);});
  const topics=Compose.topicsFor(r.kind);
  if(!r.enough){$('report-few').classList.remove('hidden');}
  else{
    $('report-range').textContent=r.since.replace(/-/g,'/')+' から今日まで（'+r.days+'日）';
    $('report-topics').replaceChildren(...r.topics.map(row=>{const tr=document.createElement('tr');const th=document.createElement('th');th.scope='row';th.textContent=Compose.label('ja',r.kind,row.topic);tr.append(th,...Compose.RATINGS.map(k=>td(cell(row[k]))));return tr;}));
    $('report-steps').replaceChildren(...r.steps.flatMap(s=>[Object.assign(document.createElement('dt'),{textContent:STEP_LABELS[s.step]||s.step}),Object.assign(document.createElement('dd'),{textContent:''})]));
    [...$('report-steps').querySelectorAll('dd')].forEach((dd,i)=>dd.append(cell(r.steps[i].count)));
    $('report-body').classList.remove('hidden');
  }
  // topics with more 「気になった」 first (hidden counts count as 0), then the screen order
  const concern=id=>{const row=r.enough&&r.topics.find(x=>x.topic===id);return row&&row.concern||0;};
  const order=topics.map((id,i)=>({id,i,c:concern(id)})).sort((a,b)=>b.c-a.c||a.i-b.i);
  $('notice-topic').replaceChildren(...order.map(o=>Object.assign(document.createElement('option'),{value:o.id,textContent:Compose.label('ja',r.kind,o.id)+(o.c?'（気になった '+o.c+'件）':'')})));
  $('notice-card').classList.remove('hidden');
}
async function load(){
  if(!/^[A-Za-z0-9_-]{43}$/.test(token)){say('report-status','報告用リンクが正しくありません。店主控えのリンクをもう一度開いてください。');return;}
  try{const res=await post('/api/report',{token});
    if(res.status===404){say('report-status','この報告用リンクは見つかりませんでした。店主控えのリンクをもう一度確かめてください。');return;}
    if(res.status===429){say('report-status','今日は開いた回数が多いため、表示を止めています。明日もう一度開いてください。');return;}
    if(!res.ok)throw Error('unavailable');
    const r=await res.json();say('report-status','');show(r);effect();
  }catch{say('report-status','いま読み込めませんでした。時間をおいて、もう一度開いてください。');}
}
$('notice-form').addEventListener('submit',async e=>{e.preventDefault();
  const text=$('notice-text').value.trim();if(!text){say('notice-status','直したことを書いてください。');return;}
  $('notice-sheet').classList.remove('is-ready');$('notice-print').classList.add('hidden');say('notice-status','確かめています…');
  try{const res=await post('/api/notice',{token,topic:$('notice-topic').value,text});const d=await res.json().catch(()=>({}));
    if(res.status===400){say('notice-status',d.error==='asks_for_rating'?'評価や口コミのお願いに見える言葉（「高評価」「★」「口コミ」「レビュー」「投稿」など）は、札に使えません。直したことだけを書いてください。':'1行・60字までで書いてください。記号の「<」「>」は使えません。');return;}
    if(!res.ok)throw Error('unavailable');
    say('notice-sheet-topic',Compose.label('ja',kind,d.topic));say('notice-sheet-text',d.text);
    $('notice-sheet').classList.add('is-ready');$('notice-print').classList.remove('hidden');say('notice-status','札ができました。下の見本を確かめてから印刷してください。');
  }catch{say('notice-status','いま作れませんでした。時間をおいて、もう一度お試しください。');}
});
$('notice-print').addEventListener('click',()=>window.print());
load();
})();
