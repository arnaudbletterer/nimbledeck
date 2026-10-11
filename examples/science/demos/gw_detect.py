import marimo

__generated_with = "0.25.1"
app = marimo.App(width="full", css_file="gw.css")


@app.cell
def _():
    import marimo as mo
    import pathlib, sys
    sys.path.insert(0, str(pathlib.Path(__file__).parent))
    import gwplot
    return gwplot, mo


@app.cell
def _(mo):
    mc = mo.ui.slider(10, 60, step=0.5, value=18, label="Template chirp mass", show_value=True, full_width=True)
    dist = mo.ui.slider(500, 3000, step=100, value=1800, label="Distance (Mpc)", show_value=True, full_width=True)
    seed = mo.ui.slider(1, 20, step=1, value=7, label="Noise sample", show_value=True, full_width=True)
    return dist, mc, seed


@app.cell
def _(dist, gwplot, mc, mo, seed):
    _png, _snr, _best = gwplot.figure(mc.value, dist.value, seed.value, dpi=220)
    _verdict = "locked on" if abs(mc.value - _best) < 3 else "not yet"
    mo.vstack([
        mo.hstack([mc, dist, seed], widths="equal", gap=2, align="end"),
        mo.image(_png, width=1130),
        mo.md(f"Simulated data: Gaussian noise coloured by a toy detector curve, plus a point-mass inspiral. "
              f"Template SNR **{_snr:.1f}**, best template in the bank **{_best:.0f}** solar masses: **{_verdict}**."),
    ], gap=0.4)
    return


if __name__ == "__main__":
    app.run()
