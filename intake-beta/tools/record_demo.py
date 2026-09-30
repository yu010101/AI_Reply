"""Record the LP demo video (public/video/demo-customer.mp4 + poster) of the real customer screen.
Serves intake-beta/public from disk with the worker's CSP, like tools/capture_screens.py.
Inputs are the LP's fictional example (喫茶 こもれび): the customer writes WRITTEN, the (faked) AI pre-selects 料理=よかった→味 and
待ち時間=気になった→注文から出てくるまで, and the customer answers the other topics (every topic is required). The candidates come from
public/compose.js; /api/* are answered by fake_api() below; every other host is refused. Captions and the tap marker are overlays
drawn only for the recording; they are not part of the product UI.
Usage: python3 tools/record_demo.py --tmp DIR   (needs ffmpeg and cwebp)
v7: --clips records the short silent loops for the LP instead (5-10 s each, same serving, overlays and encoder):
  step-store (お店: 店名とリンク→QR), step-customer (お客さま: 書く→AIが先に選ぶ→残りを選ぶ→候補), step-self (本人: 確認→コピー→Googleを開く),
  poster-print (印刷されるポスター→QR画像のSVG保存). window.print is stubbed so no dialog opens; the print look is media emulation.
  The Google button is only marked (not followed) and nothing is downloaded. --only NAME records one clip.
"""
from pathlib import Path
import argparse,base64,json,mimetypes,subprocess,time
from urllib.parse import urlencode
from playwright.sync_api import sync_playwright,expect
R=Path(__file__).resolve().parents[1];PUB=R/'public';OUT=PUB/'video'
BASE='https://hitokoto.example';STORE='喫茶 こもれび';GOOGLE='https://g.page/r/fictional-komorebi/review'
CSP="default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'"
POSTER_AFTER=1.2  # seconds after the candidate list appears: the poster frame
W,H=390,780
OVERLAY="""(t)=>{let c=document.getElementById('demo-cap');if(!c){c=document.createElement('div');c.id='demo-cap';
c.style.cssText='position:fixed;left:12px;right:12px;bottom:14px;z-index:9999;background:rgba(27,38,51,.92);color:#fff;'+
'font:600 16px/1.5 system-ui,sans-serif;padding:12px 14px;border-radius:12px;text-align:center;transition:opacity .25s';
document.body.appendChild(c)}c.style.opacity=t?1:0;if(t)c.textContent=t}"""
TAP="""(sel)=>{const r=document.querySelector(sel).getBoundingClientRect();const d=document.createElement('div');
d.style.cssText='position:fixed;z-index:9998;width:44px;height:44px;border-radius:50%;background:rgba(180,68,28,.35);'+
'border:2px solid #b4441c;pointer-events:none;transition:transform .45s,opacity .45s;transform:scale(.4)';
d.style.left=(r.left+r.width/2-22)+'px';d.style.top=(r.top+r.height/2-22)+'px';document.body.appendChild(d);
requestAnimationFrame(()=>{d.style.transform='scale(1.2)';d.style.opacity='0'});setTimeout(()=>d.remove(),600)}"""
# Fake answers for the recording (the real worker is not called): /api/classify answers like the worker would for WRITTEN
# (checked ids + quotes from the text; an example prepared for the recording, said so in the last caption), /api/draft returns the
# words as written (mode fallback: no AI tidy is claimed), /api/store issues a fictional sid/token.
WRITTEN='料理はおいしかった。待ち時間が少し長かった'
CLASSIFIED={'mode':'ai','picks':[{'topic':'dish','rating':'good','details':['taste'],'quote':'料理はおいしかった'},{'topic':'wait','rating':'concern','details':['serving'],'quote':'待ち時間が少し長かった'}]}
REST={'drink':'ok','service':'good','ambience':'good','price':'ok','location':'ok'}
def fake_api(r,path):
 if path=='/api/classify':return r.fulfill(status=200,content_type='application/json',body=json.dumps(CLASSIFIED,ensure_ascii=False))
 if path=='/api/draft':d=json.loads(r.request.post_data);return r.fulfill(status=200,content_type='application/json',body=json.dumps({'draft':d['text'],'mode':'fallback'},ensure_ascii=False))
 if path=='/api/store':return r.fulfill(status=200,content_type='application/json',body='{"sid":"DEMOsid_0123456789abcd","token":"DEMOtoken_'+'0'*33+'"}')
 return r.fulfill(status=200,content_type='application/json',body='{"recorded":true}')
