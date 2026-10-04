"""Nimbledeck live-code runner: executes Python sent from a slide and returns its output and figures.

Security model (this executes code, so it is strict):
  * binds to 127.0.0.1 only;
  * a WebSocket must carry the per-session token (?t=...) AND an Origin header from the allow-list (--origin, the deck's own
    browser origins), so another website open in the same browser cannot use it, and a request without Origin is refused;
  * every run is a separate subprocess in a temporary directory, in its own process group, with a wall-clock timeout, a CPU
    limit, a file-size limit and a memory limit (POSIX), killed as a whole when done or when a newer run replaces it. The
    memory limit is RLIMIT_AS where the OS accepts it (Linux) and always also a poll of the group's resident memory every
    200 ms (the only way on macOS), reported as "Stopped: memory limit";
  * output is read incrementally into capped buffers (only the tail is kept, and a run printing over 10 MB is stopped), and
    figure sizes are checked before they are read.
It runs the code with the presenter's own rights, like a notebook does: only ever type code you would run anyway.

Protocol (JSON text frames):
  client -> {"type": "run", "id": n, "code": str, "dpi": number, "theme": {...}, "timeout": seconds}
  client -> {"type": "cancel"}
  server -> {"type": "status", "id": n, "state": "running"}
  server -> {"type": "result", "id": n, "ok": bool, "ms": int, "stdout": str, "stderr": str, "images": [base64 png], "timedOut": bool}
"""
import argparse
import asyncio
import base64
import json
import os
import secrets
import shutil
import signal
import subprocess
import sys
import tempfile
import time
from urllib.parse import parse_qs, urlparse

from websockets.asyncio.server import serve

HERE = os.path.dirname(os.path.abspath(__file__))
MAX_TEXT = 20_000
MAX_IMAGE_BYTES = 8_000_000
MAX_TIMEOUT = 60
MAX_FILE_BYTES = 32_000_000     # RLIMIT_FSIZE: largest file the code may write
MAX_OUTPUT_BYTES = 10_000_000   # stdout + stderr together, then the run is stopped
MEMORY_POLL = 0.2
MPL = {"dir": None, "warm": None}   # shared matplotlib cache folder, and the task that fills it at startup


def _set_limits(timeout, memory_mb, which):
    import resource
    if "cpu" in which:
        resource.setrlimit(resource.RLIMIT_CPU, (int(timeout) + 2, int(timeout) + 2))
    if "as" in which:
        resource.setrlimit(resource.RLIMIT_AS, (memory_mb * 1024 * 1024, memory_mb * 1024 * 1024))
    if "fsize" in which:
        resource.setrlimit(resource.RLIMIT_FSIZE, (MAX_FILE_BYTES, MAX_FILE_BYTES))


def probe_limits(memory_mb):
    """Which rlimits this OS lets us set on a child. Failures are logged, never hidden: RLIMIT_AS, for one, raises
    "current limit exceeds maximum limit" on macOS, so there the memory limit is enforced by polling the child's RSS."""
    ok = set()
    if os.name != "posix":
        return ok
    for name in ("cpu", "as", "fsize"):
        try:
            subprocess.run([sys.executable, "-c", "pass"], check=True, capture_output=True,
                           preexec_fn=lambda n=name: _set_limits(5, memory_mb, {n}))
            ok.add(name)
        except Exception as e:
            print(f"runner: rlimit {name} is not available here ({e}), compensating where possible", file=sys.stderr, flush=True)
    return ok


async def watch_memory(proc, memory_mb, hit):
    """Poll the resident memory of the child's process group; kill it above the limit (POSIX)."""
    while proc.returncode is None:
        await asyncio.sleep(MEMORY_POLL)
        try:
            p = await asyncio.create_subprocess_exec("ps", "-A", "-o", "pgid=,rss=", stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.DEVNULL)
            out, _ = await p.communicate()
        except OSError:
            return
        kb = 0
        for line in out.decode().splitlines():
            parts = line.split()
            if len(parts) == 2 and parts[0] == str(proc.pid) and parts[1].isdigit():
                kb += int(parts[1])
        if kb > memory_mb * 1024:
            hit.set()
            kill(proc)
            return


class Capped:
    """Reads a pipe in chunks and keeps only its tail, so a flood of output never grows the runner."""
    def __init__(self, stream, flood):
        self.stream, self.flood, self.tail, self.total = stream, flood, bytearray(), 0

    async def pump(self):
        while True:
            chunk = await self.stream.read(65536)
            if not chunk:
                return
            self.total += len(chunk)
            self.tail += chunk
            if len(self.tail) > MAX_TEXT * 4:
                del self.tail[:-MAX_TEXT * 4]
            if self.total > MAX_OUTPUT_BYTES:
                self.flood.set()

    def text(self):
        return self.tail.decode("utf-8", "replace")[-MAX_TEXT:]


