"""Capture the phone screenshots used by the LP mock-ups (public/img/screen-*.webp) from the real UI.
Serves intake-beta/public from disk via Playwright routing with the worker's CSP, like tests/lp_browser.py.
Inputs are the LP's fictional example, the same as tools/record_demo.py (喫茶 こもれび: the customer writes WRITTEN, the faked AI
pre-selects 料理 and 待ち時間, the customer answers the rest; every topic is required). /api/* are answered by record_demo.fake_api
(no real AI is reached); every other host is refused.
Usage: python3 tools/capture_screens.py --tmp DIR   (writes PNGs to DIR, then WebP into public/img with cwebp)
DIR also gets customer-candidates.png (the candidate list), which the LP does not use; it is for review only.
"""
from pathlib import Path
import argparse,json,mimetypes,subprocess,sys
from urllib.parse import urlencode
from playwright.sync_api import sync_playwright,expect
R=Path(__file__).resolve().parents[1];PUB=R/'public';OUT=PUB/'img'
BASE='https://hitokoto.example';STORE='喫茶 こもれび';GOOGLE='https://g.page/r/fictional-komorebi/review'
CSP="default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'"
sys.dont_write_bytecode=True;sys.path.insert(0,str(Path(__file__).resolve().parent));from record_demo import fake_api,WRITTEN,REST,RESULT  # noqa: E402
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
   if path.startswith('/api/'):return fake_api(r,path)
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
  pg.locator('#addition').fill(WRITTEN);pg.locator('#classify-button').click();expect(pg.locator('#classify-status')).to_contain_text('2件')
  for topic,rating in REST.items():pg.locator('[name=rate-%s][value=%s]+span'%(topic,rating)).click()
  pg.locator('#compose-button').blur()
  # the free text and the first rows (料理 pre-selected from the text, with its 「どこが？」)
  shot('screen-input',pg.locator('#addition-part').evaluate('e=>e.getBoundingClientRect().top+scrollY-76'))
  # 3 候補から選んだ文章を確認して Google を開く（お客さま本人）
  pg.locator('#compose-button').click();expect(pg.locator('#candidates')).to_be_visible()
  pg.evaluate("scrollTo({top:document.getElementById('candidates').getBoundingClientRect().top+scrollY-76,behavior:'instant'})");pg.wait_for_timeout(150)
  pg.screenshot(path=str(tmp/'customer-candidates.png'))
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
