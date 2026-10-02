"""Isolated headless browser check for the owner dashboard (店主の管理画面, 2026-10-02 本人決定) and what its settings do on the customer screen.
Serves intake-beta/public from disk with the worker's CSP; /api/* are fakes here that answer like the worker; every other host is blocked.
 1. Dashboard: the first card is お客さまの声 (topics, どこが, お店にだけ届いた声), then 到達の数字 (stages, daily), 効果, 札, お店の設定.
 2. Routing consent: off by default; on only after the policy panel is opened, the box is ticked and the second step is pressed;
    the request carries the consent version; cancel sends nothing; off needs no consent. Link form: 400 is explained, a save is shown.
 3. Customer screen, routing on: a low rating (Compose.isLow) gets the thanks card only (no candidates, no Google link, no AI call);
    a rating that is not low gets the usual flow; before rating, the two direct paths to Google are hidden.
 4. LINE / Instagram buttons: at the bottom of the customer screen from the start, the same element for everyone (low, not low, off).
 5. Routing off: the customer screen's DOM (#customer-view outerHTML at every step) and every request body are byte for byte those of
    main e4e1ebb (served from git), apart from the one GET /api/store-config a newer QR (s=) makes; an old QR makes no extra request.
Writes screenshots next to --out (prefix) and prints a JSON summary; exit 0 on success.
"""
from pathlib import Path
import argparse,json,mimetypes,subprocess
from urllib.parse import urlencode
from playwright.sync_api import sync_playwright,expect
R=Path(__file__).resolve().parents[1];PUB=R/'public';BASELINE='e4e1ebb'
BASE='https://hitokoto.example';GOOGLE='https://g.page/r/qa-fictional-store/review';STORE='QA用の架空店舗'
CSP="default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'"
TOKEN='QAtoken_'+'x'*35;CONSENT='2026-10-02'
SID_OFF='QAsidOFF_0123456789abc';SID_ON='QAsidON_0123456789abcd';SID_LINKS='QAsidLNK_0123456789abc';SID_FAIL='QAsidFAIL_0123456789ab'
LINE='https://lin.ee/QAfict1';IG='https://www.instagram.com/qa_fictional_store/'
CONFIG={SID_OFF:{'route':False,'line':'','instagram':''},SID_ON:{'route':True,'line':LINE,'instagram':IG},SID_LINKS:{'route':False,'line':LINE,'instagram':IG}}
FOOD=['dish','drink','service','ambience','wait','price','location']
SETTINGS_OFF={'route':False,'consentAt':None,'line':'','instagram':'','needsReconsent':False}
DASH={'kind':'food','since':'2026-09-05','days':28,'min':5,'enough':True,'responses':12,
 'topics':[{'topic':'dish','good':8,'ok':None,'concern':None},{'topic':'drink','good':None,'ok':6,'concern':None},{'topic':'service','good':7,'ok':None,'concern':None},{'topic':'ambience','good':None,'ok':None,'concern':None},
  {'topic':'wait','good':None,'ok':None,'concern':7},{'topic':'price','good':None,'ok':5,'concern':None},{'topic':'location','good':None,'ok':None,'concern':5}],
 'steps':[{'step':s,'count':c} for s,c in [('view',30),('classify',None),('rating',16),('rated',13),('cands',12),('cand',10),('confirm',9),('copy',8),('google',6)]],
 'details':[{'topic':'dish','rating':'good','detail':'taste','count':6},{'topic':'wait','rating':'concern','detail':'serving','count':5}],
 'daily':[{'day':'2026-10-01','view':None,'cands':0,'copy':0,'google':None},{'day':'2026-10-02','view':9,'cands':6,'copy':5,'google':0}],
 'weekly':[{'from':'2026-09-05','to':'2026-09-11','view':0,'cands':0,'copy':0,'google':0},{'from':'2026-09-12','to':'2026-09-18','view':0,'cands':0,'copy':0,'google':0},{'from':'2026-09-19','to':'2026-09-25','view':None,'cands':0,'copy':0,'google':0},{'from':'2026-09-26','to':'2026-10-02','view':13,'cands':6,'copy':5,'google':None}],
 'route':{'held':5,'passed':None},'held_topics':[{'topic':t,'good':None,'ok':None,'concern':5 if t=='wait' else None} for t in FOOD],'settings':SETTINGS_OFF}