async def warm_matplotlib(env):
    """Build matplotlib's font cache once. A fresh cache folder per run made every run pay it (about 19 s on a Mac with many
    fonts); a shared folder pays once, here, before the first run. Failure is harmless: the run then builds it itself."""
    try:
        p = await asyncio.create_subprocess_exec(sys.executable, "-I", "-c", "import matplotlib.pyplot", env=env,
                                                 stdout=asyncio.subprocess.DEVNULL, stderr=asyncio.subprocess.DEVNULL)
        await p.wait()
    except OSError:
        pass


class Standby:
    """One wrapper process kept ready with numpy and matplotlib already imported (about 0.5 s of a run). A run takes it, sends
    it the work folder on stdin, and a new one is started at once, so a process still serves exactly one run: separate, in
    its own session, with the same limits, killed as a whole. If none is ready the run takes a plain new one, as before."""
    def __init__(self, memory_mb, rlimits):
        self.memory_mb, self.rlimits, self.proc = memory_mb, rlimits, None

    async def spawn(self):
        env = {k: v for k, v in os.environ.items() if k not in ("NIMBLEDECK_TOKEN",)}
        if MPL["dir"]:
            env["MPLCONFIGDIR"] = MPL["dir"]
        # the CPU limit depends on the run's timeout, so the wrapper sets it itself once it has the job
        kwargs = {"start_new_session": True, "preexec_fn": lambda: _set_limits(0, self.memory_mb, self.rlimits - {"cpu"})} if os.name == "posix" else {}
        return await asyncio.create_subprocess_exec(sys.executable, "-I", os.path.join(HERE, "wrapper.py"), cwd=tempfile.gettempdir(), env=env,
                                                    stdin=asyncio.subprocess.PIPE, stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE, **kwargs)

    async def refill(self):
        if self.proc is None or self.proc.returncode is not None:
            self.proc = await self.spawn()

    async def take(self):
        proc, self.proc = self.proc, None
        if proc is None or proc.returncode is not None:
            proc = await self.spawn()
        await self.refill()
        return proc


STANDBY = {"pool": None}


async def warm_up():
    """After the font cache exists, start the first standby."""
    await MPL["warm"]
    await STANDBY["pool"].refill()


async def run_code(msg, memory_mb, rlimits=frozenset()):
    timeout = min(float(msg.get("timeout") or 10), MAX_TIMEOUT)
    work = tempfile.mkdtemp(prefix="nd-run-")
    t0 = time.perf_counter()
    proc, tasks = None, []
    try:
        if MPL["warm"]:
            await asyncio.shield(MPL["warm"])   # the first run waits for the font cache; the timeout starts after
            t0 = time.perf_counter()
        with open(os.path.join(work, "code.py"), "w", encoding="utf-8") as f:
            f.write(str(msg.get("code", "")))
        with open(os.path.join(work, "params.json"), "w") as f:
            json.dump({"dpi": min(float(msg.get("dpi") or 100), 300), "theme": msg.get("theme") or {},
                       "cpu": int(timeout) + 2 if "cpu" in rlimits else 0}, f)
        pool = STANDBY["pool"]
        proc = await pool.take()
        try:
            proc.stdin.write((work + "\n").encode())
            await proc.stdin.drain()
        except (BrokenPipeError, ConnectionResetError):   # the standby died while it waited: use a plain new process
            proc = await pool.spawn()
            proc.stdin.write((work + "\n").encode())
            await proc.stdin.drain()
        flood, mem_hit = asyncio.Event(), asyncio.Event()
        out, err = Capped(proc.stdout, flood), Capped(proc.stderr, flood)
        tasks = [asyncio.create_task(out.pump()), asyncio.create_task(err.pump())]
        if os.name == "posix":
            tasks.append(asyncio.create_task(watch_memory(proc, memory_mb, mem_hit)))
        flood_task = asyncio.create_task(flood.wait())
        tasks.append(flood_task)
        wait_task = asyncio.create_task(proc.wait())
        tasks.append(wait_task)
        timed_out = False
        await asyncio.wait([wait_task, flood_task], timeout=timeout, return_when=asyncio.FIRST_COMPLETED)
        if proc.returncode is None:
            timed_out = not flood.is_set()
            kill(proc)
            await proc.wait()
        await asyncio.wait(tasks[:2], timeout=2)   # drain what the dead process left in the pipes
        images, total = [], 0
        for name in sorted(f for f in os.listdir(work) if f.startswith("fig-") and f.endswith(".png")):
            path = os.path.join(work, name)
            size = os.path.getsize(path)
            total += size
            if size <= MAX_IMAGE_BYTES and total <= MAX_IMAGE_BYTES:
                with open(path, "rb") as f:
                    images.append(base64.b64encode(f.read()).decode())
        err_text = err.text()
        # Where RLIMIT_AS is enforced (Linux) the allocation itself fails first: report it like the RSS watcher does.
        if "as" in rlimits and proc.returncode and not mem_hit.is_set() and "\nMemoryError" in "\n" + err_text:
            mem_hit.set()
        stopped = mem_hit.is_set() or flood.is_set() or timed_out
        if mem_hit.is_set():
            err_text += f"\nStopped: memory limit ({memory_mb} MB)."
        elif flood.is_set():
            err_text += f"\nStopped: the code printed more than {MAX_OUTPUT_BYTES // 1_000_000} MB."
        elif timed_out:
            err_text += f"\nStopped: the code ran longer than {timeout:g} seconds."
        return {"ok": proc.returncode == 0 and not stopped, "ms": int((time.perf_counter() - t0) * 1000), "stdout": out.text(),
                "stderr": err_text, "images": images, "timedOut": timed_out}
    finally:
        for t in tasks:
            t.cancel()
        if proc and proc.returncode is None:
            kill(proc)
        if proc and proc.stdin:
            proc.stdin.close()
        shutil.rmtree(work, ignore_errors=True)


