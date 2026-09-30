// public/compose.js: candidates are built only from the customer's picks (topic × rating × optional details). No browser, no network.
// Without details: exhaustive over every kind, every non-empty topic subset and every rating assignment, in every language and style.
// With details the full space is too large (food alone ≈ 10^11 per language), so it is covered in layers, every one checked the same way:
//   (1) every topic alone × every rating × every detail subset (exhaustive per topic),
//   (2) every pair of topics × every rating pair × details in {none, first, last, all} for each,
//   (3) all topics with all details × every rating assignment, and all topics with only their first detail × every rating assignment,
//   (4) a seeded random sample of arbitrary subsets/ratings/details (reproducible: fixed seed).
// The expected nouns and the rating markers below are written here independently of compose.js on purpose.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
const C=createRequire(import.meta.url)('../public/compose.js');
const app=readFileSync(new URL('../public/app.js',import.meta.url),'utf8');

// the fixed neutral nouns agreed for Japanese (kinds match app.js: general/food/beauty/retail)
// food: 料理 and 飲み物 are split and 立地・アクセス is added (食べログ / SemEval-2016); beauty uses the rating item names of
// ホットペッパービューティー (checked on its own review list page, 2026-09-29) — DECISIONS.md「話題の外部根拠と選択の記録」
const JA={food:['料理','飲み物','接客','雰囲気・席','待ち時間','価格','立地・アクセス'],beauty:['技術・仕上がり','カウンセリング','接客サービス','雰囲気','待ち時間','メニュー・料金'],
  retail:['品ぞろえ','接客','お店の雰囲気','お会計・待ち時間','価格'],general:['接客','雰囲気','待ち時間','価格','わかりやすさ']};
// how each rating must read; a sentence carries exactly one of them
const MARK={ja:{good:/よかった/,ok:/ふつう/,concern:/気にな/},en:{good:/\bgood\b|\bliked\b/i,ok:/\baverage\b/i,concern:/\bconcern\b/i},
  zh:{good:/好|不错/,ok:/一般/,concern:/在意/},ko:{good:/좋/,ok:/보통/,concern:/신경/}};
const SPLIT={ja:/(?<=。)/,zh:/(?<=。)/,en:/(?<=\.) /,ko:/(?<=\.) /};
const FORBIDDEN={ja:['おすすめ','オススメ','お勧め','また来','また行','またリピ','リピート','最高','絶対','星5','星５','★','満点','一番','感動','ぜひ','大満足','とても','すごく'],
  en:['recommend','again','best','amazing','must','star','perfect','very','love','great'],zh:['推荐','再来','最好','一定','五星','完美','非常','超级'],ko:['추천','다시','최고','꼭','별','완벽','정말','아주']};
// the agreed Japanese detail nouns per kind and topic (topic label → details)
const JA_DETAILS={food:{'料理':['味','温かさ','量','見た目','メニューの種類'],'飲み物':['味','温度','量','種類'],'接客':['説明','対応の早さ','言葉づかい'],'雰囲気・席':['明るさ','静かさ','席の広さ','清潔さ'],
    '待ち時間':['席に着くまで','注文から出てくるまで','お会計'],'価格':['量とのつりあい','値段の表示'],'立地・アクセス':['駅からの近さ','道の分かりやすさ','駐車場']},
  beauty:{'技術・仕上がり':['カット','カラー','スタイリング','持ち'],'カウンセリング':['聞き取り','提案','説明'],'接客サービス':['案内','対応の早さ','言葉づかい'],'雰囲気':['清潔さ','静かさ','明るさ'],
    '待ち時間':['始まるまで','施術中の待ち','お会計'],'メニュー・料金':['事前の説明','内容とのつりあい']},
  retail:{'品ぞろえ':['種類','サイズや色','在庫'],'接客':['説明','対応の早さ','言葉づかい'],'お店の雰囲気':['商品の並べ方','通路の広さ','明るさ','清潔さ'],
    'お会計・待ち時間':['レジの待ち','支払い方法','包装'],'価格':['品質とのつりあい','値札']},
  general:{'接客':['説明','対応の早さ','言葉づかい'],'雰囲気':['明るさ','静かさ','清潔さ'],'待ち時間':['受付まで','順番が来るまで','お会計'],'価格':['事前の説明','内容とのつりあい'],
    'わかりやすさ':['案内表示','説明','手続き']}};
