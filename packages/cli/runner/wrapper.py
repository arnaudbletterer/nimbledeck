"""Runs one piece of slide code in its own process. Used by runner.py; never imported.

The runner keeps one of these processes waiting (see Standby in runner.py), already holding numpy and matplotlib, so the
imports (about 0.5 s) are paid before the code arrives. Each process still runs exactly one job.
stdin: the work folder, one line (EOF: the runner is gone). Reads <workdir>/code.py and <workdir>/params.json. Applies the
slide theme to matplotlib, runs the code, and saves every open figure as <workdir>/fig-N.png. Errors are printed as a
traceback limited to the user's own lines.
"""
import io
import json
import os
import sys
import traceback

os.environ["MPLBACKEND"] = "Agg"
try:
    import numpy  # noqa: F401  (preloaded for the user's code)
except ImportError:
    pass
try:
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt
    from cycler import cycler
    fig = plt.figure()
    fig.text(0.5, 0.5, "warm")   # loads the fonts now, not during the run
    fig.savefig(io.BytesIO(), format="png")
    plt.close("all")
except ImportError:
    matplotlib = None

work = sys.stdin.readline().strip()
if not work:
    sys.exit(0)
os.dup2(os.open(os.devnull, os.O_RDONLY), 0)   # the user's code gets no stdin
params = json.load(open(os.path.join(work, "params.json")))
code = open(os.path.join(work, "code.py"), encoding="utf-8").read()
os.chdir(work)
if params.get("cpu") and os.name == "posix":   # the CPU limit follows the run's timeout, so it is set here, not at spawn
    import resource
    used = resource.getrusage(resource.RUSAGE_SELF)
    limit = int(used.ru_utime + used.ru_stime) + params["cpu"]
    resource.setrlimit(resource.RLIMIT_CPU, (limit, limit))

if matplotlib is not None:
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
