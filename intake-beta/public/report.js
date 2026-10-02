'use strict';
// 店主の管理画面（2026-10-02 本人決定。もとは ① お店の声の報告）。最初に「お客さまの声」（話題×評価・どこが・お店にだけ届いた声）、
// その下に到達の数字（段階と日ごとの推移）・効果・札・お店の設定（振り分け・LINE・インスタ）。
// ① お店の声の報告（店主だけ）。報告用トークンは URL の fragment（#以降。ブラウザはサーバーへ送らない）から読み、
// POST /api/report と /api/notice の本文でだけ送る。表示する数はサーバーが決める（少ない件数は null = 「5件未満」、全体が少なければ enough:false）。
// 「直しました」の札: 店主の文をサーバーで検査（評価・口コミのお願いは拒否、秘密っぽい文字列は伏せ字）した結果だけを札に載せて印刷する。
(function(){
const $=id=>document.getElementById(id);
const Compose=window.HitokotoCompose;
// #t=<token>&g=<Google review link>（古い形 #<token> も読む）
const frag=new URLSearchParams(location.hash.slice(1));const token=frag.get('t')||(location.hash.length===44?location.hash.slice(1):'');let kind='general';
// the version of the consent wording on report.html (worker.mjs ROUTE_CONSENT_VERSION; any other value is refused there)
const CONSENT_VERSION='2026-10-02b';
const RATING_LABELS={good:'よかった',ok:'ふつう',concern:'気になった'};
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
const topicRows=(k,rows)=>rows.map(row=>{const tr=document.createElement('tr');const th=document.createElement('th');th.scope='row';th.textContent=Compose.label('ja',k,row.topic);tr.append(th,...Compose.RATINGS.map(x=>td(cell(row[x]))));return tr;});
function show(r){
  kind=r.kind;
  $('report-min').textContent=String(r.min);document.querySelectorAll('.report-min-inline').forEach(e=>{e.textContent=String(r.min);});
  const topics=Compose.topicsFor(r.kind);
  $('voice-card').classList.remove('hidden');
  if(!r.enough){$('report-few').classList.remove('hidden');}
  else{
    $('report-range').textContent=r.since.replace(/-/g,'/')+' から今日まで（'+r.days+'日）';
    $('report-topics').replaceChildren(...topicRows(r.kind,r.topics));
    // 「どこが？」: only the counts at or above the minimum come from the worker
    const details=Array.isArray(r.details)?r.details:[];
    $('report-details').replaceChildren(...details.map(d=>Object.assign(document.createElement('li'),{textContent:Compose.label('ja',r.kind,d.topic)+'（'+RATING_LABELS[d.rating]+'）：'+Compose.detailLabel('ja',d.detail)+' '+d.count+'件'})));
    $('details-part').classList.toggle('hidden',!details.length);
    // お店にだけ届いた声: only while the store routes or has routed in the window
    if(r.route&&Array.isArray(r.held_topics)){
      $('held-count').replaceChildren('判定した数　Google への案内を出さなかった：',cell(r.route.held),' ／ 出した：',cell(r.route.passed));
      $('held-topics').replaceChildren(...topicRows(r.kind,r.held_topics));$('held-part').classList.remove('hidden');}
    $('report-body').classList.remove('hidden');
    $('report-steps').replaceChildren(...r.steps.flatMap(s=>[Object.assign(document.createElement('dt'),{textContent:STEP_LABELS[s.step]||s.step}),Object.assign(document.createElement('dd'),{textContent:''})]));
    [...$('report-steps').querySelectorAll('dd')].forEach((dd,i)=>dd.append(cell(r.steps[i].count)));
    // 日ごとの推移: newest first
    const daily=Array.isArray(r.daily)?[...r.daily].reverse():[];
    $('report-daily').replaceChildren(...daily.map(d=>{const tr=document.createElement('tr');const th=document.createElement('th');th.scope='row';th.textContent=d.day.slice(5).replace('-','/');tr.append(th,...['view','cands','copy','google'].map(k=>td(cell(d[k]))));return tr;}));
    dailyRows=daily.length;$('daily-table').classList.toggle('hidden',!daily.length);$('daily-none').hidden=Boolean(daily.length);
    // 本人決定 B: 週ごと（直近4週、新しい週が上）。日ごと／週ごとはボタンで切り替える（初めは日ごと）
    const weekly=Array.isArray(r.weekly)?[...r.weekly].reverse():[];const md=d=>d.slice(5).replace('-','/');
    $('report-weekly').replaceChildren(...weekly.map(w=>{const tr=document.createElement('tr');const th=document.createElement('th');th.scope='row';th.textContent=md(w.from)+'〜'+md(w.to);tr.append(th,...['view','cands','copy','google'].map(k=>td(cell(w[k]))));return tr;}));
    $('reach-card').classList.remove('hidden');
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
    const r=await res.json();say('report-status','');show(r);effect();settings(r.settings);
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
// ---- お店の設定（2026-10-02 本人決定）----
// 振り分け: 既定オフ。オンにできるのは、ポリシーの原文とおそれを示した欄を開き、チェックを入れ、確認の段でもう一度押したときだけ。
// 送るのは {token, route:true, consent:CONSENT_VERSION}（オフは {token, route:false}）。同意の日時はサーバーが記録する。
// LINE・インスタ: {token, line, instagram}。許可した形でないURLはサーバーが 400 で断る。
// Devin r2b-5: the "no records" line follows the daily rows, not only the switch
let dailyRows=0;
function reachUnit(weekly){$('weekly-part').hidden=!weekly;$('daily-part').hidden=weekly;$('daily-none').hidden=weekly||dailyRows>0;
  $('reach-weekly-btn').setAttribute('aria-pressed',String(weekly));$('reach-daily-btn').setAttribute('aria-pressed',String(!weekly));}
$('reach-daily-btn').addEventListener('click',()=>reachUnit(false));$('reach-weekly-btn').addEventListener('click',()=>reachUnit(true));
const fmt=iso=>{const d=new Date(iso);return isNaN(d)?'':d.toLocaleString('ja-JP',{timeZone:'Asia/Tokyo',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'});};
function renderRoute(s){
  // 審査 2: a consent to an older wording counts as off until the owner consents to the current one
  $('route-state').textContent=s.route?'いまの設定：オン（'+fmt(s.consentAt)+' に同意）。「気になった」が1つでもあるお客さまには、Google への案内を出していません。':s.needsReconsent?'いまの設定：オフ（説明の文章が変わったため、以前の同意は使いません。続ける場合は、もう一度お読みのうえ同意してください）。':'いまの設定：オフ。すべてのお客さまに同じように Google への案内を出しています。';
  $('route-open').classList.toggle('hidden',s.route);$('route-off').classList.toggle('hidden',!s.route);closeConsent();}
function closeConsent(){$('route-consent').classList.add('hidden');$('route-open').setAttribute('aria-expanded','false');$('route-agree').checked=false;$('route-next').disabled=true;$('route-confirm').classList.add('hidden');}
function settings(s){if(!s)return;renderRoute(s);$('link-line').value=s.line||'';$('link-instagram').value=s.instagram||'';$('settings-card').classList.remove('hidden');}
async function saveSettings(body,statusId){
  const res=await post('/api/settings',{token,...body});const d=await res.json().catch(()=>({}));
  if(res.ok&&d.settings)return d.settings;
  say(statusId,res.status===429?'今日は操作の回数が多いため、受け付けを止めています。明日もう一度お試しください。':d.error==='invalid_url'?'URLの形を確かめてください。LINE は https://lin.ee/… か https://line.me/R/ti/p/@…、インスタは https://www.instagram.com/（ユーザー名）/ の形で入れてください。':'いま保存できませんでした。時間をおいて、もう一度お試しください。');
  return null;}
$('route-open').addEventListener('click',()=>{$('route-consent').classList.remove('hidden');$('route-open').setAttribute('aria-expanded','true');say('route-status','');});
$('route-agree').addEventListener('change',()=>{$('route-next').disabled=!$('route-agree').checked;if(!$('route-agree').checked)$('route-confirm').classList.add('hidden');});
$('route-next').addEventListener('click',()=>{if(!$('route-agree').checked)return;$('route-confirm').classList.remove('hidden');$('route-confirm-text').focus();});
$('route-cancel').addEventListener('click',()=>{closeConsent();say('route-status','オンにしませんでした。');});
$('route-on').addEventListener('click',async()=>{if(!$('route-agree').checked)return;$('route-on').disabled=true;
  try{const s=await saveSettings({route:true,consent:CONSENT_VERSION},'route-status');if(s){renderRoute(s);say('route-status','振り分けをオンにしました。お客さまの画面に反映されるまで最大2分程度かかります。');}}
  catch{say('route-status','いま保存できませんでした。時間をおいて、もう一度お試しください。');}finally{$('route-on').disabled=false;}});
$('route-off').addEventListener('click',async()=>{$('route-off').disabled=true;
  try{const s=await saveSettings({route:false},'route-status');if(s){renderRoute(s);say('route-status','振り分けをオフにしました。すべてのお客さまに Google への案内を出します（反映まで最大2分程度）。');}}
  catch{say('route-status','いま保存できませんでした。時間をおいて、もう一度お試しください。');}finally{$('route-off').disabled=false;}});
$('links-form').addEventListener('submit',async e=>{e.preventDefault();say('links-status','保存しています…');
  try{const s=await saveSettings({line:$('link-line').value.trim(),instagram:$('link-instagram').value.trim()},'links-status');
    if(s){$('link-line').value=s.line;$('link-instagram').value=s.instagram;say('links-status',s.line||s.instagram?'保存しました。お客さまの画面のいちばん下にボタンが出ます（反映まで最大2分程度）。':'保存しました。ボタンは出ません（反映まで最大2分程度）。');}}
  catch{say('links-status','いま保存できませんでした。時間をおいて、もう一度お試しください。');}});
load();
})();