// characters per candidate before the optional addition: #draft-text holds 1600 and the addition box 200
const LIMIT=1390;
// every sentence, with its topic nouns taken out, must be exactly one of these reviewed wordings (§ = the topic list):
// nothing else can ride along in a candidate, and each wording keeps the plain strength of its rating
const WORDING={ja:{good:['§、よかった。','§がよかったです。','§がよかった。'],ok:['§、ふつう。','§はふつうでした。','§はふつうだった。'],concern:['§、気になった。','§は気になるところがありました。','§は気になった。']},
  en:{good:['Good: §.','I found the § good.','Liked the §.'],ok:['Average: §.','I found the § average.','The § felt average.'],concern:['Concern: §.','I had a concern about the §.','Had a concern about the §.']},
  zh:{good:['§：好。','我觉得§不错。','§挺好的。'],ok:['§：一般。','我觉得§一般。','§感觉一般。'],concern:['§：有在意的地方。','§方面有我在意的地方。','§让我有些在意。']},
  ko:{good:['§: 좋음.','§ 부분이 좋았습니다.','§ 부분이 좋았어요.'],ok:['§: 보통.','§ 부분은 보통이었습니다.','§ 부분은 보통이었어요.'],concern:['§: 신경 쓰임.','§ 부분은 신경 쓰이는 점이 있었습니다.','§ 부분이 신경 쓰였어요.']}};
// a topic with details: § = the topic, ¤ = its detail list. Same plain strength per rating as above.
const DETAIL_WORDING={ja:{good:['§（¤）、よかった。','§は、¤がよかったです。','§は、¤がよかった。'],ok:['§（¤）、ふつう。','§は、¤がふつうでした。','§は、¤がふつうだった。'],concern:['§（¤）、気になった。','§は、¤が気になりました。','§は、¤が気になった。']},
  en:{good:['Good: § (¤).','For the §, I found the ¤ good.','For the §, liked the ¤.'],ok:['Average: § (¤).','For the §, I found the ¤ average.','For the §, the ¤ felt average.'],concern:['Concern: § (¤).','For the §, I had a concern about the ¤.','For the §, had a concern about the ¤.']},
  zh:{good:['§（¤）：好。','§方面，我觉得¤不错。','§方面，¤挺好的。'],ok:['§（¤）：一般。','§方面，我觉得¤一般。','§方面，¤感觉一般。'],concern:['§（¤）：有在意的地方。','§方面，¤有我在意的地方。','§方面，¤让我有些在意。']},
  ko:{good:['§(¤): 좋음.','§에서는 ¤ 부분이 좋았습니다.','§에서는 ¤ 부분이 좋았어요.'],ok:['§(¤): 보통.','§에서는 ¤ 부분은 보통이었습니다.','§에서는 ¤ 부분은 보통이었어요.'],concern:['§(¤): 신경 쓰임.','§에서는 ¤ 부분은 신경 쓰이는 점이 있었습니다.','§에서는 ¤ 부분이 신경 쓰였어요.']}};
const RATINGS=['good','ok','concern'];
const kinds=Object.keys(JA);