def kill(proc):
    try:
        if os.name == "posix":
            os.killpg(proc.pid, signal.SIGKILL)
        else:
            proc.kill()
    except (ProcessLookupError, PermissionError):
        pass


def make_handler(token, memory_mb, rlimits):
    async def handler(ws):
        current = None   # the run in progress for this connection

        async def cancel():
            nonlocal current
            if current and not current.done():
                current.cancel()
                try:
                    await current
                except (asyncio.CancelledError, Exception):
                    pass
            current = None

        async def execute(msg):
            await ws.send(json.dumps({"type": "status", "id": msg.get("id"), "state": "running"}))
            try:
                res = await run_code(msg, memory_mb, rlimits)
            except asyncio.CancelledError:
                raise
            except Exception as e:
                res = {"ok": False, "ms": 0, "stdout": "", "stderr": f"runner error: {e}", "images": [], "timedOut": False}
            await ws.send(json.dumps({"type": "result", "id": msg.get("id"), **res}))

        try:
            async for raw in ws:
                try:
                    msg = json.loads(raw)
                except ValueError:
                    continue
                if msg.get("type") == "run":
                    await cancel()          # a newer run replaces the one in progress
                    current = asyncio.create_task(execute(msg))
                elif msg.get("type") == "cancel":
                    await cancel()
        finally:
            await cancel()
    return handler


async def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--port", type=int, required=True)
    ap.add_argument("--origin", action="append", default=[])
    ap.add_argument("--memory-mb", type=int, default=4096)
    ap.add_argument("--cache-dir", help="folder that keeps matplotlib's font cache between sessions (default: a temporary one)")
    args = ap.parse_args()
    token = os.environ.get("NIMBLEDECK_TOKEN") or secrets.token_hex(16)

    def process_request(connection, request):
        # token check before the WebSocket handshake completes
        q = parse_qs(urlparse(request.path).query)
        if not secrets.compare_digest(q.get("t", [""])[0], token):
            return connection.respond(403, "forbidden\n")
        return None

    if not args.origin:
        sys.exit("runner: at least one --origin is required (the deck's own browser origin)")
    rlimits = probe_limits(args.memory_mb)
    MPL["dir"] = os.path.abspath(args.cache_dir) if args.cache_dir else tempfile.mkdtemp(prefix="nd-mpl-")
    os.makedirs(MPL["dir"], exist_ok=True)
    STANDBY["pool"] = Standby(args.memory_mb, rlimits)
    MPL["warm"] = asyncio.create_task(warm_matplotlib({**{k: v for k, v in os.environ.items() if k != "NIMBLEDECK_TOKEN"}, "MPLCONFIGDIR": MPL["dir"]}))
    print(f"runner: memory limit {args.memory_mb} MB via " + ("RLIMIT_AS and RSS polling" if "as" in rlimits else "RSS polling"), file=sys.stderr, flush=True)
    async with serve(make_handler(token, args.memory_mb, rlimits), "127.0.0.1", args.port, origins=args.origin, process_request=process_request,
                     max_size=2_000_000):
        print(f"runner on ws://127.0.0.1:{args.port}", flush=True)
        warming = asyncio.create_task(warm_up())
        await asyncio.Future()


if __name__ == "__main__":
    asyncio.run(main())
