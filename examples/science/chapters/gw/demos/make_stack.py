"""Writes public/gw-chirp.png, the still of the equation slide (simulated data, see gwlib.py). Run: python demos/make_stack.py"""
import pathlib

import gwplot

out = pathlib.Path(__file__).resolve().parent.parent / "public" / "gw-chirp.png"
out.write_bytes(gwplot.stack())
print(out, out.stat().st_size // 1024, "KB")