function* assignments(topics){  // every non-empty subset × every rating per chosen topic
  for(let mask=1;mask<(1<<topics.length);mask++){
    const chosen=topics.filter((_,i)=>mask&(1<<i));
    for(let n=0;n<3**chosen.length;n++){let x=n;yield chosen.map(topic=>{const rating=RATINGS[x%3];x=Math.floor(x/3);return {topic,rating};});}
  }
}
const JOIN=/((と|、|, | and the |, the )X)*/;  // list joiners compose.js may use between two nouns
const collapse=(str,mark,to)=>str.replace(new RegExp(mark+JOIN.source.replace(/X/g,mark),'g'),to);
const byLength=a=>[...a].sort((x,y)=>y.length-x.length);
// read a candidate back into {topic label: {rating, details:[detail labels]}} using only the markers and wordings above
function decode(lang,kind,text){
  const topics=C.topicsFor(kind);const labels=byLength(topics.map(id=>C.label(lang,kind,id)));
  const detailsOf=Object.fromEntries(topics.map(id=>[C.label(lang,kind,id),C.detailsFor(kind,id).map(d=>C.detailLabel(lang,d))]));
  const got={};
  for(const sentence of text.split(SPLIT[lang]).filter(s=>s.trim())){
    const hits=RATINGS.filter(r=>MARK[lang][r].test(sentence));
    assert.equal(hits.length,1,lang+' sentence must carry exactly one rating: '+sentence);
    let rest=sentence;const found=[];
    for(const l of labels)if(rest.includes(l)){found.push(l);rest=rest.split(l).join('\u0000');}
    assert.ok(found.length>0,'sentence without a topic: '+sentence);
    let details=[];
    if(found.length===1)for(const d of byLength(detailsOf[found[0]]))if(rest.includes(d)){details.push(d);rest=rest.split(d).join('\u0001');}
    let skeleton;
    if(details.length){assert.ok(!rest.slice(rest.indexOf('\u0000')+1).includes('\u0000'),'topic twice in a detail sentence: '+sentence);
      skeleton=collapse(rest,'\u0001','¤').replace('\u0000','§').trim();
      assert.ok(DETAIL_WORDING[lang][hits[0]].includes(skeleton),lang+' unexpected detail wording: '+sentence+' → '+skeleton);
      assert.equal(rest.split('\u0001').length-1,details.length,'detail repeated: '+sentence);
      details=detailsOf[found[0]].filter(d=>details.includes(d));}
    else{skeleton=collapse(rest,'\u0000','§').trim();
      assert.ok(WORDING[lang][hits[0]].includes(skeleton),lang+' unexpected wording: '+sentence+' → '+skeleton);}
    for(const l of found){assert.ok(!(l in got),'topic repeated: '+l);got[l]={rating:hits[0],details};}
  }
  return got;
}
// expected reading of a pick list: every picked topic with its own rating and exactly its picked details (in the fixed order)
const expected=(lang,kind,picks)=>Object.fromEntries(picks.map(p=>[C.label(lang,kind,p.topic),{rating:p.rating,
  details:C.detailsFor(kind,p.topic).filter(d=>(p.details||[]).includes(d)).map(d=>C.detailLabel(lang,d))}]));
// (a)–(f) for one pick list, all three styles
function checkCase(lang,kind,picks,stats){
  const out=C.compose(lang,kind,picks);
  assert.deepEqual(out.map(c=>c.style),['short','polite','casual']);
  const want=expected(lang,kind,picks);const all=C.topicsFor(kind);
  for(const {style,text} of out){
    const where=`${lang}/${kind}/${style} ${JSON.stringify(picks)} → ${text}`;
    // (a)(b)(c)(e) + details: decoding gives back exactly the picks — no extra topic or detail, none missing, same rating
    assert.deepEqual(decode(lang,kind,text),want,where);
    // (b) unselected topic nouns do not appear anywhere
    for(const id of all)if(!picks.some(p=>p.topic===id)){const l=C.label(lang,kind,id);
      if(!picks.some(p=>C.label(lang,kind,p.topic).includes(l)))assert.ok(!text.includes(l),'unselected '+l+' in '+where);}
    // unselected details: once the picked topic and detail nouns are taken out, no detail noun of this kind is left in the text
    let rest=text;for(const l of byLength([...Object.keys(want),...Object.values(want).flatMap(w=>w.details)]))rest=rest.split(l).join('\u0000');
    for(const id of all)for(const d of C.detailsFor(kind,id)){const l=C.detailLabel(lang,d);assert.ok(!rest.includes(l),'unselected detail '+l+' in '+where);}
    // (c) every concern is written as a concern
    if(picks.some(p=>p.rating==='concern'))assert.ok(MARK[lang].concern.test(text),where);
    // (d) no digits, links or promotional words
    assert.ok(!/[0-9０-９]/.test(text),where);assert.ok(!/https?:|www\.|\.com|\.jp/i.test(text),where);
    for(const w of FORBIDDEN[lang])assert.ok(!text.toLowerCase().includes(w.toLowerCase()),w+' in '+where);
    assert.ok(!/[!！?？<>]/.test(text),where);
    // (f) length
    assert.ok(text.length<=LIMIT,where);stats.maxLen=Math.max(stats.maxLen,text.length);
  }
  stats.cases++;
}
const subsets=a=>Array.from({length:1<<a.length},(_,m)=>a.filter((_,i)=>m&(1<<i)));
function seeded(seed){let x=seed>>>0;return ()=>{x^=x<<13;x>>>=0;x^=x>>>17;x^=x<<5;x>>>=0;return x/4294967296;};}

