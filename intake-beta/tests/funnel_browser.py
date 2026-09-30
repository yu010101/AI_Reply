"""Isolated browser check for the customer screen and its anonymous counts (instruction-025 A/B/C, ③ 時間と離脱, ② AI 分類).
Serves intake-beta/public from disk via Playwright routing with the worker's CSP. /api/* are answered by fakes in this script;
Google and every other host are blocked. Prints a JSON summary; exit 0 on success. Optional --shot PATH saves the 390px
customer screen with every topic listed (before any answer).

Customer screen (本人決定 2026-09-29): every topic of the kind is listed from the start and each needs one of よかった/ふつう/気になった
(no "none"); "どこが？" stays optional; one free-text box, which the AI (/api/classify, faked here) may use to pre-select rows.
"""
from pathlib import Path
import argparse,json,mimetypes,re
from urllib.parse import urlencode,urlparse,parse_qs
from playwright.sync_api import sync_playwright,expect
R=Path(__file__).resolve().parents[1];PUB=R/'public'
BASE='https://hitokoto.example';GOOGLE='https://g.page/r/qa-fictional-store/review';STORE='QA用の架空店舗'
CSP="default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'"
SID='QAsid_0123456789abcdef';TOKEN='QAtoken_'+'x'*35
BUCKETS={'0-10','10-20','20-30','30-60','60-120','120+'}
FOOD=['料理','飲み物','接客','雰囲気・席','待ち時間','価格','立地・アクセス']
def main():
 ap=argparse.ArgumentParser();ap.add_argument('--shot');args=ap.parse_args()
 assert CSP in (R/'worker.mjs').read_text(),'test CSP drifted from worker.mjs'
 res={'event_bodies':[],'draft_bodies':[],'pick_bodies':[],'classify_bodies':[],'store_bodies':[],'blocked_external':[],'page_errors':[]}
 fake={'draft_code':200,'tidy':False,'classify':None,'store':True}
 with sync_playwright() as p:
  b=p.chromium.launch(headless=True)
  def make(locale):
   ctx=b.new_context(viewport={'width':390,'height':844},locale=locale)
   ctx.grant_permissions(['clipboard-read','clipboard-write'],origin=BASE)
   def route(r):
    url=r.request.url
    if not url.startswith(BASE+'/'):res['blocked_external'].append(url.split('?')[0]);return r.abort()
    path=url[len(BASE):].split('?')[0]
    ok=lambda body:r.fulfill(status=200,content_type='application/json',body=json.dumps(body))
    if path=='/api/event':res['event_bodies'].append(json.loads(r.request.post_data));return ok({'recorded':True})
    if path=='/api/pick-stat':res['pick_bodies'].append(json.loads(r.request.post_data));return ok({'recorded':True})
    if path=='/api/store':
     res['store_bodies'].append(json.loads(r.request.post_data))
     return ok({'sid':SID,'token':TOKEN}) if fake['store'] else r.fulfill(status=503,content_type='application/json',body='{"error":"unavailable"}')
    if path=='/api/classify':
     res['classify_bodies'].append(json.loads(r.request.post_data))
     return ok(fake['classify'] or {'picks':[],'mode':'fallback'})
    if path=='/api/draft':
     d=json.loads(r.request.post_data);res['draft_bodies'].append(d)
     if fake['draft_code']!=200:return r.fulfill(status=fake['draft_code'],content_type='application/json',body='{"error":"x"}')
     return ok({'draft':d['text']+'。' if fake['tidy'] else d['text'],'mode':'ai' if fake['tidy'] else 'fallback'})
    f=PUB/(path.lstrip('/') or 'index.html')
    if not f.is_file():return r.fulfill(status=404,body='')
    r.fulfill(status=200,body=f.read_bytes(),content_type=mimetypes.guess_type(f.name)[0] or 'application/octet-stream',headers={'content-security-policy':CSP})
   ctx.route('**/*',route);pg=ctx.new_page();pg.on('pageerror',lambda e:res['page_errors'].append(str(e)));return ctx,pg
  rows=lambda pg:pg.locator('#topics .rate-row')
  # --- #create: only the kind goes to /api/store; the share link gets s=<sid>; the owner's copy shows the report link (not the poster)
  ctx,pg=make('ja-JP');pg.goto(BASE+'/#create');pg.wait_for_load_state('networkidle');assert res['event_bodies']==[],'store page must not count'
  pg.locator('#store-name').fill(STORE);pg.locator('summary').first.click();pg.locator('#store-kind').select_option('food');pg.locator('#review-url').fill(GOOGLE);pg.locator('#store-form button').click()
  expect(pg.locator('#poster-actions')).to_be_visible();msg=pg.locator('#print-message').text_content();voice=pg.locator('#voice-script').text_content()
  assert 'お料理' in msg and 'お会計' in voice,(msg,voice)
  assert res['store_bodies']==[{'kind':'food'}],res['store_bodies']
  share=pg.locator('#share-url').input_value();q=parse_qs(urlparse(share).query);assert q['s']==[SID] and q['store']==[STORE] and q['kind']==['food'],q
  expect(pg.locator('#owner-copy')).to_be_visible();rep=pg.locator('#report-url').input_value()
  assert rep.startswith(BASE+'/report#') and TOKEN in rep and TOKEN not in share and '?' not in rep.split('#')[0],rep
  pg.emulate_media(media='print');assert pg.locator('#voice-kit').evaluate('e=>getComputedStyle(e).display')=='none';assert pg.locator('#owner-copy').evaluate('e=>getComputedStyle(e).display')=='none','report link must not print on the poster';pg.emulate_media(media='screen')
  res['poster']={'message':msg,'voice':voice};res['share_url']=share;res['report_url']=rep
  # --- customer screen: every topic listed, unanswered, the three ratings unselected and alike; the button waits for all answers
  pg.goto(share);pg.wait_for_load_state('networkidle');expect(pg.locator('#customer-view')).to_be_visible();assert pg.locator('html').get_attribute('lang')=='ja'
  assert rows(pg).locator('.rate-name > span:first-child').all_text_contents()==FOOD,rows(pg).locator('.rate-name').all_text_contents()
  assert pg.locator('#topics input:checked').count()==0 and rows(pg).locator('.rate-state').all_text_contents()==['未回答']*7
  assert rows(pg).first.locator('.seg span').all_text_contents()==['よかった','ふつう','気になった']
  LOOK="e=>{const c=getComputedStyle(e);return [c.backgroundColor,c.borderTopColor,c.borderTopWidth,c.fontWeight,c.fontSize,c.color,Math.round(e.getBoundingClientRect().width),Math.round(e.getBoundingClientRect().height)].join('|')}"
  for i in range(7):
   looks=[rows(pg).nth(i).locator('.seg span').nth(j).evaluate(LOOK) for j in range(3)];assert len(set(looks))==1,(i,looks)
  expect(pg.locator('#compose-button')).to_be_disabled();expect(pg.locator('#compose-need')).to_have_text('未回答があと7件あります。すべての話題に答えると押せます。')
  expect(pg.locator('#write-own-toggle')).to_be_visible();expect(pg.locator('#addition')).to_be_visible();expect(pg.locator('.detail-part').first).to_be_hidden()
  assert pg.evaluate('document.documentElement.scrollWidth<=innerWidth'),'mobile overflow (ja)'
  if args.shot:pg.screenshot(path=args.shot,full_page=True);res['shot']=args.shot
  res['rows_height_px']=pg.locator('#topics').evaluate('e=>Math.round(e.getBoundingClientRect().height)')
  # --- ② free text → AI pre-selects rows (the fake answers like the worker: checked ids and quotes only)
  fake['classify']={'mode':'ai','picks':[{'topic':'dish','rating':'good','details':['taste'],'quote':'料理はおいしかった'},{'topic':'wait','rating':'concern','details':[],'quote':'待ち時間が長かった'}]}
  pg.locator('#addition').fill('料理はおいしかった。待ち時間が長かった');pg.locator('#classify-button').click()
  expect(pg.locator('#classify-status')).to_have_text('2件の話題を先に選びました。確かめて、違うところは直してください。')
  assert res['classify_bodies']==[{'kind':'food','text':'料理はおいしかった。待ち時間が長かった'}],res['classify_bodies']
  assert pg.locator('[name=rate-dish]:checked').get_attribute('value')=='good' and pg.locator('[name=rate-wait]:checked').get_attribute('value')=='concern'
  dish=pg.locator('#topics [data-topic=dish]');expect(dish.locator('.rate-from')).to_have_text('書いた「料理はおいしかった」から選びました')
  assert dish.locator('[data-detail][aria-pressed=true]').all_text_contents()==['味']
  expect(pg.locator('#compose-need')).to_have_text('未回答があと5件あります。すべての話題に答えると押せます。')
  # the customer corrects a pre-selected row by hand; a second classify never overwrites a row set by hand
  pg.locator('[name=rate-wait][value=ok]+span').click();expect(pg.locator('#topics [data-topic=wait] .rate-from')).to_be_hidden()
  fake['classify']={'mode':'ai','picks':[{'topic':'wait','rating':'concern','details':[],'quote':'待ち時間が長かった'}]};pg.locator('#classify-button').click();expect(pg.locator('#classify-status')).to_contain_text('選べる話題はありません')
  assert pg.locator('[name=rate-wait]:checked').get_attribute('value')=='ok','a row set by hand stays'
  pg.locator('[name=rate-wait][value=concern]+span').click()
  wait=pg.locator('#topics [data-topic=wait]');expect(wait.locator('.detail-q')).to_contain_text('気になったのはどこ？');wait.locator('[data-detail=serving]').click()
  # answer the rest: keyboard for one row, clicks for the others
  pg.locator('[name=rate-drink][value=good]').focus();pg.keyboard.press('Space');pg.keyboard.press('ArrowRight');assert pg.locator('[name=rate-drink]:checked').get_attribute('value')=='ok'
  for t,r in [('service','good'),('ambience','good'),('price','ok')]:pg.locator('[name=rate-%s][value=%s]+span'%(t,r)).click()
  expect(pg.locator('#compose-button')).to_be_disabled();expect(pg.locator('#compose-need')).to_have_text('未回答があと1件あります。すべての話題に答えると押せます。')
  assert rows(pg).locator('.rate-state').all_text_contents()==['','','','','','','未回答']
  pg.locator('[name=rate-location][value=concern]+span').click();pg.locator('#topics [data-topic=location] [data-detail=parking]').click()
  expect(pg.locator('#compose-button')).to_be_enabled();expect(pg.locator('#compose-need')).to_be_hidden()
  fake['tidy']=True;pg.locator('#compose-button').click();expect(pg.locator('#candidates')).to_be_visible()
  assert res['draft_bodies']==[{'text':'料理はおいしかった。待ち時間が長かった','storeName':STORE}],res['draft_bodies']  # only the written words go to the AI tidy, never the picks
  cands=pg.locator('#cand-options .cand-text').all_text_contents()
  for c in cands:
   for name in FOOD:assert name in c,(name,c)
   assert c.endswith('料理はおいしかった。待ち時間が長かった。'),c
  assert cands[1]=='料理は、味がよかったです。接客と雰囲気・席がよかったです。飲み物と価格はふつうでした。待ち時間は、注文から出てくるまでが気になりました。立地・アクセスは、駐車場が気になりました。料理はおいしかった。待ち時間が長かった。',cands[1]
  srt=lambda bodies:[{**x,'picks':sorted(x['picks'],key=lambda y:y['topic'])} for x in bodies]  # the worker puts picks in table order itself
  assert srt(res['pick_bodies'])==srt([{'kind':'food','picks':[{'topic':'dish','rating':'good','details':['taste']},{'topic':'drink','rating':'ok','details':[]},{'topic':'service','rating':'good','details':[]},{'topic':'ambience','rating':'good','details':[]},{'topic':'wait','rating':'concern','details':['serving']},{'topic':'price','rating':'ok','details':[]},{'topic':'location','rating':'concern','details':['parking']}],'sid':SID}]),res['pick_bodies']
  pg.locator('#cand-options .cand').nth(1).click();expect(pg.locator('#draft-result')).to_be_visible();assert pg.locator('#draft-text').input_value()==cands[1]
  pg.locator('#google-link').click(force=True)  # disabled: must not count
  pg.locator('#confirm').check();pg.locator('#confirm').uncheck();pg.locator('#confirm').check()
  pg.locator('#copy-draft').click();expect(pg.locator('#copy-status')).to_have_text('コピーしました。');pg.locator('#copy-draft').click()
  pg.locator('#google-link').click();pg.wait_for_timeout(300)
  ev=res['event_bodies'];names=[e['event'] for e in ev]
  assert names==['view','classify','rating','rated','draft','cands','cand','confirm','copy','copy','google'],names
  for e in ev:assert set(e)<={'event','sec','sid'} and ('sec' not in e or e['sec'] in BUCKETS),e
  firsts=[e for e in ev if 'sec' in e];assert [e['event'] for e in firsts]==['view','classify','rating','rated','draft','cands','cand','confirm','copy','google'],'each stage once with its bucket'
  assert all(e.get('sid')==SID for e in firsts) and all('sid' not in e for e in ev if 'sec' not in e);assert ev[9]=={'event':'copy'},ev[9]
  res['event_example']=firsts[:3]
  ctx.close()
  # --- an old QR (no s=): works as before, nothing carries a sid; "write my own" is reachable before answering
  n=len(res['event_bodies']);npick=len(res['pick_bodies'])
  q=urlencode({'store':STORE,'review':GOOGLE,'kind':'beauty'})
  ctx,pg=make('ja-JP');pg.goto(BASE+'/?'+q);pg.wait_for_load_state('networkidle');pg.locator('#write-own-toggle').click()
  expect(pg.locator('#write-own')).to_be_visible();assert pg.evaluate("document.activeElement.id")=='experience'
  fake['tidy']=False;pg.locator('#experience').fill('窓際でゆっくりできた');pg.locator('#draft-button').click();expect(pg.locator('#draft-result')).to_be_visible()
  assert res['draft_bodies'][-1]=={'text':'窓際でゆっくりできた','storeName':STORE};pg.locator('.direct-google').click();pg.wait_for_timeout(300)
  assert [e['event'] for e in res['event_bodies'][n:]]==['view','draft','direct'] and all('sid' not in e for e in res['event_bodies'][n:]),res['event_bodies'][n:]
  ctx.close()
  # --- English by browser language; AI unavailable → nothing pre-selected; Korean keeps the answers; all required
  ctx,pg=make('en-US');pg.goto(BASE+'/?'+q);pg.wait_for_load_state('networkidle')
  assert pg.locator('html').get_attribute('lang')=='en';expect(pg.locator('h1').last).to_have_text('How was your visit?')
  assert rows(pg).locator('.rate-name > span:first-child').all_text_contents()==['technique and result','consultation','customer service','atmosphere','wait time','menu and price']
  fake['classify']=None;pg.locator('#addition').fill('The cut was great');pg.locator('#classify-button').click();expect(pg.locator('#classify-status')).to_contain_text('not available')
  assert pg.locator('#topics input:checked').count()==0
  for t,r in [('result','good'),('counseling','ok'),('service','good'),('ambience','ok'),('wait','ok'),('price','concern')]:pg.locator('[name=rate-%s][value=%s]+span'%(t,r)).click()
  pg.locator('#topics [data-topic=result] [data-detail=cut]').click()
  pg.locator('[data-lang="ko"]').click();assert pg.locator('html').get_attribute('lang')=='ko';assert pg.locator('[name=rate-price]:checked').get_attribute('value')=='concern'
  assert pg.locator('#topics [data-topic=result] [data-detail][aria-pressed=true]').all_text_contents()==['커트'];expect(pg.locator('#compose-button')).to_be_enabled()
  pg.locator('#compose-button').click();expect(pg.locator('#candidates')).to_be_visible();assert '커트' in pg.locator('#cand-options .cand-text').first.text_content()
  assert pg.evaluate('document.documentElement.scrollWidth<=innerWidth'),'mobile overflow (ko)'
  ctx.close()
  assert srt(res['pick_bodies'][npick:])==srt([{'kind':'beauty','picks':[{'topic':'result','rating':'good','details':['cut']},{'topic':'counseling','rating':'ok','details':[]},{'topic':'service','rating':'good','details':[]},{'topic':'ambience','rating':'ok','details':[]},{'topic':'wait','rating':'ok','details':[]},{'topic':'price','rating':'concern','details':[]}]}]),res['pick_bodies'][npick:]
  # --- /api/store down: the QR is made exactly as before, without s= and without a report link
  fake['store']=False;ctx,pg=make('ja-JP');pg.goto(BASE+'/#create');pg.wait_for_load_state('networkidle')
  pg.locator('#store-name').fill(STORE);pg.locator('#review-url').fill(GOOGLE);pg.locator('#store-form button').click();expect(pg.locator('#poster-actions')).to_be_visible()
  assert 's' not in parse_qs(urlparse(pg.locator('#share-url').input_value()).query);expect(pg.locator('#owner-copy')).to_be_hidden();expect(pg.locator('#owner-copy-none')).to_be_visible();ctx.close()
  # --- the minimum number of taps from the customer screen to Google (every topic answered, no details, no writing)
  kinds={'food':7,'beauty':6,'retail':5,'general':5}
  res['min_taps']={k:{'before_2bcf616(1 topic chip + its rating)':1+1+4+1,'after(all topics required)':n+1+4} for k,n in kinds.items()}
  res['min_taps_note']='compose(1)+candidate(1)+confirm(1)+copy(1)+google(1) are common; before: 1 topic chip + 1 rating; after: one rating per listed topic. With AI pre-selection, k matched rows save k taps and cost 1 (the button) plus typing.'
  b.close()
 assert not res['page_errors'],res['page_errors'];assert all(u==GOOGLE for u in res['blocked_external']),res['blocked_external']
 print(json.dumps(res,ensure_ascii=False))
if __name__=='__main__':main()
