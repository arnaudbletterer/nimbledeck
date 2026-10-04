// Tests of the live-code runner: spawns the real Python runner and talks to it over a WebSocket.
// Uses the `ws` package because Node's global WebSocket cannot set an Origin header.
// Needs `uv` (it fetches Python, websockets, matplotlib and numpy); skipped when uv is missing.
import assert from 'node:assert/strict'
import { spawn, spawnSync } from 'node:child_process'
import net from 'node:net'
import { dirname, join } from 'node:path'
import test, { after, before } from 'node:test'
import { fileURLToPath } from 'node:url'
import WebSocket from 'ws'

const hasUv = spawnSync('uv', ['--version']).status === 0
const posix = process.platform !== 'win32'
const here = dirname(fileURLToPath(import.meta.url))
const TOKEN = 'test-token-123'
const ORIGIN = 'http://localhost:3030'
let proc, port

const freePort = () => new Promise((res) => { const s = net.createServer(); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => res(p)) }) })
const open = (token, origin = ORIGIN) => new Promise((resolve, reject) => {
  const ws = new WebSocket(`ws://127.0.0.1:${port}/?t=${token}`, origin === null ? {} : { origin })
  ws.onopen = () => resolve(ws); ws.onerror = () => reject(new Error('refused'))
})
const rssKb = (pid) => Number(spawnSync('ps', ['-o', 'rss=', '-p', String(pid)]).stdout.toString().trim())
// send a run and collect messages until its result (or `wait` ms)
const run = (ws, msg, wait = 30000) => new Promise((resolve) => {
  const got = []; const t = setTimeout(() => resolve(got), wait)
  ws.onmessage = (e) => { const m = JSON.parse(e.data); got.push(m); if (m.type === 'result' && m.id === msg.id) { clearTimeout(t); resolve(got) } }
  ws.send(JSON.stringify({ type: 'run', ...msg }))
})
const result = (got) => got.find((m) => m.type === 'result')

before(async () => {
  if (!hasUv) return
  port = await freePort()
  proc = spawn('uv', ['run', '--python', '3.12', '--with', 'websockets', '--with', 'matplotlib', '--with', 'numpy', 'python', join(here, '../runner/runner.py'), '--port', String(port), '--origin', ORIGIN, '--memory-mb', '400'],
    { env: { ...process.env, NIMBLEDECK_TOKEN: TOKEN }, stdio: ['ignore', 'pipe', 'inherit'] })
  await new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('runner did not start')), 120000)
    proc.stdout.on('data', (d) => { if (/runner on/.test(String(d))) { clearTimeout(t); resolve() } })
    proc.on('exit', () => { clearTimeout(t); reject(new Error('runner exited')) })
  })
  // A cold machine builds matplotlib's font cache on the first run (minutes on a CI runner): do it once, here.
  const ws = await open(TOKEN); await run(ws, { id: 0, code: 'import matplotlib.pyplot', timeout: 60 }, 120000); ws.close()
}, { timeout: 240000 })
// On Windows killing `uv` leaves its Python child holding the pipes, which keeps the test process alive: kill the tree.
after(() => { if (proc && process.platform === 'win32') spawnSync('taskkill', ['/pid', String(proc.pid), '/T', '/F'], { stdio: 'ignore' }); else proc?.kill() })

test('a wrong token is refused', { skip: !hasUv }, async () => { await assert.rejects(open('nope'), /refused/) })
test('a connection without an Origin header is refused', { skip: !hasUv }, async () => { await assert.rejects(open(TOKEN, null), /refused/) })
test('a connection from another origin is refused', { skip: !hasUv }, async () => { await assert.rejects(open(TOKEN, 'http://evil.example'), /refused/) })
test('the allowed origin with the token is accepted', { skip: !hasUv }, async () => { (await open(TOKEN, ORIGIN)).close() })

test('print output comes back', { skip: !hasUv }, async () => {
  const ws = await open(TOKEN); const r = result(await run(ws, { id: 1, code: 'print("hello", 6*7)' }))
  assert.equal(r.ok, true); assert.match(r.stdout, /hello 42/); ws.close()
})

test('an open matplotlib figure comes back as a PNG, drawn with the slide theme', { skip: !hasUv }, async () => {
  const ws = await open(TOKEN)
  const code = 'import matplotlib.pyplot as plt, numpy as np\nx = np.linspace(0, 6, 50)\nplt.plot(x, np.sin(x))'
  const r = result(await run(ws, { id: 2, code, dpi: 100, theme: { ink: '#ff0000', line: '#cccccc', colors: ['#ff0000'] } }))
  assert.equal(r.ok, true); assert.equal(r.images.length, 1)
  assert.equal(Buffer.from(r.images[0], 'base64').subarray(0, 4).toString('hex'), '89504e47'); ws.close()
})

