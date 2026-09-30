"""Isolated browser check for ① the owner's report: the owner's copy on #create (screen and its own print, never on the poster),
the report page (/report#t=<token>&g=<review link>), the small-count rule as shown, the 「直しました」 sign (one printed page),
and the 効果 section (numbers kept in this browser only). Serves intake-beta/public from disk with the worker's CSP; /api/* are fakes
here that answer like the worker; every other host is blocked. Writes PDFs/PNGs next to --out and prints a JSON summary; exit 0 on success.
"""
from pathlib import Path
import argparse,json,mimetypes
from urllib.parse import urlencode
from playwright.sync_api import sync_playwright,expect
R=Path(__file__).resolve().parents[1];PUB=R/'public'
BASE='https://hitokoto.example';GOOGLE='https://g.page/r/qa-fictional-store/review';STORE='QA用の架空店舗'
CSP="default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'"
SID='QAsid_0123456789abcdef';TOKEN='QAtoken_'+'x'*35
FEW={'kind':'food','since':'2026-09-02','days':28,'min':5,'enough':False}
FULL={'kind':'food','since':'2026-09-02','days':28,'min':5,'enough':True,'responses':9,
 'topics':[{'topic':'dish','good':7,'ok':None,'concern':None},{'topic':'drink','good':None,'ok':5,'concern':None},{'topic':'service','good':6,'ok':None,'concern':None},{'topic':'ambience','good':None,'ok':None,'concern':None},
  {'topic':'wait','good':None,'ok':None,'concern':6},{'topic':'price','good':None,'ok':5,'concern':None},{'topic':'location','good':None,'ok':None,'concern':5}],
 'steps':[{'step':s,'count':c} for s,c in [('view',21),('classify',None),('rating',12),('rated',10),('cands',9),('cand',8),('confirm',7),('copy',6),('google',5)]]}
