"""Isolated browser check for instruction-025 (A funnel events, B poster kit, C customer languages).
Serves intake-beta/public from disk via Playwright routing with the worker's CSP. /api/draft and /api/event are
answered by a fake in this script; Google and every other host are blocked. Prints a JSON summary; exit 0 on success.
"""
from pathlib import Path
import json,mimetypes,sys
from urllib.parse import urlencode
from playwright.sync_api import sync_playwright,expect
R=Path(__file__).resolve().parents[1];PUB=R/'public'
BASE='https://hitokoto.example';GOOGLE='https://g.page/r/qa-fictional-store/review';STORE='QA用の架空店舗'
CSP="default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'"
def main():
 assert CSP in (R/'worker.mjs').read_text(),'test CSP drifted from worker.mjs'
 res={'event_bodies':[],'draft_bodies':[],'blocked_external':[],'page_errors':[]}
 with sync_playwright() as p:
  b=p.chromium.launch(headless=True)
  def make(locale):
   ctx=b.new_context(viewport={'width':390,'height':844},locale=locale)
   ctx.grant_permissions(['clipboard-read','clipboard-write'],origin=BASE)
   def route(r):
    url=r.request.url
    if not url.startswith(BASE+'/'):res['blocked_external'].append(url.split('?')[0]);return r.abort()
    path=url[len(BASE):].split('?')[0]
    if path=='/api/event':res['event_bodies'].append(json.loads(r.request.post_data));return r.fulfill(status=200,content_type='application/json',body='{"recorded":true}')
    if path=='/api/draft':d=json.loads(r.request.post_data);res['draft_bodies'].append(d);return r.fulfill(status=200,content_type='application/json',body=json.dumps({'draft':d['text'],'mode':'fallback'}))
    f=PUB/(path.lstrip('/') or 'index.html')
    if not f.is_file():return r.fulfill(status=404,body='')
    r.fulfill(status=200,body=f.read_bytes(),content_type=mimetypes.guess_type(f.name)[0] or 'application/octet-stream',headers={'content-security-policy':CSP})
   ctx.route('**/*',route);pg=ctx.new_page();pg.on('pageerror',lambda e:res['page_errors'].append(str(e)));return ctx,pg
  # A: store page sends no events; customer funnel sends only {event}
  ctx,pg=make('ja-JP');pg.goto(BASE+'/');pg.wait_for_load_state('networkidle');assert res['event_bodies']==[],'store page must not count'
  # B: poster caption/voice script follow the store kind
  pg.locator('#store-name').fill(STORE);pg.locator('summary').first.click();pg.locator('#store-kind').select_option('food');pg.locator('#review-url').fill(GOOGLE);pg.locator('#store-form button').click()
  expect(pg.locator('#poster-actions')).to_be_visible();msg=pg.locator('#print-message').text_content();voice=pg.locator('#voice-script').text_content()
  assert 'お料理' in msg and 'お会計' in voice,(msg,voice);expect(pg.locator('#voice-kit')).to_be_visible()
  pg.emulate_media(media='print');assert pg.locator('#voice-kit').evaluate('e=>getComputedStyle(e).display')=='none';assert pg.locator('#print-message').evaluate('e=>getComputedStyle(e).display')!='none';pg.emulate_media(media='screen')
  res['poster']={'message':msg,'voice':voice}
  share=pg.locator('#share-url').input_value();assert res['event_bodies']==[]
  pg.goto(share);pg.wait_for_load_state('networkidle')
  expect(pg.locator('#customer-view')).to_be_visible();assert pg.locator('html').get_attribute('lang')=='ja'
  pg.locator('[data-tag="good"]').click();pg.locator('#experience').fill('窓際でゆっくりできた');pg.locator('#draft-button').click();expect(pg.locator('#draft-result')).to_be_visible()
  assert res['draft_bodies'][-1]=={'text':'よかった。窓際でゆっくりできた','storeName':STORE},res['draft_bodies']
  pg.locator('#google-link').click(force=True)  # disabled: must not count
  pg.locator('#confirm').check();pg.locator('#copy-draft').click();expect(pg.locator('#copy-status')).to_have_text('コピーしました。')
  pg.locator('#google-link').click();pg.locator('.direct-google').click();pg.wait_for_timeout(300)
  assert [e['event'] for e in res['event_bodies']]==['view','draft','copy','google','direct'],res['event_bodies']
  assert all(list(e)==['event'] for e in res['event_bodies'])
  ctx.close()
  # C: browser language picks English; switch to Korean; customer's words are not translated
  n=len(res['event_bodies']);ctx,pg=make('en-US');q=urlencode({'store':STORE,'review':GOOGLE,'kind':'beauty'})
  pg.goto(BASE+'/?'+q);pg.wait_for_load_state('networkidle')
  assert pg.locator('html').get_attribute('lang')=='en';expect(pg.locator('h1').last).to_have_text('How was your visit?')
  assert pg.locator('#customer-store').text_content()=='Your thoughts on '+STORE;assert 'treatment' in pg.locator('#writing-prompt').text_content()
  pg.locator('[data-tag="concern"]').click();pg.locator('#experience').fill('The wait was long');pg.locator('#draft-button').click();expect(pg.locator('#draft-result')).to_be_visible()
  assert res['draft_bodies'][-1]['text']=='Something bothered me. The wait was long',res['draft_bodies'][-1]
  pg.locator('[data-lang="ko"]').click();assert pg.locator('html').get_attribute('lang')=='ko';expect(pg.locator('#draft-button')).to_contain_text('문장 다듬기')
  assert pg.locator('#experience').input_value()=='The wait was long';assert pg.locator('[data-lang="ko"]').get_attribute('aria-pressed')=='true'
  assert pg.evaluate('document.documentElement.scrollWidth<=innerWidth'),'mobile overflow'
  ctx.close();ctx,pg=make('ja-JP');pg.goto(BASE+'/?'+q+'&lang=zh');pg.wait_for_load_state('networkidle');assert pg.locator('html').get_attribute('lang')=='zh-Hans';expect(pg.locator('h1').last).to_have_text('这次体验怎么样？');ctx.close()
  assert [e['event'] for e in res['event_bodies'][n:]]==['view','draft','view'],res['event_bodies'][n:]
  b.close()
 assert not res['page_errors'],res['page_errors'];assert all(u==GOOGLE for u in res['blocked_external']),res['blocked_external']
 print(json.dumps(res,ensure_ascii=False))
if __name__=='__main__':main()
