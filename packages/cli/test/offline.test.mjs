// The deck must open with no internet: nothing the theme or the scaffold ships may point at a remote host,
// and `nimbledeck run` must never wait on a dead network.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { EventEmitter } from 'node:events'
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { planUv } from '../src/offline.mjs'
import { startDeck } from '../src/run.mjs'

const theme = JSON.parse(readFileSync(new URL('../../theme/package.json', import.meta.url), 'utf8')).slidev.defaults

test('the theme loads no web fonts', () => {
  assert.equal(theme.fonts?.provider, 'none')
})

test('the theme favicon is inline, not fetched from a CDN', () => {
  assert.match(theme.favicon, /^data:/)
})

const cfg = { python: { version: '3.12', requirements: 'none.txt' } }
const ran = (status, stderr = '') => () => ({ status, stderr })
const never = async () => { throw new Error('the network must not be probed') }

test('packages already in the cache: uv starts offline and the network is not asked', async () => {
  const p = await planUv(cfg, '.', { run: ran(0), probe: never })
  assert.deepEqual(p.flags, ['--offline']); assert.equal(p.skip, false)
})

test('not cached and the network is down: skip uv and say what is missing', async () => {
  const p = await planUv(cfg, '.', { run: ran(2, 'error: No solution\nfailed to download websockets'), probe: async () => false, env: {} })
  assert.equal(p.skip, true); assert.match(p.message, /none\.txt/); assert.match(p.message, /offline/)
})

test('UV_OFFLINE is honoured without probing', async () => {
  const p = await planUv(cfg, '.', { run: ran(2), probe: never, env: { UV_OFFLINE: '1' } })
  assert.equal(p.skip, true)
})

test('not cached but the network answers: uv fetches, with a short timeout', async () => {
  const p = await planUv(cfg, '.', { run: ran(2), probe: async () => true, env: {} })
  assert.equal(p.skip, false); assert.deepEqual(p.flags, []); assert.equal(p.env.UV_HTTP_TIMEOUT, '10')
})

test('startDeck adds the plan to uv commands, and starts none when the plan says skip', async () => {
  const root = mkdtempSync(join(tmpdir(), 'nd-off-'))
  mkdirSync(join(root, 'demos'))
  writeFileSync(join(root, 'nimbledeck.config.json'), JSON.stringify({ demos: { a: { file: 'demos/a.py', port: 41901 } } }))
  for (const [plan, count] of [[{ flags: ['--offline'], env: {}, skip: false }, 1], [{ flags: ['--offline'], env: {}, skip: true, message: 'x' }, 0]]) {
    const spawned = []
    const spawn = (cmd, args, o) => { const c = new EventEmitter(); Object.assign(c, { pid: 1, exitCode: null, cmd, args }); spawned.push(c); return c }
    const deps = { spawn, kill: (c) => { c.exitCode = 0; c.emit('exit', 0, null) }, log: () => {}, exit: () => {}, free: async () => true, plan: async () => plan }
    const run = await startDeck('d.md', root, deps)
    const uv = spawned.filter((c) => c.cmd === 'uv')
    assert.equal(uv.length, count)
    if (count) assert.deepEqual(uv[0].args.slice(0, 2), ['run', '--offline'])
    await run.stop()
  }
})