def pages(pdf):return pdf.count(b'/Type /Page')-pdf.count(b'/Type /Pages')
def main():
 ap=argparse.ArgumentParser();ap.add_argument('--out',required=True);a=ap.parse_args();out=Path(a.out);out.parent.mkdir(parents=True,exist_ok=True)
 assert CSP in (R/'worker.mjs').read_text(),'test CSP drifted from worker.mjs'
 res={'requests':[],'blocked_external':[],'page_errors':[]};fake={'report':FULL}
 with sync_playwright() as p:
  b=p.chromium.launch(headless=True)
  def make():
   ctx=b.new_context(viewport={'width':390,'height':844},locale='ja-JP');ctx.grant_permissions(['clipboard-read','clipboard-write'],origin=BASE)
   def route(r):
    url=r.request.url
    if not url.startswith(BASE+'/'):res['blocked_external'].append(url.split('?')[0]);return r.abort()
    path=url[len(BASE):].split('?')[0];res['requests'].append({'url':url,'body':r.request.post_data})
    ok=lambda body,status=200:r.fulfill(status=status,content_type='application/json',body=json.dumps(body))
    if path=='/api/store':return ok({'sid':SID,'token':TOKEN})
    if path=='/api/report':
     body=json.loads(r.request.post_data);assert body=={'token':TOKEN},body;return ok(fake['report'])
    if path=='/api/notice':
     body=json.loads(r.request.post_data);assert set(body)=={'token','topic','text'} and body['token']==TOKEN,body
     if '高評価' in body['text']:return ok({'error':'asks_for_rating'},400)
     return ok({'topic':body['topic'],'text':body['text'].replace('owner@example.com','[MASKED:EMAIL]')})
    if path.startswith('/api/'):return ok({'recorded':True})
    f=PUB/('report.html' if path=='/report' else (path.lstrip('/') or 'index.html'))
    if not f.is_file():return r.fulfill(status=404,body='')
    r.fulfill(status=200,body=f.read_bytes(),content_type=mimetypes.guess_type(f.name)[0] or 'application/octet-stream',headers={'content-security-policy':CSP,'referrer-policy':'no-referrer'})
   ctx.route('**/*',route);pg=ctx.new_page();pg.on('pageerror',lambda e:res['page_errors'].append(str(e)));pg.add_init_script('window.__printed=0;window.print=()=>{window.__printed++;};');return ctx,pg
  visible_text="()=>{const w=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);let s='';while(w.nextNode()){const e=w.currentNode.parentElement;if(e&&e.checkVisibility&&e.checkVisibility())s+=w.currentNode.textContent;}return s;}"
  # --- #create: owner's copy on screen, and two separate prints
  ctx,pg=make();pg.goto(BASE+'/#create');pg.wait_for_load_state('networkidle')
  pg.locator('#store-name').fill(STORE);pg.locator('#review-url').fill(GOOGLE);pg.locator('#store-form button').click();expect(pg.locator('#owner-copy')).to_be_visible()
  report=pg.locator('#report-url').input_value();res['report_url']=report;assert report==BASE+'/report#'+urlencode({'t':TOKEN,'g':GOOGLE}),report
  expect(pg.locator('#owner-copy')).to_contain_text('お客さまに見せないでください')
  pg.locator('#copy-report').click();expect(pg.locator('#owner-copy-status')).to_have_text('コピーしました。');assert pg.evaluate('navigator.clipboard.readText()')==report
  pg.locator('#print-qr').click();pg.emulate_media(media='print');txt=pg.evaluate(visible_text)
  assert TOKEN not in txt and 'report' not in txt and STORE in txt,'the poster print never carries the report link'
  assert pg.locator('#owner-copy').evaluate('e=>getComputedStyle(e).display')=='none';pg.emulate_media(media='screen')
  pg.locator('#print-owner').click();assert pg.evaluate('window.__printed')==2;pg.emulate_media(media='print');txt=pg.evaluate(visible_text)
  assert TOKEN in txt and STORE in txt and '店主控え' in txt,txt[:300];assert pg.locator('#qr-area').evaluate('e=>getComputedStyle(e).display')=='none','owner print has no QR'
  assert pg.locator('#print-message').evaluate('e=>getComputedStyle(e).display')=='none'
  pdf=pg.pdf(format='A4',print_background=True);out.with_suffix('.owner.pdf').write_bytes(pdf);assert pages(pdf)==1,pages(pdf);res['owner_print_pages']=pages(pdf)
  pg.emulate_media(media='screen');ctx.close()
  # --- report page: few → only "まだ少ない"; the token goes in the POST body only
  fake['report']=FEW;ctx,pg=make();pg.goto(report);pg.wait_for_load_state('networkidle')
  expect(pg.locator('#report-few')).to_be_visible();expect(pg.locator('#report-body')).to_be_hidden();expect(pg.locator('#report-few')).to_contain_text('5 件以上')
  for q in res['requests']:assert TOKEN not in q['url'].split('#')[0],q['url']
  assert pg.locator('meta[name=robots]').get_attribute('content')=='noindex,nofollow'
  pg.screenshot(path=str(out.with_suffix('.report_few.png')),full_page=True);ctx.close()
  # --- enough: table with 5件未満 for hidden cells, stages, effect, sign
  fake['report']=FULL;ctx,pg=make();pg.goto(report);pg.wait_for_load_state('networkidle');expect(pg.locator('#report-body')).to_be_visible()
  rows=pg.locator('#report-topics tr').evaluate_all('rs=>rs.map(r=>[...r.children].map(c=>c.textContent))')
  assert rows[0]==['料理','7','5件未満','5件未満'] and rows[4]==['待ち時間','5件未満','5件未満','6'],rows
  steps=pg.locator('#report-steps').evaluate("e=>[...e.querySelectorAll('dt')].map((d,i)=>[d.textContent,e.querySelectorAll('dd')[i].textContent])")
  assert steps[0]==['画面を開いた','21'] and steps[1]==['書いた内容から選んだ（AI）','5件未満'] and steps[-1]==['Googleを開いた','5'],steps
  res['report_rows']=rows;res['report_steps']=steps
  # sign: topics with more 気になった first; rating requests refused; secrets masked; the printed page holds only the sign
  assert pg.locator('#notice-topic option').first.text_content()=='待ち時間（気になった 6件）',pg.locator('#notice-topic option').all_text_contents()
  pg.locator('#notice-text').fill('高評価をお願いします');pg.locator('#notice-form button').click();expect(pg.locator('#notice-status')).to_contain_text('札に使えません');expect(pg.locator('#notice-print')).to_be_hidden()
  pg.locator('#notice-text').fill('注文の受け方を変えました。ご意見は owner@example.com');pg.locator('#notice-form button').click();expect(pg.locator('#notice-print')).to_be_visible()
  expect(pg.locator('#notice-sheet-topic')).to_have_text('待ち時間');expect(pg.locator('#notice-sheet-text')).to_have_text('注文の受け方を変えました。ご意見は [MASKED:EMAIL]')
  assert pg.locator('#notice-text').get_attribute('maxlength')=='60'
  pg.locator('#notice-print').click();assert pg.evaluate('window.__printed')==1;pg.emulate_media(media='print');txt=pg.evaluate(visible_text)
  assert 'お客さまの声から、直しました' in txt and '5件未満' not in txt and '報告' not in txt,txt
  pdf=pg.pdf(format='A4',print_background=True);out.with_suffix('.notice.pdf').write_bytes(pdf);assert pages(pdf)==1,pages(pdf);res['notice_print_pages']=pages(pdf)
  pg.screenshot(path=str(out.with_suffix('.notice.png')));pg.emulate_media(media='screen')
  # effect (A+D): the owner's own numbers, kept in this browser only; links to the store's Google page and to Business Profile
  expect(pg.locator('#effect-card')).to_contain_text('ご自身で入力した数字です。ひとことβの効果を示すものではありません')
  assert pg.locator('#effect-maps').get_attribute('href')=='https://g.page/r/qa-fictional-store',pg.locator('#effect-maps').get_attribute('href')
  assert pg.locator('#effect-card a[href="https://business.google.com/"]').count()==1
  n=len(res['requests']);pg.locator('#effect-start').fill('12');pg.locator('#effect-today').fill('15')
  expect(pg.locator('#effect-diff')).to_have_text('設置した日から +3 件（12 件 → 15 件）。ご自身で入力した数字です。')
  pg.wait_for_timeout(300);assert len(res['requests'])==n,'the numbers are never sent'
  pg.screenshot(path=str(out.with_suffix('.report.png')),full_page=True)
  pg.reload();pg.wait_for_load_state('networkidle');expect(pg.locator('#effect-diff')).to_contain_text('+3 件');assert pg.locator('#effect-start').input_value()=='12'
  for q in res['requests'][n:]:assert '12' not in (q['body'] or '') and '15' not in (q['body'] or ''),q
  assert pg.evaluate('document.documentElement.scrollWidth<=innerWidth'),'mobile overflow'
  ctx.close()
  # a report link without g= (or with an odd one) falls back to Google Maps in general
  ctx,pg=make();pg.goto(BASE+'/report#'+urlencode({'t':TOKEN,'g':'https://evil.example/x'}));pg.wait_for_load_state('networkidle');expect(pg.locator('#effect-card')).to_be_visible()
  assert pg.locator('#effect-maps').get_attribute('href')=='https://www.google.com/maps';ctx.close()
  b.close()
 assert not res['page_errors'],res['page_errors'];assert not res['blocked_external'],res['blocked_external']
 print(json.dumps({k:res[k] for k in ('report_url','owner_print_pages','notice_print_pages','report_rows','report_steps')},ensure_ascii=False))
if __name__=='__main__':main()
