"""Isolated browser check for the improvement-loop intake (public/loop.js → POST /api/loop-event).
Serves intake-beta/public from disk via Playwright routing with the worker's CSP (headless). /api/loop-event, /api/event and
/api/draft are answered by fakes here; every other host is blocked. For the secrets check only, the served app.js gets a few
test functions appended that throw errors whose message carries the page URL, the store name and made-up text (the file on disk
is not changed). Checks: an exception sends exactly {kind, screen, version, error_type, frame, fp} with no message, URL, store
name or stack text; the same fingerprint is sent once per session (also after a reload); errors that do not come from our files
are not sent; at most 5 per page; the customer feedback is choice-only (no free-text field), sends {kind, screen, version,
category} once per session; the owner form (LP / #create) sends category + text and is hidden on the customer screen;
the pick counts (/api/pick-stat) are sent once per session when the candidates are first shown, with only {kind, picks:[{topic,
rating, details}]} (no store name, link, added words or candidate text), and not again after re-composing, a language switch or a reload.
Prints a JSON summary; exit 0 on success.
"""
from pathlib import Path
import json,mimetypes,re
from urllib.parse import urlencode
from playwright.sync_api import sync_playwright,expect
R=Path(__file__).resolve().parents[1];PUB=R/'public'
BASE='https://hitokoto.example';GOOGLE='https://g.page/r/qa-fictional-store/review';STORE='QA用の架空店舗'
CSP="default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'"
VERSION=re.search(r"const VERSION='([^']+)'",(PUB/'loop.js').read_text()).group(1)
ERROR_KEYS={'kind','screen','version','error_type','frame','fp'}
# test-only functions appended to the served app.js (not on disk): real frames in app.js, messages full of things that must not leave
TEST_APPENDIX="""
function hkTestThrow(){throw new RangeError('本文 こっそり '+document.title+' '+location.href+' '+document.body.innerText.slice(0,80));}
async function hkTestReject(){throw new SyntaxError('秘密の感想 '+location.href);}
function hkTestCustom(){const e=new Error('x '+location.search);e.name='店名エラー';throw e;}
function hkTestMany(n){const f=[function hkM0(){null.a;},function hkM1(){undefined.b;},function hkM2(){({}).c.d;},function hkM3(){[].e.f;},function hkM4(){(void 0)();},function hkM5(){Symbol()+'';}];f[n]();}
document.addEventListener('hk-test',e=>{const k=e.detail;if(k==='throw')hkTestThrow();else if(k==='reject')hkTestReject();else if(k==='custom')hkTestCustom();else hkTestMany(Number(k));});
"""
def main():
 assert CSP in (R/'worker.mjs').read_text(),'test CSP drifted from worker.mjs'
 res={'loop_bodies':[],'event_bodies':[],'pick_bodies':[],'blocked_external':[],'page_errors':[]}
 with sync_playwright() as p:
  b=p.chromium.launch(headless=True)
  def make(inject=False):
   ctx=b.new_context(viewport={'width':390,'height':844},locale='ja-JP')
   def route(r):
    url=r.request.url
    if not url.startswith(BASE+'/'):res['blocked_external'].append(url.split('?')[0]);return r.abort()
    path=url[len(BASE):].split('?')[0].split('#')[0]
    if path=='/api/loop-event':res['loop_bodies'].append({'raw':r.request.post_data,'body':json.loads(r.request.post_data)});return r.fulfill(status=200,content_type='application/json',body='{"recorded":true}')
    if path=='/api/event':res['event_bodies'].append(json.loads(r.request.post_data));return r.fulfill(status=200,content_type='application/json',body='{"recorded":true}')
    if path=='/api/pick-stat':res['pick_bodies'].append({'raw':r.request.post_data,'body':json.loads(r.request.post_data)});return r.fulfill(status=200,content_type='application/json',body='{"recorded":true}')
    if path=='/api/draft':d=json.loads(r.request.post_data);return r.fulfill(status=200,content_type='application/json',body=json.dumps({'draft':d['text'],'mode':'fallback'}))
    f=PUB/(path.lstrip('/') or 'index.html')
    if not f.is_file():return r.fulfill(status=404,body='')
    body=f.read_bytes()
    if inject and f.name=='app.js':body+=TEST_APPENDIX.encode()
    r.fulfill(status=200,body=body,content_type=mimetypes.guess_type(f.name)[0] or 'application/octet-stream',headers={'content-security-policy':CSP})
   ctx.route('**/*',route);pg=ctx.new_page();pg.on('pageerror',lambda e:res['page_errors'].append(str(e)[:60]));return ctx,pg
  share=BASE+'/?'+urlencode({'store':STORE,'review':GOOGLE,'kind':'food'})
  def bodies():return [x['body'] for x in res['loop_bodies']]
  def settle(pg):pg.wait_for_timeout(300)
  # every topic needs an answer (本人決定 2026-09-29); given ratings, the rest 'ok'
  def answer(pg,given):
   for t in pg.locator('#topics .rate-row').evaluate_all('n=>n.map(e=>e.dataset.topic)'):pg.locator('[name=rate-%s][value=%s]'%(t,given.get(t,'ok'))).check(force=True)

  # --- A. a real exception in app.js (sabotaged DOM): exactly the six keys, sent once per session
  ctx,pg=make();pg.goto(share);pg.wait_for_load_state('networkidle');expect(pg.locator('#customer-view')).to_be_visible()
  assert res['loop_bodies']==[],'nothing is sent while nothing fails'
  pg.evaluate("document.getElementById('compose-status').remove()")
  pg.locator('[name=rate-dish][value=good]+span').click();settle(pg)
  assert bodies()==[{'kind':'error','screen':'customer','version':VERSION,'error_type':'TypeError','frame':'app.js:announce','fp':bodies()[0]['fp']}],bodies()
  assert re.fullmatch(r'[0-9a-f]{8}',bodies()[0]['fp'])
  pg.locator('[name=rate-dish][value=ok]+span').click();pg.locator('[name=rate-wait][value=ok]+span').click();settle(pg);assert len(res['loop_bodies'])==1,'same fingerprint: once'
  pg.reload();pg.wait_for_load_state('networkidle');pg.evaluate("document.getElementById('compose-status').remove()");pg.locator('[name=rate-dish][value=good]+span').click();settle(pg)
  assert len(res['loop_bodies'])==1,'same fingerprint: once per session, also after a reload'
  res['real_error_body']=res['loop_bodies'][0]['raw'];ctx.close()

  # --- B. errors whose messages carry the URL, store name and text: none of it leaves; foreign errors are not sent; max 5 per page
  n0=len(res['loop_bodies'])
  ctx,pg=make(inject=True);pg.goto(share);pg.wait_for_load_state('networkidle')
  for k in ['throw','reject','custom']:pg.evaluate("k=>document.dispatchEvent(new CustomEvent('hk-test',{detail:k}))",k);settle(pg)
  got=bodies()[n0:]
  assert [(x['error_type'],x['frame']) for x in got]==[('RangeError','app.js:hkTestThrow'),('SyntaxError','app.js:hkTestReject'),('OtherError','app.js:hkTestCustom')],got
  pg.evaluate("setTimeout(()=>{throw new Error('from elsewhere '+location.href)},0)");pg.evaluate("()=>{Promise.reject(new Error('elsewhere '+location.href));}");settle(pg)
  assert len(res['loop_bodies'])==n0+3,'errors that are not from our files are not sent'
  for i in range(6):pg.evaluate("k=>document.dispatchEvent(new CustomEvent('hk-test',{detail:k}))",str(i));settle(pg)
  assert len(res['loop_bodies'])==n0+5,('at most 5 per page',len(res['loop_bodies'])-n0)
  for x in res['loop_bodies']:
   assert set(x['body'])==ERROR_KEYS,x['body']
   for secret in [STORE,'QA用','g.page','review','http','hitokoto.example','本文','こっそり','秘密','感想','店名','store=','?','\n',' at ','@']:assert secret not in x['raw'],(secret,x['raw'])
   assert not re.search(r':\d+:\d+|\.js:\d',x['raw']),'no line/column numbers (stack text)'
  res['secret_error_bodies']=[x['raw'] for x in res['loop_bodies'][n0:n0+3]];ctx.close()

  # --- C. customer feedback: choice-only, once per session, labels follow the language
  n0=len(res['loop_bodies'])
  ctx,pg=make();pg.goto(share);pg.wait_for_load_state('networkidle')
  fb=pg.locator('#customer-fb');expect(fb.locator('summary')).to_be_visible();expect(pg.locator('#customer-fb-form')).to_be_hidden()
  assert fb.locator('textarea').count()==0 and fb.locator('input:not([type=radio])').count()==0 and fb.locator('[contenteditable]').count()==0,'no free-text field'
  assert fb.locator('summary').evaluate("e=>parseFloat(getComputedStyle(e).fontSize)")<=13,'a small link, not a button'
  fb.locator('summary').click();expect(pg.locator('#customer-fb-form')).to_be_visible()
  assert fb.locator('input[name=fb-cat]').evaluate_all("a=>a.map(e=>e.value)")==['hard_to_use','confusing','broken','good']
  assert fb.locator('input[name=fb-cat]:checked').count()==0 and pg.locator('#customer-fb-where').input_value()==''
  fb.locator('button').click();expect(pg.locator('#customer-fb-status')).to_have_text('2つとも選んでください。');assert len(res['loop_bodies'])==n0
  pg.locator('[data-lang=en]').click();expect(fb.locator('summary')).to_have_text('Tell us about this screen (just choose)');expect(pg.locator('#customer-fb-status')).to_have_text('Please choose both.')
  pg.locator('[data-lang=ja]').click()
  fb.locator('input[value=confusing]').check();pg.locator('#customer-fb-where').select_option('customer-edit');fb.locator('button').click()
  expect(pg.locator('#customer-fb-status')).to_have_text('ありがとうございました。改善に使います。');expect(pg.locator('#customer-fb-form')).to_be_hidden()
  assert bodies()[n0:]==[{'kind':'feedback','screen':'customer-edit','version':VERSION,'category':'confusing'}],bodies()[n0:]
  res['customer_fb_body']=res['loop_bodies'][n0]['raw']
  pg.reload();pg.wait_for_load_state('networkidle');pg.locator('#customer-fb summary').click();expect(pg.locator('#customer-fb-form')).to_be_hidden()
  expect(pg.locator('#customer-fb-status')).to_have_text('ありがとうございました。改善に使います。');assert len(res['loop_bodies'])==n0+1,'once per session'
  expect(pg.locator('#owner-fb')).to_be_hidden();ctx.close()
  ctx,pg=make();pg.goto(share);pg.wait_for_load_state('networkidle');pg.locator('#customer-fb summary').click();expect(pg.locator('#customer-fb-form')).to_be_visible();ctx.close()

  # --- D. owner feedback on #create and on the LP (category + up to 200 characters; masking happens in the worker)
  n0=len(res['loop_bodies'])
  ctx,pg=make();pg.goto(BASE+'/#create');pg.wait_for_load_state('networkidle')
  ofb=pg.locator('#owner-fb');expect(ofb).to_be_visible();expect(pg.locator('#customer-fb')).to_be_hidden()
  ofb.locator('summary').click();ofb.locator('button').click();expect(pg.locator('#owner-fb-status')).to_have_text('内容の種類を選んでください。');assert len(res['loop_bodies'])==n0
  assert pg.locator('#owner-fb-text').get_attribute('maxlength')=='200'
  pg.locator('#owner-fb-cat').select_option('bug');pg.locator('#owner-fb-text').fill('印刷すると2枚になります。連絡は owner@example.com');ofb.locator('button').click()
  expect(pg.locator('#owner-fb-status')).to_contain_text('受け付けました');assert pg.locator('#owner-fb-text').input_value()==''
  assert bodies()[n0:]==[{'kind':'feedback','screen':'create','version':VERSION,'category':'bug','text':'印刷すると2枚になります。連絡は owner@example.com'}],bodies()[n0:]
  res['owner_fb_body']=res['loop_bodies'][n0]['raw']
  pg.goto(BASE+'/');pg.wait_for_load_state('networkidle');expect(pg.locator('#owner-fb')).to_be_visible()
  # at the very end of the LP (snap off, as a resting position) the link is on screen and not under the phone bottom bar
  pg.evaluate("document.documentElement.style.scrollSnapType='none';scrollTo({top:document.documentElement.scrollHeight,behavior:'instant'})");settle(pg)
  assert pg.evaluate("(()=>{const e=document.querySelector('#owner-fb summary'),r=e.getBoundingClientRect();return r.bottom<=innerHeight&&e.contains(document.elementFromPoint(r.left+5,r.top+r.height/2))})()"),'owner link reachable'
  pg.locator('#owner-fb summary').click();pg.locator('#owner-fb-cat').select_option('idea');pg.locator('#owner-fb button').click();expect(pg.locator('#owner-fb-status')).to_contain_text('受け付けました')
  assert bodies()[-1]=={'kind':'feedback','screen':'lp','version':VERSION,'category':'idea'},bodies()[-1]
  assert pg.evaluate('document.documentElement.scrollWidth<=innerWidth'),'no horizontal scroll with the form open'
  ctx.close()

  # --- E. pick counts: once per session, only the kind and the topic/rating/details ids
  ctx,pg=make();pg.goto(share);pg.wait_for_load_state('networkidle');assert res['pick_bodies']==[],'nothing before the candidates'
  answer(pg,{'drink':'good','location':'concern'})
  pg.locator('#topics [data-topic=location] [data-detail=parking]').click();pg.locator('#topics [data-topic=drink] [data-detail=variety]').click();pg.locator('#topics [data-topic=drink] [data-detail=taste]').click()
  pg.locator('#addition').fill('ビールが冷えていた '+STORE);pg.locator('#compose-button').click();expect(pg.locator('#candidates')).to_be_visible();settle(pg)
  cand=pg.locator('#cand-options .cand-text').nth(1).text_content()
  assert cand.startswith('飲み物は、味と種類がよかったです。') and '立地・アクセスは、駐車場が気になりました。' in cand and cand.endswith('ビールが冷えていた '+STORE),cand
  got=res['pick_bodies'][0]['body'];assert got['kind']=='food' and {x['topic']:(x['rating'],x['details']) for x in got['picks']}=={'dish':('ok',[]),'drink':('good',['variety','taste']),'service':('ok',[]),'ambience':('ok',[]),'wait':('ok',[]),'price':('ok',[]),'location':('concern',['parking'])},res['pick_bodies']
  raw=res['pick_bodies'][0]['raw'];res['pick_body']=raw
  body=res['pick_bodies'][0]['body'];assert set(body)=={'kind','picks'} and all(set(x)=={'topic','rating','details'} for x in body['picks']),body
  for secret in [STORE,'QA用','g.page','review','http','hitokoto.example','ビール','冷えて','飲み物','駐車場','store=','よかった']:assert secret not in raw,(secret,raw)
  pg.locator('[name=rate-drink][value=ok]+span').click();pg.locator('#compose-button').click();settle(pg);pg.locator('[data-lang=en]').click();settle(pg)
  pg.reload();pg.wait_for_load_state('networkidle');answer(pg,{'dish':'good'});pg.locator('#compose-button').click();expect(pg.locator('#candidates')).to_be_visible();settle(pg)
  assert len(res['pick_bodies'])==1,('once per session, also after re-composing, a language switch and a reload',len(res['pick_bodies']))
  ctx.close()
  ctx,pg=make();pg.goto(BASE+'/?'+urlencode({'store':STORE,'review':GOOGLE,'kind':'nightclub'}));pg.wait_for_load_state('networkidle')
  answer(pg,{});pg.locator('#compose-button').click();expect(pg.locator('#candidates')).to_be_visible();settle(pg)
  assert res['pick_bodies'][-1]['body']=={'kind':'general','picks':[{'topic':t,'rating':'ok','details':[]} for t in ['service','ambience','wait','price','clarity']]},'an unknown kind is sent as general (what the screen showed)'
  ctx.close()
  b.close()
 assert not res['blocked_external'],res['blocked_external']
 print(json.dumps({'version':VERSION,'loop_requests':len(res['loop_bodies']),'real_error_body':res['real_error_body'],'secret_error_bodies':res['secret_error_bodies'],
   'customer_fb_body':res['customer_fb_body'],'owner_fb_body':res['owner_fb_body'],'pick_body':res['pick_body'],'pick_requests':len(res['pick_bodies']),'page_errors_triggered':len(res['page_errors'])},ensure_ascii=False))
 return 0
if __name__=='__main__':raise SystemExit(main())