test('store kinds and languages match app.js; Japanese nouns are the agreed fixed ones',()=>{
  const m=app.match(/^const writingPrompts=(\{.*\});$/m);assert.ok(m);
  assert.deepEqual(Object.keys(C.TOPICS).sort(),Object.keys(Function('return ('+m[1]+')')()).sort());
  for(const k of kinds)assert.deepEqual(C.topicsFor(k).map(id=>C.label('ja',k,id)),JA[k],k);
  assert.deepEqual([...C.LANGS].sort(),['en','ja','ko','zh']);assert.deepEqual([...C.STYLES],['short','polite','casual']);
  for(const lang of C.LANGS)for(const k of kinds){const ls=C.topicsFor(k).map(id=>C.label(lang,k,id));assert.equal(new Set(ls).size,ls.length);
    for(const l of ls){assert.ok(l&&!/[0-9０-９]/.test(l),lang+k+l);for(const w of FORBIDDEN[lang])assert.ok(!l.includes(w),l);}}
  assert.equal(C.topicsFor('unknown').join(),C.topicsFor('general').join());
});

test('exhaustive without details: only the picked topics, each with its own rating, in all three styles; concerns never drop',()=>{
  const stats={cases:0,maxLen:0};
  for(const lang of C.LANGS)for(const kind of kinds)for(const picks of assignments(C.topicsFor(kind)))checkCase(lang,kind,picks,stats);
  assert.equal(stats.cases,4*(2*(4**5-1)+(4**6-1)+(4**7-1)));  // 4 languages × (retail, general with 5 topics + beauty with 6 + food with 7)
  console.log('compose cases (no details)',stats.cases,'candidates',stats.cases*3,'longest',stats.maxLen);
});

test('details: agreed Japanese nouns, translated in every language, neutral, and unambiguous inside each kind',()=>{
  for(const k of kinds){assert.deepEqual(Object.fromEntries(C.topicsFor(k).map(id=>[C.label('ja',k,id),C.detailsFor(k,id).map(d=>C.detailLabel('ja',d))])),JA_DETAILS[k],k);
    for(const lang of C.LANGS){const topicLabels=C.topicsFor(k).map(id=>C.label(lang,k,id));
      for(const id of C.topicsFor(k)){const ls=C.detailsFor(k,id).map(d=>C.detailLabel(lang,d));assert.ok(ls.length>=2,k+id);
        for(const l of ls){assert.ok(typeof l==='string'&&l.trim()===l&&l,lang+k+id);assert.ok(!/[0-9０-９!！?？<>]/.test(l),l);
          for(const w of FORBIDDEN[lang])assert.ok(!l.toLowerCase().includes(w.toLowerCase()),w+' in detail '+l);
          for(const r of RATINGS)assert.ok(!MARK[lang][r].test(l),'rating word in detail '+l);
          for(const t of topicLabels)assert.ok(!l.includes(t),'detail '+l+' contains topic '+t);
          for(const o of ls)if(o!==l)assert.ok(!o.includes(l),'detail '+l+' is inside '+o);}}}}
  assert.deepEqual(C.detailsFor('food','nope'),[]);assert.deepEqual(C.detailsFor('unknown','clarity'),C.detailsFor('general','clarity'));
});

test('details layer 1: every topic alone × every rating × every detail subset',()=>{
  const stats={cases:0,maxLen:0};let expect=0;
  for(const lang of C.LANGS)for(const kind of kinds)for(const topic of C.topicsFor(kind)){const sets=subsets(C.detailsFor(kind,topic));expect+=3*sets.length;
    for(const rating of RATINGS)for(const details of sets)checkCase(lang,kind,[{topic,rating,details}],stats);}
  assert.equal(stats.cases,expect);console.log('details layer 1 cases',stats.cases,'longest',stats.maxLen);
});

test('details layer 2: every pair of topics × every rating pair × details none/first/last/all',()=>{
  const stats={cases:0,maxLen:0};
  for(const lang of C.LANGS)for(const kind of kinds){const ts=C.topicsFor(kind);
    for(let i=0;i<ts.length;i++)for(let j=i+1;j<ts.length;j++){
      const pick=t=>{const d=C.detailsFor(kind,t);return [[],[d[0]],[d[d.length-1]],d];};
      for(const ra of RATINGS)for(const rb of RATINGS)for(const da of pick(ts[i]))for(const db of pick(ts[j]))
        checkCase(lang,kind,[{topic:ts[j],rating:rb,details:[...db].reverse()},{topic:ts[i],rating:ra,details:da}],stats);}}
  assert.equal(stats.cases,4*(2*10+15+21)*9*16);  // pairs: 5 topics → 10, 6 → 15, 7 → 21console.log('details layer 2 cases',stats.cases,'longest',stats.maxLen);
});

