import marimo

__generated_with = "0.25.1"
app = marimo.App(width="full", css_file="transparent.css")


@app.cell
def _():
    import marimo as mo
    import subprocess, sys
    run = mo.ui.run_button(label="Run 10 s computation")
    run
    return mo, run, subprocess, sys


@app.cell
def _(mo, run, subprocess, sys):
    mo.stop(not run.value, mo.md("Press the button. The deck stays responsive while this runs."))
    # A long computation in a subprocess: the slide deck must keep working meanwhile.
    _r = subprocess.run([sys.executable, "-c", "import time; time.sleep(10); print('done')"], capture_output=True, text=True)
    mo.md(f"**Finished:** `{_r.stdout.strip()}` after a 10 s subprocess.")
    return
