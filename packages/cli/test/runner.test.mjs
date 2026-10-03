// Tests of the live-code runner: spawns the real Python runner and talks to it over a WebSocket.
// Needs `uv` (it fetches Python, websockets, matplotlib and numpy); skipped when uv is missing.
import assert from 'node:assert/strict'
import { spawn, spawnSync } from 'node:child_process'
import net from 'node:net'
import { dirname, join } from 'node:path'
import test, { after, before } from 'node:test'
import { fileURLToPath } from 'node:url'

const hasUv = spawnSync('uv', ['--version']).status === 0
const here = dirname(fileURLToPath(import.meta.url))
const TOKEN = 'test-token-123'
let proc, port

const freePort = () => new Promise((res) => { const s = net.createServer(); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => res(p)) }) })
const open = (token) => new Promise((resolve, reject) => {
  const ws = new WebSocket(`ws://127.0.0.1:${port}/?t=${token}`)
  ws.onopen = () => resolve(ws); ws.onerror = () => reject(new Error('refused'))
})
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
  proc = spawn('uv', ['run', '--python', '3.12', '--with', 'websockets', '--with', 'matplotlib', '--with', 'numpy', 'python', join(here, '../runner/runner.py'), '--port', String(port), '--origin', 'http://localhost:3030'],
    { env: { ...process.env, NIMBLEDECK_TOKEN: TOKEN }, stdio: ['ignore', 'pipe', 'inherit'] })
  await new Promise((resolve, reject) => { proc.stdout.on('data', (d) => /runner on/.test(String(d)) && resolve()); proc.on('exit', () => reject(new Error('runner exited'))); setTimeout(() => reject(new Error('runner did not start')), 120000) })
})
after(() => proc?.kill())

test('a wrong token is refused', { skip: !hasUv }, async () => { await assert.rejects(open('nope'), /refused/) })

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

test('a newer run replaces the one in progress', { skip: !hasUv }, async () => {
  const ws = await open(TOKEN); const seen = []
  ws.onmessage = (e) => seen.push(JSON.parse(e.data))
  ws.send(JSON.stringify({ type: 'run', id: 10, code: 'import time; time.sleep(20)', timeout: 30 }))
  await new Promise((r) => setTimeout(r, 800))
  ws.send(JSON.stringify({ type: 'run', id: 11, code: 'print("second")' }))
  await new Promise((r) => setTimeout(r, 6000))
  assert.ok(seen.some((m) => m.type === 'result' && m.id === 11 && /second/.test(m.stdout)), 'second result missing')
  assert.ok(!seen.some((m) => m.type === 'result' && m.id === 10), 'the replaced run must not report'); ws.close()
})
