"""Isolated browser check for the store poster flow (print + SVG download).
Serves intake-beta/public from disk via Playwright routing: no server, no network,
no /api/draft call, no Google navigation. Writes a JSON evidence file to --out.
"""
from pathlib import Path
import argparse,datetime,hashlib,json,mimetypes
from playwright.sync_api import sync_playwright,expect
R=Path(__file__).resolve().parents[1];PUB=R/'public'
BASE='https://hitokoto.example';GOOGLE='https://g.page/r/qa-fictional-store/review';STORE='QA用の架空店舗'
# Same policy the worker sets on every static response (worker.mjs); kept in sync by the assertion below.
SECURITY_HEADERS={'content-security-policy':"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'",'x-content-type-options':'nosniff','referrer-policy':'no-referrer'}
HIDDEN_IN_PRINT=['header','footer','#store-form','.lp-hero','#faq','#copy-link','#preview-link','#poster-actions','#share-url']
SHOWN_IN_PRINT=['#print-store','#print-url','#qr-area svg']
def main():
 ap=argparse.ArgumentParser();ap.add_argument('--out',required=True);args=ap.parse_args()
 result={'checked_at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'base':BASE,'served_from_disk':True,'synthetic_inputs':True,'real_google_posts':0,'draft_api_requests':0,'external_requests_blocked':[],'errors':[],'files':{}}
 assert SECURITY_HEADERS['content-security-policy'] in (R/'worker.mjs').read_text(),'test CSP drifted from worker.mjs'
 for name in ('index.html','app.js','styles.css','qrcode.min.js'):result['files'][name]=hashlib.sha256((PUB/name).read_bytes()).hexdigest()
 with sync_playwright() as p:
  b=p.chromium.launch(headless=True);ctx=b.new_context(viewport={'width':390,'height':844},accept_downloads=True)
  def route(r):
   url=r.request.url
   if not url.startswith(BASE+'/'):result['external_requests_blocked'].append(url.split('?')[0]);return r.abort()
   if '/api/' in url:result['draft_api_requests']+=1;return r.abort()
   path=url[len(BASE):].split('?')[0].lstrip('/') or 'index.html';f=PUB/path
   if not f.is_file():return r.fulfill(status=404,body='')
   r.fulfill(status=200,body=f.read_bytes(),content_type=mimetypes.guess_type(path)[0] or 'application/octet-stream',headers=SECURITY_HEADERS)
  ctx.route('**/*',route);page=ctx.new_page();page.on('pageerror',lambda e:result['errors'].append(str(e)))
  page.add_init_script('window.__printed=0;window.print=()=>{window.__printed++;};')
  page.goto(BASE+'/');page.wait_for_load_state('networkidle')
  expect(page.locator('#poster-actions')).to_be_hidden();assert page.locator('.print-only').first.evaluate('e=>getComputedStyle(e).display')=='none','print caption must be hidden on screen'
  page.locator('#store-name').fill(STORE);page.locator('#review-url').fill(GOOGLE);page.locator('#store-form button').click()
  expect(page.locator('#share-result')).to_be_visible();share=page.locator('#share-url').input_value();result['share_url']=share
  expect(page.locator('#qr-area svg')).to_be_visible();expect(page.locator('#poster-actions')).to_be_visible()
  assert page.locator('#print-store').text_content()==STORE;assert page.locator('#print-url').text_content()==share
  assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'),'mobile overflow'
  # download: file is an SVG carrying the same modules as the on-screen QR
  with page.expect_download() as dl:page.locator('#download-qr').click()
  d=dl.value;data=Path(d.path()).read_bytes();svg=data.decode('utf-8')
  assert d.suggested_filename=='hitokoto-qr.svg' and svg.startswith('<svg') and 'xmlns="http://www.w3.org/2000/svg"' in svg,'download is not a standalone svg'
  screen_paths=page.locator('#qr-area svg path').evaluate_all('n=>n.map(e=>e.getAttribute("d")).join("|")');assert screen_paths and screen_paths in svg,'downloaded modules differ from screen QR'
  result['download']={'name':d.suggested_filename,'bytes':len(data),'sha256':hashlib.sha256(data).hexdigest(),'width_attr':'width="512"' in svg}
  # print: only the poster card remains
  page.locator('#print-qr').click();assert page.evaluate('window.__printed')==1,'print not invoked'
  page.emulate_media(media='print')
  hidden={s:page.locator(s).first.evaluate('e=>getComputedStyle(e).display') for s in HIDDEN_IN_PRINT}
  shown={s:page.locator(s).first.evaluate('e=>getComputedStyle(e).display') for s in SHOWN_IN_PRINT}
  assert all(v=='none' for v in hidden.values()),hidden;assert all(v!='none' for v in shown.values()),shown
  result['print_media']={'hidden':hidden,'shown':shown};page.screenshot(path=str(Path(args.out).with_suffix('.print.png')),full_page=True)
  pdf=page.pdf(format='A4',print_background=True);pages=pdf.count(b'/Type /Page')-pdf.count(b'/Type /Pages');Path(args.out).with_suffix('.print.pdf').write_bytes(pdf)
  assert pages==1,('print must fit one page',pages)
  result['print_pdf']={'bytes':len(pdf),'pages':pages,'sha256':hashlib.sha256(pdf).hexdigest(),'note':'headless Chromium page.pdf with print media; no browser dialog, no printer'}
  page.emulate_media(media='screen');page.set_viewport_size({'width':1440,'height':1000});assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
  page.screenshot(path=str(Path(args.out).with_suffix('.desktop.png')),full_page=True)
  # regenerating with the same inputs yields the same share URL (store keeps no record)
  page.locator('#store-form button').click();assert page.locator('#share-url').input_value()==share
  assert not result['errors'],result['errors'];assert result['draft_api_requests']==0 and not result['external_requests_blocked']
  b.close()
 result.update(served_with_worker_csp=True,poster_actions_after_qr=True,print_caption_hidden_on_screen=True,download_svg_matches_screen_qr=True,print_layout_isolated=True,same_inputs_same_share_url=True,mobile_and_desktop_no_overflow=True)
 Path(args.out).write_text(json.dumps(result,ensure_ascii=False,indent=2));print(json.dumps({k:result[k] for k in ('draft_api_requests','external_requests_blocked','errors','download')},ensure_ascii=False))
if __name__=='__main__':main()
