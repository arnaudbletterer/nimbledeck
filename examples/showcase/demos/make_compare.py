"""Draw the two images of the Compare slide: the Markdown of a slide and the slide it makes (2560 x 1288 each).

Usage: uv run --with pillow --with numpy --with matplotlib python demos/make_compare.py public
Writes public/source.jpg (an editor showing the Markdown) and public/slide.jpg (the studio look of the same slide).
Fonts are the DejaVu files that ship with matplotlib, so the result is the same on every machine.
Both images share one grid: the same baselines and left margin, and line widths that match to within a few percent, so
where the divider of <Compare> cuts a line the two halves join into one line. The size matches a 1200 x 604 slide box.
The slide is an illustration drawn in the studio colours, not a screenshot of the theme.
"""
import sys
from pathlib import Path

import numpy as np
from matplotlib import font_manager
from PIL import Image, ImageDraw, ImageFilter, ImageFont

OUT = Path(sys.argv[1])
W, H = 2560, 1288
LEFT = 340
LINES = ["Ship the new editor", "Cut load time in half", "Hire two engineers"]
TITLE_BASE = 330
BASES = [585, 845, 1105]
SANS, MONO = 118, 113           # a bold sans line and a mono line of the same words are about as wide
TEXT_X = LEFT + 110


def font(family, size, weight="normal"):
    return ImageFont.truetype(font_manager.findfont(font_manager.FontProperties(family=family, weight=weight)), size)


# Left: the Markdown in an editor. Markers in the accent colour, words in white, a dim gutter with line numbers.
src = Image.new("RGB", (W, H), "#0b0f19")
d = ImageDraw.Draw(src)
d.rectangle((0, 0, 120, H), fill="#0e1322")
mono, mono_title = font("DejaVu Sans Mono", MONO), font("DejaVu Sans Mono", 150, "bold")
mw = mono.getlength("- ")
d.text((LEFT - 40 - mono_title.getlength("# ") + 0, TITLE_BASE), "# ", font=mono_title, fill="#22d3ee", anchor="ls")
d.text((LEFT - 40, TITLE_BASE), "Q3 roadmap", font=mono_title, fill="#f2eee6", anchor="ls")
for base, line in zip(BASES, LINES):
    d.text((TEXT_X - mw, base), "- ", font=mono, fill="#22d3ee", anchor="ls")
    d.text((TEXT_X, base), line, font=mono, fill="#f2eee6", anchor="ls")
for i, base in enumerate([TITLE_BASE] + BASES):
    d.text((70, base), str(i + 1), font=font("DejaVu Sans Mono", 44), fill="#4b5675", anchor="rs")

# Right: the same words as a studio slide: dark page, two soft glows, heavy sans type, a gradient bar.
rng = np.random.default_rng(7)
yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
glow = np.exp(-(((xx - 2000) / 900) ** 2 + ((yy - 250) / 650) ** 2)) * np.array([0.25, 0.35, 1.0], np.float32)[:, None, None]
glow2 = np.exp(-(((xx - 600) / 800) ** 2 + ((yy - 1250) / 460) ** 2)) * np.array([0.55, 0.2, 0.9], np.float32)[:, None, None]
base = np.array([0.03, 0.035, 0.065], np.float32)[:, None, None]
img = np.clip(base + 0.5 * glow + 0.4 * glow2, 0, 1).transpose(1, 2, 0)
img = img + rng.normal(0, 0.006, img.shape)  # a little grain hides gradient banding
slide = Image.fromarray((np.clip(img, 0, 1) * 255).astype(np.uint8))
d = ImageDraw.Draw(slide)
d.text((LEFT - 40, TITLE_BASE), "Q3 roadmap", font=font("DejaVu Sans", 172, "bold"), fill="#7fe3f5", anchor="ls")
d.rounded_rectangle((LEFT - 40, TITLE_BASE + 40, LEFT + 480, TITLE_BASE + 50), radius=5, fill="#a78bfa")
for base, line in zip(BASES, LINES):
    d.rounded_rectangle((LEFT, base - 100, LEFT + 18, base + 6), radius=9, fill="#22d3ee")
    d.text((TEXT_X, base), line, font=font("DejaVu Sans", SANS, "bold"), fill="#f2eee6", anchor="ls")

src.save(OUT / "source.jpg", quality=88)
slide.filter(ImageFilter.GaussianBlur(0.4)).save(OUT / "slide.jpg", quality=88)
