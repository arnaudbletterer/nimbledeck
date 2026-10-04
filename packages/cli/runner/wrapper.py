"""Runs one piece of slide code in its own process. Used by runner.py; never imported.

argv: <workdir>. Reads <workdir>/code.py and <workdir>/params.json. Applies the slide theme to matplotlib, runs the code,
and saves every open figure as <workdir>/fig-N.png. Errors are printed as a traceback limited to the user's own lines.
"""
import json
import os
import sys
import traceback

work = sys.argv[1]
params = json.load(open(os.path.join(work, "params.json")))
code = open(os.path.join(work, "code.py"), encoding="utf-8").read()
os.chdir(work)

os.environ.setdefault("MPLBACKEND", "Agg")
os.environ.setdefault("MPLCONFIGDIR", os.path.join(work, ".mpl"))   # the runner passes a shared one
try:
    import matplotlib
    matplotlib.use("Agg")
    from cycler import cycler
    t = params.get("theme") or {}
    ink, line = t.get("ink", "#222222"), t.get("line", "#cccccc")
    rc = {
        "figure.dpi": params.get("dpi", 100), "savefig.dpi": params.get("dpi", 100),
        "figure.facecolor": "none", "axes.facecolor": "none", "savefig.transparent": True,
        "text.color": ink, "axes.labelcolor": ink, "axes.edgecolor": ink, "xtick.color": ink, "ytick.color": ink,
        "grid.color": line, "axes.spines.top": False, "axes.spines.right": False, "font.size": 11,
    }
    if t.get("colors"):
        rc["axes.prop_cycle"] = cycler(color=t["colors"])
    matplotlib.rcParams.update(rc)
except ImportError:
    matplotlib = None

status = 0
try:
    exec(compile(code, "<slide>", "exec"), {"__name__": "__main__"})
except SystemExit:
    pass
except BaseException:
    status = 1
    tb = traceback.format_exc().splitlines()
    # keep the header and the frames of the user's code, drop the wrapper's own frame
    keep, skip = [tb[0]], False
    for ln in tb[1:]:
        if ln.startswith("  File ") and "<slide>" not in ln:
            skip = True; continue
        if ln.startswith("  File "):
            skip = False
        if not skip:
            keep.append(ln)
    print("\n".join(keep), file=sys.stderr)

if matplotlib is not None:
    try:
        import matplotlib.pyplot as plt
        for i, num in enumerate(plt.get_fignums()[:8]):
            plt.figure(num).savefig(os.path.join(work, f"fig-{i}.png"), bbox_inches="tight", transparent=True)
    except Exception as e:  # saving must never hide the user's own error
        print(f"(could not save figure: {e})", file=sys.stderr)
sys.exit(status)
