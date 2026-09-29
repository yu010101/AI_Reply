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
 res={'event_bodies':[],'draft_bodies':[],'blocked_external':[],'page_errors':[]};draft_status={'code':200,'tidy':False}
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
    if path=='/api/draft':
     d=json.loads(r.request.post_data);res['draft_bodies'].append(d)
     if draft_status['code']!=200:return r.fulfill(status=draft_status['code'],content_type='application/json',body='{"error":"x"}')
     return r.fulfill(status=200,content_type='application/json',body=json.dumps({'draft':d['text']+'。' if draft_status['tidy'] else d['text'],'mode':'ai' if draft_status['tidy'] else 'fallback'}))
    f=PUB/(path.lstrip('/') or 'index.html')
    if not f.is_file():return r.fulfill(status=404,body='')
    r.fulfill(status=200,body=f.read_bytes(),content_type=mimetypes.guess_type(f.name)[0] or 'application/octet-stream',headers={'content-security-policy':CSP})
   ctx.route('**/*',route);pg=ctx.new_page();pg.on('pageerror',lambda e:res['page_errors'].append(str(e)));return ctx,pg
  # A: store page sends no events; customer funnel sends only {event}
  ctx,pg=make('ja-JP');pg.goto(BASE+'/#create');pg.wait_for_load_state('networkidle');assert res['event_bodies']==[],'store page must not count'
  # B: poster caption/voice script follow the store kind
  pg.locator('#store-name').fill(STORE);pg.locator('summary').first.click();pg.locator('#store-kind').select_option('food');pg.locator('#review-url').fill(GOOGLE);pg.locator('#store-form button').click()
  expect(pg.locator('#poster-actions')).to_be_visible();msg=pg.locator('#print-message').text_content();voice=pg.locator('#voice-script').text_content()
  assert 'お料理' in msg and 'お会計' in voice,(msg,voice);expect(pg.locator('#voice-kit')).to_be_visible()
  pg.emulate_media(media='print');assert pg.locator('#voice-kit').evaluate('e=>getComputedStyle(e).display')=='none';assert pg.locator('#print-message').evaluate('e=>getComputedStyle(e).display')!='none';pg.emulate_media(media='screen')
  res['poster']={'message':msg,'voice':voice}
  share=pg.locator('#share-url').input_value();assert res['event_bodies']==[]
  pg.goto(share);pg.wait_for_load_state('networkidle')
  expect(pg.locator('#customer-view')).to_be_visible();assert pg.locator('html').get_attribute('lang')=='ja'
  # pick-to-draft: fixed neutral topics for the kind, nothing chosen at first
  assert pg.locator('#topics button').all_text_contents()==['料理・飲み物','接客','雰囲気・席','待ち時間','価格'],pg.locator('#topics button').all_text_contents()
  assert pg.locator('#topics [aria-pressed=true]').count()==0 and pg.locator('#ratings fieldset').count()==0
  expect(pg.locator('#write-own-toggle')).to_be_visible();expect(pg.locator('#write-own')).to_be_hidden();expect(pg.locator('#draft-result')).to_be_hidden()
  pg.locator('#compose-button').click();expect(pg.locator('#compose-status')).to_contain_text('1つ以上選ぶ');assert res['draft_bodies']==[]
  pg.locator('#topics button',has_text='料理・飲み物').click();pg.locator('#topics button',has_text='待ち時間').click()
  assert pg.locator('#topics [aria-pressed=true]').all_text_contents()==['料理・飲み物','待ち時間']
  assert pg.locator('#ratings fieldset').count()==2 and pg.locator('#ratings input:checked').count()==0,'ratings must start unselected'
  assert pg.locator('#ratings fieldset').first.locator('span').all_text_contents()==['よかった','ふつう','気になった']
  # the three ratings look the same (no answer favoured), unchecked and checked
  LOOK="e=>{const c=getComputedStyle(e);return [c.backgroundColor,c.borderTopColor,c.borderTopWidth,c.fontWeight,c.fontSize,c.color,Math.round(e.getBoundingClientRect().width),Math.round(e.getBoundingClientRect().height)].join('|')}"
  looks=[pg.locator('#ratings fieldset').first.locator('span').nth(i).evaluate(LOOK) for i in range(3)];assert len(set(looks))==1,looks
  pg.locator('#compose-button').click();expect(pg.locator('#compose-status')).to_contain_text('どうだったか');assert res['draft_bodies']==[]
  pg.locator('[name=rate-dish][value=good]').check(force=True)
  # keyboard: Space picks a rating, arrow keys move within the three
  pg.locator('[name=rate-wait][value=good]').focus();pg.keyboard.press('Space');pg.keyboard.press('ArrowRight');pg.keyboard.press('ArrowRight')
  assert pg.locator('[name=rate-wait]:checked').get_attribute('value')=='concern'
  on=[pg.locator('#ratings fieldset').nth(i).locator('input:checked + span').evaluate(LOOK) for i in range(2)];assert on[0]==on[1],on
  pg.locator('#addition').fill('コーヒーは少し熱かった');draft_status['tidy']=True;pg.locator('#compose-button').click();expect(pg.locator('#candidates')).to_be_visible()
  assert res['draft_bodies']==[{'text':'コーヒーは少し熱かった','storeName':STORE}],res['draft_bodies']  # only the added words go to the AI, never the picks
  cands=pg.locator('#cand-options .cand-text').all_text_contents()
  assert cands==['料理・飲み物、よかった。待ち時間、気になった。コーヒーは少し熱かった。','料理・飲み物がよかったです。待ち時間は気になるところがありました。コーヒーは少し熱かった。','料理・飲み物がよかった。待ち時間は気になった。コーヒーは少し熱かった。'],cands
  assert pg.locator('#cand-options .cand-style').all_text_contents()==['短く','ていねい','くだけた']
  assert pg.locator('input[name=cand]').count()==4 and pg.locator('input[name=cand]:checked').count()==0;expect(pg.locator('.cand-own')).to_contain_text('自分で書く')
  expect(pg.locator('#draft-result')).to_be_hidden()
  pg.locator('#cand-options .cand').nth(1).click();expect(pg.locator('#draft-result')).to_be_visible()
  assert pg.locator('#draft-text').input_value()==cands[1];expect(pg.locator('#draft-mode')).to_contain_text('選んだことだけ');expect(pg.locator('#draft-mode')).to_contain_text('AIが句読点')
  pg.locator('#google-link').click(force=True)  # disabled: must not count
  pg.locator('#draft-text').fill(cands[1]+'また行きたい');pg.locator('#confirm').check()  # the customer may add anything themselves
  expect(pg.locator('#google-link')).to_have_attribute('aria-disabled','false')
  pg.locator('#copy-draft').click();expect(pg.locator('#copy-status')).to_have_text('コピーしました。')
  assert pg.evaluate('navigator.clipboard.readText()')==cands[1]+'また行きたい'
  pg.locator('#google-link').click()
  # "write my own" from the candidate list and from the first step: the tidy flow still works
  pg.locator('.cand-own').click();expect(pg.locator('#write-own')).to_be_visible();expect(pg.locator('#draft-result')).to_be_hidden()
  draft_status['tidy']=False;pg.locator('#experience').fill('窓際でゆっくりできた');pg.locator('#draft-button').click();expect(pg.locator('#draft-result')).to_be_visible()
  assert res['draft_bodies'][-1]=={'text':'窓際でゆっくりできた','storeName':STORE},res['draft_bodies']
  assert pg.locator('#draft-text').input_value()=='窓際でゆっくりできた'
  pg.locator('.direct-google').click();pg.wait_for_timeout(300)
  assert [e['event'] for e in res['event_bodies']]==['view','draft','copy','google','draft','direct'],res['event_bodies']
  assert all(list(e)==['event'] for e in res['event_bodies'])
  assert pg.evaluate('document.documentElement.scrollWidth<=innerWidth'),'mobile overflow (ja)'
  ctx.close()
  # "write my own" is reachable before choosing anything
  ctx,pg=make('ja-JP');pg.goto(share);pg.wait_for_load_state('networkidle');pg.locator('#write-own-toggle').click()
  expect(pg.locator('#write-own')).to_be_visible();assert pg.evaluate("document.activeElement.id")=='experience';assert pg.locator('#write-own-toggle').get_attribute('aria-expanded')=='true'
  pg.locator('#draft-button').click();expect(pg.locator('#draft-status')).to_contain_text('短い感想を書いて');ctx.close()
  # C: browser language picks English; switch to Korean; picks survive; the customer's own words are not translated
  n=len(res['event_bodies']);nd=len(res['draft_bodies']);ctx,pg=make('en-US');q=urlencode({'store':STORE,'review':GOOGLE,'kind':'beauty'})
  pg.goto(BASE+'/?'+q);pg.wait_for_load_state('networkidle')
  assert pg.locator('html').get_attribute('lang')=='en';expect(pg.locator('h1').last).to_have_text('How was your visit?')
  assert pg.locator('#customer-store').text_content()=='Your thoughts on '+STORE;assert 'treatment' in pg.locator('#writing-prompt').text_content()
  assert pg.locator('#topics button').all_text_contents()==['result','consultation','service','atmosphere','wait time','price']
  pg.locator('#topics button',has_text='result').click();pg.locator('#topics button',has_text='price').click()
  pg.locator('[name=rate-result][value=good]').check(force=True);pg.locator('[name=rate-price][value=concern]').check(force=True)
  pg.locator('#compose-button').click();expect(pg.locator('#candidates')).to_be_visible();assert len(res['draft_bodies'])==nd,'no AI call without added words'
  assert pg.locator('#cand-options .cand-text').first.text_content()=='Good: result. Concern: price.'
  pg.locator('[data-lang="ko"]').click();assert pg.locator('html').get_attribute('lang')=='ko';expect(pg.locator('#compose-button')).to_contain_text('문장 후보 보기')
  assert pg.locator('#topics [aria-pressed=true]').all_text_contents()==['결과','가격'];assert pg.locator('[name=rate-price]:checked').get_attribute('value')=='concern'
  assert pg.locator('#cand-options .cand-text').first.text_content()=='결과: 좋음. 가격: 신경 쓰임.',pg.locator('#cand-options .cand-text').first.text_content()
  pg.locator('#write-own-toggle').click();pg.locator('#experience').fill('The wait was long');pg.locator('[data-lang="zh"]').click();assert pg.locator('#experience').input_value()=='The wait was long'
  assert pg.locator('[data-lang="zh"]').get_attribute('aria-pressed')=='true'
  assert pg.evaluate('document.documentElement.scrollWidth<=innerWidth'),'mobile overflow'
  ctx.close()
  # /api/draft down: the added words are used as written
  ctx,pg=make('ja-JP');pg.goto(BASE+'/?'+q+'&lang=zh');pg.wait_for_load_state('networkidle');assert pg.locator('html').get_attribute('lang')=='zh-Hans';expect(pg.locator('h1').last).to_have_text('这次体验怎么样？')
  draft_status['code']=503;pg.locator('#topics button').nth(4).click();pg.locator('[name=rate-wait][value=ok]').check(force=True);pg.locator('#addition').fill('咖啡有点烫')
  pg.locator('#compose-button').click();expect(pg.locator('#candidates')).to_be_visible()
  assert pg.locator('#cand-options .cand-text').all_text_contents()==['等待时间：一般。咖啡有点烫','我觉得等待时间一般。咖啡有点烫','等待时间感觉一般。咖啡有点烫'],pg.locator('#cand-options .cand-text').all_text_contents()
  pg.locator('#cand-options .cand').first.click();expect(pg.locator('#draft-mode')).to_contain_text('按原文');draft_status['code']=200
  ctx.close()
  assert [e['event'] for e in res['event_bodies'][n:]]==['view','draft','view','draft'],res['event_bodies'][n:]
  b.close()
 assert not res['page_errors'],res['page_errors'];assert all(u==GOOGLE for u in res['blocked_external']),res['blocked_external']
 print(json.dumps(res,ensure_ascii=False))
if __name__=='__main__':main()
