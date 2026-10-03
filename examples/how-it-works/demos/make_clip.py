"""Render a short mp4 (reaction-diffusion-like moving field) with imageio's bundled ffmpeg."""
import sys
import numpy as np
import imageio.v2 as imageio

out = sys.argv[1]
W, H, N = 640, 360, 150
y, x = np.mgrid[0:H, 0:W].astype(np.float32)
with imageio.get_writer(out, fps=30, codec="libx264", quality=7, macro_block_size=1, pixelformat="yuv420p") as w:
    for i in range(N):
        t = i / 30
        v = np.sin(x / 40 + t * 2) + np.sin(y / 30 - t * 1.5) + np.sin((x + y) / 50 + t)
        v = (v - v.min()) / (v.max() - v.min())
        img = np.stack([35 + 200 * v, 35 + 170 * v, 35 + 150 * v], -1).astype(np.uint8)
        w.append_data(img)
