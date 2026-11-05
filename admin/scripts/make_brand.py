"""Собирает шрифты woff2, логотип SVG (текст в контурах) и фавиконы «Кладезъ».
usage: python -I make_brand.py <fonts-dl dir> <admin/public dir>"""
import sys, os
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from PIL import Image, ImageDraw, ImageFont

src, pub = sys.argv[1], sys.argv[2]
fonts = os.path.join(pub, 'fonts')
os.makedirs(fonts, exist_ok=True)

for ttf, out in [('Ponomar-Regular.ttf', 'Ponomar-Regular.woff2'), ('OldStandard-Regular.ttf', 'OldStandardTT-Regular.woff2')]:
    f = TTFont(os.path.join(src, ttf))
    f.flavor = 'woff2'
    f.save(os.path.join(fonts, out))

with open(os.path.join(fonts, 'OFL.txt'), 'w', encoding='utf-8', newline='\n') as o:
    o.write('Шрифты логотипа «Кладезъ» распространяются по лицензии SIL Open Font License 1.1.\n')
    o.write('Ponomar-Regular.woff2 и OldStandardTT-Regular.woff2 — без изменений, только упакованы в формат WOFF2.\n\n')
    for name in ['OFL-Ponomar.txt', 'OFL-OldStandard.txt']:
        o.write('=' * 72 + '\n')
        o.write(open(os.path.join(src, name), encoding='utf-8').read().strip() + '\n\n')

def text_path(font, text, size, x0, baseline, tracking=0.0):
    """Контур строки: возвращает (svg path d, ширина) при размере size px, начало x0, базовая линия baseline."""
    cmap = font.getBestCmap(); gs = font.getGlyphSet(); upm = font['head'].unitsPerEm
    hmtx = font['hmtx']; s = size / upm
    pen = SVGPathPen(gs); x = x0
    names = [cmap[ord(ch)] for ch in text]
    for i, g in enumerate(names):
        tp = TransformPen(pen, (s, 0, 0, -s, x, baseline))
        gs[g].draw(tp)
        x += hmtx[g][0] * s
        if i < len(names) - 1: x += tracking
    return pen.getCommands(), x - x0

pono = TTFont(os.path.join(src, 'Ponomar-Regular.ttf'))
olds = TTFont(os.path.join(src, 'OldStandard-Regular.ttf'))
COLOR, BG = '#5a3b12', '#f6efe0'

# Ширина строк при базовом размере, чтобы отцентрировать
_, w_word = text_path(pono, 'Кладезъ', 96, 0, 0)
_, w_caps = text_path(olds, 'КЛАДЕЗЬ ЗНАНИЙ', 16, 0, 0, tracking=5)
W = int(max(w_word, w_caps) + 40)
word_d, _ = text_path(pono, 'Кладезъ', 96, (W - w_word) / 2, 92)
caps_d, _ = text_path(olds, 'КЛАДЕЗЬ ЗНАНИЙ', 16, (W - w_caps) / 2, 146, tracking=5)
H = 160
full = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" role="img" aria-label="Кладезъ — кладезь знаний">
<path fill="currentColor" d="{word_d}"/>
<rect x="{(W - 120) / 2}" y="117" width="120" height="1" fill="currentColor" opacity="0.5"/>
<path fill="currentColor" d="{caps_d}"/>
</svg>
'''
open(os.path.join(pub, 'kladez-logo.svg'), 'w', encoding='utf-8', newline='\n').write(full.replace('currentColor', COLOR))

# Компактный вариант — только слово
word_c, wc = text_path(pono, 'Кладезъ', 96, 10, 92)
compact = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {int(wc + 20)} 120" role="img" aria-label="Кладезъ">
<path fill="{COLOR}" d="{word_c}"/>
</svg>
'''
open(os.path.join(pub, 'kladez-logo-compact.svg'), 'w', encoding='utf-8', newline='\n').write(compact)

# Пути для React-компонента (цвет через currentColor, чтобы работала ночная тема)
with open(os.path.join(src, 'logo_paths.json'), 'w', encoding='utf-8') as o:
    import json
    json.dump({'W': W, 'H': H, 'word': word_d, 'caps': caps_d, 'ruleX': (W - 120) / 2,
               'cW': int(wc + 20), 'cH': 120, 'cWord': word_c}, o)

# Фавиконы: буква «К» шрифтом Ponomar на пергаменте
def favicon(size):
    img = Image.new('RGBA', (size, size), BG)
    d = ImageDraw.Draw(img)
    r = max(2, size // 8)
    mask = Image.new('L', (size, size), 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, size - 1, size - 1], radius=r, fill=255)
    font = ImageFont.truetype(os.path.join(src, 'Ponomar-Regular.ttf'), int(size * 0.9))
    bbox = d.textbbox((0, 0), 'К', font=font)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    d.text(((size - tw) / 2 - bbox[0], (size - th) / 2 - bbox[1]), 'К', font=font, fill=COLOR)
    img.putalpha(mask)
    return img

for s in [16, 32, 180, 192, 512]:
    favicon(s).save(os.path.join(pub, f'favicon-{s}x{s}.png'))
favicon(64).save(os.path.join(pub, 'favicon.ico'), sizes=[(16, 16), (32, 32), (48, 48), (64, 64)])
print('ok', W, H)
