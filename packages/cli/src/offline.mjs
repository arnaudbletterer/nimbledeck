import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import net from 'node:net'
import tls from 'node:tls'
import { join } from 'node:path'

// `uv run` asks the package index before it starts, so with no network it can wait a minute or more (measured: 46 s
// against a connection that accepts and never answers, and 19 s even with UV_HTTP_TIMEOUT=3), then fail. Packages that
// are already in uv's cache need no network at all (`uv run --offline` starts in 0.2 s). So: use the cache when it has
// everything; otherwise ask whether the network answers, and if it does not, say what is missing instead of waiting.

// Does the network answer within `ms`? A TLS handshake with the Python package index must complete, or, behind a proxy, the
// proxy must reply to a CONNECT. Opening the socket alone is not enough: a dead link can accept and then stay silent.
export function reachable(env = process.env, ms = 1000) {
  const proxy = env.HTTPS_PROXY || env.https_proxy || env.HTTP_PROXY || env.http_proxy
  let via = null
  if (proxy) { try { const u = new URL(proxy); via = { host: u.hostname, port: Number(u.port) || 80 } } catch { /* ignore a malformed proxy */ } }
  return new Promise((done) => {
    const s = via ? net.connect(via) : tls.connect({ host: 'pypi.org', port: 443, servername: 'pypi.org' })
    const end = (ok) => { clearTimeout(t); s.destroy(); done(ok) }
    const t = setTimeout(() => end(false), ms)
    s.once('error', () => end(false))
    if (via) { s.once('connect', () => s.write('CONNECT pypi.org:443 HTTP/1.1\r\nHost: pypi.org:443\r\n\r\n')); s.once('data', () => end(true)) }
    else s.once('secureConnect', () => end(true))
  })
}

const truthy = (v) => v !== undefined && !/^(0|false|no|)$/i.test(String(v))

// Decide how every `uv run` of this deck starts. Returns { flags, env, skip, message }:
// flags/env are added to each uv command; skip is true when the packages are missing and there is no network (message says what).
// `deps` exist for tests.
export async function planUv(cfg, root, deps = {}) {
  const { run = spawnSync, probe = reachable, env: base = process.env } = deps
  const req = existsSync(join(root, cfg.python.requirements)) ? ['--with-requirements', cfg.python.requirements] : []
  const args = ['run', '--offline', '--python', cfg.python.version, '--with', 'websockets', ...req, 'python', '-c', 'pass']
  const r = run('uv', args, { cwd: root, encoding: 'utf8', timeout: 30000, env: base })
  if (r.status === 0) return { flags: ['--offline'], env: {}, skip: false }          // everything is cached: no network needed
  if (r.error) return { flags: [], env: {}, skip: false }                            // uv itself is missing: its own error says so
  if (truthy(base.UV_OFFLINE) || !(await probe(base))) {
    return {
      flags: ['--offline'], env: {}, skip: true,
      message: `no internet, and uv has not cached Python ${cfg.python.version} or the packages in ${cfg.python.requirements}. Demos, streams and live code will show as offline; the deck itself works.\n` +
        `  Connect once and run \`nimbledeck prepare <deck.md>\` to keep them for later.`,
    }
  }
  return { flags: [], env: { UV_HTTP_TIMEOUT: base.UV_HTTP_TIMEOUT || '10' }, skip: false }   // network answers: let uv fetch, with a short timeout
}

// Fill uv's cache for this deck (needs the network once): the packages of demos/requirements.txt, the runner's, and Python itself.
export function prepareDeck(cfg, root, run = spawnSync) {
  const req = existsSync(join(root, cfg.python.requirements)) ? ['--with-requirements', cfg.python.requirements] : []
  const r = run('uv', ['run', '--python', cfg.python.version, '--with', 'websockets', ...req, 'python', '-c', 'pass'], { cwd: root, stdio: 'inherit' })
  return r.status ?? 1
}