test('details layer 3: all topics with all details (and with only the first) × every rating assignment',()=>{
  const stats={cases:0,maxLen:0};
  for(const lang of C.LANGS)for(const kind of kinds){const ts=C.topicsFor(kind);
    for(let n=0;n<3**ts.length;n++){let x=n;const rs=ts.map(()=>{const r=RATINGS[x%3];x=Math.floor(x/3);return r;});
      checkCase(lang,kind,ts.map((topic,i)=>({topic,rating:rs[i],details:C.detailsFor(kind,topic)})),stats);
      checkCase(lang,kind,ts.map((topic,i)=>({topic,rating:rs[i],details:C.detailsFor(kind,topic).slice(0,1)})),stats);}}
  assert.equal(stats.cases,4*2*(2*3**5+3**6+3**7));console.log('details layer 3 cases',stats.cases,'longest (all details)',stats.maxLen);
});

test('details layer 4: seeded random sample of any subset, ratings and details',()=>{
  const stats={cases:0,maxLen:0};const rnd=seeded(20260929);const N=2500;
  for(const lang of C.LANGS)for(const kind of kinds)for(let n=0;n<N;n++){
    const ts=C.topicsFor(kind).filter(()=>rnd()<0.5);if(!ts.length)ts.push(C.topicsFor(kind)[Math.floor(rnd()*C.topicsFor(kind).length)]);
    const picks=ts.map(topic=>{const d=C.detailsFor(kind,topic).filter(()=>rnd()<0.4);const p={topic,rating:RATINGS[Math.floor(rnd()*3)]};if(d.length||rnd()<0.5)p.details=d;return p;});
    for(let i=picks.length-1;i>0;i--){const j=Math.floor(rnd()*(i+1));[picks[i],picks[j]]=[picks[j],picks[i]];}
    checkCase(lang,kind,picks,stats);}
  assert.equal(stats.cases,4*4*N);console.log('details layer 4 cases',stats.cases,'longest',stats.maxLen);
});

test('topic evidence: every topic says where it comes from; 待ち時間 and カウンセリング are marked internal-unverified; the mark never changes the text',()=>{
  const want={food:{dish:'external',drink:'external',service:'external',ambience:'external',wait:'internal-unverified',price:'external',location:'external'},
    beauty:{result:'external',counseling:'internal-unverified',service:'external',ambience:'external',wait:'internal-unverified',price:'external'},
    retail:{selection:'internal-unverified',service:'internal-unverified',ambience:'internal-unverified',checkout:'internal-unverified',price:'internal-unverified'},
    general:{service:'internal-unverified',ambience:'internal-unverified',wait:'internal-unverified',price:'internal-unverified',clarity:'internal-unverified'}};
  for(const k of kinds){assert.deepEqual(Object.fromEntries(C.topicsFor(k).map(id=>[id,C.evidenceFor(k,id).evidence])),want[k],k);
    for(const id of C.topicsFor(k)){const e=C.evidenceFor(k,id);assert.ok(Object.isFrozen(e));assert.equal(Boolean(e.source),e.evidence==='external',k+id);}}
  assert.match(C.evidenceFor('food','drink').source,/食べログ/);assert.match(C.evidenceFor('food','location').source,/SemEval/);assert.match(C.evidenceFor('beauty','result').source,/技術・仕上がり/);
  assert.equal(C.evidenceFor('food','nope'),null);assert.deepEqual(C.evidenceFor('unknown','clarity'),C.evidenceFor('general','clarity'));
  // the screen does not show it: app.js never reads it
  assert.ok(!/evidence/i.test(app),'app.js must not show the evidence mark');
});

test('same picks in any order give the same text; the addition is appended as written to every style',()=>{
  const a=[{topic:'wait',rating:'concern'},{topic:'dish',rating:'good'}];
  assert.deepEqual(C.compose('ja','food',a),C.compose('ja','food',[...a].reverse()));
  const out=C.compose('ja','food',a,'  コーヒーは少し熱かった。 ');
  for(const [i,c] of out.entries()){assert.ok(c.text.endsWith('コーヒーは少し熱かった。'));assert.equal(c.text,C.compose('ja','food',a)[i].text+'コーヒーは少し熱かった。');}
  assert.equal(C.compose('en','food',a,'Coffee was hot.')[0].text,'Good: food. Concern: wait time. Coffee was hot.');
  assert.deepEqual(C.compose('ja','food',a,'').map(c=>c.text),C.compose('ja','food',a).map(c=>c.text));
});

