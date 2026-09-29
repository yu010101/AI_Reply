// public/compose.js: candidates are built only from the customer's picks (topic × rating). Exhaustive over every kind,
// every non-empty topic subset and every rating assignment, in every language and style. No browser, no network.
// The expected nouns and the rating markers below are written here independently of compose.js on purpose.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
const C=createRequire(import.meta.url)('../public/compose.js');
const app=readFileSync(new URL('../public/app.js',import.meta.url),'utf8');

// the fixed neutral nouns agreed for Japanese (kinds match app.js: general/food/beauty/retail)
const JA={food:['料理・飲み物','接客','雰囲気・席','待ち時間','価格'],beauty:['仕上がり','カウンセリング','接客','雰囲気','待ち時間','価格'],
  retail:['品ぞろえ','接客','お店の雰囲気','お会計・待ち時間','価格'],general:['接客','雰囲気','待ち時間','価格','わかりやすさ']};
// how each rating must read; a sentence carries exactly one of them
const MARK={ja:{good:/よかった/,ok:/ふつう/,concern:/気にな/},en:{good:/\bgood\b|^Liked\b/i,ok:/\baverage\b/i,concern:/\bconcern\b|Wasn't happy/i},
  zh:{good:/好|不错/,ok:/一般|还行/,concern:/在意/},ko:{good:/좋/,ok:/보통/,concern:/신경/}};
const SPLIT={ja:/(?<=。)/,zh:/(?<=。)/,en:/(?<=\.) /,ko:/(?<=\.) /};
const FORBIDDEN={ja:['おすすめ','オススメ','お勧め','また来','また行','またリピ','リピート','最高','絶対','星5','星５','★','満点','一番','感動','ぜひ','大満足','とても','すごく'],
  en:['recommend','again','best','amazing','must','star','perfect','very','love','great'],zh:['推荐','再来','最好','一定','五星','完美','非常','超级'],ko:['추천','다시','최고','꼭','별','완벽','정말','아주']};
const LIMIT=200; // characters per candidate before the optional addition; #draft-text holds 1600
const RATINGS=['good','ok','concern'];
const kinds=Object.keys(JA);

function* assignments(topics){  // every non-empty subset × every rating per chosen topic
  for(let mask=1;mask<(1<<topics.length);mask++){
    const chosen=topics.filter((_,i)=>mask&(1<<i));
    for(let n=0;n<3**chosen.length;n++){let x=n;yield chosen.map(topic=>{const rating=RATINGS[x%3];x=Math.floor(x/3);return {topic,rating};});}
  }
}
// read a candidate back into {label: rating} using only the markers above
function decode(lang,kind,text){
  const labels=C.topicsFor(kind).map(id=>C.label(lang,kind,id)).sort((a,b)=>b.length-a.length);
  const got={};
  for(const sentence of text.split(SPLIT[lang]).filter(s=>s.trim())){
    const hits=RATINGS.filter(r=>MARK[lang][r].test(sentence));
    assert.equal(hits.length,1,lang+' sentence must carry exactly one rating: '+sentence);
    let rest=sentence;const found=[];
    for(const l of labels)if(rest.includes(l)){found.push(l);rest=rest.split(l).join('\u0000');}
    assert.ok(found.length>0,'sentence without a topic: '+sentence);
    for(const l of found){assert.ok(!(l in got),'topic repeated: '+l);got[l]=hits[0];}
  }
  return got;
}

test('store kinds and languages match app.js; Japanese nouns are the agreed fixed ones',()=>{
  const m=app.match(/^const writingPrompts=(\{.*\});$/m);assert.ok(m);
  assert.deepEqual(Object.keys(C.TOPICS).sort(),Object.keys(Function('return ('+m[1]+')')()).sort());
  for(const k of kinds)assert.deepEqual(C.topicsFor(k).map(id=>C.label('ja',k,id)),JA[k],k);
  assert.deepEqual([...C.LANGS].sort(),['en','ja','ko','zh']);assert.deepEqual([...C.STYLES],['short','polite','casual']);
  for(const lang of C.LANGS)for(const k of kinds){const ls=C.topicsFor(k).map(id=>C.label(lang,k,id));assert.equal(new Set(ls).size,ls.length);
    for(const l of ls){assert.ok(l&&!/[0-9０-９]/.test(l),lang+k+l);for(const w of FORBIDDEN[lang])assert.ok(!l.includes(w),l);}}
  assert.equal(C.topicsFor('unknown').join(),C.topicsFor('general').join());
});

test('exhaustive: only the picked topics, each with its own rating, in all three styles; concerns never drop',()=>{
  let cases=0,maxLen=0;
  for(const lang of C.LANGS)for(const kind of kinds){
    const all=C.topicsFor(kind);
    for(const picks of assignments(all)){
      const out=C.compose(lang,kind,picks);
      assert.deepEqual(out.map(c=>c.style),['short','polite','casual']);
      const want=Object.fromEntries(picks.map(p=>[C.label(lang,kind,p.topic),p.rating]));
      for(const {style,text} of out){
        const where=`${lang}/${kind}/${style} ${JSON.stringify(picks)} → ${text}`;
        // (a)(b)(c)(e): decoding the text gives back exactly the picks — no extra topic, none missing, same rating
        assert.deepEqual(decode(lang,kind,text),want,where);
        // (b) unselected topic nouns do not appear anywhere
        for(const id of all)if(!picks.some(p=>p.topic===id)){const l=C.label(lang,kind,id);
          const selectedContaining=picks.some(p=>C.label(lang,kind,p.topic).includes(l));if(!selectedContaining)assert.ok(!text.includes(l),'unselected '+l+' in '+where);}
        // (c) every concern is written as a concern
        const concerns=picks.filter(p=>p.rating==='concern').length;if(concerns)assert.ok(MARK[lang].concern.test(text),where);
        // (d) no digits, links or promotional words
        assert.ok(!/[0-9０-９]/.test(text),where);assert.ok(!/https?:|www\.|\.com|\.jp/i.test(text),where);
        for(const w of FORBIDDEN[lang])assert.ok(!text.toLowerCase().includes(w.toLowerCase()),w+' in '+where);
        assert.ok(!/[!！?？<>]/.test(text),where);
        // (f) length
        assert.ok(text.length<=LIMIT,where);maxLen=Math.max(maxLen,text.length);
      }
      cases++;
    }
  }
  assert.equal(cases,4*(3*(4**5-1)+(4**6-1)));  // 4 languages × (3 kinds with 5 topics + beauty with 6)
  console.log('compose cases',cases,'candidates',cases*3,'longest',maxLen);
});

test('same picks in any order give the same text; the addition is appended as written to every style',()=>{
  const a=[{topic:'wait',rating:'concern'},{topic:'dish',rating:'good'}];
  assert.deepEqual(C.compose('ja','food',a),C.compose('ja','food',[...a].reverse()));
  const out=C.compose('ja','food',a,'  コーヒーは少し熱かった。 ');
  for(const [i,c] of out.entries()){assert.ok(c.text.endsWith('コーヒーは少し熱かった。'));assert.equal(c.text,C.compose('ja','food',a)[i].text+'コーヒーは少し熱かった。');}
  assert.equal(C.compose('en','food',a,'Coffee was hot.')[0].text,'Good: food and drinks. Concern: wait time. Coffee was hot.');
  assert.deepEqual(C.compose('ja','food',a,'').map(c=>c.text),C.compose('ja','food',a).map(c=>c.text));
});

test('bad picks are refused instead of silently dropped',()=>{
  for(const bad of [[],null,[{topic:'dish',rating:'great'}],[{topic:'result',rating:'good'}],[{topic:'dish',rating:'good'},{topic:'dish',rating:'concern'}],
    [{topic:'dish'}],Array.from({length:7},()=>({topic:'dish',rating:'good'}))])
    assert.throws(()=>C.compose('ja','food',bad),/picks/,JSON.stringify(bad));
});

test('examples read naturally (fixed snapshots)',()=>{
  const p=[{topic:'dish',rating:'good'},{topic:'wait',rating:'concern'}];
  assert.deepEqual(C.compose('ja','food',p).map(c=>c.text),['料理・飲み物、よかった。待ち時間、気になった。','料理・飲み物がよかったです。待ち時間は気になるところがありました。','料理・飲み物がよかった。待ち時間は気になった。']);
});
