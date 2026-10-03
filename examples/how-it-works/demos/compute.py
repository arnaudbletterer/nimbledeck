import marimo

__generated_with = "0.25.1"
app = marimo.App(width="full", css_file="transparent.css")


@app.cell
def _():
    import marimo as mo
    import subprocess, sys, time, json
    return json, mo, subprocess, sys, time


@app.cell
def _(mo):
    size = mo.ui.slider(200, 1600, step=200, value=800, label="Grid size", show_value=True)
    iters = mo.ui.slider(20, 400, step=20, value=100, label="Iterations", show_value=True)
    mo.hstack([size, iters], justify="start", gap=2)
    return iters, size


@app.cell
def _(iters, json, mo, size, subprocess, sys, time):
    # Heavy work runs in a SUBPROCESS, standing in for a dedicated .exe.
    # If it crashes, only this cell shows an error; the kernel and the deck survive.
    _code = (
        "import numpy as np, json, sys\n"
        "n, it = int(sys.argv[1]), int(sys.argv[2])\n"
        "y, x = np.ogrid[-1.2:1.2:n*1j, -2:1:n*1j]\n"
        "c = x + 1j*y; z = c.copy(); out = np.zeros(c.shape, dtype=np.int32)\n"
        "for i in range(it):\n"
        "    m = np.abs(z) <= 2; z[m] = z[m]**2 + c[m]; out += m\n"
        "np.save(sys.argv[3], out)\n"
    )
    import tempfile, pathlib
    import numpy as np
    _path = pathlib.Path(tempfile.mkdtemp()) / "out.npy"
    _t0 = time.perf_counter()
    _r = subprocess.run([sys.executable, "-c", _code, str(size.value), str(iters.value), str(_path)],
                        capture_output=True, text=True, timeout=120)
    _dt = time.perf_counter() - _t0
    if _r.returncode != 0:
        mo.stop(True, mo.md(f"**Compute failed:** `{_r.stderr[-300:]}`"))
    import matplotlib.pyplot as plt
    _fig, _ax = plt.subplots(figsize=(6, 4.2))
    _ax.imshow(np.load(_path), cmap="magma")
    _ax.axis("off")
    mo.vstack([mo.md(f"**{size.value}x{size.value}** grid, **{iters.value}** iterations: computed in **{_dt:.2f}s** (subprocess)"), _fig])
    return


if __name__ == "__main__":
    app.run()