def main():
 ap=argparse.ArgumentParser();ap.add_argument('--tmp',required=True);ap.add_argument('--clips',action='store_true');ap.add_argument('--only');a=ap.parse_args();tmp=Path(a.tmp);tmp.mkdir(parents=True,exist_ok=True)
 if a.clips:return record_clips(tmp,a.only)
 assert CSP in (R/'worker.mjs').read_text(),'CSP drifted from worker.mjs'
 blocked=[];errors=[]
 with sync_playwright() as p:
  b=p.chromium.launch(headless=True)
  ctx=b.new_context(viewport={'width':W,'height':H},device_scale_factor=2,locale='ja-JP')
  def route(r):
   url=r.request.url
   if not url.startswith(BASE+'/'):blocked.append(url.split('?')[0]);return r.abort()
   path=url[len(BASE):].split('?')[0].split('#')[0]
   if path.startswith('/api/'):return fake_api(r,path)
   f=PUB/(path.lstrip('/') or 'index.html')
   if not f.is_file():return r.fulfill(status=404,body='')
   r.fulfill(status=200,body=f.read_bytes(),content_type=mimetypes.guess_type(f.name)[0] or 'application/octet-stream',headers={'content-security-policy':CSP})
  ctx.route('**/*',route);pg=ctx.new_page();pg.on('pageerror',lambda e:errors.append(str(e)))
  # Playwright's own recorder pads instead of scaling at device_scale_factor 2, so take frames from the CDP screencast
  cdp=ctx.new_cdp_session(pg);frames=[]
  def on_frame(ev):
   f=tmp/f'f{len(frames):05d}.jpg';f.write_bytes(base64.b64decode(ev['data']));frames.append((f,ev['metadata']['timestamp']))
   cdp.send('Page.screencastFrameAck',{'sessionId':ev['sessionId']})
  cdp.on('Page.screencastFrame',on_frame)
  cap=lambda t:pg.evaluate(OVERLAY,t);tap=lambda s:(pg.evaluate(TAP,s),pg.wait_for_timeout(350))
  def scroll_to(sel,off=90):
   pg.evaluate("([s,o])=>scrollTo({top:document.querySelector(s).getBoundingClientRect().top+scrollY-o,behavior:'smooth'})",[sel,off]);pg.wait_for_timeout(900)
  pg.goto(BASE+'/?'+urlencode({'store':STORE,'review':GOOGLE,'kind':'food'}));pg.wait_for_load_state('networkidle')
  cdp.send('Page.startScreencast',{'format':'jpeg','quality':92,'maxWidth':W*2,'maxHeight':H*2,'everyNthFrame':1})
  cap('QRを読むと、この画面が開きます');pg.wait_for_timeout(2200)
  scroll_to('#pick-card');cap('思ったことを書くと、AIが下の表を先に選びます');pg.wait_for_timeout(900)
  tap('#addition');pg.locator('#addition').press_sequentially(WRITTEN,delay=60);pg.wait_for_timeout(400)
  tap('#classify-button');pg.locator('#classify-button').click();expect(pg.locator('#classify-status')).to_contain_text('2件');pg.wait_for_timeout(600)
  scroll_to('#topics',120);cap('選ばれた内容を確かめて、残りも選びます');pg.wait_for_timeout(1400)
  for topic,rating in REST.items():
   sel='[name=rate-%s][value=%s]+span'%(topic,rating);scroll_to('#topics [data-topic=%s]'%topic,300);tap(sel);pg.locator(sel).click();pg.wait_for_timeout(450)
  pg.wait_for_timeout(500)
  scroll_to('#compose-button',520);tap('#compose-button');pg.locator('#compose-button').click();expect(pg.locator('#candidates')).to_be_visible();pg.wait_for_timeout(900)
  cap('選んだことだけで、文章の候補ができます');cand_at=time.time();pg.wait_for_timeout(2800)
  cap('選んで、自由に直せます');sel='#cand-options .cand:nth-child(2) .cand-body';tap(sel);pg.locator(sel).click();pg.wait_for_timeout(600)
  assert pg.locator('#draft-text').input_value()==RESULT,pg.locator('#draft-text').input_value()
  scroll_to('#draft-result');tap('#draft-text');pg.locator('#draft-text').click();pg.wait_for_timeout(1800)
  cap('確かめて、Googleを開きます');tap('#confirm');pg.locator('#confirm').check();pg.wait_for_timeout(900)
  expect(pg.locator('#google-link')).to_have_attribute('aria-disabled','false')
  tap('#google-link');pg.wait_for_timeout(1400)
  cap('投稿するのは、お客さま本人です');pg.wait_for_timeout(2400)
  cap('画面は実物です。店名・内容とAIの読み取りは録画用の例です');pg.wait_for_timeout(2600)
  cdp.send('Page.stopScreencast');ctx.close();b.close()
 assert not errors,errors;assert not blocked,blocked
 OUT.mkdir(exist_ok=True);mp4=OUT/'demo-customer.mp4';poster=OUT/'demo-customer-poster.webp'
 assert len(frames)>20,len(frames)
 lst=tmp/'frames.txt';lines=[]
 for (f,t),(_,t2) in zip(frames,frames[1:]+[(None,frames[-1][1]+1.0)]):lines+=[f"file '{f}'",f'duration {max(t2-t,0.001):.4f}']
 lst.write_text('\n'.join(lines+[f"file '{frames[-1][0]}'"])+'\n')
 subprocess.run(['ffmpeg','-y','-loglevel','error','-f','concat','-safe','0','-i',str(lst),'-vf','scale=600:-2,fps=30','-c:v','libx264','-profile:v','main','-pix_fmt','yuv420p',
  '-crf','30','-preset','slow','-movflags','+faststart','-an',str(mp4)],check=True)
 webm=OUT/'demo-customer.webm'
 subprocess.run(['ffmpeg','-y','-loglevel','error','-i',str(mp4),'-c:v','libvpx-vp9','-b:v','0','-crf','46','-row-mt','1','-an',str(webm)],check=True)
 poster_at=max(0.0,cand_at-frames[0][1]+POSTER_AFTER)  # screencast timestamps are wall-clock seconds
 png=tmp/'poster.png';subprocess.run(['ffmpeg','-y','-loglevel','error','-ss','%.2f'%poster_at,'-i',str(mp4),'-frames:v','1',str(png)],check=True)
 subprocess.run(['cwebp','-quiet','-q','80','-metadata','none',str(png),'-o',str(poster)],check=True)
 dur=subprocess.run(['ffprobe','-v','error','-show_entries','format=duration','-of','csv=p=0',str(mp4)],capture_output=True,text=True,check=True).stdout.strip()
 print(json.dumps({'frames':len(frames),'mp4':mp4.stat().st_size,'webm':webm.stat().st_size,'poster':poster.stat().st_size,'duration_s':dur,'poster_at_s':round(poster_at,2),'blocked_external':blocked,'page_errors':errors},ensure_ascii=False))

