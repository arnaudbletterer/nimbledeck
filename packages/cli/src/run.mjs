import { spawn as nodeSpawn } from 'node:child_process'
import { randomBytes } from 'node:crypto'
import { closeSync, existsSync, mkdirSync, openSync, writeFileSync } from 'node:fs'
import net from 'node:net'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadConfig, validateConfig } from './config.mjs'

const isWin = process.platform === 'win32'

export const portFree = (port) => new Promise((ok) => {
  const s = net.createServer()
  s.once('error', () => ok(false))
  s.once('listening', () => s.close(() => ok(true)))
  s.listen(port, '127.0.0.1')
})

// Windows resolves npx to npx.cmd, which only a shell can start. Arguments were validated (no quotes, no shell characters),
// so double quotes are enough to keep spaces together.
export const winCommand = (cmd, args) => [cmd, ...args].map((a) => (/\s/.test(a) ? `"${a}"` : a)).join(' ')

const HINTS = { uv: 'install uv from https://docs.astral.sh/uv/', npx: 'install Node.js from https://nodejs.org/' }

// Kill a child and everything it started: the whole process group on POSIX (children are spawned detached), taskkill /T on Windows.
export function killTree(child, signal = 'SIGTERM', spawnImpl = nodeSpawn) {
  if (!child.pid || (child.exitCode ?? null) !== null) return
  try {
    if (isWin) spawnImpl('taskkill', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore' })
    else process.kill(-child.pid, signal)
  } catch { try { child.kill(signal) } catch { /* already gone */ } }
}

// Start every demo and stream from nimbledeck.config.json, the live-code runner, then the deck. Everything binds to 127.0.0.1.
// Returns { children, stop }. On a startup problem it stops what it started and throws. `deps` exist for tests.
export async function startDeck(deck, root, deps = {}) {
  const { spawn = nodeSpawn, free = portFree, log = console.log, exit = process.exit } = deps
  const kill = deps.kill ?? ((child, signal) => killTree(child, signal))
  const cfg = loadConfig(root)
  const problems = validateConfig(cfg, root)
  if (/[;&|`$<>"'%^!*?(){}[\]\r\n\0]/.test(deck) || deck.startsWith('-')) problems.push(`deck: ${JSON.stringify(deck)} contains shell characters`)
  if (problems.length) throw new Error(`invalid nimbledeck.config.json:\n  ${problems.join('\n  ')}`)

  const children = []   // { name, child, log }
  let stopping = false
  const stop = () => new Promise((done) => {
    stopping = true
    const alive = children.filter((c) => (c.child.exitCode ?? null) === null)
    if (!alive.length) return done()
    const t = setTimeout(() => { alive.forEach((c) => kill(c.child, 'SIGKILL')); done() }, 2000)
    let left = alive.length
    alive.forEach((c) => c.child.once('exit', () => { if (!--left) { clearTimeout(t); done() } }))
    alive.forEach((c) => kill(c.child, 'SIGTERM'))
  })
  const fail = async (message) => { await stop(); throw new Error(message) }

  const logDir = join(root, '.nimbledeck', 'logs')
  mkdirSync(logDir, { recursive: true })
  // One place to start a child: its output goes to a log file, a missing program is explained, a death is reported.
  const launch = (name, cmd, args, { inherit = false, env, onExit } = {}) => {
    const logFile = join(logDir, `${name}.log`)
    const fd = inherit ? null : openSync(logFile, 'w')
    const opts = { cwd: root, stdio: inherit ? 'inherit' : ['ignore', fd, fd], detached: !isWin, env }
    const child = cmd === 'npx' && isWin ? spawn(winCommand(cmd, args), [], { ...opts, shell: true }) : spawn(cmd, args, opts)
    if (fd !== null) closeSync(fd)
    const entry = { name, child, log: logFile }
    children.push(entry)
    child.on('error', (e) => {
      const why = e.code === 'ENOENT' ? `'${cmd}' was not found, ${HINTS[cmd] || `make sure ${cmd} is on your PATH`}` : e.message
      console.error(`cannot start ${name}: ${why}`)
      stop().then(() => exit(1))
    })
    child.on('exit', (code, signal) => {
      if (stopping) return
      if (onExit) onExit(code)
      else console.error(`${name} exited (${signal ? `signal ${signal}` : `code ${code}`}), see ${inherit ? 'the output above' : logFile}`)
    })
    return child
  }

  // Live-code runner (optional): started only when the config has a `runner` entry. A random token, valid for this session
  // only, is shared with the page through public/nimbledeck.json; the runner also only accepts the deck's own origins.
  const runner = cfg.runner ? { port: cfg.runner.port, token: randomBytes(16).toString('hex') } : null

  // The browser components read ports from public/nimbledeck.json.
  const pub = join(root, cfg.publicDir)
  mkdirSync(pub, { recursive: true })
  writeFileSync(join(pub, 'nimbledeck.json'), JSON.stringify({ demos: cfg.demos, streams: cfg.streams, runner }, null, 2))

  const origins = [`http://localhost:${cfg.port}`, `http://127.0.0.1:${cfg.port}`].flatMap((o) => ['--origin', o])
  const req = existsSync(join(root, cfg.python.requirements)) ? ['--with-requirements', cfg.python.requirements] : []
  const uv = (name, args, opts) => launch(name, 'uv', ['run', '--python', cfg.python.version, ...req, ...args], opts)
  for (const [kind, entries] of [['demo', cfg.demos], ['stream', cfg.streams]]) {
    for (const [name, e] of Object.entries(entries)) {
      if (!(await free(e.port))) await fail(`port ${e.port} is already in use (${kind} ${name})`)
      uv(`${kind}-${name}`, kind === 'demo'
        ? ['marimo', 'run', e.file, '--host', '127.0.0.1', '--port', String(e.port), '--headless', '--no-token']
        : ['python', e.file, '--port', String(e.port), ...origins])
      log(`${kind} ${name} -> ${kind === 'demo' ? 'http' : 'ws'}://127.0.0.1:${e.port}`)
    }
  }
  if (runner) {
    if (!(await free(runner.port))) await fail(`port ${runner.port} is already in use (live-code runner)`)
    const script = join(dirname(fileURLToPath(import.meta.url)), '..', 'runner', 'runner.py')
    launch('runner', 'uv', ['run', '--python', cfg.python.version, '--with', 'websockets', ...req, 'python', script, '--port', String(runner.port), '--cache-dir', join(root, '.nimbledeck', 'cache', 'matplotlib'), ...origins],
      { env: { ...process.env, NIMBLEDECK_TOKEN: runner.token } })
    log(`runner -> ws://127.0.0.1:${runner.port} (live code)`)
  }
  if (!(await free(cfg.port))) await fail(`port ${cfg.port} is already in use (deck)`)
  // The deck keeps the terminal (Slidev's own prompt and shortcuts); its end ends everything.
  const slidev = launch('slidev', 'npx', ['slidev', deck, '--port', String(cfg.port), '--bind', '127.0.0.1', '--open', 'false'],
    { inherit: true, onExit: (code) => { stop().then(() => exit(code ?? 0)) } })
  return { children, stop, slidev }
}

export async function runDeck(deck, root = process.cwd()) {
  let run
  try { run = await startDeck(deck, root) } catch (e) { console.error(e.message); process.exit(1) }
  const quit = () => run.stop().then(() => process.exit(0))
  process.on('SIGINT', quit)
  process.on('SIGTERM', quit)
  process.on('exit', () => run.children.forEach((c) => killTree(c.child)))
}
