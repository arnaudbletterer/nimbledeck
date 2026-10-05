import marimo

__generated_with = "0.25.1"
app = marimo.App(width="full", css_file="science.css")


@app.cell
def _():
    import marimo as mo
    import io, pathlib, subprocess, sys, tempfile, time
    import numpy as np
    return io, mo, np, pathlib, subprocess, sys, tempfile, time


@app.cell
def _(mo):
    feed = mo.ui.slider(0.02, 0.07, step=0.0005, value=0.0545, label="Feed rate", show_value=True, full_width=True)
    kill = mo.ui.slider(0.05, 0.07, step=0.0002, value=0.062, label="Kill rate", show_value=True, full_width=True)
    steps = mo.ui.slider(500, 8000, step=500, value=3000, label="Time steps", show_value=True, full_width=True)
    return feed, kill, steps


@app.cell
def _(feed, io, kill, mo, np, pathlib, steps, subprocess, sys, tempfile, time):
    # The heavy work runs in a SUBPROCESS: if it fails, only this cell shows an error and the deck keeps working.
    _here = pathlib.Path(__file__).parent
    _out = pathlib.Path(tempfile.mkdtemp()) / "v.npy"
    _t0 = time.perf_counter()
    _r = subprocess.run([sys.executable, str(_here / "gray_scott.py"), str(feed.value), str(kill.value), str(steps.value), str(_out), "192"],
                        capture_output=True, text=True, timeout=120)
    _dt = time.perf_counter() - _t0
    mo.stop(_r.returncode != 0, mo.md(f"**Compute failed:** `{_r.stderr[-300:]}`"))
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt
    from matplotlib.colors import LinearSegmentedColormap
    _v = np.load(_out)
    _cmap = LinearSegmentedColormap.from_list("studio", ["#07090f", "#2b2f78", "#a78bfa", "#22d3ee", "#f2eee6"])
    _fig = plt.figure(figsize=(5.2, 5.2), dpi=130)
    _ax = _fig.add_axes([0, 0, 1, 1])
    _ax.imshow(_v, cmap=_cmap, vmin=0, vmax=max(0.35, float(_v.max())), interpolation="bicubic")
    _ax.axis("off")
    _buf = io.BytesIO()
    _fig.savefig(_buf, format="png", facecolor="#07090f")
    plt.close(_fig)
    _cells = _v.size * steps.value
    mo.hstack([
        mo.vstack([
            mo.md("## Reaction-diffusion"),
            mo.md("Two chemicals, one rule. Move a slider: the pattern is recomputed on this machine."),
            feed, kill, steps,
            mo.md(f"**{_v.shape[0]} x {_v.shape[1]}** cells, **{steps.value:,}** steps in **{_dt:.1f} s** "
                  f"({_cells / _dt / 1e6:.0f} million cell updates per second, NumPy, one subprocess)"),
        ], gap=1.2),
        mo.image(_buf.getvalue(), width=520, rounded=True),
    ], widths=[380, "content"], gap=3, align="center", justify="center")
    return


if __name__ == "__main__":
    app.run()
