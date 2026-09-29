"""Isolated browser check for the LP redesign (LP / #create / customer views and the 試用店舗募集 form).
Serves intake-beta/public from disk via Playwright routing with the worker's CSP. /api/trial is answered by a fake
in this script (status chosen per case); every other /api/ call and every external host is recorded and refused.
Optional --shots DIR writes full-page JPEG screenshots (390px phone, 1280px desktop, and the create view).
Prints a JSON summary; exit 0 on success.
"""
from pathlib import Path
import argparse,json,mimetypes
from urllib.parse import urlencode
from playwright.sync_api import sync_playwright,expect
R=Path(__file__).resolve().parents[1];PUB=R/'public'
BASE='https://hitokoto.example';GOOGLE='https://g.page/r/qa-fictional-store/review';STORE='QA用の架空店舗'
CSP="default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'"
H1='QRを置くだけ。お客さまが、自分の言葉で書ける。'
def main():
 ap=argparse.ArgumentParser();ap.add_argument('--shots');args=ap.parse_args()
 assert CSP in (R/'worker.mjs').read_text(),'test CSP drifted from worker.mjs'
 res={'trial_bodies':[],'other_api':[],'blocked_external':[],'page_errors':[],'console_errors':[]}
 trial_status={'code':200}
 with sync_playwright() as p:
  b=p.chromium.launch(headless=True)
  def make(width,height=844):
   ctx=b.new_context(viewport={'width':width,'height':height},locale='ja-JP')
   def route(r):
    url=r.request.url
    if not url.startswith(BASE+'/'):res['blocked_external'].append(url.split('?')[0]);return r.abort()
    path=url[len(BASE):].split('?')[0].split('#')[0]
    if path=='/api/trial':
     res['trial_bodies'].append(json.loads(r.request.post_data));code=trial_status['code']
     return r.fulfill(status=code,content_type='application/json',body=json.dumps({'ok':True} if code==200 else {'error':'x'}))
    if path.startswith('/api/'):res['other_api'].append(path);return r.fulfill(status=200,content_type='application/json',body='{"recorded":true}')
    f=PUB/(path.lstrip('/') or 'index.html')
    if not f.is_file():return r.fulfill(status=404,body='')
    r.fulfill(status=200,body=f.read_bytes(),content_type=mimetypes.guess_type(f.name)[0] or 'application/octet-stream',headers={'content-security-policy':CSP})
   ctx.route('**/*',route);pg=ctx.new_page();pg.on('pageerror',lambda e:res['page_errors'].append(str(e)))
   pg.on('console',lambda m:m.type=='error' and res['console_errors'].append(m.text));return ctx,pg
  no_overflow='document.documentElement.scrollWidth<=innerWidth'
  # LP at phone width
  ctx,pg=make(390);pg.goto(BASE+'/');pg.wait_for_load_state('networkidle')
  assert pg.evaluate('document.body.dataset.view')=='lp'
  assert pg.locator('.lp-hero h1').inner_text().replace('\n','')==H1,pg.locator('.lp-hero h1').inner_text()
  expect(pg.locator('#store-form')).to_be_hidden();expect(pg.locator('#sticky-cta')).to_be_hidden();expect(pg.locator('#customer-view')).to_be_hidden()
  pg.locator('#worry').scroll_into_view_if_needed();expect(pg.locator('#sticky-cta')).to_be_visible();pg.evaluate('scrollTo(0,0)');expect(pg.locator('#sticky-cta')).to_be_hidden()
  assert pg.evaluate(no_overflow),'LP mobile overflow'
  assert pg.locator('#hero-qr svg').count()==1 and pg.locator('#poster-qr svg').count()==1,'sample QR not drawn'
  body=pg.locator('#lp').inner_text()
  for must in ['架空の例です','星や感想で、振り分けません。','特典と引き換えにしません。','自動で投稿しません。','2,980','税込','先着10店','合同会社Radineer']:assert must in body,must
  ctas=pg.locator('a[href="#create"]:visible').count();res['visible_create_ctas_390']=ctas;assert ctas>=5,ctas
  if args.shots:pg.screenshot(path=str(Path(args.shots)/'lp_390_full.jpg'),full_page=True,type='jpeg',quality=80)
  # header CTA -> create view; back link -> LP
  pg.locator('.header-cta').click();expect(pg.locator('#store-form')).to_be_visible();assert pg.evaluate('document.body.dataset.view')=='create'
  expect(pg.locator('#lp')).to_be_hidden();expect(pg.locator('#sticky-cta')).to_be_hidden();expect(pg.locator('.header-cta')).to_be_hidden()
  assert pg.evaluate(no_overflow),'create view overflow'
  if args.shots:pg.screenshot(path=str(Path(args.shots)/'create_390_full.jpg'),full_page=True,type='jpeg',quality=80)
  pg.locator('.back-link').click();expect(pg.locator('.lp-hero')).to_be_visible();expect(pg.locator('#store-form')).to_be_hidden()
  # an in-page link from the LP keeps the LP
  pg.locator('#faq').scroll_into_view_if_needed();expect(pg.locator('#sticky-cta')).to_be_visible();pg.locator('#sticky-cta a').click();expect(pg.locator('#store-form')).to_be_visible();pg.go_back();expect(pg.locator('.lp-hero')).to_be_visible()
  # trial form: client-side checks send nothing
  pg.locator('#trial-submit').click();expect(pg.locator('#trial-status')).to_contain_text('店名・お名前・連絡先');assert res['trial_bodies']==[]
  pg.locator('#trial-store').fill('架空の喫茶店');pg.locator('#trial-name').fill('山田 花子');pg.locator('#trial-contact').fill('あとで');pg.locator('#trial-submit').click()
  expect(pg.locator('#trial-status')).to_contain_text('メールアドレスか電話番号');assert res['trial_bodies']==[]
  # server refusals are explained and keep the input
  for code,text in [(429,'今日は受け付けを止めています'),(400,'入力内容を確認してください'),(503,'時間をおいて')]:
   trial_status['code']=code;pg.locator('#trial-contact').fill('owner@example.com');pg.locator('#trial-submit').click()
   expect(pg.locator('#trial-status')).to_contain_text(text);assert pg.locator('#trial-store').input_value()=='架空の喫茶店';expect(pg.locator('#trial-submit')).to_be_enabled()
  trial_status['code']=200;pg.locator('#trial-message').fill('レジ横に置いてみたいです。');pg.locator('#trial-submit').click()
  expect(pg.locator('#trial-done')).to_be_visible();expect(pg.locator('#trial-form')).to_be_hidden()
  last=res['trial_bodies'][-1];assert last=={'storeName':'架空の喫茶店','name':'山田 花子','contact':'owner@example.com','message':'レジ横に置いてみたいです。','website':''},last
  assert len(res['trial_bodies'])==4,res['trial_bodies']
  assert res['other_api']==[],('LP and create view must not send events',res['other_api'])
  ctx.close()
  # desktop LP
  ctx,pg=make(1280,900);pg.goto(BASE+'/');pg.wait_for_load_state('networkidle');expect(pg.locator('#sticky-cta')).to_be_hidden();expect(pg.locator('.owner-nav')).to_be_visible()
  assert pg.evaluate(no_overflow),'LP desktop overflow'
  if args.shots:pg.screenshot(path=str(Path(args.shots)/'lp_1280_full.jpg'),full_page=True,type='jpeg',quality=80)
  ctx.close()
  # customer view hides every owner element; a broken share link opens the create view with the message
  ctx,pg=make(390);pg.goto(BASE+'/?'+urlencode({'store':STORE,'review':GOOGLE}));pg.wait_for_load_state('networkidle')
  expect(pg.locator('#customer-view')).to_be_visible();expect(pg.locator('#lp')).to_be_hidden();expect(pg.locator('.header-cta')).to_be_hidden();expect(pg.locator('#store-form')).to_be_hidden()
  assert res['other_api']==['/api/event'],res['other_api']
  pg.goto(BASE+'/?'+urlencode({'store':STORE,'review':'https://evil.example/review'}));pg.wait_for_load_state('networkidle')
  expect(pg.locator('#store-form')).to_be_visible();expect(pg.locator('#store-error')).to_contain_text('共有リンクを確認してください')
  ctx.close();b.close()
 assert not res['page_errors'],res['page_errors'];assert not res['blocked_external'],res['blocked_external']
 print(json.dumps({k:res[k] for k in ('visible_create_ctas_390','other_api','blocked_external','page_errors','console_errors')}|{'trial_requests':len(res['trial_bodies'])},ensure_ascii=False))
if __name__=='__main__':main()
