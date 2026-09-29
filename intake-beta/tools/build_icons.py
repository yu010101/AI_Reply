"""Build the inline Lucide icon sprite (<symbol> per icon) into public/index.html between the icons markers, and public/licenses.txt.
Only the icons listed in ICONS are copied. No external request at run time: the page uses <svg class="ico"><use href="#i-NAME"></use></svg>.
Source: the lucide-static npm package unpacked locally (npm pack lucide-static; tar xzf), ISC License (some icons MIT via Feather).
Usage: python3 tools/build_icons.py --lucide DIR   (DIR = the unpacked package/ folder)
"""
from pathlib import Path
import argparse,json,re
R=Path(__file__).resolve().parents[1];PUB=R/'public'
# name -> where it is used (kept here so an unused icon is easy to spot)
ICONS={'credit-card':'01 登録・カード不要','link':'01 店名とリンクだけ','hand':'01 自動で投稿しない',
 'split':'05 振り分けない','gift':'05 特典と引き換えにしない','bot-off':'05 自動で投稿しない',
 'badge-japanese-yen':'07 料金 / 09 料金の質問','calendar-clock':'07 正式版の案内','gauge':'07 AIの上限',
 'qr-code':'08 QR','printer':'08 ポスター','mouse-pointer-click':'08 選ぶだけの候補','spell-check':'08 句読点の整え','languages':'08 4言語',
 'message-square-text':'08 口コミの一覧・返信','chart-line':'08 効果の分析','store':'08 複数店舗 / 04 その他','save':'08 設定の保存',
 'shield-check':'09 Googleのルール','circle-help':'09 使い方','lock':'09 データ',
 'coffee':'04 飲食店','scissors':'04 美容室','shopping-bag':'04 ショップ'}
def main():
 ap=argparse.ArgumentParser();ap.add_argument('--lucide',required=True);a=ap.parse_args();src=Path(a.lucide)
 ver=json.loads((src/'package.json').read_text())['version'];out=[]
 for n in ICONS:
  body=(src/'icons'/(n+'.svg')).read_text()
  inner=re.search(r'<svg[^>]*>(.*)</svg>',body,re.S).group(1)
  inner=re.sub(r'\s*\n\s*','',inner)
  out.append(f'<symbol id="i-{n}" viewBox="0 0 24 24">{inner}</symbol>')
 sprite=(f'<!-- icons:start (Lucide v{ver}, ISC License, see licenses.txt; built by tools/build_icons.py) -->\n'
  '<svg class="icon-sprite" width="0" height="0" aria-hidden="true" focusable="false">'+''.join(out)+'</svg>\n<!-- icons:end -->')
 idx=PUB/'index.html';h=idx.read_text()
 h2=re.sub(r'<!-- icons:start.*?<!-- icons:end -->',lambda m:sprite,h,flags=re.S)
 assert h2!=h or sprite in h,'icons markers missing in index.html'
 idx.write_text(h2)
 lic=(src/'LICENSE').read_text()
 (PUB/'licenses.txt').write_text(f'ひとことβ で使っている第三者の素材\n\nアイコン: Lucide (lucide-static v{ver}) https://lucide.dev\n使っているアイコン: {", ".join(ICONS)}\n\n'+lic)
 print(json.dumps({'icons':len(ICONS),'version':ver,'sprite_bytes':len(sprite.encode())}))
if __name__=='__main__':main()