test('an error returns a traceback of the user code only', { skip: !hasUv }, async () => {
  const ws = await open(TOKEN); const r = result(await run(ws, { id: 3, code: 'x = 1\nprint(1/0)' }))
  assert.equal(r.ok, false); assert.match(r.stderr, /ZeroDivisionError/); assert.match(r.stderr, /<slide>/); assert.doesNotMatch(r.stderr, /wrapper\.py/); ws.close()
})

test('a syntax error is reported', { skip: !hasUv }, async () => {
  const ws = await open(TOKEN); const r = result(await run(ws, { id: 4, code: 'def broken(:\n  pass' }))
  assert.equal(r.ok, false); assert.match(r.stderr, /SyntaxError/); ws.close()
})

test('an infinite loop is killed at the timeout and the runner keeps working', { skip: !hasUv }, async () => {
  const ws = await open(TOKEN); const t0 = Date.now()
  const r = result(await run(ws, { id: 5, code: 'while True: pass', timeout: 2 }))
  assert.equal(r.timedOut, true); assert.equal(r.ok, false); assert.ok(Date.now() - t0 < 8000, `took ${Date.now() - t0} ms`)
  const again = result(await run(ws, { id: 6, code: 'print("still alive")' })); assert.match(again.stdout, /still alive/); ws.close()
})

test('each run is a fresh process: no shared state, no stdin, its own session', { skip: !hasUv || !posix }, async () => {
  const ws = await open(TOKEN)
  const code = 'import os, sys\nprint(os.getpid(), os.getsid(0) == os.getpid(), repr(sys.stdin.read()), "leak" in globals())\nleak = 1\nimport builtins; builtins.leak2 = 1'
  const a = result(await run(ws, { id: 20, code })); const b = result(await run(ws, { id: 21, code }))
  const [pa, sa, ia, la] = a.stdout.trim().split(' '); const [pb, sb, ib, lb] = b.stdout.trim().split(' ')
  assert.notEqual(pa, pb); assert.equal(sa, 'True'); assert.equal(sb, 'True'); assert.equal(ia, "''"); assert.equal(ib, "''"); assert.equal(la, 'False'); assert.equal(lb, 'False')
  const c = result(await run(ws, { id: 22, code: 'print(hasattr(__import__("builtins"), "leak2"))' })); assert.match(c.stdout, /False/); ws.close()
})

test('the CPU limit still follows the run timeout', { skip: !hasUv || !posix }, async () => {
  const ws = await open(TOKEN)
  const r = result(await run(ws, { id: 23, code: 'import resource\nprint(resource.getrlimit(resource.RLIMIT_CPU))', timeout: 5 }))
  assert.match(r.stdout, /\(7, 7\)/); ws.close()
})

test('a newer run replaces the one in progress',{ skip: !hasUv }, async () => {
  const ws = await open(TOKEN); const seen = []
  ws.onmessage = (e) => seen.push(JSON.parse(e.data))
  ws.send(JSON.stringify({ type: 'run', id: 10, code: 'import time; time.sleep(20)', timeout: 30 }))
  await new Promise((r) => setTimeout(r, 800))
  ws.send(JSON.stringify({ type: 'run', id: 11, code: 'print("second")' }))
  await new Promise((r) => setTimeout(r, 6000))
  assert.ok(seen.some((m) => m.type === 'result' && m.id === 11 && /second/.test(m.stdout)), 'second result missing')
  assert.ok(!seen.some((m) => m.type === 'result' && m.id === 10), 'the replaced run must not report'); ws.close()
})


test('code above the memory limit is stopped and reported', { skip: !hasUv || !posix }, async () => {
  const ws = await open(TOKEN); const t0 = Date.now()
  const r = result(await run(ws, { id: 20, code: 'blob = b"x" * (1500 * 1024 * 1024)\nimport time; time.sleep(30)', timeout: 30 }))
  assert.equal(r.ok, false); assert.match(r.stderr, /Stopped: memory limit/); assert.ok(Date.now() - t0 < 15000, `took ${Date.now() - t0} ms`)
  const again = result(await run(ws, { id: 21, code: 'print("still alive")' })); assert.match(again.stdout, /still alive/); ws.close()
})

test('a flood of output returns by the timeout and the runner stays small', { skip: !hasUv || !posix }, async () => {
  const ws = await open(TOKEN); const before = rssKb(proc.pid); const t0 = Date.now()
  const r = result(await run(ws, { id: 30, code: 'while True: print("x" * 1000)', timeout: 3 }))
  assert.equal(r.ok, false); assert.ok(Date.now() - t0 < 10000, `took ${Date.now() - t0} ms`)
  assert.ok(r.stdout.length <= 20000, `stdout was ${r.stdout.length} chars`)
  assert.ok(rssKb(proc.pid) - before < 150 * 1024, 'the runner grew by more than 150 MB'); ws.close()
})
