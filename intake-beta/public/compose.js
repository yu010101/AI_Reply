// ひとことβ: builds review-draft candidates only from what the customer picked (topic × rating). No AI, no network.
// Legal reason (景表法・ステマ告示): the shop must not decide the content of a review. So there are no ready-made texts:
// the topics are fixed neutral nouns per store kind (shops cannot edit them), and every sentence is "topic + rating" only.
// Nothing else is added: no unselected topic, no extra praise, no recommendation or revisit intent, no numbers.
// A "concern" rating always stays in the text. The three styles differ only in wording, never in which topic got which rating.
// Details ("どこが？"): after rating a topic the customer may also pick any of that topic's fixed neutral detail nouns
// (optional, several). Details carry no rating of their own: they inherit the topic's rating and appear only in its sentence.
// Loaded by index.html as a classic script (global HitokotoCompose) and by node --test via require/import (module.exports).
(function(root){
'use strict';
const RATINGS=['good','ok','concern'];
const STYLES=['short','polite','casual'];
// Topic ids per store kind, in display order. Kinds match app.js writingPrompts (general, food, beauty, retail).
const TOPICS={
  food:['dish','drink','service','ambience','wait','price','location'],
  beauty:['result','counseling','service','ambience','wait','price'],
  retail:['selection','service','ambience','checkout','price'],
  general:['service','ambience','wait','price','clarity']
};
// Where each topic comes from (EXTERNAL-DATA.md, 2026-09-29). Kept in code only: the screen and the text do not change with it.
// 'external' = the same aspect is a rating item of a large review site or of a published aspect taxonomy (source says which);
// 'internal-unverified' = our own choice with no external basis found yet, kept until our own pick counts (/api/pick-stat) decide.
// Weights (order, share) have no external source yet for any topic.
const EXT=source=>Object.freeze({evidence:'external',source});
const UNVERIFIED=Object.freeze({evidence:'internal-unverified',source:''});
const TABELOG='食べログ口コミガイドライン(taste/service/atmosphere/cost-performance/drinks)';const SEMEVAL='SemEval-2016 Task5 REST';
const HPB='ホットペッパービューティー口コミの項目';
const EVIDENCE={
  food:{dish:EXT(TABELOG+' taste; '+SEMEVAL+' food'),drink:EXT(TABELOG+' drinks; '+SEMEVAL+' drinks'),service:EXT(TABELOG+' service; '+SEMEVAL+' service'),
    ambience:EXT(TABELOG+' atmosphere; '+SEMEVAL+' ambience'),wait:UNVERIFIED,price:EXT(TABELOG+' cost-performance; '+SEMEVAL+' prices'),location:EXT(SEMEVAL+' location')},
  beauty:{result:EXT(HPB+'「技術・仕上がり」'),counseling:UNVERIFIED,service:EXT(HPB+'「接客サービス」'),ambience:EXT(HPB+'「雰囲気」'),wait:UNVERIFIED,price:EXT(HPB+'「メニュー・料金」')},
  // retail and general: no external rating items checked yet (楽天ショップレビューの項目は未確認)
  retail:{selection:UNVERIFIED,service:UNVERIFIED,ambience:UNVERIFIED,checkout:UNVERIFIED,price:UNVERIFIED},
  general:{service:UNVERIFIED,ambience:UNVERIFIED,wait:UNVERIFIED,price:UNVERIFIED,clarity:UNVERIFIED}
};
// Neutral nouns only. Per-kind overrides where the same id reads differently (retail's ambience = お店の雰囲気).
const LABELS={
  ja:{dish:'料理',drink:'飲み物',location:'立地・アクセス',service:'接客',ambience:'雰囲気・席',wait:'待ち時間',price:'価格',result:'仕上がり',counseling:'カウンセリング',selection:'品ぞろえ',checkout:'お会計・待ち時間',clarity:'わかりやすさ',
    _kind:{beauty:{result:'技術・仕上がり',service:'接客サービス',ambience:'雰囲気',price:'メニュー・料金'},retail:{ambience:'お店の雰囲気'},general:{ambience:'雰囲気'}}},
  en:{dish:'food',drink:'drinks',location:'location and access',service:'service',ambience:'atmosphere and seating',wait:'wait time',price:'price',result:'result',counseling:'consultation',selection:'product range',checkout:'checkout and wait time',clarity:'clarity',
    _kind:{beauty:{result:'technique and result',service:'customer service',ambience:'atmosphere',price:'menu and price'},retail:{ambience:'store atmosphere'},general:{ambience:'atmosphere'}}},
  zh:{dish:'菜品',drink:'饮品',location:'位置和交通',service:'接待服务',ambience:'氛围和座位',wait:'等待时间',price:'价格',result:'效果',counseling:'咨询沟通',selection:'商品种类',checkout:'结账和等待',clarity:'易懂程度',
    _kind:{beauty:{result:'技术和效果',service:'接待服务',ambience:'氛围',price:'项目和价格'},retail:{ambience:'店内氛围'},general:{ambience:'氛围'}}},
  ko:{dish:'음식',drink:'음료',location:'위치·교통',service:'접객',ambience:'분위기·좌석',wait:'대기 시간',price:'가격',result:'결과',counseling:'상담',selection:'상품 구성',checkout:'계산·대기 시간',clarity:'알기 쉬움',
    _kind:{beauty:{result:'기술·완성도',service:'접객 서비스',ambience:'분위기',price:'메뉴·요금'},retail:{ambience:'매장 분위기'},general:{ambience:'분위기'}}}
};
// Detail ids per kind and topic, in display order. Neutral nouns only (no praise, adjectives or shop-specific facts).
const DETAILS={
  food:{dish:['taste','temp','portion','look','menu'],drink:['taste','drinkTemp','amount','variety'],service:['explain','speed','manner'],ambience:['light','quiet','space','clean'],
    wait:['seating','serving','paying'],price:['portionValue','costShown'],location:['station','route','parking']},
  beauty:{result:['cut','color','styling','lasting'],counseling:['hearing','proposal','explain'],service:['guide','speed','manner'],
    ambience:['clean','quiet','light'],wait:['start','during','paying'],price:['advance','contentValue']},
  retail:{selection:['variety','sizeColor','stock'],service:['explain','speed','manner'],ambience:['layout','aisle','light','clean'],
    checkout:['register','payment','wrapping'],price:['qualityValue','tags']},
  general:{service:['explain','speed','manner'],ambience:['light','quiet','clean'],wait:['reception','turn','paying'],
    price:['advance','contentValue'],clarity:['signs','explain','procedure']}
};
const DETAIL_LABELS={
  ja:{taste:'味',temp:'温かさ',portion:'量',look:'見た目',menu:'メニューの種類',explain:'説明',speed:'対応の早さ',manner:'言葉づかい',guide:'案内',
    light:'明るさ',quiet:'静かさ',space:'席の広さ',clean:'清潔さ',seating:'席に着くまで',serving:'注文から出てくるまで',drinkTemp:'温度',amount:'量',station:'駅からの近さ',route:'道の分かりやすさ',parking:'駐車場',paying:'お会計',
    portionValue:'量とのつりあい',costShown:'値段の表示',cut:'カット',color:'カラー',styling:'スタイリング',lasting:'持ち',hearing:'聞き取り',proposal:'提案',
    start:'始まるまで',during:'施術中の待ち',advance:'事前の説明',menuValue:'メニューとのつりあい',variety:'種類',sizeColor:'サイズや色',stock:'在庫',
    layout:'商品の並べ方',aisle:'通路の広さ',register:'レジの待ち',payment:'支払い方法',wrapping:'包装',qualityValue:'品質とのつりあい',tags:'値札',
    reception:'受付まで',turn:'順番が来るまで',contentValue:'内容とのつりあい',signs:'案内表示',procedure:'手続き'},
  en:{taste:'taste',temp:'temperature',portion:'portion size',look:'presentation',menu:'menu choices',explain:'explanations',speed:'speed of response',manner:'way of speaking',guide:'guidance',
    light:'lighting',quiet:'noise level',space:'space at the table',clean:'cleanliness',seating:'wait to be seated',serving:'wait after ordering',drinkTemp:'temperature',amount:'amount',station:'distance from the station',route:'finding the way',parking:'parking',paying:'checkout',
    portionValue:'value for the portion',costShown:'cost display',cut:'cut',color:'color',styling:'styling',lasting:'longevity',hearing:'understanding of my request',proposal:'suggestions',
    start:'wait before it began',during:'waiting during the treatment',advance:'explanation beforehand',menuValue:'value for the menu',variety:'variety',sizeColor:'sizes and colors',stock:'stock',
    layout:'product layout',aisle:'aisle space',register:'wait at the register',payment:'payment options',wrapping:'wrapping',qualityValue:'value for the quality',tags:'shelf labels',
    reception:'wait at reception',turn:'wait for my turn',contentValue:'value for what I got',signs:'signage',procedure:'procedures'},
  zh:{taste:'味道',temp:'温度',portion:'分量',look:'外观',menu:'菜单种类',explain:'说明',speed:'响应速度',manner:'说话方式',guide:'引导',
    light:'亮度',quiet:'安静程度',space:'座位空间',clean:'清洁程度',seating:'入座前',serving:'点单后到上桌',drinkTemp:'温度',amount:'分量',station:'离车站的距离',route:'到店路线',parking:'停车场',paying:'结账',
    portionValue:'与分量的匹配',costShown:'标价',cut:'剪发',color:'染发',styling:'造型',lasting:'持久度',hearing:'需求了解',proposal:'建议',
    start:'开始前',during:'服务中的等待',advance:'事先说明',menuValue:'与项目的匹配',variety:'种类',sizeColor:'尺码和颜色',stock:'库存',
    layout:'陈列',aisle:'通道宽度',register:'收银排队',payment:'支付方式',wrapping:'包装',qualityValue:'与质量的匹配',tags:'标签',
    reception:'受理前',turn:'轮到我之前',contentValue:'与内容的匹配',signs:'指示标识',procedure:'手续'},
  ko:{taste:'맛',temp:'온도',portion:'양',look:'담음새',menu:'메뉴 종류',explain:'설명',speed:'응대 속도',manner:'말투',guide:'안내',
    light:'밝기',quiet:'소음 정도',space:'좌석 공간',clean:'청결',seating:'자리에 앉기까지',serving:'주문 후 나오기까지',drinkTemp:'온도',amount:'양',station:'역에서의 거리',route:'찾아가는 길',parking:'주차장',paying:'계산',
    portionValue:'양과의 균형',costShown:'금액 표시',cut:'커트',color:'컬러',styling:'스타일링',lasting:'유지력',hearing:'요청 파악',proposal:'제안',
    start:'시작하기까지',during:'시술 중 대기',advance:'사전 설명',menuValue:'메뉴와의 균형',variety:'종류',sizeColor:'사이즈와 색상',stock:'재고',
    layout:'진열',aisle:'통로 넓이',register:'계산대 대기',payment:'결제 방법',wrapping:'포장',qualityValue:'품질과의 균형',tags:'라벨 표시',
    reception:'접수까지',turn:'차례가 오기까지',contentValue:'내용과의 균형',signs:'안내 표시',procedure:'절차'}
};
// One sentence per rating group: {L} is the list of topics that got that rating. Wording only; no added content.
const PHRASES={
  ja:{short:{good:'{L}、よかった。',ok:'{L}、ふつう。',concern:'{L}、気になった。'},
      polite:{good:'{L}がよかったです。',ok:'{L}はふつうでした。',concern:'{L}は気になるところがありました。'},
      casual:{good:'{L}がよかった。',ok:'{L}はふつうだった。',concern:'{L}は気になった。'}},
  en:{short:{good:'Good: {L}.',ok:'Average: {L}.',concern:'Concern: {L}.'},
      polite:{good:'I found the {L} good.',ok:'I found the {L} average.',concern:'I had a concern about the {L}.'},
      casual:{good:'Liked the {L}.',ok:'The {L} felt average.',concern:'Had a concern about the {L}.'}},
  zh:{short:{good:'{L}：好。',ok:'{L}：一般。',concern:'{L}：有在意的地方。'},
      polite:{good:'我觉得{L}不错。',ok:'我觉得{L}一般。',concern:'{L}方面有我在意的地方。'},
      casual:{good:'{L}挺好的。',ok:'{L}感觉一般。',concern:'{L}让我有些在意。'}},
  ko:{short:{good:'{L}: 좋음.',ok:'{L}: 보통.',concern:'{L}: 신경 쓰임.'},
      polite:{good:'{L} 부분이 좋았습니다.',ok:'{L} 부분은 보통이었습니다.',concern:'{L} 부분은 신경 쓰이는 점이 있었습니다.'},
      casual:{good:'{L} 부분이 좋았어요.',ok:'{L} 부분은 보통이었어요.',concern:'{L} 부분이 신경 쓰였어요.'}}
};
// A topic with details gets its own sentence: {T} = the topic, {D} = its picked details. Same rating wording as PHRASES.
const DETAIL_PHRASES={
  ja:{short:{good:'{T}（{D}）、よかった。',ok:'{T}（{D}）、ふつう。',concern:'{T}（{D}）、気になった。'},
      polite:{good:'{T}は、{D}がよかったです。',ok:'{T}は、{D}がふつうでした。',concern:'{T}は、{D}が気になりました。'},
      casual:{good:'{T}は、{D}がよかった。',ok:'{T}は、{D}がふつうだった。',concern:'{T}は、{D}が気になった。'}},
  en:{short:{good:'Good: {T} ({D}).',ok:'Average: {T} ({D}).',concern:'Concern: {T} ({D}).'},
      polite:{good:'For the {T}, I found the {D} good.',ok:'For the {T}, I found the {D} average.',concern:'For the {T}, I had a concern about the {D}.'},
      casual:{good:'For the {T}, liked the {D}.',ok:'For the {T}, the {D} felt average.',concern:'For the {T}, had a concern about the {D}.'}},
  zh:{short:{good:'{T}（{D}）：好。',ok:'{T}（{D}）：一般。',concern:'{T}（{D}）：有在意的地方。'},
      polite:{good:'{T}方面，我觉得{D}不错。',ok:'{T}方面，我觉得{D}一般。',concern:'{T}方面，{D}有我在意的地方。'},
      casual:{good:'{T}方面，{D}挺好的。',ok:'{T}方面，{D}感觉一般。',concern:'{T}方面，{D}让我有些在意。'}},
  ko:{short:{good:'{T}({D}): 좋음.',ok:'{T}({D}): 보통.',concern:'{T}({D}): 신경 쓰임.'},
      polite:{good:'{T}에서는 {D} 부분이 좋았습니다.',ok:'{T}에서는 {D} 부분은 보통이었습니다.',concern:'{T}에서는 {D} 부분은 신경 쓰이는 점이 있었습니다.'},
      casual:{good:'{T}에서는 {D} 부분이 좋았어요.',ok:'{T}에서는 {D} 부분은 보통이었어요.',concern:'{T}에서는 {D} 부분이 신경 쓰였어요.'}}
};
const LANGS=Object.keys(PHRASES);
const SEP={ja:'',zh:'',en:' ',ko:' '};
const MAX_TOPICS=Math.max(...Object.values(TOPICS).map(t=>t.length));  // a customer may pick every topic of the largest kind
function kindOf(kind){return Object.hasOwn(TOPICS,kind)?kind:'general';}
function topicsFor(kind){return TOPICS[kindOf(kind)].slice();}
function label(lang,kind,id){const t=LABELS[lang]||LABELS.ja;const k=t._kind[kindOf(kind)];return (k&&Object.hasOwn(k,id))?k[id]:t[id];}
function detailsFor(kind,topic){const d=DETAILS[kindOf(kind)];return Object.hasOwn(d,topic)?d[topic].slice():[];}
function evidenceFor(kind,topic){const e=EVIDENCE[kindOf(kind)];return Object.hasOwn(e,topic)?e[topic]:null;}
function detailLabel(lang,id){const t=DETAIL_LABELS[lang]||DETAIL_LABELS.ja;return t[id];}
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
    // details are optional; when given, each must be one of this topic's fixed details, without repeats
    if(p.details!==undefined){const ok=DETAILS[kindOf(kind)][p.topic];
      if(!Array.isArray(p.details)||new Set(p.details).size!==p.details.length||p.details.some(d=>!ok.includes(d)))throw new Error('picks');}
    seen.add(p.topic);
  }
  // fixed display order (topics and details), so the same choices always give the same text
  return allowed.filter(id=>seen.has(id)).map(id=>{const p=picks.find(x=>x.topic===id);const chosen=p.details||[];
    return {topic:id,rating:p.rating,details:DETAILS[kindOf(kind)][id].filter(d=>chosen.includes(d))};});
}
function composeOne(lang,kind,picks,style){
  const L=Object.hasOwn(PHRASES,lang)?lang:'ja';const P=PHRASES[L][style];
  const D=DETAIL_PHRASES[L][style];const cap=s=>L==='en'?s.charAt(0).toUpperCase()+s.slice(1):s;
  const parts=[];
  for(const r of RATINGS){
    // in display order: adjacent topics without details share one sentence; a topic with details gets its own, with the same rating wording
    let ids=[];const flush=()=>{if(ids.length)parts.push(cap(P[r].replace('{L}',joinList(L,ids,style))));ids=[];};
    for(const p of picks.filter(x=>x.rating===r)){
      if(!p.details.length){ids.push(label(L,kind,p.topic));continue;}
      flush();parts.push(cap(D[r].replace('{T}',label(L,kind,p.topic)).replace('{D}',joinList(L,p.details.map(d=>detailLabel(L,d)),style))));
    }
    flush();
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
// 振り分け（2026-10-02 本人決定。店主が管理画面で Google のポリシーとおそれを読んで同意し、オンにした店だけで使う）の「評価が低い」:
// 「気になった」が、その業種の話題の数の半分より多い（飲食 7話題中4以上・美容 6中4以上・小売/その他 5中3以上）。本人確認待ちの案。
// お客さま画面（app.js）と worker（件数）の両方がこの1つの関数で判定する。picks は compose() と同じ検査を通す（不正は例外）。
function isLow(kind,picks){const n=normalize(kind,picks).filter(p=>p.rating==='concern').length;return n*2>TOPICS[kindOf(kind)].length;}
const api={RATINGS,STYLES,TOPICS,DETAILS,LANGS,MAX_TOPICS,topicsFor,label,detailsFor,detailLabel,evidenceFor,normalize,compose,isLow};
if(typeof module==='object'&&module&&module.exports)module.exports=api;else root.HitokotoCompose=Object.freeze(api);
})(typeof globalThis!=='undefined'?globalThis:this);
