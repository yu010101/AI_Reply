"""Record the LP demo video (public/video/demo-customer.mp4 + poster) of the real customer screen.
Serves intake-beta/public from disk with the worker's CSP, like tools/capture_screens.py.
Inputs are the LP's fictional example (喫茶 こもれび: 料理・飲み物=よかった→味・温かさ, 待ち時間=気になった→料理が出るまで). The candidates come from
public/compose.js; nothing is added to the picks, so /api/draft must not be called (it is refused and recorded here);
every other host is refused. Captions and the tap marker are overlays
drawn only for the recording; they are not part of the product UI.
Usage: python3 tools/record_demo.py --tmp DIR   (needs ffmpeg and cwebp)
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
def main():
 ap=argparse.ArgumentParser();ap.add_argument('--tmp',required=True);a=ap.parse_args();tmp=Path(a.tmp);tmp.mkdir(parents=True,exist_ok=True)
 assert CSP in (R/'worker.mjs').read_text(),'CSP drifted from worker.mjs'
 blocked=[];errors=[]
 with sync_playwright() as p:
  b=p.chromium.launch(headless=True)
  ctx=b.new_context(viewport={'width':W,'height':H},device_scale_factor=2,locale='ja-JP')
  def route(r):
   url=r.request.url
   if not url.startswith(BASE+'/'):blocked.append(url.split('?')[0]);return r.abort()
   path=url[len(BASE):].split('?')[0].split('#')[0]
   if path=='/api/draft':blocked.append(path);return r.fulfill(status=503,body='')
   if path.startswith('/api/'):return r.fulfill(status=200,content_type='application/json',body='{"recorded":true}')
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
  scroll_to('#pick-card');cap('何がありましたか？ タップで選びます');pg.wait_for_timeout(900)
  for name in ['料理・飲み物','待ち時間']:
   sel='#topics button[data-topic="%s"]'%{'料理・飲み物':'dish','待ち時間':'wait'}[name];tap(sel);pg.locator(sel).click();pg.wait_for_timeout(500)
  scroll_to('#ratings',150);cap('どうだったかを選びます。気になったことも同じように');pg.wait_for_timeout(1000)
  for topic,rating in [('dish','good'),('wait','concern')]:
   sel='[name=rate-%s][value=%s]+span'%(topic,rating);tap(sel);pg.locator(sel).click();pg.wait_for_timeout(700)
  scroll_to('#ratings [data-topic=dish] .detail-part',150);cap('どこが？も選べます（選ばなくてもOK）');pg.wait_for_timeout(1300)
  for topic,details in [('dish',['taste','temp']),('wait',['serving'])]:
   if topic=='wait':scroll_to('#ratings [data-topic=wait] .detail-part',260)
   for d in details:sel='#ratings [data-topic=%s] [data-detail=%s]'%(topic,d);tap(sel);pg.locator(sel).click();pg.wait_for_timeout(650)
  pg.wait_for_timeout(600)
  scroll_to('#compose-button',520);tap('#compose-button');pg.locator('#compose-button').click();expect(pg.locator('#candidates')).to_be_visible();pg.wait_for_timeout(900)
  cap('選んだことだけで、文章の候補ができます');cand_at=time.time();pg.wait_for_timeout(2800)
  cap('選んで、自由に直せます');sel='#cand-options .cand:nth-child(2) .cand-body';tap(sel);pg.locator(sel).click();pg.wait_for_timeout(600)
  assert pg.locator('#draft-text').input_value()=='料理・飲み物は、味と温かさがよかったです。待ち時間は、料理が出るまでが気になりました。',pg.locator('#draft-text').input_value()
  scroll_to('#draft-result');tap('#draft-text');pg.locator('#draft-text').click();pg.wait_for_timeout(1800)
  cap('確かめて、Googleを開きます');tap('#confirm');pg.locator('#confirm').check();pg.wait_for_timeout(900)
  expect(pg.locator('#google-link')).to_have_attribute('aria-disabled','false')
  tap('#google-link');pg.wait_for_timeout(1400)
  cap('投稿するのは、お客さま本人です');pg.wait_for_timeout(2400)
  cap('画面は実物です。店名・内容は架空の例です');pg.wait_for_timeout(2600)
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
if __name__=='__main__':main()