test('bad picks are refused instead of silently dropped',()=>{
  for(const bad of [[],null,[{topic:'dish',rating:'great'}],[{topic:'result',rating:'good'}],[{topic:'dish',rating:'good'},{topic:'dish',rating:'concern'}],
    [{topic:'dish'}],Array.from({length:7},()=>({topic:'dish',rating:'good'})),[...C.topicsFor('food').map(topic=>({topic,rating:'good'})),{topic:'clarity',rating:'good'}],
    [{topic:'drink',rating:'good',details:['temp']}],[{topic:'location',rating:'good',details:['taste']}],
    [{topic:'dish',rating:'good',details:['cut']}],[{topic:'dish',rating:'good',details:['taste','taste']}],[{topic:'dish',rating:'good',details:'taste'}],
    [{topic:'dish',rating:'good',details:['serving']}],[{topic:'wait',rating:'concern',details:[null]}],[{topic:'dish',rating:'',details:['taste']}]])
    assert.throws(()=>C.compose('ja','food',bad),/picks/,JSON.stringify(bad));
});

test('examples read naturally (fixed snapshots)',()=>{
  const p=[{topic:'dish',rating:'good'},{topic:'wait',rating:'concern'}];
  assert.deepEqual(C.compose('ja','food',p).map(c=>c.text),['料理、よかった。待ち時間、気になった。','料理がよかったです。待ち時間は気になるところがありました。','料理がよかった。待ち時間は気になった。']);
  assert.deepEqual(C.compose('ja','food',p.map(x=>({...x,details:[]}))),C.compose('ja','food',p),'empty details = no details');
  const d=[{topic:'dish',rating:'good',details:['temp','taste']},{topic:'wait',rating:'concern',details:['serving']}];
  assert.deepEqual(C.compose('ja','food',d).map(c=>c.text),['料理（味と温かさ）、よかった。待ち時間（注文から出てくるまで）、気になった。','料理は、味と温かさがよかったです。待ち時間は、注文から出てくるまでが気になりました。','料理は、味と温かさがよかった。待ち時間は、注文から出てくるまでが気になった。']);
  assert.equal(C.compose('en','food',d)[1].text,'For the food, I found the taste and the temperature good. For the wait time, I had a concern about the wait after ordering.');
  assert.equal(C.compose('zh','food',d)[1].text,'菜品方面，我觉得味道、温度不错。等待时间方面，点单后到上桌有我在意的地方。');
  assert.equal(C.compose('ko','food',d)[1].text,'음식에서는 맛, 온도 부분이 좋았습니다. 대기 시간에서는 주문 후 나오기까지 부분은 신경 쓰이는 점이 있었습니다.');
  // the new food topics (drinks, location) in all four languages
  const n=[{topic:'drink',rating:'good',details:['taste','variety']},{topic:'location',rating:'concern',details:['parking']}];
  assert.deepEqual(C.LANGS.map(l=>C.compose(l,'food',n)[1].text),['飲み物は、味と種類がよかったです。立地・アクセスは、駐車場が気になりました。',
    'For the drinks, I found the taste and the variety good. For the location and access, I had a concern about the parking.',
    '饮品方面，我觉得味道、种类不错。位置和交通方面，停车场有我在意的地方。','음료에서는 맛, 종류 부분이 좋았습니다. 위치·교통에서는 주차장 부분은 신경 쓰이는 점이 있었습니다.']);
  assert.equal(C.compose('ja','beauty',[{topic:'result',rating:'good'},{topic:'service',rating:'good'},{topic:'price',rating:'ok'}])[1].text,'技術・仕上がりと接客サービスがよかったです。メニュー・料金はふつうでした。');
  // the LP example (index.html #example) shows exactly what compose.js builds for its picks
  const html=readFileSync(new URL('../public/index.html',import.meta.url),'utf8');assert.ok(html.includes('<p class="ba-text">'+C.compose('ja','food',d)[1].text+'</p>'),'LP example drifted from compose.js');
});
