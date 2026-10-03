"""Nimbledeck live-code runner: executes Python sent from a slide and returns its output and figures.

Security model (this executes code, so it is strict):
  * binds to 127.0.0.1 only;
  * a WebSocket must carry the per-session token (?t=...) AND, if it has an Origin header (every browser does), that origin
    must be in the allow-list, so another website open in the same browser cannot use it;
  * every run is a separate subprocess in a temporary directory, in its own process group, with a wall-clock timeout, a CPU
    limit and a memory limit (POSIX), killed as a whole when done or when a newer run replaces it;
  * output and image sizes are capped.
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
import sys
import tempfile
import time
from urllib.parse import parse_qs, urlparse

from websockets.asyncio.server import serve

HERE = os.path.dirname(os.path.abspath(__file__))
MAX_TEXT = 20_000
MAX_IMAGE_BYTES = 8_000_000
MAX_TIMEOUT = 60


def limits(timeout, memory_mb):
    def apply():
        try:
            import resource
            resource.setrlimit(resource.RLIMIT_CPU, (int(timeout) + 2, int(timeout) + 2))
            resource.setrlimit(resource.RLIMIT_AS, (memory_mb * 1024 * 1024, memory_mb * 1024 * 1024))
        except Exception:
            pass
    return apply


async def run_code(msg, memory_mb):
    timeout = min(float(msg.get("timeout") or 10), MAX_TIMEOUT)
    work = tempfile.mkdtemp(prefix="nd-run-")
    t0 = time.perf_counter()
    proc = None
    try:
        open(os.path.join(work, "code.py"), "w", encoding="utf-8").write(str(msg.get("code", "")))
        json.dump({"dpi": min(float(msg.get("dpi") or 100), 300), "theme": msg.get("theme") or {}}, open(os.path.join(work, "params.json"), "w"))
        env = {k: v for k, v in os.environ.items() if k not in ("NIMBLEDECK_TOKEN",)}
        kwargs = {"start_new_session": True, "preexec_fn": limits(timeout, memory_mb)} if os.name == "posix" else {}
        proc = await asyncio.create_subprocess_exec(sys.executable, "-I", os.path.join(HERE, "wrapper.py"), work, cwd=work, env=env,
                                                    stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE, **kwargs)
        timed_out = False
        try:
            out, err = await asyncio.wait_for(proc.communicate(), timeout)
        except asyncio.TimeoutError:
            timed_out = True
            kill(proc)
            out, err = await proc.communicate()
        images, total = [], 0
        for name in sorted(f for f in os.listdir(work) if f.startswith("fig-") and f.endswith(".png")):
            data = open(os.path.join(work, name), "rb").read()
            total += len(data)
            if total <= MAX_IMAGE_BYTES:
                images.append(base64.b64encode(data).decode())
        err_text = err.decode("utf-8", "replace")[-MAX_TEXT:]
        if timed_out:
            err_text += f"\nStopped: the code ran longer than {timeout:g} seconds."
        return {"ok": proc.returncode == 0 and not timed_out, "ms": int((time.perf_counter() - t0) * 1000), "stdout": out.decode("utf-8", "replace")[-MAX_TEXT:],
                "stderr": err_text, "images": images, "timedOut": timed_out}
    finally:
        if proc and proc.returncode is None:
            kill(proc)
        shutil.rmtree(work, ignore_errors=True)


def kill(proc):
    try:
        if os.name == "posix":
            os.killpg(proc.pid, signal.SIGKILL)
        else:
            proc.kill()
    except ProcessLookupError:
        pass


def make_handler(token, memory_mb):
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
                res = await run_code(msg, memory_mb)
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
    args = ap.parse_args()
    token = os.environ.get("NIMBLEDECK_TOKEN") or secrets.token_hex(16)

    def process_request(connection, request):
        # token check before the WebSocket handshake completes
        q = parse_qs(urlparse(request.path).query)
        if not secrets.compare_digest(q.get("t", [""])[0], token):
            return connection.respond(403, "forbidden\n")
        return None

    async with serve(make_handler(token, args.memory_mb), "127.0.0.1", args.port, origins=args.origin + [None], process_request=process_request,
                     max_size=2_000_000):
        print(f"runner on ws://127.0.0.1:{args.port}", flush=True)
        await asyncio.Future()


if __name__ == "__main__":
    asyncio.run(main())
