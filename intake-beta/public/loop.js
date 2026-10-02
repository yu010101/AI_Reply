'use strict';
// 改善ループの受け口（ブラウザ側）。送り先は同じオリジンの POST /api/loop-event だけ（CSP connect-src 'self' のまま）。
// (1) 例外: window の error / unhandledrejection を拾い、{kind, screen, version, error_type, frame, fp} だけを送る。
//     例外メッセージ・ページURL（共有リンクの店名・口コミリンク）・スタック本文は送らない。スタックはこの端末の中で読むだけで、
//     送るのは「自分たちのJSファイル名:関数名」（frame）1つ。ファイルは FILES の許可リスト、関数名は識別子の形だけ
//     （お客さまの入力が入り得ない）。自分たちのファイルから出ていない例外（拡張機能など）は送らない。日付はサーバーが付ける。
//     同じ指紋は1セッション1回（sessionStorage）、1ページで最大 MAX_ERRORS 件。
// (2) お客さまの感想: 選択式だけ（どうだったか×どこで）。自由記述の欄は無い。送れるのは1セッション1回。
// (3) 店主のご意見（LP・#create のフッター）: 区分＋200字までのひとこと。サーバーが保存前にメール・電話・URL・鍵を伏せ字にする。
(function(){
const VERSION='2026.10.02-1';  // worker.mjs の LOOP_VERSION と同じ値（worker.test.mjs で照合）
const ENDPOINT='/api/loop-event';
const FILES=['app.js','compose.js','loop.js','qrcode.min.js'];
const ERROR_TYPES=['Error','TypeError','RangeError','ReferenceError','SyntaxError','EvalError','URIError','AggregateError','AbortError','NotAllowedError','NotFoundError','NotSupportedError','InvalidStateError','QuotaExceededError','SecurityError','NetworkError','TimeoutError','DataCloneError','InvalidCharacterError','OtherError'];
const MAX_ERRORS=5;
const $=id=>document.getElementById(id);
function session(){try{return window.sessionStorage;}catch{return null;}}
function sessionHas(key,val){try{const s=session();return Boolean(s&&(JSON.parse(s.getItem(key)||'[]')||[]).includes(val));}catch{return false;}}
function sessionAdd(key,val){try{const s=session();if(!s)return;const list=JSON.parse(s.getItem(key)||'[]');if(Array.isArray(list)&&!list.includes(val)){list.push(val);s.setItem(key,JSON.stringify(list.slice(-50)));}}catch{/* storage may be blocked */}}
function post(body){try{return fetch(ENDPOINT,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),keepalive:true});}catch(e){return Promise.reject(e);}}
function view(){const v=document.body&&document.body.dataset.view;if(v==='lp'||v==='create'||v==='customer')return v;
  const q=new URLSearchParams(location.search);return q.has('store')&&q.has('review')?'customer':location.hash==='#create'?'create':'lp';}