FEW={'kind':'food','since':'2026-09-05','days':28,'min':5,'enough':False,'settings':SETTINGS_OFF}
def git_file(rel):
 try:return subprocess.run(['git','show',BASELINE+':intake-beta/public/'+rel],cwd=R,capture_output=True,check=True).stdout
 except subprocess.CalledProcessError:return None
def main():
 ap=argparse.ArgumentParser();ap.add_argument('--out',required=True);a=ap.parse_args();out=Path(a.out);out.parent.mkdir(parents=True,exist_ok=True)
 assert CSP in (R/'worker.mjs').read_text(),'test CSP drifted from worker.mjs'
 assert ("ROUTE_CONSENT_VERSION='"+CONSENT+"'") in (R/'worker.mjs').read_text(),'consent version drifted from worker.mjs'
 res={'blocked_external':[],'page_errors':[],'shots':[]};fake={'report':DASH,'settings_status':200}
 with sync_playwright() as p:
  b=p.chromium.launch(headless=True)
  def make(source='new',width=390,log=None):
   ctx=b.new_context(viewport={'width':width,'height':844},locale='ja-JP');ctx.grant_permissions(['clipboard-read','clipboard-write'],origin=BASE)
   reqs=[] if log is None else log
   def route(r):
    url=r.request.url
    if not url.startswith(BASE+'/'):
     if not url.startswith(GOOGLE):res['blocked_external'].append(url.split('?')[0])
     return r.abort()
    path=url[len(BASE):].split('?')[0];body=r.request.post_data
    ok=lambda data,status=200:r.fulfill(status=status,content_type='application/json',body=json.dumps(data))
    if path.startswith('/api/'):reqs.append({'method':r.request.method,'url':url[len(BASE):],'body':body})
    if path=='/api/store-config':
     sid=url.split('s=')[1] if 's=' in url else ''
     if sid==SID_FAIL or (fake.get('config_fail') and sid==SID_ON):return ok({'error':'unavailable'},503)
     return ok(CONFIG.get(sid,{'route':False,'line':'','instagram':''}))
    if path=='/compose.js' and fake.get('no_compose'):return r.fulfill(status=404,body='')
    if path=='/api/report':return ok(fake['report'])
    if path=='/api/settings':
     d=json.loads(body);assert d['token']==TOKEN,d
     if fake['settings_status']!=200:return ok({'error':'invalid_url'},fake['settings_status'])
     s=dict(fake['report']['settings'])
     if 'route' in d:s['route']=d['route'];s['consentAt']='2026-10-02T03:04:05Z' if d['route'] else s['consentAt']
     for k in ('line','instagram'):
      if k in d:s[k]=d[k]
     fake['report']['settings']=s;return ok({'settings':s})
    if path=='/api/draft':d=json.loads(body);return ok({'draft':d['text'],'mode':'fallback'})
    if path=='/api/classify':return ok({'picks':[],'mode':'fallback'})
    if path.startswith('/api/'):return ok({'recorded':True})
    rel='report.html' if path=='/report' else (path.lstrip('/') or 'index.html')
    data=git_file(rel) if source=='baseline' and rel.endswith(('.html','.js','.css')) else None
    if data is None:
     f=PUB/rel
     if not f.is_file():return r.fulfill(status=404,body='')
     data=f.read_bytes()
    r.fulfill(status=200,body=data,content_type=mimetypes.guess_type(rel)[0] or 'application/octet-stream',headers={'content-security-policy':CSP,'referrer-policy':'no-referrer'})
   ctx.route('**/*',route);pg=ctx.new_page();pg.on('pageerror',lambda e:res['page_errors'].append(str(e)));pg.add_init_script('window.__printed=0;window.print=()=>{window.__printed++;};');return ctx,pg,reqs
  def shot(pg,name,full=True):path=str(out.with_suffix('.'+name+'.png'));pg.screenshot(path=path,full_page=full);res['shots'].append(path)
  report_url=BASE+'/report#'+urlencode({'t':TOKEN,'g':GOOGLE})
  # ---------- 1. dashboard: order and content ----------
  ctx,pg,reqs=make();pg.goto(report_url);pg.wait_for_load_state('networkidle')
  order=pg.evaluate("()=>[...document.querySelectorAll('.report-screen > section')].filter(e=>e.checkVisibility()).map(e=>e.id)")
  assert order==['voice-card','reach-card','effect-card','notice-card','settings-card'],order
  assert pg.locator('h1').text_content()=='お店の管理画面' and pg.title().startswith('お店の管理画面')
  rows=pg.locator('#report-topics tr').evaluate_all('rs=>rs.map(r=>[...r.children].map(c=>c.textContent))')
  assert rows[0]==['料理','8','5件未満','5件未満'] and rows[4]==['待ち時間','5件未満','5件未満','7'],rows
  assert pg.locator('#report-details li').all_text_contents()==['料理（よかった）：味 6件','待ち時間（気になった）：注文から出てくるまで 5件']
  expect(pg.locator('#held-part')).to_be_visible();expect(pg.locator('#held-count')).to_have_text('Google への案内を出さなかった：5 ／ 出した：5件未満')
  held=pg.locator('#held-topics tr').evaluate_all('rs=>rs.map(r=>[...r.children].map(c=>c.textContent))');assert held[4]==['待ち時間','5件未満','5件未満','5'] and held[0]==['料理','5件未満','5件未満','5件未満'],held
  daily=pg.locator('#report-daily tr').evaluate_all('rs=>rs.map(r=>[...r.children].map(c=>c.textContent))')
  assert daily==[['10/02','9','6','5','0'],['10/01','5件未満','0','0','5件未満']],daily  # 0 = none yet, 5件未満 = 1..4
  expect(pg.locator('#daily-part')).to_be_visible();expect(pg.locator('#weekly-part')).to_be_hidden()
  pg.locator('#reach-weekly-btn').click();expect(pg.locator('#weekly-part')).to_be_visible();expect(pg.locator('#daily-part')).to_be_hidden();assert pg.locator('#reach-weekly-btn').get_attribute('aria-pressed')=='true'
  weekly=pg.locator('#report-weekly tr').evaluate_all('rs=>rs.map(r=>[...r.children].map(c=>c.textContent))')
  assert weekly==[['09/26〜10/02','13','6','5','5件未満'],['09/19〜09/25','5件未満','0','0','0'],['09/12〜09/18','0','0','0','0'],['09/05〜09/11','0','0','0','0']],weekly
  shot(pg,'dashboard_weekly_390',full=False);pg.locator('#reach-weekly-btn').scroll_into_view_if_needed();shot(pg,'dashboard_weekly_390',full=False);pg.locator('#reach-daily-btn').click();expect(pg.locator('#daily-part')).to_be_visible();res['dashboard_weekly']=weekly
  steps=pg.locator('#report-steps dt').all_text_contents();assert steps[0]=='画面を開いた' and steps[-1]=='Googleを開いた',steps
  expect(pg.locator('#route-state')).to_contain_text('いまの設定：オフ');expect(pg.locator('#route-open')).to_be_visible();expect(pg.locator('#route-off')).to_be_hidden();expect(pg.locator('#route-consent')).to_be_hidden()
  assert pg.evaluate('document.documentElement.scrollWidth<=innerWidth'),'mobile overflow (dashboard)'
  shot(pg,'dashboard_390');res['dashboard_order']=order;res['dashboard_rows']=rows;res['dashboard_daily']=daily
  # ---------- 2. routing consent ----------
  n=len([q for q in reqs if q['url']=='/api/settings'])
  pg.locator('#route-open').click();expect(pg.locator('#route-consent')).to_be_visible();assert pg.locator('#route-open').get_attribute('aria-expanded')=='true'
  consent=pg.locator('#route-consent').text_content()
  for must in ['Discourage or prohibit negative reviews, or selectively solicit positive reviews from customers','顧客からの否定的なクチコミの投稿を妨げたり禁止したり、肯定的なクチコミを選択的に募ったりする行為。','口コミの削除やビジネスプロフィールの制限を受けるおそれ','「気になった」が1つでもあるとき','完全には防げません','最後に読み込めた設定']:
   assert must in consent,must
  assert pg.locator('#route-consent a[href="https://support.google.com/contributionpolicy/answer/7400114?hl=en"]').count()==1
  expect(pg.locator('#route-next')).to_be_disabled();expect(pg.locator('#route-confirm')).to_be_hidden()
  pg.locator('#route-next').click(force=True);expect(pg.locator('#route-confirm')).to_be_hidden()
  pg.locator('#route-agree').check();expect(pg.locator('#route-next')).to_be_enabled();shot(pg,'consent_390')
  pg.locator('#route-next').click();expect(pg.locator('#route-confirm')).to_be_visible();pg.locator('#route-cancel').click()
  expect(pg.locator('#route-consent')).to_be_hidden();expect(pg.locator('#route-status')).to_have_text('オンにしませんでした。')
  assert len([q for q in reqs if q['url']=='/api/settings'])==n,'cancel sends nothing'
  pg.locator('#route-open').click();assert not pg.locator('#route-agree').is_checked(),'the box starts unticked again';pg.locator('#route-agree').check();pg.locator('#route-next').click();pg.locator('#route-on').click()
  expect(pg.locator('#route-status')).to_have_text('振り分けをオンにしました。')
  sent=[json.loads(q['body']) for q in reqs if q['url']=='/api/settings'];assert sent==[{'token':TOKEN,'route':True,'consent':CONSENT}],sent
  expect(pg.locator('#route-state')).to_contain_text('いまの設定：オン（2026/10/02 12:04 に同意）');expect(pg.locator('#route-off')).to_be_visible();expect(pg.locator('#route-open')).to_be_hidden()
  pg.locator('#route-off').click();expect(pg.locator('#route-state')).to_contain_text('いまの設定：オフ')
  sent=[json.loads(q['body']) for q in reqs if q['url']=='/api/settings'];assert sent[-1]=={'token':TOKEN,'route':False},sent
  # links: a 400 is explained; a save is shown; the request has exactly the two links
  fake['settings_status']=400;pg.locator('#link-line').fill('https://evil.example/x');pg.locator('#links-form button').click();expect(pg.locator('#links-status')).to_contain_text('URLの形を確かめてください')
  fake['settings_status']=200;pg.locator('#link-line').fill(' '+LINE+' ');pg.locator('#link-instagram').fill(IG);pg.locator('#links-form button').click();expect(pg.locator('#links-status')).to_contain_text('保存しました')
  sent=[json.loads(q['body']) for q in reqs if q['url']=='/api/settings'];assert sent[-1]=={'token':TOKEN,'line':LINE,'instagram':IG},sent[-1]
  for q in reqs:assert TOKEN not in q['url'],q['url']
  ctx.close()
  # a consent to an older wording: shown as off and asks for a fresh consent (審査 2)
  fake['report']=dict(DASH,settings=dict(SETTINGS_OFF,consentAt='2026-09-01T00:00:00Z',needsReconsent=True));ctx,pg,_=make();pg.goto(report_url);pg.wait_for_load_state('networkidle')
  expect(pg.locator('#route-state')).to_contain_text('以前の同意は使いません');expect(pg.locator('#route-open')).to_be_visible();ctx.close()
  # not enough yet: the voice card says so, the settings are still there, the numbers are not
  fake['report']=FEW;ctx,pg,_=make();pg.goto(report_url);pg.wait_for_load_state('networkidle')
  expect(pg.locator('#report-few')).to_be_visible();expect(pg.locator('#report-body')).to_be_hidden();expect(pg.locator('#reach-card')).to_be_hidden();expect(pg.locator('#settings-card')).to_be_visible()
  shot(pg,'dashboard_few_390');ctx.close()
  # ---------- 3/4. customer screen with routing on, and the links for everyone ----------
  def share(sid=None,kind='food'):q={'store':STORE,'review':GOOGLE,'kind':kind};q.update({'s':sid} if sid else {});return BASE+'/?'+urlencode(q)
  def answer(pg,concern):
   for i,t in enumerate(FOOD):pg.locator('[name=rate-%s][value=%s]+span'%(t,'concern' if i<concern else 'good')).click()
  links_html={}
  for case,sid,concern in [('on_low',SID_ON,1),('on_ok',SID_ON,0),('off_links_low',SID_LINKS,7)]:
   log=[];ctx,pg,_=make(log=log);pg.goto(share(sid));pg.wait_for_load_state('networkidle')
   expect(pg.locator('#store-links')).to_be_visible()  # from the start, before any answer
   links_html[case+'_start']=pg.locator('#store-links').evaluate('e=>e.outerHTML')
   assert pg.locator('#store-link-line').get_attribute('href')==LINE and pg.locator('#store-link-instagram').get_attribute('href')==IG
   for sel in ('#store-link-line','#store-link-instagram'):assert pg.locator(sel).get_attribute('rel')=='noopener noreferrer' and pg.locator(sel).get_attribute('target')=='_blank'
   assert pg.evaluate("[...document.querySelectorAll('#customer-view > *')].at(-2).id")=='store-links','the links sit at the end of the customer screen (before the feedback form)'
   if sid==SID_ON:
    expect(pg.locator('#write-own-toggle')).to_be_hidden();expect(pg.locator('#classify-button')).to_be_hidden()  # 審査 1: no AI reading before the rating is known
    assert 'AI' not in pg.locator('#addition-part').inner_text(),pg.locator('#addition-part').inner_text()
   else:expect(pg.locator('#write-own-toggle')).to_be_visible();expect(pg.locator('#classify-button')).to_be_visible()
   pg.locator('#addition').fill('待ち時間が長かった');answer(pg,concern);pg.locator('#compose-button').click()
   if case=='on_low':
    expect(pg.locator('#held-result')).to_be_visible();expect(pg.locator('#held-result')).to_contain_text('ご回答ありがとうございました')
    expect(pg.locator('#candidates')).to_be_hidden();expect(pg.locator('#draft-result')).to_be_hidden();expect(pg.locator('#google-link')).to_be_hidden()
    assert pg.locator('.direct-google:visible').count()==0 and pg.locator('a[href^="https://g.page"]:visible').count()==0,'no Google guidance for a held customer'
    assert not [q for q in log if q['url']=='/api/draft'],'the written words are not sent to the AI when held'
    picks=[json.loads(q['body']) for q in log if q['url']=='/api/pick-stat'];assert len(picks)==1 and picks[0]['sid']==SID_ON and set(picks[0])=={'kind','picks','sid'},picks
    shot(pg,'customer_held_390')
    pg.locator('[data-lang="en"]').click();expect(pg.locator('#held-title')).to_have_text('Thank you for your answers');expect(pg.locator('#store-link-line')).to_contain_text('Add the shop on LINE');pg.locator('[data-lang="ja"]').click()
   else:
    expect(pg.locator('#candidates')).to_be_visible();expect(pg.locator('#held-result')).to_have_count(0)
    pg.locator('#cand-options .cand').first.click();pg.locator('#confirm').check();expect(pg.locator('#google-link')).to_be_visible();assert pg.locator('#google-link').get_attribute('aria-disabled')=='false'
   links_html[case+'_end']=pg.locator('#store-links').evaluate('e=>e.outerHTML')
   assert pg.evaluate('document.documentElement.scrollWidth<=innerWidth'),'mobile overflow '+case
   if case=='on_ok':shot(pg,'customer_links_390')
   ctx.close()
  assert len(set(links_html.values()))==1,('the same buttons for everyone, whatever the rating',links_html)
  res['links_html']=links_html['on_low_start']
  # a failing store-config on a phone that never read it: routing off, no buttons (the screen as before)
  ctx,pg,_=make();pg.goto(share(SID_FAIL));pg.wait_for_load_state('networkidle');expect(pg.locator('#write-own-toggle')).to_be_visible();assert pg.locator('#store-links').count()==0;ctx.close()
  # 本人決定 C: the last setting this phone read (per sid, localStorage) is used while store-config fails or is slow
  ctx,pg,_=make();pg.goto(share(SID_ON));pg.wait_for_load_state('networkidle');expect(pg.locator('#write-own-toggle')).to_be_hidden()
  stored=pg.evaluate("localStorage.getItem('hk-store-config:%s')"%SID_ON);assert json.loads(stored)=={'route':True,'line':LINE,'instagram':IG},stored
  fake['config_fail']=True
  pg.reload();pg.wait_for_load_state('networkidle');expect(pg.locator('#write-own-toggle')).to_be_hidden();expect(pg.locator('#classify-button')).to_be_hidden();expect(pg.locator('#store-links')).to_be_visible()
  answer(pg,1);pg.locator('#compose-button').click();expect(pg.locator('#held-result')).to_be_visible();expect(pg.locator('#google-link')).to_be_hidden()
  # compose.js missing with a known "on": no Google guidance and no AI path at all, and the screen says why
  fake['no_compose']=True;pg.reload();pg.wait_for_load_state('networkidle')
  expect(pg.locator('#compose-status')).to_have_text('いまは画面の一部を読み込めませんでした。時間をおいて、もう一度開いてください。')
  expect(pg.locator('#write-own')).to_be_hidden();assert pg.locator('a[href^="https://g.page"]:visible').count()==0;fake['no_compose']=False
  # localStorage blocked: the page still works (routing off when nothing could be read)
  fake['config_fail']=False;CONFIG[SID_ON]['route']=False;pg.reload();pg.wait_for_load_state('networkidle');expect(pg.locator('#write-own-toggle')).to_be_visible();expect(pg.locator('#classify-button')).to_be_visible()
  assert json.loads(pg.evaluate("localStorage.getItem('hk-store-config:%s')"%SID_ON))['route'] is False,'a fresh "off" replaces the stored "on"';CONFIG[SID_ON]['route']=True;ctx.close()
  ctx,pg,_=make();pg.add_init_script("Object.defineProperty(window,'localStorage',{get(){throw new DOMException('blocked','SecurityError');}})");fake['config_fail']=True
  pg.goto(share(SID_ON));pg.wait_for_load_state('networkidle');expect(pg.locator('#write-own-toggle')).to_be_visible();fake['config_fail']=False;ctx.close()
  # ---------- 5. routing off: byte-for-byte the screen of main e4e1ebb ----------
  def run(source,url):
   log=[];ctx,pg,_=make(source,log=log);snaps=[]
   snap=lambda tag:snaps.append([tag,pg.locator('#customer-view').evaluate('e=>e.outerHTML'),pg.evaluate('document.documentElement.lang')])
   pg.goto(url);pg.wait_for_load_state('networkidle');snap('open')
   pg.locator('#addition').fill('料理はおいしかった');pg.locator('#classify-button').click();expect(pg.locator('#classify-status')).not_to_be_empty();snap('classify')
   answer(pg,4);pg.locator('#topics [data-topic=dish] [data-detail=taste]').click();snap('answered')
   pg.locator('#compose-button').click();expect(pg.locator('#candidates')).to_be_visible();snap('candidates')
   pg.locator('#cand-options .cand').nth(1).click();pg.locator('#confirm').check();snap('confirmed')
   pg.locator('#copy-draft').click();expect(pg.locator('#copy-status')).not_to_be_empty();pg.locator('#google-link').click();pg.wait_for_timeout(300);snap('google')
   pg.locator('[data-lang="ko"]').click();snap('ko')
   ctx.close()
   log2=[];ctx,pg,_=make(source,log=log2);pg.goto(url);pg.wait_for_load_state('networkidle');pg.locator('#write-own-toggle').click();pg.locator('#experience').fill('窓際でゆっくりできた')
   pg.locator('#draft-button').click();expect(pg.locator('#draft-result')).to_be_visible();snap('write_own');pg.locator('.direct-google').click();pg.wait_for_timeout(300);snap('direct');ctx.close()
   norm=lambda q:{**q,'body':json.dumps({**json.loads(q['body']),**({'sec':'SEC'} if 'sec' in json.loads(q['body']) else {})},ensure_ascii=False) if q['body'] and '/api/event' in q['url'] else q['body']}
   return snaps,[norm(q) for q in log+log2]
  parity={}
  for name,url,extra in [('new_qr_off',share(SID_OFF),2),('old_qr',share(None),0)]:
   s0,q0=run('baseline',url);s1,q1=run('new',url)
   assert git_file('app.js') is not None and git_file('app.js')!=(PUB/'app.js').read_bytes(),'the baseline is really the old app.js'
   cfg=[q for q in q1 if q['url'].startswith('/api/store-config')];assert len(cfg)==extra,(name,cfg)
   for q in cfg:assert q=={'method':'GET','url':'/api/store-config?s='+SID_OFF,'body':None},q
   rest=[q for q in q1 if not q['url'].startswith('/api/store-config')]
   assert rest==q0,(name,[x for x in zip(q0,rest) if x[0]!=x[1]][:3],len(q0),len(rest))
   for (t0,h0,l0),(t1,h1,l1) in zip(s0,s1):assert (t0,l0)==(t1,l1) and h0==h1,(name,t0,next((i,h0[max(0,i-80):i+80],h1[max(0,i-80):i+80]) for i in range(min(len(h0),len(h1))) if h0[i]!=h1[i]) if h0!=h1 else None)
   assert len(s0)==len(s1)==9,(len(s0),len(s1))
   parity[name]={'snapshots':len(s1),'bytes_compared':sum(len(h) for _,h,_ in s1),'requests_compared':len(rest),'extra_store_config_gets':len(cfg)}
  res['off_parity_vs_'+BASELINE]=parity
  b.close()
 assert not res['page_errors'],res['page_errors'];assert not res['blocked_external'],res['blocked_external']
 print(json.dumps({k:res[k] for k in ('dashboard_order','dashboard_rows','dashboard_daily','links_html','off_parity_vs_'+BASELINE,'shots')},ensure_ascii=False))
if __name__=='__main__':main()
