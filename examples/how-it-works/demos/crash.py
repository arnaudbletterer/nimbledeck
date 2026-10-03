import marimo

__generated_with = "0.25.1"
app = marimo.App(width="full", css_file="transparent.css")


@app.cell
def _():
    import marimo as mo
    import subprocess, sys
    boom = mo.ui.switch(label="Make the subprocess crash")
    boom
    return boom, mo, subprocess, sys


@app.cell
def _(boom, mo, subprocess, sys):
    _code = "import sys; sys.exit(3)" if boom.value else "print('ok')"
    _r = subprocess.run([sys.executable, "-c", _code], capture_output=True, text=True)
    mo.md(f"Subprocess exit code: **{_r.returncode}**" + (" (crashed, but the demo and the deck are still alive)" if _r.returncode else ""))
    return
