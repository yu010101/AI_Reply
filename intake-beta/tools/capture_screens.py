"""Capture the phone screenshots used by the LP mock-ups (public/img/screen-*.webp) from the real UI.
Serves intake-beta/public from disk via Playwright routing with the worker's CSP, like tests/lp_browser.py.
Inputs are the LP's fictional example (喫茶 こもれび: 料理・飲み物=よかった, 待ち時間=気になった).
The candidates are built by public/compose.js from those picks; no words are added, so /api/draft is not called
(it is answered here anyway so no AI is ever reached); /api/event is answered and discarded; every other host is refused.
Usage: python3 tools/capture_screens.py --tmp DIR   (writes PNGs to DIR, then WebP into public/img with cwebp)
"""
from pathlib import Path
import argparse,json,mimetypes,subprocess
from urllib.parse import urlencode
from playwright.sync_api import sync_playwright,expect
R=Path(__file__).resolve().parents[1];PUB=R/'public';OUT=PUB/'img'
BASE='https://hitokoto.example';STORE='喫茶 こもれび';GOOGLE='https://g.page/r/fictional-komorebi/review'
CSP="default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'"
PICKS=['料理・飲み物','待ち時間'];RESULT='料理・飲み物がよかったです。待ち時間は気になるところがありました。'
W,H=390,780  # phone screen; saved at 2x then scaled to 600px wide
def main():
 ap=argparse.ArgumentParser();ap.add_argument('--tmp',required=True);a=ap.parse_args();tmp=Path(a.tmp);tmp.mkdir(parents=True,exist_ok=True)
 assert CSP in (R/'worker.mjs').read_text(),'CSP drifted from worker.mjs'
 blocked=[];errors=[]
 with sync_playwright() as p:
  b=p.chromium.launch(headless=True);ctx=b.new_context(viewport={'width':W,'height':H},device_scale_factor=2,locale='ja-JP')
  def route(r):
   url=r.request.url
   if not url.startswith(BASE+'/'):blocked.append(url.split('?')[0]);return r.abort()
   path=url[len(BASE):].split('?')[0].split('#')[0]
   if path=='/api/draft':blocked.append(path);return r.fulfill(status=503,body='')  # not expected: nothing is added to the picks
   if path.startswith('/api/'):return r.fulfill(status=200,content_type='application/json',body='{"recorded":true}')
   f=PUB/(path.lstrip('/') or 'index.html')
   if not f.is_file():return r.fulfill(status=404,body='')
   r.fulfill(status=200,body=f.read_bytes(),content_type=mimetypes.guess_type(f.name)[0] or 'application/octet-stream',headers={'content-security-policy':CSP})
  ctx.route('**/*',route);pg=ctx.new_page();pg.on('pageerror',lambda e:errors.append(str(e)))
  shots=[]
  def shot(name,top):
   pg.evaluate("y=>scrollTo({top:y,behavior:'instant'})",max(0,top));pg.wait_for_timeout(150);f=tmp/(name+'.png');pg.screenshot(path=str(f));shots.append(name)
  # 1 お店: 店名とリンクを入れる
  pg.goto(BASE+'/#create');pg.wait_for_load_state('networkidle')
  pg.locator('#store-name').fill(STORE);pg.locator('#review-url').fill(GOOGLE);pg.locator('#review-url').blur()
  shot('screen-create',pg.locator('#store-form').evaluate('e=>e.getBoundingClientRect().top+scrollY-76'))
  # 2 お客さま: 何があったか・どうだったかを選ぶ
  pg.goto(BASE+'/?'+urlencode({'store':STORE,'review':GOOGLE,'kind':'food'}));pg.wait_for_load_state('networkidle')
  for name in PICKS:pg.locator('#topics button',has_text=name).click()
  pg.locator('[name=rate-dish][value=good]').check(force=True);pg.locator('[name=rate-wait][value=concern]').check(force=True)
  shot('screen-input',pg.locator('#pick-card').evaluate('e=>e.getBoundingClientRect().top+scrollY-76'))
  # 3 候補から選んだ文章を確認して Google を開く（お客さま本人）
  pg.locator('#compose-button').click();expect(pg.locator('#candidates')).to_be_visible()
  pg.locator('#cand-options .cand').nth(1).click();assert pg.locator('#draft-text').input_value()==RESULT,pg.locator('#draft-text').input_value()
  pg.locator('#confirm').check();expect(pg.locator('#google-link')).to_have_attribute('aria-disabled','false');pg.locator('#confirm').blur()
  shot('screen-result',pg.locator('#draft-result').evaluate('e=>e.getBoundingClientRect().top+scrollY-76'))
  b.close()
 assert not errors,errors;assert not blocked,blocked
 sizes={}
 for n in shots:
  dst=OUT/(n+'.webp');subprocess.run(['cwebp','-quiet','-q','82','-resize','600','0','-metadata','none',str(tmp/(n+'.png')),'-o',str(dst)],check=True);sizes[n]=dst.stat().st_size
 print(json.dumps({'written':sizes,'blocked_external':blocked,'page_errors':errors},ensure_ascii=False))
if __name__=='__main__':main()
