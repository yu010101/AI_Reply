// instruction-025 B/C: wording and translation-key checks on public/app.js and public/index.html (no browser, no network).
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const app=readFileSync(new URL('../public/app.js',import.meta.url),'utf8');
const html=readFileSync(new URL('../public/index.html',import.meta.url),'utf8');
const grab=name=>{const m=app.match(new RegExp('^const '+name+'=(\\{.*\\});$','m'));assert.ok(m,name+' not found');return Function('"use strict";return ('+m[1]+');')();};
const writingPrompts=grab('writingPrompts'),posterMessages=grab('posterMessages'),voiceScripts=grab('voiceScripts');
// Google review policy: no incentives, no selective solicitation of positive reviews.
const FORBIDDEN=['割引','特典','プレゼント','クーポン','無料','ポイント','景品','お礼','値引','サービスします','星5','星５','★5','★５','高評価','よい評価','良い評価','いい評価','いい口コミ','良い口コミ','満点','おすすめ','ぜひ高'];
test('poster and voice scripts cover every store kind and carry no incentive or rating request',()=>{
  for(const table of [posterMessages,voiceScripts]){assert.deepEqual(Object.keys(table).sort(),Object.keys(writingPrompts).sort());
    for(const [kind,text] of Object.entries(table)){for(const w of FORBIDDEN)assert.ok(!text.includes(w),kind+': '+w);assert.ok(text.includes('気になった'),kind+' must invite concerns too');}}
});
test('every customer-view data-i18n key exists in every language, and prompts cover every kind',()=>{
  const m=app.match(/^const I18N=(\{[\s\S]*?\}\}\});$/m);assert.ok(m,'I18N not found');const I18N=Function('writingPrompts','"use strict";return ('+m[1]+');')(writingPrompts);
  const keys=[...html.matchAll(/data-i18n="([^"]+)"/g)].map(x=>x[1]);assert.ok(keys.length>=20,String(keys.length));
  const base=Object.keys(I18N.ja).sort();
  for(const [lang,d] of Object.entries(I18N)){assert.deepEqual(Object.keys(d).sort(),base,lang);for(const k of keys)assert.equal(typeof d[k],'string',lang+':'+k);
    assert.deepEqual(Object.keys(d.prompts).sort(),Object.keys(writingPrompts).sort(),lang);for(const k of ['tag_good','tag_usual','tag_concern'])assert.ok(d[k].length>0);
    assert.equal(typeof d.suffix('X'),'string');assert.ok(d.suffix('X').includes('X'));}
  assert.equal(I18N.ja.prompts,writingPrompts);
});
