"""Isolated browser check for the LP redesign (LP / #create / customer views and the 試用店舗募集 form).
Serves intake-beta/public from disk via Playwright routing with the worker's CSP. /api/trial is answered by a fake
in this script (status chosen per case); every other /api/ call and every external host is recorded and refused.
Optional --shots DIR writes full-page JPEG screenshots (390px phone, 1280px desktop, and the create view) and the first view only
(fv_390.jpg, fv_1280.jpg). v2 checks: every LP image is same-origin WebP with width/height and loading=lazy and actually decodes,
every AI photo carries 「イメージ（AI生成）」, the scroll fade-in reveals everything, and prefers-reduced-motion turns it off.
v5 checks: the owner's decided wording is on the page verbatim (FV lead, price, promises ①②③④, retention), the planned price
is a separate row below the free trial, and nothing is struck through or says 「通常」「今なら」. --shots also writes the price, data
and trial-done sections (price_*.jpg, data_*.jpg, trial_done_390.jpg).
v6 checks (slides + fixed form): the LP is 9 slides in order, each at least one screen tall and numbered 「NN / 09」; at 1280x800 the
試用 form is fixed on the right, fully on screen below the header on every slide and at the very end, and links to it focus its
first field without scrolling; below 1024px it is not fixed, sits after the price slide, and the phone bar's 「試用を申し込む」 reaches
it; no horizontal scroll at 390/1024/1280/1440; and the “AI-looking” decorations are machine-checked away inside #lp (FORBID).
--shots also writes every slide at 1280x800 (slide_01.jpg..) and 390x844 (slide_390_01.jpg..) and the first view at 1440 (fv_1440.jpg).
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
# the owner's decided wording (DECISIONS.md, 2026-09-29), used verbatim
LEAD='何がどうだったかをタップで選ぶだけ。選んだことだけが文章になります。確認してGoogleに投稿するのは、お客さま本人です。'
P1='試用中に料金がかかることはありません。正式版に移るときは事前にご案内し、お申し込みいただいたお店だけが有料になります。'
P2='正式版の開始時期と料金は、決まりしだいこのページでお知らせします。試用店舗には、ご入力の連絡先にもご連絡します。'
P3='お申し込みを受け付けました。内容を確認のうえ、ご入力の連絡先にご連絡します（先着10店に達していた場合も、その旨をお知らせします）。'
P4='試用中は無料です。設定で分からないことは、このページのフォームからご相談ください。使ってみた感想を、簡単なアンケートでうかがうことがあります。'
PRICE='正式版の予定価格：1店舗 月2,980円（税込）。変更する場合はこのページでお知らせします'
KEEP='試用のお申し込み内容は、試用期間の終了から1年で削除します。正式版をお申し込みのお店は契約期間中保管します'
# no double-price presentation (景表法): no struck-through price and none of these words anywhere on the page
NO_WORDS=['通常','今なら']
STRUCK="[...document.querySelectorAll('*')].filter(e=>['S','DEL','STRIKE'].includes(e.tagName)||getComputedStyle(e).textDecorationLine.includes('line-through')).map(e=>e.tagName+':'+e.textContent.slice(0,30))"
SLIDES=['top','worry','how-it-works','example','promise','scenes','price','scope','faq']
# v6: decorations the owner called “AI臭い” are gone from #lp. Controls (inputs, buttons, button-styled links) and the phone
# mock-up are allowed their borders, rounding and shadow; photos may carry a shadow; blue is for buttons and links only.
MAX_BOXED=0
FORBID=r"""(()=>{const lp=document.getElementById('lp');const px=v=>parseFloat(v)||0;
 const out={kicker:lp.querySelectorAll('.kicker').length,mark:lp.querySelectorAll('.mark').length,
  icons:[...lp.querySelectorAll('svg')].filter(v=>!v.closest('.sample-qr')).length,  // only the poster sample QR is drawn as SVG
  check_glyphs:(lp.textContent.match(/[\u2713\u2714\u2705\u2611\u2610]/g)||[]).length,
  ink_bands:lp.querySelectorAll('.band-ink').length,left_rule:[],inset_rule:[],boxed:[],shadow:[],round:[],pseudo:[],blue:[],gradient:[]};
 // blue = the accent family or anything close to it (clearly blue hue, bright enough to read as blue rather than navy ink)
 const rgb=v=>(v.match(/[\d.]+/g)||[]).map(Number);
 const isBlue=v=>{const [r,g,b,a=1]=rgb(v);return a>0&&((b-r>=100&&b>=150)||['rgb(225, 234, 252)','rgb(156, 192, 255)'].includes(v));};
 const name=e=>e.tagName.toLowerCase()+(e.id?'#'+e.id:'')+(typeof e.className==='string'&&e.className?'.'+e.className.trim().split(/\s+/).join('.'):'');
 for(const e of [lp,...lp.querySelectorAll('*')]){const cs=getComputedStyle(e);if(cs.display==='none')continue;
  const phone=!!e.closest('.phone');const ctrl=e.matches('input,textarea,select,button,.primary,.secondary');
  const w=['Top','Right','Bottom','Left'].map(k=>cs['border'+k+'Style']==='none'?0:px(cs['border'+k+'Width']));
  const c=['Top','Right','Bottom','Left'].map(k=>cs['border'+k+'Color']);
  if(w[3]>0&&(w[0]!==w[3]||w[1]!==w[3]||c[0]!==c[3]||c[1]!==c[3]))out.left_rule.push(name(e));
  if(cs.boxShadow.includes('inset')&&!phone)out.inset_rule.push(name(e));
  if(w.every(x=>x>0)&&!ctrl&&!phone)out.boxed.push(name(e));
  if((cs.boxShadow!=='none'||cs.textShadow!=='none'||cs.filter.includes('drop-shadow'))&&!phone&&!e.matches('.hero-photo'))out.shadow.push(name(e));
  if(cs.backgroundImage.includes('gradient'))out.gradient.push(name(e));
  const r=Math.max(...['TopLeft','TopRight','BottomLeft','BottomRight'].map(k=>px(cs['border'+k+'Radius'])));
  if(r>8&&!phone&&!ctrl)out.round.push(name(e)+':'+r);
  const blue=[cs.color,cs.backgroundColor,...c.filter((_,i)=>w[i]>0)].some(isBlue);
  if(blue&&!ctrl&&!e.closest('a,button'))out.blue.push(name(e));
  if(!phone)for(const p of ['::before','::after']){const pc=getComputedStyle(e,p);if(pc.content==='none'||pc.content==='normal')continue;
   const pw=['Top','Right','Bottom','Left'].some(k=>pc['border'+k+'Style']!=='none'&&px(pc['border'+k+'Width'])>0);
   if(pw||pc.backgroundColor!=='rgba(0, 0, 0, 0)'||pc.backgroundImage!=='none'||pc.transform!=='none'||pc.boxShadow!=='none'||isBlue(pc.color)||/[\u2713\u2714\u2705\u2611\u2610]/.test(pc.content))out.pseudo.push(name(e)+p);}}
 return out;})()"""
def check_forbidden(pg,res,key):
 f=pg.evaluate(FORBID);res[key]={k:(len(v) if isinstance(v,list) else v) for k,v in f.items()}
 assert f['kicker']==0 and f['mark']==0 and f['icons']==0 and f['check_glyphs']==0,f
 assert f['ink_bands']<=1,f
 for k in ('left_rule','inset_rule','shadow','round','pseudo','blue','gradient'):assert f[k]==[],(k,f[k])
 assert len(f['boxed'])<=MAX_BOXED,('boxed cards',f['boxed'])
# on screen below the header, and actually the top-most thing at its centre (not covered by the header, the bar or anything else)
IN_VIEW="s=>{const r=document.querySelector(s).getBoundingClientRect();const top=document.querySelector('.site-header').getBoundingClientRect().bottom;if(!(r.height>0&&r.top>=top-0.5&&r.left>=0&&r.bottom<=innerHeight+0.5&&r.right<=innerWidth+0.5))return false;const hit=document.elementFromPoint(r.left+r.width/2,r.top+Math.min(r.height/2,20));return !!hit&&(document.querySelector(s).contains(hit)||hit.contains(document.querySelector(s)))}"
def to_slide(pg,sid):
 pg.evaluate("id=>{const e=document.getElementById(id);scrollTo({top:e.getBoundingClientRect().top+scrollY-60,behavior:'instant'})}",sid);pg.wait_for_timeout(200)
def check_slides(pg,res,key):
 got=pg.evaluate("[...document.querySelectorAll('#lp > .slide')].map(s=>({id:s.id,h:s.getBoundingClientRect().height,no:s.querySelector(':scope > .slide-no').textContent.replace(/\\s/g,'')}))")
 assert [g['id'] for g in got]==SLIDES,got
 vh=pg.evaluate('innerHeight')
 for i,g in enumerate(got,1):
  assert g['no']==f'{i:02d}/09',g
  assert g['h']>=vh-1,('slide shorter than one screen',g,vh)
 res[key]={g['id']:round(g['h']) for g in got}
def slide_shots(pg,d,prefix):
 for i,sid in enumerate(SLIDES,1):to_slide(pg,sid);pg.screenshot(path=str(Path(d)/f'{prefix}{i:02d}.jpg'),type='jpeg',quality=82)
 pg.evaluate("scrollTo({top:0,behavior:'instant'})")
def section_shot(pg,sel,path):
 # the fixed header and phone bar would cover the section in an element shot; hide them for the shot only
 pg.evaluate("for(const e of document.querySelectorAll('.site-header,.sticky-cta'))e.style.visibility='hidden'")
 pg.locator(sel).scroll_into_view_if_needed();pg.wait_for_timeout(300);pg.locator(sel).screenshot(path=path,type='jpeg',quality=82)
 pg.evaluate("for(const e of document.querySelectorAll('.site-header,.sticky-cta'))e.style.visibility=''")
def settle(pg):
 # scroll the whole page once so lazy images load and every fade-in has fired, then return to the top
 h=pg.evaluate('document.documentElement.scrollHeight');y=0
 while y<h:pg.evaluate("y=>scrollTo({top:y,behavior:'instant'})",y);pg.wait_for_timeout(120);y+=400
 pg.evaluate("scrollTo({top:0,behavior:'instant'})");pg.wait_for_timeout(900)
V2_IMAGES='''[...document.querySelectorAll('#lp img')].map(i=>({src:i.getAttribute('src'),w:i.getAttribute('width'),h:i.getAttribute('height'),lazy:i.getAttribute('loading'),alt:i.alt,ok:i.complete&&i.naturalWidth>0,ai:!!i.closest('.scene-img')&&!!i.closest('.scene-img').querySelector('.ai-badge')&&i.closest('.scene-img').querySelector('.ai-badge').textContent==='イメージ（AI生成）',scene:!!i.closest('.scene-img'),hero:!!i.closest('.lp-hero')}))'''
def check_images(pg,res,key):
 imgs=pg.evaluate(V2_IMAGES);res[key]=len(imgs)
 assert len(imgs)>=8,imgs
 for i in imgs:
  assert i['src'].startswith('img/') and i['src'].endswith('.webp'),i
  assert i['w'] and i['h'] and i['alt'],i
  assert i['lazy']==('eager' if i['hero'] else 'lazy'),i  # first view loads at once, the rest on scroll
  assert i['ok'],('image did not load',i)
  if i['scene']:assert i['ai'],('AI photo without label',i)
 assert sum(i['scene'] for i in imgs)>=3,imgs
 assert sum(i['hero'] and i['scene'] for i in imgs)==1,('hero photo missing or unlabeled',imgs)
 # the fade-in has revealed every element once the page was scrolled through
 hidden=pg.evaluate("[...document.querySelectorAll('#lp .reveal')].filter(e=>getComputedStyle(e).opacity!=='1').length")
 assert hidden==0,('reveal left hidden elements',hidden)
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
  assert pg.locator('#poster-qr svg').count()==1,'sample QR not drawn'  # the hero shows a photo, the poster section keeps the QR sample
  body=pg.locator('#lp').inner_text()
  for must in ['架空の例です','星や感想で、振り分けません。','特典と引き換えにしません。','自動で投稿しません。','2,980','税込','先着10店','合同会社Radineer']:assert must in body,must
  # decided wording, verbatim: FV lead, price, promises ①②④ and the retention period
  assert pg.locator('.lp-hero .lead').inner_text().replace('\n','')==LEAD,pg.locator('.lp-hero .lead').inner_text()
  for must,where in [(PRICE,'#price'),(P1,'#price'),(P2,'#price'),(P4,'#trial'),(KEEP,'#data')]:assert must in pg.locator(where).inner_text().replace('\n',''),(where,must)
  assert '短い感想に、AIが句読点を整えます' not in body,'old FV lead left'
  html=pg.content();text=pg.evaluate('document.documentElement.textContent')
  for w in NO_WORDS:assert w not in html and w not in text,w
  assert pg.evaluate(STRUCK)==[],pg.evaluate(STRUCK)
  # the planned price is its own row below the free trial, not a column beside it
  trial_box=pg.locator('#price .price-col').bounding_box();plan_box=pg.locator('#price .price-plan').bounding_box()
  assert pg.locator('#price .price-col').count()==1 and plan_box['y']>=trial_box['y']+trial_box['height'],(trial_box,plan_box)
  assert pg.locator('#trial-done').inner_text().strip()==P3,pg.locator('#trial-done').inner_text()
  ctas=pg.locator('a[href="#create"]:visible').count();res['visible_create_ctas_390']=ctas;assert ctas>=5,ctas
  if args.shots:pg.screenshot(path=str(Path(args.shots)/'fv_390.jpg'),type='jpeg',quality=80)
  assert pg.evaluate("document.documentElement.classList.contains('reveal-on')"),'fade-in not armed'
  settle(pg);check_images(pg,res,'lp_images_390')
  # v6 at phone width: slides, no fixed form, the form sits after the price slide, the bar's 試用 button reaches it
  check_slides(pg,res,'slides_390');check_forbidden(pg,res,'forbid_390')
  assert pg.evaluate("getComputedStyle(document.getElementById('trial')).position")=='static'
  assert pg.evaluate("(()=>{const a=document.querySelector('.lp-aside');return a.previousElementSibling.id==='price'&&a.nextElementSibling.id==='scope'})()"),'form must follow the price slide'
  assert pg.locator('#sticky-cta a').evaluate_all("l=>l.map(a=>[a.getAttribute('href'),a.textContent])")==[['#create','無料でQRを作る'],['#trial','試用を申し込む']]
  to_slide(pg,'faq');assert not pg.evaluate(IN_VIEW,'#trial'),'form must not be fixed on a phone'
  expect(pg.locator('#sticky-cta')).to_be_visible();pg.locator('#sticky-cta a[href="#trial"]').click();reached=False
  for _ in range(40):
   if pg.evaluate("(()=>{const r=document.getElementById('trial').getBoundingClientRect();return r.top>=0&&r.top<innerHeight*0.5})()"):reached=True;break
   pg.wait_for_timeout(100)
  assert reached,'phone bar did not bring the form on screen'
  expect(pg.locator('#sticky-cta')).to_be_hidden()  # the bar steps aside while the form is on screen
  if args.shots:pg.evaluate("scrollTo({top:0,behavior:'instant'})");slide_shots(pg,args.shots,'slide_390_')
  pg.evaluate("scrollTo({top:0,behavior:'instant'})")
  if args.shots:pg.screenshot(path=str(Path(args.shots)/'lp_390_full.jpg'),full_page=True,type='jpeg',quality=80)
  if args.shots:section_shot(pg,'#price',str(Path(args.shots)/'price_390.jpg'));section_shot(pg,'#data',str(Path(args.shots)/'data_390.jpg'))
  # header CTA -> create view; back link -> LP
  pg.locator('.header-cta').click();expect(pg.locator('#store-form')).to_be_visible();assert pg.evaluate('document.body.dataset.view')=='create'
  expect(pg.locator('#lp')).to_be_hidden();expect(pg.locator('#sticky-cta')).to_be_hidden();expect(pg.locator('.header-cta')).to_be_hidden()
  assert pg.evaluate(no_overflow),'create view overflow'
  if args.shots:pg.screenshot(path=str(Path(args.shots)/'create_390_full.jpg'),full_page=True,type='jpeg',quality=80)
  pg.locator('.back-link').click();expect(pg.locator('.lp-hero')).to_be_visible();expect(pg.locator('#store-form')).to_be_hidden()
  # an in-page link from the LP keeps the LP
  pg.locator('#faq').scroll_into_view_if_needed();expect(pg.locator('#sticky-cta')).to_be_visible();pg.locator('#sticky-cta a[href="#create"]').click();expect(pg.locator('#store-form')).to_be_visible();pg.go_back();expect(pg.locator('.lp-hero')).to_be_visible()
  # trial form: client-side checks send nothing
  pg.locator('#trial-submit').click();expect(pg.locator('#trial-status')).to_contain_text('店名・お名前・連絡先');assert res['trial_bodies']==[]
  pg.locator('#trial-store').fill('架空の喫茶店');pg.locator('#trial-name').fill('山田 花子');pg.locator('#trial-contact').fill('あとで');pg.locator('#trial-submit').click()
  expect(pg.locator('#trial-status')).to_contain_text('メールアドレスか電話番号');assert res['trial_bodies']==[]
  # server refusals are explained and keep the input
  for code,text in [(429,'今日は受け付けを止めています'),(400,'入力内容を確認してください'),(503,'時間をおいて')]:
   trial_status['code']=code;pg.locator('#trial-contact').fill('owner@example.com');pg.locator('#trial-submit').click()
   expect(pg.locator('#trial-status')).to_contain_text(text);assert pg.locator('#trial-store').input_value()=='架空の喫茶店';expect(pg.locator('#trial-submit')).to_be_enabled()
  trial_status['code']=200;pg.locator('#trial-message').fill('レジ横に置いてみたいです。');pg.locator('#trial-submit').click()
  expect(pg.locator('#trial-done')).to_be_visible();expect(pg.locator('#trial-form')).to_be_hidden();expect(pg.locator('#trial-done')).to_have_text(P3)
  if args.shots:section_shot(pg,'#trial',str(Path(args.shots)/'trial_done_390.jpg'))
  last=res['trial_bodies'][-1];assert last=={'storeName':'架空の喫茶店','name':'山田 花子','contact':'owner@example.com','message':'レジ横に置いてみたいです。','website':''},last
  assert len(res['trial_bodies'])==4,res['trial_bodies']
  assert res['other_api']==[],('LP and create view must not send events',res['other_api'])
  ctx.close()
  # v6 desktop 1280x800: the 試用 form is fixed on the right and fully on screen (below the header) from the first view to the end
  ctx,pg=make(1280,800);pg.goto(BASE+'/');pg.wait_for_load_state('networkidle')
  assert pg.evaluate("getComputedStyle(document.getElementById('trial')).position")=='sticky'
  for sel in ('#trial','#trial-submit','#trial-store'):assert pg.evaluate(IN_VIEW,sel),('form not on screen at first view',sel)
  hdr=pg.locator('.site-header').bounding_box();tb=pg.locator('#trial').bounding_box();assert tb['y']>=hdr['y']+hdr['height'],(hdr,tb)
  assert tb['x']>=1280-440 and 360<=tb['width']<=400,tb  # the right column, 360-400px
  nav=pg.locator('.owner-nav a').evaluate_all("l=>l.map(a=>[a.textContent,a.getAttribute('href')])");assert nav==[[f'{i:02d}','#'+sid] for i,sid in enumerate(SLIDES,1)],nav
  settle(pg);check_slides(pg,res,'slides_1280');check_forbidden(pg,res,'forbid_1280')
  if args.shots:slide_shots(pg,args.shots,'slide_')
  for sid in SLIDES:
   to_slide(pg,sid)
   for sel in ('#trial','#trial-submit'):assert pg.evaluate(IN_VIEW,sel),('form left the screen',sid,sel)
  # and at every 100px from the top to the very end (snap off so each position is where the page really rests)
  pg.evaluate("document.documentElement.style.scrollSnapType='none'");end=pg.evaluate('document.documentElement.scrollHeight-innerHeight');y=0;positions=0
  while True:
   pg.evaluate("y=>scrollTo({top:y,behavior:'instant'})",y);positions+=1
   for sel in ('#trial .trial-h','#trial-store','#trial-message','#trial-submit'):assert pg.evaluate(IN_VIEW,sel),('form left the screen or is covered',y,sel)
   if y>=end:break
   y=min(end,y+100)
  pg.evaluate("document.documentElement.style.scrollSnapType=''");res['form_checked_positions_1280']=positions
  pg.evaluate("scrollTo({top:document.documentElement.scrollHeight,behavior:'instant'})");pg.wait_for_timeout(300)
  assert pg.evaluate("Math.ceil(scrollY+innerHeight)>=document.documentElement.scrollHeight-1")
  for sel in ('#trial','#trial-submit'):assert pg.evaluate(IN_VIEW,sel),('form left the screen at the page end',sel)
  res['trial_box_1280']=pg.locator('#trial').bounding_box()
  # a link to the form focuses its first field and leaves the page where it was; Tab reaches the form's fields in order
  to_slide(pg,'price');y0=pg.evaluate('scrollY');pg.locator('.price-trial a').click();pg.wait_for_timeout(300)
  assert pg.evaluate('document.activeElement.id')=='trial-store' and abs(pg.evaluate('scrollY')-y0)<2
  order=[]
  for _ in range(5):pg.keyboard.press('Tab');order.append(pg.evaluate("[document.activeElement.id,document.activeElement.getAttribute('href')]"))
  assert order==[['trial-name',None],['trial-contact',None],['trial-message',None],['','privacy.html#trial'],['trial-submit',None]],order
  expect(pg.locator('#sticky-cta')).to_be_hidden()
  ctx.close()
  # no horizontal scroll at any of the checked widths
  for w in (390,1024,1280,1440):
   ctx,pg=make(w,900);pg.goto(BASE+'/');pg.wait_for_load_state('networkidle');settle(pg)
   assert pg.evaluate(no_overflow),('horizontal scroll',w)
   if w==1440 and args.shots:pg.screenshot(path=str(Path(args.shots)/'fv_1440.jpg'),type='jpeg',quality=82)
   ctx.close()
  res['no_overflow_widths']=[390,1024,1280,1440]
  # desktop LP
  ctx,pg=make(1280,900);pg.goto(BASE+'/');pg.wait_for_load_state('networkidle');expect(pg.locator('#sticky-cta')).to_be_hidden();expect(pg.locator('.owner-nav')).to_be_visible()
  assert pg.evaluate(no_overflow),'LP desktop overflow'
  if args.shots:pg.screenshot(path=str(Path(args.shots)/'fv_1280.jpg'),type='jpeg',quality=80)
  settle(pg);check_images(pg,res,'lp_images_1280')
  trial_box=pg.locator('#price .price-col').bounding_box();plan_box=pg.locator('#price .price-plan').bounding_box()
  assert plan_box['y']>=trial_box['y']+trial_box['height'],('desktop: planned price must be its own row',trial_box,plan_box)
  if args.shots:
   section_shot(pg,'#price',str(Path(args.shots)/'price_1280.jpg'));section_shot(pg,'#data',str(Path(args.shots)/'data_1280.jpg'))
  # demo video: same-origin sources, plays muted once on screen
  srcs=pg.evaluate("[...document.querySelectorAll('#demo-video source')].map(s=>[s.getAttribute('src'),s.type])")
  assert srcs==[['video/demo-customer.mp4','video/mp4'],['video/demo-customer.webm','video/webm']],srcs
  assert pg.evaluate("(v=>v.muted&&v.loop&&v.hasAttribute('playsinline')&&v.getAttribute('preload')==='none')(document.getElementById('demo-video'))")
  pg.locator('#demo-video').scroll_into_view_if_needed();playing=False
  for _ in range(40):  # wait_for_function evaluates a string, which this CSP (no unsafe-eval) refuses
   if pg.evaluate("(v=>!v.paused&&v.currentTime>0.3)(document.getElementById('demo-video'))"):playing=True;break
   pg.wait_for_timeout(200)
  assert playing,'demo video did not start on screen'
  res['demo_video_src']=pg.evaluate("document.getElementById('demo-video').currentSrc.split('/').pop()")
  if args.shots:pg.screenshot(path=str(Path(args.shots)/'lp_1280_full.jpg'),full_page=True,type='jpeg',quality=80)
  ctx.close()
  # prefers-reduced-motion: nothing is hidden or animated
  ctx,pg=make(390);pg.emulate_media(reduced_motion='reduce');pg.goto(BASE+'/');pg.wait_for_load_state('networkidle')
  assert not pg.evaluate("document.documentElement.classList.contains('reveal-on')"),'fade-in armed under reduced motion'
  assert pg.evaluate("[...document.querySelectorAll('#lp .reveal')].every(e=>getComputedStyle(e).opacity==='1')")
  assert pg.evaluate("getComputedStyle(document.querySelector('.hero-phone')).animationName")=='none'
  pg.locator('#demo-video').scroll_into_view_if_needed();pg.wait_for_timeout(1500)
  assert pg.evaluate("document.getElementById('demo-video').paused"),'demo video autoplayed under reduced motion'
  ctx.close()
  # customer view hides every owner element; a broken share link opens the create view with the message
  ctx,pg=make(390);pg.goto(BASE+'/?'+urlencode({'store':STORE,'review':GOOGLE}));pg.wait_for_load_state('networkidle')
  expect(pg.locator('#customer-view')).to_be_visible();expect(pg.locator('#lp')).to_be_hidden();expect(pg.locator('.header-cta')).to_be_hidden();expect(pg.locator('#store-form')).to_be_hidden()
  assert res['other_api']==['/api/event'],res['other_api']
  pg.goto(BASE+'/?'+urlencode({'store':STORE,'review':'https://evil.example/review'}));pg.wait_for_load_state('networkidle')
  expect(pg.locator('#store-form')).to_be_visible();expect(pg.locator('#store-error')).to_contain_text('共有リンクを確認してください')
  pg.goto(BASE+'/privacy.html');pg.wait_for_load_state('networkidle');ptext=pg.locator('body').inner_text().replace('\n','')
  assert KEEP in ptext,'retention sentence missing on privacy.html';assert 'お名前・連絡先・ひとことは送りません' in ptext
  for w in NO_WORDS:assert w not in ptext,w
  ctx.close();b.close()
 assert not res['page_errors'],res['page_errors'];assert not res['blocked_external'],res['blocked_external']
 print(json.dumps({k:res[k] for k in ('visible_create_ctas_390','lp_images_390','lp_images_1280','demo_video_src','slides_1280','slides_390','forbid_1280','forbid_390','trial_box_1280','form_checked_positions_1280','no_overflow_widths','other_api','blocked_external','page_errors','console_errors')}|{'trial_requests':len(res['trial_bodies'])},ensure_ascii=False))
if __name__=='__main__':main()