# ---- v7: short loops for the LP (03 しくみの3ステップ, 06 ポスター) ----
RESULT='料理は、味がよかったです。接客と雰囲気・席がよかったです。飲み物、価格と立地・アクセスはふつうでした。待ち時間は、注文から出てくるまでが気になりました。'+WRITTEN
def encode(frames,tmp,name,poster_at,crf=30):
 """frames -> public/video/NAME.mp4 (+ .webm, -poster.webp). Returns sizes and duration."""
 lst=tmp/(name+'.txt');lines=[]
 for (f,t),(_,t2) in zip(frames,frames[1:]+[(None,frames[-1][1]+0.6)]):lines+=[f"file '{f}'",f'duration {max(t2-t,0.001):.4f}']
 lst.write_text('\n'.join(lines+[f"file '{frames[-1][0]}'"])+'\n')
 mp4=OUT/(name+'.mp4');webm=OUT/(name+'.webm');poster=OUT/(name+'-poster.webp')
 subprocess.run(['ffmpeg','-y','-loglevel','error','-f','concat','-safe','0','-i',str(lst),'-vf','scale=600:-2,fps=30','-c:v','libx264','-profile:v','main','-pix_fmt','yuv420p',
  '-crf',str(crf),'-preset','slow','-movflags','+faststart','-an',str(mp4)],check=True)
 subprocess.run(['ffmpeg','-y','-loglevel','error','-i',str(mp4),'-c:v','libvpx-vp9','-b:v','0','-crf','46','-row-mt','1','-an',str(webm)],check=True)
 png=tmp/(name+'-poster.png');subprocess.run(['ffmpeg','-y','-loglevel','error','-ss','%.2f'%poster_at,'-i',str(mp4),'-frames:v','1',str(png)],check=True)
 # the loops are shown ~164px wide and the poster is fetched on first view (preload=none does not cover posters): keep it small
 subprocess.run(['cwebp','-quiet','-q','78','-resize','360','0','-metadata','none',str(png),'-o',str(poster)],check=True)
 dur=float(subprocess.run(['ffprobe','-v','error','-show_entries','format=duration','-of','csv=p=0',str(mp4)],capture_output=True,text=True,check=True).stdout.strip())
 return {'mp4':mp4.stat().st_size,'webm':webm.stat().st_size,'poster':poster.stat().st_size,'duration_s':round(dur,2),'frames':len(frames)}
