import assert from 'node:assert/strict'
import { spawn, spawnSync } from 'node:child_process'
import net from 'node:net'
import { dirname, join } from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'
import WebSocket from 'ws'
import { validateRecordings } from '../src/config.mjs'
import { chooseClock, PAGE_SHIM, ticksFor, tickMs, tickTime, withTimeout } from '../src/lockstep.mjs'
import { encodeArgs, frameGeometry, intermediateArgs, parseRecordArgs } from '../src/record.mjs'

test('ticks: 60 of them are exactly one second', () => {
  assert.ok(Math.abs(tickMs(60) * 60 - 1000) < 1e-9)   // 1000 / 60 * 60 is 1000.0000000000001 in floating point
  assert.equal(tickTime(60, 60), 1000)
  assert.equal(ticksFor(1000, 60), 60)
  assert.equal(ticksFor(100, 60), 6)
  assert.equal(ticksFor(0, 60), 0)
  assert.equal(ticksFor(1000, 30), 30)
})

test('streams are lockstepped, the rest says why it is not', () => {
  assert.deepEqual(chooseClock({ kind: 'stream' }), { lockstep: true, reason: null })
  assert.match(chooseClock({ kind: 'demo' }).reason, /marimo/)
  assert.match(chooseClock({ kind: 'live' }).reason, /runner/)
  assert.match(chooseClock({ kind: 'stream', realtime: true }).reason, /--realtime/)
  assert.equal(chooseClock({ kind: 'stream', cfgRealtime: true }).lockstep, false)
})

test('a wait that never ends is turned into an error', async () => {
  await assert.rejects(withTimeout(new Promise(() => {}), 20, 'no frame'), /no frame \(no answer/)
  assert.equal(await withTimeout(Promise.resolve(3), 1000, 'x'), 3)
})

test('the page shim is self-contained text', () => {
  assert.ok(PAGE_SHIM.startsWith('(') && PAGE_SHIM.endsWith(')()'))
  assert.doesNotThrow(() => new Function(PAGE_SHIM))
})

test('record options: fps, realtime and timeout', () => {
  const o = parseRecordArgs([])
  assert.deepEqual([o.fps, o.realtime, o.timeout], [60, false, 900])
  const p = parseRecordArgs(['--fps', '30', '--realtime', '--timeout', '60'])
  assert.deepEqual([p.fps, p.realtime, p.timeout], [30, true, 60])
  assert.throws(() => parseRecordArgs(['--fps', '7']), /--fps/)
  assert.throws(() => parseRecordArgs(['--fps', '59.5']), /--fps/)
  assert.throws(() => parseRecordArgs(['--timeout', '1']), /--timeout/)
})

test('the intermediate of a lockstep clip is lossless, and the encodes read it as a file', () => {
  const g = frameGeometry({ x: 0, y: 0, width: 2000, height: 1000 })
  const a = intermediateArgs(g, 'm.mkv', 60)
  assert.ok(a.includes('ffv1') && a.includes('pipe:0') && a.at(-1) === 'm.mkv' && !a.includes('libvpx'))
  const e = encodeArgs('vp9', g, 'o.webm', { fps: 60, file: 'm.mkv' })
  assert.ok(e.includes('m.mkv') && !e.includes('pipe:0') && !e.includes('-vf'))
  assert.equal(e[e.indexOf('-r') + 1], '60')
})

test('config: isolate and realtime are booleans', () => {
  const v = (r) => validateRecordings(r, { streams: { x: {} } }).join('\n')
  assert.equal(v({ 'stream-x': { isolate: true, realtime: false } }), '')
  assert.match(v({ 'stream-x': { isolate: 'yes' } }), /isolate: must be true or false/)
  assert.match(v({ 'stream-x': { fps: 30 } }), /unknown key/)
})

// The tick protocol of the stream servers, against the real nbody server (needs uv).
const here = dirname(fileURLToPath(import.meta.url))
const hasUv = spawnSync('uv', ['--version']).status === 0
const freePort = () => new Promise((res) => { const s = net.createServer(); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => res(p)) }) })

test('a stream answers one frame per tick, the same frames every time', { skip: !hasUv && 'uv not installed', timeout: 120000 }, async () => {
  const demo = join(here, '../../../examples/how-it-works/demos/stream_nbody.py'), port = await freePort()
  const proc = spawn('uv', ['run', '--quiet', '--with', 'websockets', '--with', 'numpy', 'python', demo, '--port', String(port), '--origin', 'http://localhost:3030'], { stdio: ['ignore', 'pipe', 'inherit'], env: { ...process.env, PYTHONUNBUFFERED: '1' } })   // unbuffered: the "ws://" line must reach us through a pipe
  try {
    await new Promise((ok, fail) => { proc.stdout.on('data', (d) => /ws:\/\//.test(String(d)) && ok()); proc.on('exit', () => fail(new Error('server exited'))) })
    const session = () => new Promise((resolve, reject) => {
      const ws = new WebSocket(`ws://127.0.0.1:${port}`, { origin: 'http://localhost:3030' })
      let acked = false
      const frames = []
      ws.on('error', reject)
      ws.on('open', () => ws.send(JSON.stringify({ n: 200, dt: 0.02, g: 1, lockstep: true })))
      ws.on('message', (data, binary) => {
        if (!binary) { if (String(data) === 'lockstep') { acked = true; ws.send(JSON.stringify({ tick: 1 })) } return }
        if (!acked) return   // a frame of the free-running start
        frames.push(Buffer.from(data).subarray(4).toString('base64'))   // after the 4 bytes of timing
        if (frames.length < 5) ws.send(JSON.stringify({ tick: frames.length + 1 }))
        else setTimeout(() => { ws.close(); resolve(frames) }, 300)   // a sixth frame would be a bug
      })
    })
    const a = await session(), b = await session()
    assert.equal(a.length, 5, 'exactly one frame per tick, nothing in between')
    assert.deepEqual(a, b, 'same particles every run')
  } finally { if (process.platform === 'win32') spawnSync('taskkill', ['/pid', String(proc.pid), '/T', '/F'], { stdio: 'ignore' }); else proc.kill() }   // on Windows kill() stops uv only: its python child would keep the pipe, and the test run, open
})