// ---- (1) 例外 ----
function fnv(s){let h=0x811c9dc5;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,0x01000193)>>>0;}return h.toString(16).padStart(8,'0');}
const IDENT=/^[A-Za-z_][A-Za-z0-9_.]{0,59}$/;
// Our file only when served from this page's own origin (an extension's own "app.js" does not count).
function fileOf(s){s=String(s||'');const m=/\/((?:app|compose|loop)\.js|qrcode\.min\.js)(?:[?#][^:\s)]*)?(?::\d+){0,2}\)?\s*$/.exec(s);return m&&FILES.includes(m[1])&&s.includes(location.origin+'/'+m[1])?m[1]:'';}
// First stack frame that is one of our files: "at [async] name (https://host/app.js:1:2)" (Chromium) or "name@https://host/app.js:1:2" (Firefox, Safari).
function frameOf(stack){
  for(const line of String(stack||'').split('\n').slice(0,40)){
    const file=fileOf(line);if(!file)continue;
    const m=/^\s*at\s+(?:async\s+)?([^\s(]+)\s+\(/.exec(line)||/^\s*([^@\s]*)@/.exec(line);
    const fn=m&&IDENT.test(m[1])?m[1]:'anonymous';
    return file+':'+fn;
  }
  return '';
}
function typeOf(err){const n=err&&typeof err==='object'&&typeof err.name==='string'?err.name:'';return ERROR_TYPES.includes(n)?n:'OtherError';}
let errorsSent=0;const sentHere=new Set();
function report(err,filename){try{
  if(errorsSent>=MAX_ERRORS)return;
  let frame=frameOf(err&&typeof err==='object'?err.stack:'');
  if(!frame){const f=fileOf(filename);if(!f)return;frame=f+':anonymous';}
  const screen=view(),error_type=typeOf(err),fp=fnv(screen+'|'+error_type+'|'+frame);
  if(sentHere.has(fp)||sessionHas('hk-loop-errors',fp))return;
  sentHere.add(fp);sessionAdd('hk-loop-errors',fp);errorsSent++;
  post({kind:'error',screen,version:VERSION,error_type,frame,fp}).catch(()=>{});
}catch{/* the reporter must never throw */}}
window.addEventListener('error',e=>report(e.error,e.filename));
window.addEventListener('unhandledrejection',e=>report(e.reason,''));

// ---- (2) お客さまの感想（選択式のみ） ----
const FB={
  ja:{summary:'この画面について知らせる（選ぶだけ）',q1:'どうでしたか？',hard_to_use:'使いにくい',confusing:'分かりにくい',broken:'動かない',good:'よかった',q2:'どこで？',choose:'選んでください','customer-pick':'何があったかを選ぶところ','customer-candidates':'文章の候補','customer-edit':'直す・コピー・Googleを開く','customer-own':'自分で書く',note:'選んだ2つと画面の種類だけを運営に送ります。感想の文章・お店の名前・リンクは送りません。',send:'送る',need:'2つとも選んでください。',thanks:'ありがとうございました。改善に使います。',failed:'いま送れませんでした。'},
  en:{summary:'Tell us about this screen (just choose)',q1:'How was it?',hard_to_use:'Hard to use',confusing:'Confusing',broken:'Not working',good:'Good',q2:'Where?',choose:'Please choose','customer-pick':'Choosing what happened','customer-candidates':'Draft sentences','customer-edit':'Editing, copying, opening Google','customer-own':'Writing my own',note:'Only your two choices and the screen type are sent to the operator. Your words, the store name and links are not sent.',send:'Send',need:'Please choose both.',thanks:'Thank you. We will use this to improve.',failed:'Could not send right now.'},
  'zh-Hans':{summary:'反馈此页面（只需选择）',q1:'感觉如何？',hard_to_use:'不好用',confusing:'看不懂',broken:'无法使用',good:'很好',q2:'在哪里？',choose:'请选择','customer-pick':'选择体验内容','customer-candidates':'文字候选','customer-edit':'修改・复制・打开Google','customer-own':'自己写',note:'只向运营方发送您选择的两项和页面类型。不会发送感想文字、店名或链接。',send:'发送',need:'请两项都选择。',thanks:'谢谢，我们会用于改进。',failed:'暂时无法发送。'},
  ko:{summary:'이 화면에 대해 알려 주세요 (고르기만)',q1:'어땠나요?',hard_to_use:'쓰기 어려워요',confusing:'이해하기 어려워요',broken:'작동하지 않아요',good:'좋았어요',q2:'어디에서?',choose:'골라 주세요','customer-pick':'무엇이 있었는지 고르는 곳','customer-candidates':'문장 후보','customer-edit':'고치기・복사・Google 열기','customer-own':'직접 쓰기',note:'고른 두 가지와 화면 종류만 운영자에게 보내요. 소감 문장, 가게 이름, 링크는 보내지 않아요.',send:'보내기',need:'두 가지 모두 골라 주세요.',thanks:'감사합니다. 개선에 활용할게요.',failed:'지금은 보낼 수 없어요.'}
};
const fbText=k=>(FB[document.documentElement.lang]||FB.ja)[k];
function fbLabels(){const box=$('customer-fb');if(!box)return;box.querySelectorAll('[data-fb]').forEach(el=>{el.textContent=fbText(el.dataset.fb);});}
function fbDone(){const form=$('customer-fb-form'),st=$('customer-fb-status');if(form)form.classList.add('hidden');if(st){st.dataset.fbState='thanks';st.textContent=fbText('thanks');}}
(function(){const form=$('customer-fb-form');if(!form)return;
  fbLabels();new MutationObserver(()=>{fbLabels();const st=$('customer-fb-status');if(st&&st.dataset.fbState)st.textContent=fbText(st.dataset.fbState);}).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});
  if(sessionHas('hk-loop-fb','customer'))fbDone();
  form.addEventListener('submit',async e=>{e.preventDefault();const st=$('customer-fb-status');
    const cat=form.querySelector('input[name=fb-cat]:checked'),where=$('customer-fb-where').value;
    if(!cat||!where){st.dataset.fbState='need';st.textContent=fbText('need');return;}
    if(sessionHas('hk-loop-fb','customer'))return fbDone();
    const btn=form.querySelector('button');btn.disabled=true;
    try{const r=await post({kind:'feedback',screen:where,version:VERSION,category:cat.value});
      if(r.ok||r.status===429){sessionAdd('hk-loop-fb','customer');fbDone();return;}
      st.dataset.fbState='failed';st.textContent=fbText('failed');}
    catch{st.dataset.fbState='failed';st.textContent=fbText('failed');}
    finally{btn.disabled=false;}});})();

// ---- (3) 店主のご意見（LP・#create） ----
(function(){const form=$('owner-fb-form');if(!form)return;const st=$('owner-fb-status');
  const say=(msg,err)=>{st.textContent=msg;st.classList.toggle('is-error',Boolean(err));};
  form.addEventListener('submit',async e=>{e.preventDefault();
    const category=$('owner-fb-cat').value,text=$('owner-fb-text').value.trim(),screen=view();
    if(!category)return say('内容の種類を選んでください。',true);
    if(text.length>200)return say('ひとことは200字までです。',true);
    if(/[<>]/.test(text))return say('記号の「<」「>」は使えません。',true);
    const btn=form.querySelector('button');btn.disabled=true;say('送信しています…');
    try{const body={kind:'feedback',screen:screen==='create'?'create':'lp',version:VERSION,category};if(text)body.text=text;
      const r=await post(body);
      if(r.ok){form.reset();say('受け付けました。ありがとうございます。改善に使います（返事はしていません）。');return;}
      say(r.status===429?'今日はこれ以上送れません。明日以降にお送りください。':r.status===400?'入力内容を確認してください。':'いま受け付けられませんでした。時間をおいてお送りください。',true);}
    catch{say('いま受け付けられませんでした。時間をおいてお送りください。',true);}
    finally{btn.disabled=false;}});})();
})();
