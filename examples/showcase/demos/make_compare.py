"""Draw the two images of the Compare slide: the same words as a plain slide and as a styled one (2560 x 1440).

Usage: uv run --with pillow --with numpy --with matplotlib python demos/make_compare.py public
Fonts are the DejaVu files that ship with matplotlib, so the result is the same on every machine.
"""
import sys
from pathlib import Path

import numpy as np
from matplotlib import font_manager
from PIL import Image, ImageDraw, ImageFilter, ImageFont

OUT = Path(sys.argv[1])
W, H = 2560, 1440
LINES = ["Ship the new editor", "Cut load time in half", "Hire two engineers"]


def font(family, size, weight="normal"):
    return ImageFont.truetype(font_manager.findfont(font_manager.FontProperties(family=family, weight=weight)), size)


# Before: what a default template gives you.
before = Image.new("RGB", (W, H), "#ffffff")
d = ImageDraw.Draw(before)
d.text((160, 150), "Q3 roadmap", font=font("DejaVu Serif", 110, "bold"), fill="#222222")
for i, line in enumerate(LINES):
    y = 420 + i * 190
    d.ellipse((170, y + 40, 200, y + 70), fill="#222222")
    d.text((250, y), line, font=font("DejaVu Serif", 90), fill="#222222")

# After: the same words with the studio look.
rng = np.random.default_rng(7)
yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
glow = np.exp(-(((xx - 2000) / 900) ** 2 + ((yy - 300) / 700) ** 2)) * np.array([0.25, 0.35, 1.0], np.float32)[:, None, None]
glow2 = np.exp(-(((xx - 500) / 800) ** 2 + ((yy - 1300) / 500) ** 2)) * np.array([0.55, 0.2, 0.9], np.float32)[:, None, None]
base = np.array([0.035, 0.04, 0.07], np.float32)[:, None, None]
img = np.clip(base + 0.55 * glow + 0.4 * glow2, 0, 1).transpose(1, 2, 0)
img = img + rng.normal(0, 0.006, img.shape)  # a little grain hides gradient banding
after = Image.fromarray((np.clip(img, 0, 1) * 255).astype(np.uint8))
d = ImageDraw.Draw(after)
d.text((170, 230), "Q3 ROADMAP", font=font("DejaVu Sans", 56, "bold"), fill="#7aa2ff")
d.text((160, 330), "Ship the new editor.", font=font("DejaVu Sans", 190, "bold"), fill="#ffffff")
for i, line in enumerate(LINES[1:]):
    d.text((170, 640 + i * 150), line, font=font("DejaVu Sans", 84), fill="#aab4d4")
d.rounded_rectangle((170, 1080, 520, 1096), radius=8, fill="#7aa2ff")

# Progressive and optimised Huffman tables are lossless; quality 85 instead of 88 is below what the eye can tell apart
# (PSNR 51 dB and 42 dB, the grain of the second image sets its ceiling). Together they cut the two files from 347 to 212 KB.
JPEG = dict(quality=85, optimize=True, progressive=True)
before.save(OUT / "before.jpg", **JPEG)
after.filter(ImageFilter.GaussianBlur(0.4)).save(OUT / "after.jpg", **JPEG)
