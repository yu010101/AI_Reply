// ひとことβ: builds review-draft candidates only from what the customer picked (topic × rating). No AI, no network.
// Legal reason (景表法・ステマ告示): the shop must not decide the content of a review. So there are no ready-made texts:
// the topics are fixed neutral nouns per store kind (shops cannot edit them), and every sentence is "topic + rating" only.
// Nothing else is added: no unselected topic, no extra praise, no recommendation or revisit intent, no numbers.
// A "concern" rating always stays in the text. The three styles differ only in wording, never in which topic got which rating.
// Loaded by index.html as a classic script (global HitokotoCompose) and by node --test via require/import (module.exports).
(function(root){
'use strict';
const RATINGS=['good','ok','concern'];
const STYLES=['short','polite','casual'];
// Topic ids per store kind, in display order. Kinds match app.js writingPrompts (general, food, beauty, retail).
const TOPICS={
  food:['dish','service','ambience','wait','price'],
  beauty:['result','counseling','service','ambience','wait','price'],
  retail:['selection','service','ambience','checkout','price'],
  general:['service','ambience','wait','price','clarity']
};
// Neutral nouns only. Per-kind overrides where the same id reads differently (retail's ambience = お店の雰囲気).
const LABELS={
  ja:{dish:'料理・飲み物',service:'接客',ambience:'雰囲気・席',wait:'待ち時間',price:'価格',result:'仕上がり',counseling:'カウンセリング',selection:'品ぞろえ',checkout:'お会計・待ち時間',clarity:'わかりやすさ',
    _kind:{beauty:{ambience:'雰囲気'},retail:{ambience:'お店の雰囲気'},general:{ambience:'雰囲気'}}},
  en:{dish:'food and drinks',service:'service',ambience:'atmosphere and seating',wait:'wait time',price:'price',result:'result',counseling:'consultation',selection:'product range',checkout:'checkout and wait time',clarity:'clarity',
    _kind:{beauty:{ambience:'atmosphere'},retail:{ambience:'store atmosphere'},general:{ambience:'atmosphere'}}},
  zh:{dish:'菜品和饮品',service:'接待服务',ambience:'氛围和座位',wait:'等待时间',price:'价格',result:'效果',counseling:'咨询沟通',selection:'商品种类',checkout:'结账和等待',clarity:'易懂程度',
    _kind:{beauty:{ambience:'氛围'},retail:{ambience:'店内氛围'},general:{ambience:'氛围'}}},
  ko:{dish:'음식·음료',service:'접객',ambience:'분위기·좌석',wait:'대기 시간',price:'가격',result:'결과',counseling:'상담',selection:'상품 구성',checkout:'계산·대기 시간',clarity:'알기 쉬움',
    _kind:{beauty:{ambience:'분위기'},retail:{ambience:'매장 분위기'},general:{ambience:'분위기'}}}
};
// One sentence per rating group: {L} is the list of topics that got that rating. Wording only; no added content.
const PHRASES={
  ja:{short:{good:'{L}、よかった。',ok:'{L}、ふつう。',concern:'{L}、気になった。'},
      polite:{good:'{L}がよかったです。',ok:'{L}はふつうでした。',concern:'{L}は気になるところがありました。'},
      casual:{good:'{L}がよかった。',ok:'{L}はふつうだった。',concern:'{L}は気になった。'}},
  en:{short:{good:'Good: {L}.',ok:'Average: {L}.',concern:'Concern: {L}.'},
      polite:{good:'I found the {L} good.',ok:'I found the {L} average.',concern:'I had a concern about the {L}.'},
      casual:{good:'Liked the {L}.',ok:'The {L} felt average.',concern:"Wasn't happy with the {L}."}},
  zh:{short:{good:'{L}：好。',ok:'{L}：一般。',concern:'{L}：有在意的地方。'},
      polite:{good:'我觉得{L}不错。',ok:'我觉得{L}一般。',concern:'{L}方面有我在意的地方。'},
      casual:{good:'{L}挺好的。',ok:'{L}还行。',concern:'{L}让我有些在意。'}},
  ko:{short:{good:'{L}: 좋음.',ok:'{L}: 보통.',concern:'{L}: 신경 쓰임.'},
      polite:{good:'{L} 부분이 좋았습니다.',ok:'{L} 부분은 보통이었습니다.',concern:'{L} 부분은 신경 쓰이는 점이 있었습니다.'},
      casual:{good:'{L} 부분이 좋았어요.',ok:'{L} 부분은 보통이었어요.',concern:'{L} 부분이 신경 쓰였어요.'}}
};
const LANGS=Object.keys(PHRASES);
const SEP={ja:'',zh:'',en:' ',ko:' '};
const MAX_TOPICS=6;
function kindOf(kind){return Object.hasOwn(TOPICS,kind)?kind:'general';}
function topicsFor(kind){return TOPICS[kindOf(kind)].slice();}
function label(lang,kind,id){const t=LABELS[lang]||LABELS.ja;const k=t._kind[kindOf(kind)];return (k&&Object.hasOwn(k,id))?k[id]:t[id];}
function joinList(lang,items,style){
  if(items.length<2)return items[0]||'';
  if(lang==='en'&&style==='short')return items.join(', ');
  if(lang==='ja')return items.slice(0,-1).join('、')+'と'+items[items.length-1];
  if(lang==='zh')return items.join('、');
  if(lang==='ko')return items.join(', ');
  // en: "the A and the B" / "the A, the B and the C" — the template supplies the first "the"
  const w=items.map((x,i)=>i?'the '+x:x);return w.slice(0,-1).join(', ')+' and '+w[w.length-1];
}
// picks: [{topic, rating}] in any order. Unknown topics/ratings and duplicates are rejected, not silently dropped,
// so a concern can never disappear on the way in.
function normalize(kind,picks){
  const allowed=TOPICS[kindOf(kind)];
  if(!Array.isArray(picks)||picks.length===0||picks.length>MAX_TOPICS)throw new Error('picks');
  const seen=new Set();
  for(const p of picks){
    if(!p||!allowed.includes(p.topic)||!RATINGS.includes(p.rating)||seen.has(p.topic))throw new Error('picks');
    seen.add(p.topic);
  }
  // fixed display order, so the same choices always give the same text
  return allowed.filter(id=>seen.has(id)).map(id=>({topic:id,rating:picks.find(p=>p.topic===id).rating}));
}
function composeOne(lang,kind,picks,style){
  const L=Object.hasOwn(PHRASES,lang)?lang:'ja';const P=PHRASES[L][style];
  const parts=[];
  for(const r of RATINGS){
    const ids=picks.filter(p=>p.rating===r).map(p=>label(L,kind,p.topic));
    if(!ids.length)continue;
    let s=P[r].replace('{L}',joinList(L,ids,style));
    if(L==='en')s=s.charAt(0).toUpperCase()+s.slice(1);
    parts.push(s);
  }
  return parts.join(SEP[L]);
}
// Returns [{style, text}] for the three styles. addition (optional) is the customer's own words, already tidied by /api/draft;
// it is appended as is.
function compose(lang,kind,picks,addition){
  const norm=normalize(kind,picks);const L=Object.hasOwn(PHRASES,lang)?lang:'ja';
  const extra=typeof addition==='string'?addition.trim():'';
  return STYLES.map(style=>{const body=composeOne(L,kind,norm,style);return {style,text:extra?body+SEP[L]+extra:body};});
}
const api={RATINGS,STYLES,TOPICS,LANGS,MAX_TOPICS,topicsFor,label,compose};
if(typeof module==='object'&&module&&module.exports)module.exports=api;else root.HitokotoCompose=Object.freeze(api);
})(typeof globalThis!=='undefined'?globalThis:this);