def record_clips(tmp,only=None):
 assert CSP in (R/'worker.mjs').read_text(),'CSP drifted from worker.mjs'
 blocked=[];errors=[];out={}
 with sync_playwright() as p:
  b=p.chromium.launch(headless=True)
  def clip(name,setup,act,poster_mark):
   """setup runs off camera; act runs while recording and returns nothing. poster_mark: key in marks used for the poster frame."""
   if only and only!=name:return
   d=tmp/name;d.mkdir(parents=True,exist_ok=True)
   for f in d.glob('f*.jpg'):f.unlink()
   ctx=b.new_context(viewport={'width':W,'height':H},device_scale_factor=2,locale='ja-JP',permissions=['clipboard-read','clipboard-write'])
   ctx.add_init_script('window.print=()=>{window.__printed=(window.__printed||0)+1;};')  # no print dialog; the print look is emulated below
   def route(r):
    url=r.request.url
    if not url.startswith(BASE+'/'):blocked.append(url.split('?')[0]);return r.abort()
    path=url[len(BASE):].split('?')[0].split('#')[0]
    if path.startswith('/api/'):return fake_api(r,path)
    f=PUB/(path.lstrip('/') or 'index.html')
    if not f.is_file():return r.fulfill(status=404,body='')
    r.fulfill(status=200,body=f.read_bytes(),content_type=mimetypes.guess_type(f.name)[0] or 'application/octet-stream',headers={'content-security-policy':CSP})
   ctx.route('**/*',route);pg=ctx.new_page();pg.on('pageerror',lambda e:errors.append(str(e)))
   h=type('H',(),{})();h.pg=pg;h.marks={}
   def cap(t):  # the loops are shown ~150px wide on the LP, so the caption is set larger than in the full demo
    pg.evaluate(OVERLAY,t);pg.evaluate("()=>{const c=document.getElementById('demo-cap');c.style.fontSize='27px';c.style.lineHeight='1.35';c.style.padding='14px 12px'}")
   h.cap=cap;h.tap=lambda s:(pg.evaluate(TAP,s),pg.wait_for_timeout(300))
   def scroll_to(sel,off=90,wait=700):
    pg.evaluate("([s,o])=>scrollTo({top:document.querySelector(s).getBoundingClientRect().top+scrollY-o,behavior:'smooth'})",[sel,off]);pg.wait_for_timeout(wait)
   h.scroll_to=scroll_to
   setup(h)
   cdp=ctx.new_cdp_session(pg);frames=[]
   def on_frame(ev):
    f=d/f'f{len(frames):05d}.jpg';f.write_bytes(base64.b64decode(ev['data']));frames.append((f,ev['metadata']['timestamp']))
    cdp.send('Page.screencastFrameAck',{'sessionId':ev['sessionId']})
   cdp.on('Page.screencastFrame',on_frame)
   cdp.send('Page.startScreencast',{'format':'jpeg','quality':90,'maxWidth':W*2,'maxHeight':H*2,'everyNthFrame':1})
   h.mark=lambda k:h.marks.__setitem__(k,time.time())  # wall clock, like the screencast timestamps
   act(h);cdp.send('Page.stopScreencast');ctx.close()
   assert len(frames)>10,(name,len(frames))
   poster_at=min(max(0.0,h.marks[poster_mark]+0.9-frames[0][1]),frames[-1][1]-frames[0][1])
   # step-customer scrolls through every topic now (all required), so it needs a higher crf to stay under the LP's 420 KB per loop
   out[name]=encode(frames,d,name,poster_at,crf=35 if name=='step-customer' else 30)|{"poster_at_s":round(poster_at,2)}
  # ① お店: 店名とリンクを入れて QR ができるまで
  def s_store(h):
   h.pg.goto(BASE+'/#create');h.pg.wait_for_load_state('networkidle')
   h.pg.evaluate("scrollTo({top:document.getElementById('store-form').getBoundingClientRect().top+scrollY-70,behavior:'instant'})")
  def a_store(h):
   pg=h.pg;h.cap('店名とGoogleの口コミリンクを入れます');pg.wait_for_timeout(700)
   h.tap('#store-name');pg.locator('#store-name').press_sequentially(STORE,delay=90);pg.wait_for_timeout(300)
   h.tap('#review-url');pg.locator('#review-url').fill(GOOGLE);pg.wait_for_timeout(700)
   h.scroll_to('#store-form button.primary',420);h.tap('#store-form button.primary');pg.locator('#store-form button.primary').click()
   expect(pg.locator('#qr-area svg')).to_be_visible();h.scroll_to('#qr-area',180,800)
   h.cap('QRと掲示用ポスターができます');h.mark('done');pg.wait_for_timeout(2600)
  clip('step-store',s_store,a_store,'done')
  # ② お客さま: 話題 → 評価 → 細目 → 候補（既存デモの短縮版）
  def s_cust(h):
   h.pg.goto(BASE+'/?'+urlencode({'store':STORE,'review':GOOGLE,'kind':'food'}));h.pg.wait_for_load_state('networkidle')
   h.pg.evaluate("scrollTo({top:document.getElementById('pick-card').getBoundingClientRect().top+scrollY-70,behavior:'instant'})")
  def a_cust(h):
   pg=h.pg;h.cap('書くと、AIが先に選びます');h.tap('#addition');pg.locator('#addition').fill(WRITTEN);pg.wait_for_timeout(500)
   h.tap('#classify-button');pg.locator('#classify-button').click();expect(pg.locator('#classify-status')).to_contain_text('2件');h.scroll_to('#topics',120,600)
   h.cap('残りの話題も選びます')
   for topic,rating in REST.items():sel='[name=rate-%s][value=%s]+span'%(topic,rating);h.scroll_to('#topics [data-topic=%s]'%topic,300,250);h.tap(sel);pg.locator(sel).click();pg.wait_for_timeout(200)
   h.scroll_to('#compose-button',520,600);h.tap('#compose-button');pg.locator('#compose-button').click();expect(pg.locator('#candidates')).to_be_visible();pg.wait_for_timeout(700)
   h.cap('選んだことだけで、候補ができます');h.mark('done');pg.wait_for_timeout(2200)
  clip('step-customer',s_cust,a_cust,'done')
  # ③ お客さま本人: 確認 → コピー → Googleを開く
  def s_self(h):
   s_cust(h);pg=h.pg
   pg.locator('#addition').fill(WRITTEN);pg.locator('#classify-button').click();expect(pg.locator('#classify-status')).to_contain_text('2件')
   for topic,rating in REST.items():pg.locator('[name=rate-%s][value=%s]+span'%(topic,rating)).click()
   pg.locator('#compose-button').click();expect(pg.locator('#candidates')).to_be_visible();pg.locator('#cand-options .cand').nth(1).click()
   assert pg.locator('#draft-text').input_value()==RESULT,pg.locator('#draft-text').input_value()
   pg.evaluate("scrollTo({top:document.getElementById('draft-result').getBoundingClientRect().top+scrollY-70,behavior:'instant'})");pg.wait_for_timeout(300)
  def a_self(h):
   pg=h.pg;h.cap('文章を確かめて、直せます');pg.wait_for_timeout(1200);h.tap('#draft-text');pg.locator('#draft-text').click();pg.wait_for_timeout(700)
   h.cap('体験と合っていたら、チェック');h.tap('#confirm');pg.locator('#confirm').check();pg.wait_for_timeout(700)
   h.cap('コピーして');h.tap('#copy-draft');pg.locator('#copy-draft').click();pg.wait_for_timeout(900)
   expect(pg.locator('#google-link')).to_have_attribute('aria-disabled','false')
   h.cap('Googleを開いて、自分で投稿します');h.tap('#google-link');h.mark('done');pg.wait_for_timeout(2400)  # marked only; not followed
  clip('step-self',s_self,a_self,'done')
  # 06 ポスター: 印刷されるポスター → QR画像（SVG）の保存
  def s_post(h):
   s_store(h);pg=h.pg;pg.locator('#store-name').fill(STORE);pg.locator('#review-url').fill(GOOGLE);pg.locator('#store-form button.primary').click()
   expect(pg.locator('#poster-actions')).to_be_visible()
   pg.evaluate("scrollTo({top:document.getElementById('qr-area').getBoundingClientRect().top+scrollY-80,behavior:'instant'})");pg.wait_for_timeout(300)
  def a_post(h):
   pg=h.pg;h.cap('QRができたら、印刷します');pg.wait_for_timeout(900)
   h.scroll_to('#print-qr',420,600);h.tap('#print-qr');pg.locator('#print-qr').click();assert pg.evaluate('window.__printed')==1
   pg.emulate_media(media='print');pg.evaluate("scrollTo({top:0,behavior:'instant'})");h.cap('印刷されるのは、この1枚');h.mark('print');pg.wait_for_timeout(2600)
   pg.emulate_media(media='screen');h.scroll_to('#download-qr',420,10);pg.evaluate("scrollTo({top:document.getElementById('download-qr').getBoundingClientRect().top+scrollY-420,behavior:'instant'})");pg.wait_for_timeout(300)
   h.cap('QR画像（SVG）だけの保存もできます');h.tap('#download-qr');pg.wait_for_timeout(2300)  # marked only; nothing is downloaded
  clip('poster-print',s_post,a_post,'print')
  b.close()
 assert not errors,errors;assert not blocked,blocked
 print(json.dumps({'clips':out,'blocked_external':blocked,'page_errors':errors},ensure_ascii=False))
if __name__=='__main__':main()
