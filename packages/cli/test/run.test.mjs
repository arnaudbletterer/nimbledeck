import assert from 'node:assert/strict'
import { EventEmitter } from 'node:events'
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import net from 'node:net'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import { loadConfig, validateConfig } from '../src/config.mjs'
import { slidevBin, startDeck, winCommand } from '../src/run.mjs'

const project = (config) => {
  const root = mkdtempSync(join(tmpdir(), 'nd-run-'))
  writeFileSync(join(root, 'nimbledeck.config.json'), JSON.stringify(config))
  return root
}
const problems = (config) => { const root = project(config); return validateConfig(loadConfig(root), root).join('\n') }

test('the default config is valid', () => assert.equal(problems({}), ''))

test('config values are validated with clear messages', () => {
  assert.match(problems({ python: { version: '3.12; rm -rf /' } }), /python.version/)
  assert.match(problems({ python: { version: 'latest' } }), /python.version/)
  assert.match(problems({ demos: { a: { file: '../outside.py', port: 2800 } } }), /demos.a.file.*inside the project/)
  assert.match(problems({ demos: { a: { file: '/etc/passwd', port: 2800 } } }), /inside the project/)
  assert.match(problems({ demos: { a: { file: 'demos/a.py; touch x', port: 2800 } } }), /shell characters/)
  assert.match(problems({ demos: { a: { file: '--evil', port: 2800 } } }), /starts with '-'/)
  assert.match(problems({ streams: { 'a/b': { file: 'x.py', port: 2800 } } }), /streams.a\/b: the name/)
  assert.match(problems({ streams: { a: { file: 'x.py', port: 99999 } } }), /streams.a.port/)
  assert.match(problems({ publicDir: '../public' }), /publicDir.*inside/)
  assert.match(problems({ python: { requirements: '$(id).txt' } }), /python.requirements/)
  assert.match(problems({ runner: { port: 'x' } }), /runner.port/)
  assert.equal(problems({ demos: { a: { file: 'my demos/a.py', port: 2800 } } }), '')
})

test('an invalid JSON config is a readable error', () => {
  const root = mkdtempSync(join(tmpdir(), 'nd-run-')); writeFileSync(join(root, 'nimbledeck.config.json'), '{ nope')
  assert.throws(() => loadConfig(root), /not valid JSON/)
})

test('Windows commands quote spaces', () => assert.equal(winCommand('npx', ['slidev', 'my deck.md', '--port', '1']), 'npx slidev "my deck.md" --port 1'))

// A fake spawn that records every child and its kills, so nothing real starts.
function fakes() {
  const spawned = [], killed = []
  const spawn = (cmd, args) => { const c = new EventEmitter(); Object.assign(c, { pid: 1, exitCode: null, cmd, args }); spawned.push(c); return c }
  const kill = (child, signal) => { killed.push([child.args.slice(-1)[0], signal]); child.exitCode = 0; child.emit('exit', 0, null) }
  return { spawned, killed, deps: { spawn, kill, log: () => {}, exit: () => {}, plan: async () => ({ flags: [], env: {}, skip: false }) } }
}
const busy = () => new Promise((res) => { const s = net.createServer(); s.listen(0, '127.0.0.1', () => res(s)) })

test('a busy port is refused and the children already started are stopped', async () => {
  const server = await busy(), taken = server.address().port
  const root = project({ demos: { a: { file: 'a.py', port: 41999 } }, streams: { b: { file: 'b.py', port: taken } } })
  const f = fakes()
  try {
    await assert.rejects(startDeck('deck.md', root, { ...f.deps, free: (p) => p !== taken && new Promise((ok) => ok(true)) }), new RegExp(`port ${taken} is already in use \\(stream b\\)`))
  } finally { server.close() }
  assert.equal(f.spawned.length, 1, 'only the demo before the busy port was started')
  assert.equal(f.killed.length, 1, 'and it was stopped')
})

test('the real port check refuses a port in use', async () => {
  const server = await busy(), taken = server.address().port
  const root = project({ port: taken })
  const f = fakes()
  try { await assert.rejects(startDeck('deck.md', root, f.deps), /is already in use \(deck\)/) } finally { server.close() }
  assert.equal(f.spawned.length, 0)
})

test('an invalid config starts nothing', async () => {
  const f = fakes()
  await assert.rejects(startDeck('deck.md', project({ demos: { a: { file: '../x.py', port: 2800 } } }), f.deps), /invalid nimbledeck.config.json/)
  assert.equal(f.spawned.length, 0)
})

test('a child that dies is reported with its log, and children write to .nimbledeck/logs', async () => {
  const root = project({ demos: { a: { file: 'a.py', port: 41998 } } }); mkdirSync(join(root, 'demos'))
  const f = fakes(), errors = [], orig = console.error
  console.error = (m) => errors.push(m)
  try {
    const run = await startDeck('deck.md', root, { ...f.deps, free: async () => true })
    const demo = run.children.find((c) => c.name === 'demo-a')
    assert.match(demo.log, /\.nimbledeck[\\/]logs[\\/]demo-a\.log$/)
    readFileSync(demo.log)   // created
    demo.child.emit('exit', 3, null)
    assert.equal(errors.length, 1)
    assert.match(errors[0], /demo-a exited \(code 3\), see .*demo-a\.log/)
    await run.stop()
  } finally { console.error = orig }
})

test('a missing program is explained and everything stops', async () => {
  const root = project({}), f = fakes(), errors = [], orig = console.error
  let code
  console.error = (m) => errors.push(m)
  try {
    await startDeck('deck.md', root, { ...f.deps, free: async () => true, exit: (c) => { code = c } })
    const e = Object.assign(new Error('spawn npx ENOENT'), { code: 'ENOENT' })
    f.spawned.find((c) => c.cmd === 'npx').emit('error', e)
    await new Promise((r) => setTimeout(r, 20))
    assert.match(errors[0], /cannot start slidev: 'npx' was not found, install Node.js/)
    assert.equal(code, 1)
  } finally { console.error = orig }
})

test('Slidev is found in the deck project and started with node, not npx; a project without it falls back', () => {
  assert.match(slidevBin(new URL('../../../examples/how-it-works', import.meta.url).pathname), /@slidev[\\/]cli[\\/]bin[\\/]slidev\.mjs$/)
  assert.equal(slidevBin(mkdtempSync(join(tmpdir(), 'nd-noslidev-'))), null)
})
