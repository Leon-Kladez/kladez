"""«Кладезъ»: картинки мастера установки (WizardImageFile / WizardSmallImageFile).

Рисует логотип как в шапке панели: «Кладезъ» шрифтом Ponomar → тонкая черта →
«КЛАДЕЗЬ ЗНАНИЙ» разреженными заглавными Old Standard TT; тёмно-коричневый #5a3b12 на #f6efe0.
Шрифты — admin/public/fonts (SIL OFL 1.1), WOFF2 распаковывается в TTF во временной папке.

Запуск (из корня репозитория):  python -I installer/windows/assets/make_wizard_images.py
Нужны: Pillow, fontTools с brotli. Результат — BMP в installer/windows/assets/ (их и кладём в git).
"""
import sys
import tempfile
from pathlib import Path

from fontTools.ttLib import TTFont
from PIL import Image, ImageDraw, ImageFont

INK = (0x5A, 0x3B, 0x12)
PAPER = (0xF6, 0xEF, 0xE0)
SOFT = (0xEA, 0xD9, 0xB8)

# Размеры из документации Inno Setup 6 для масштабов 100/125/150/200 % (берётся ближайший).
WIZARD_SIZES = [(164, 314), (192, 386), (246, 459), (328, 604)]
SMALL_SIZES = [(55, 55), (64, 68), (83, 80), (110, 106)]

ROOT = Path(__file__).resolve().parents[3]
FONTS = ROOT / 'admin' / 'public' / 'fonts'
OUT = Path(__file__).resolve().parent


def woff2_to_ttf(src: Path, dst_dir: Path) -> Path:
    font = TTFont(str(src))
    font.flavor = None
    dst = dst_dir / (src.stem + '.ttf')
    font.save(str(dst))
    return dst


def fit_font(path: Path, text: str, max_w: int, max_h: int, tracking: float = 0.0) -> ImageFont.FreeTypeFont:
    size = max_h
    while size > 6:
        f = ImageFont.truetype(str(path), size)
        if text_width(f, text, tracking) <= max_w and f.getbbox(text)[3] - f.getbbox(text)[1] <= max_h:
            return f
        size -= 1
    return ImageFont.truetype(str(path), 6)


def text_width(f: ImageFont.FreeTypeFont, text: str, tracking: float) -> float:
    return sum(f.getlength(c) for c in text) + tracking * f.size * (len(text) - 1)


def draw_spaced(d: ImageDraw.ImageDraw, f, text: str, cx: float, y: float, tracking: float) -> None:
    x = cx - text_width(f, text, tracking) / 2
    for c in text:
        d.text((x, y), c, font=f, fill=INK)
        x += f.getlength(c) + tracking * f.size


def wizard_image(w: int, h: int, ponomar: Path, oldstd: Path) -> Image.Image:
    img = Image.new('RGB', (w, h), PAPER)
    d = ImageDraw.Draw(img)
    line = max(1, round(w / 164))
    m = round(w * 0.06)
    d.rectangle([m, m, w - 1 - m, h - 1 - m], outline=INK, width=line)
    d.rectangle([m + 3 * line, m + 3 * line, w - 1 - m - 3 * line, h - 1 - m - 3 * line], outline=SOFT, width=line)

    title = fit_font(ponomar, 'Кладезъ', int(w * 0.74), int(h * 0.16))
    bbox = title.getbbox('Кладезъ')
    tw = bbox[2] - bbox[0]
    th = bbox[3] - bbox[1]
    y = int(h * 0.30)
    d.text(((w - tw) / 2 - bbox[0], y - bbox[1]), 'Кладезъ', font=title, fill=INK)
    y += th + int(h * 0.035)
    rule = int(w * 0.56)
    d.line([((w - rule) / 2, y), ((w + rule) / 2, y)], fill=INK, width=line)
    y += int(h * 0.03)

    tracking = 0.32
    sub = fit_font(oldstd, 'КЛАДЕЗЬ', int(w * 0.62), int(h * 0.045), tracking)
    for word in ('КЛАДЕЗЬ', 'ЗНАНИЙ'):
        draw_spaced(d, sub, word, w / 2, y, tracking)
        y += int(sub.size * 1.45)

    # Небольшой орнамент внизу: ромб между двумя чертами.
    cy = int(h * 0.84)
    r = max(3, round(w * 0.025))
    d.line([(w * 0.30, cy), (w / 2 - 2 * r, cy)], fill=INK, width=line)
    d.line([(w / 2 + 2 * r, cy), (w * 0.70, cy)], fill=INK, width=line)
    d.polygon([(w / 2, cy - r), (w / 2 + r, cy), (w / 2, cy + r), (w / 2 - r, cy)], fill=INK)
    return img


def small_image(w: int, h: int, ponomar: Path) -> Image.Image:
    img = Image.new('RGB', (w, h), PAPER)
    d = ImageDraw.Draw(img)
    line = max(1, round(w / 55))
    d.rectangle([0, 0, w - 1, h - 1], outline=INK, width=line)
    f = fit_font(ponomar, 'К', int(w * 0.62), int(h * 0.70))
    bbox = f.getbbox('К')
    d.text(((w - (bbox[2] - bbox[0])) / 2 - bbox[0], (h - (bbox[3] - bbox[1])) / 2 - bbox[1]), 'К', font=f, fill=INK)
    return img


def main() -> int:
    with tempfile.TemporaryDirectory() as tmp:
        ponomar = woff2_to_ttf(FONTS / 'Ponomar-Regular.woff2', Path(tmp))
        oldstd = woff2_to_ttf(FONTS / 'OldStandardTT-Regular.woff2', Path(tmp))
        for w, h in WIZARD_SIZES:
            wizard_image(w, h, ponomar, oldstd).save(OUT / f'wizard-{w}x{h}.bmp')
        for w, h in SMALL_SIZES:
            small_image(w, h, ponomar).save(OUT / f'wizard-small-{w}x{h}.bmp')
    print('ok:', ', '.join(sorted(p.name for p in OUT.glob('wizard*.bmp'))))
    return 0


if __name__ == '__main__':
    sys.exit(main())
