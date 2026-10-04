"""Render a seamless abstract loop (flowing light ribbons) as small videos, 1280x720, 4 s at 30 fps.

Usage: uv run --with numpy --with imageio --with imageio-ffmpeg python demos/make_loop.py public/loop
Writes public/loop.mp4 (H.264) and public/loop.webm (VP9), the second for browsers built without H.264.
Every term depends on the phase p through sin/cos of whole multiples of 2*pi, so the last frame leads into the first.
"""
import sys

import imageio.v2 as imageio
import numpy as np

stem = sys.argv[1].removesuffix(".mp4")
W, H, FPS, SECONDS = 1280, 720, 30, 4
N = FPS * SECONDS
y, x = np.mgrid[0:H, 0:W].astype(np.float32)
u, v = x / W * 2 - 1, (y / H * 2 - 1) * (H / W)

RIBBONS = [
    ((0.30, 0.55, 1.00), 0.22, 2.0, 0.0),
    ((0.65, 0.30, 1.00), 0.18, 3.0, 2.1),
    ((0.10, 0.85, 0.95), 0.14, 4.0, 4.2),
]

writers = [
    imageio.get_writer(f"{stem}.mp4", fps=FPS, codec="libx264", macro_block_size=1, pixelformat="yuv420p",
                       output_params=["-crf", "27", "-preset", "slow"]),
    imageio.get_writer(f"{stem}.webm", fps=FPS, codec="libvpx-vp9", macro_block_size=1, pixelformat="yuv420p",
                       output_params=["-crf", "38", "-b:v", "0", "-row-mt", "1"]),
]
for i in range(N):
    p = 2 * np.pi * i / N
    img = np.zeros((H, W, 3), np.float32)
    for k, (hue, amp, freq, phase) in enumerate(RIBBONS):
        curve = amp * np.sin(freq * 2.2 * u + phase + (k + 1) * p) + 0.12 * np.cos((k + 2) * p + u * 3)
        d = np.abs(v - curve + (k - 1) * 0.16)
        glow = np.exp(-(d / 0.035) ** 2) * 0.9 + np.exp(-(d / 0.20) ** 2) * 0.28
        img += glow[..., None] * np.array(hue, np.float32)
    vignette = 1 - 0.55 * np.clip(u ** 2 + (v * 1.4) ** 2, 0, 1)
    img = 1 - np.exp(-img * 1.2)
    img = img * vignette[..., None] + np.array([0.025, 0.03, 0.055], np.float32)
    frame = (np.clip(img, 0, 1) * 255).astype(np.uint8)
    for w in writers:
        w.append_data(frame)
for w in writers:
    w.close()
