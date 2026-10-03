import { spawn, spawnSync } from 'node:child_process'
import { randomBytes } from 'node:crypto'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import net from 'node:net'
import { join } from 'node:path'
import { loadConfig } from './config.mjs'

const isWin = process.platform === 'win32'

const portFree = (port) => new Promise((ok) => {
  const s = net.createServer()
  s.once('error', () => ok(false))
  s.once('listening', () => s.close(() => ok(true)))
  s.listen(port, '127.0.0.1')
})

function killTree(child) {
  if (!child.pid) return
  if (isWin) spawnSync('taskkill', ['/pid', String(child.pid), '/T', '/F'])
  else child.kill('SIGTERM')
}

// Start every demo and stream from nimbledeck.config.json, then the deck. Everything binds to 127.0.0.1.
export async function runDeck(deck, root = process.cwd()) {
  const cfg = loadConfig(root)
  const children = []
  const cleanup = () => children.forEach(killTree)
  process.on('SIGINT', () => { cleanup(); process.exit(0) })
  process.on('SIGTERM', () => { cleanup(); process.exit(0) })
  process.on('exit', cleanup)

  // Live-code runner (optional): started only when the config has a `runner` entry. A random token, valid for this session
  // only, is shared with the page through public/nimbledeck.json; the runner also only accepts the deck's own origins.
  const runner = cfg.runner ? { port: cfg.runner.port, token: randomBytes(16).toString('hex') } : null

  // The browser components read ports from public/nimbledeck.json.
  const pub = join(root, cfg.publicDir)
  mkdirSync(pub, { recursive: true })
  writeFileSync(join(pub, 'nimbledeck.json'), JSON.stringify({ demos: cfg.demos, streams: cfg.streams, runner }, null, 2))

  const uv = (args, log) => spawn('uv', ['run', '--python', cfg.python.version, ...(existsSync(join(root, cfg.python.requirements)) ? ['--with-requirements', cfg.python.requirements] : []), ...args],
    { cwd: root, stdio: 'ignore', shell: isWin })
  for (const [kind, entries] of [['demo', cfg.demos], ['stream', cfg.streams]]) {
    for (const [name, e] of Object.entries(entries)) {
      if (!(await portFree(e.port))) { console.error(`port ${e.port} is already in use (${kind} ${name})`); cleanup(); process.exit(1) }
      const args = kind === 'demo'
        ? ['marimo', 'run', e.file, '--host', '127.0.0.1', '--port', String(e.port), '--headless', '--no-token']
        : ['python', e.file, '--port', String(e.port)]
      children.push(uv(args))
      console.log(`${kind} ${name} -> ${kind === 'demo' ? 'http' : 'ws'}://127.0.0.1:${e.port}`)
    }
  }
  if (runner) {
    if (!(await portFree(runner.port))) { console.error(`port ${runner.port} is already in use (live-code runner)`); cleanup(); process.exit(1) }
    const script = join(dirname(fileURLToPath(import.meta.url)), '..', 'runner', 'runner.py')
    const origins = [`http://localhost:${cfg.port}`, `http://127.0.0.1:${cfg.port}`].flatMap((o) => ['--origin', o])
    children.push(spawn('uv', ['run', '--python', cfg.python.version, '--with', 'websockets', ...(existsSync(join(root, cfg.python.requirements)) ? ['--with-requirements', cfg.python.requirements] : []),
      'python', script, '--port', String(runner.port), ...origins], { cwd: root, stdio: 'ignore', shell: isWin, env: { ...process.env, NIMBLEDECK_TOKEN: runner.token } }))
    console.log(`runner -> ws://127.0.0.1:${runner.port} (live code)`)
  }
  if (!(await portFree(cfg.port))) { console.error(`port ${cfg.port} is already in use (deck)`); cleanup(); process.exit(1) }
  const slidev = spawn('npx', ['slidev', deck, '--port', String(cfg.port), '--bind', '127.0.0.1', '--open', 'false'], { cwd: root, stdio: 'inherit', shell: isWin })
  children.push(slidev)
  slidev.on('exit', (code) => { cleanup(); process.exit(code ?? 0) })
}
