import { existsSync, readFileSync } from 'node:fs'
import { isAbsolute, relative, resolve } from 'node:path'

export const DEFAULTS = { python: { version: '3.12', requirements: 'demos/requirements.txt' }, demos: {}, streams: {}, runner: null, publicDir: 'public', limits: { maxTitle: 40, maxBullets: 7, maxChars: 900, maxSubtitle: 55 }, port: 3030,
  // Layouts whose slides need no '# title' and no text limits (cover-like slides).
  leadLayouts: ['cover', 'divider', 'closing', 'full', 'end', 'section', 'intro', 'none'],
  // CSS selectors for `nimbledeck verify`: `chrome` is the slide furniture (footer, page number) that is exempt from the
  // placement checks, `bleed` is media that is meant to reach the slide edge. A theme with its own classes lists them here.
  verify: { chrome: ['.nd-foot', '.nd-page', 'footer'], bleed: ['.nd-photo', '.nd-media'] } }

// NIMBLEDECK_PORT_OFFSET shifts every port (deck, demos, streams, runner) so several decks, or several agents on one machine,
// can run side by side without clashing. The browser components read the shifted ports from public/nimbledeck.json.
const shift = (entries, off) => Object.fromEntries(Object.entries(entries || {}).map(([k, v]) => [k, { ...v, port: v.port + off }]))

export function loadConfig(root) {
  const p = resolve(root, 'nimbledeck.config.json')
  let user = {}
  if (existsSync(p)) {
    try { user = JSON.parse(readFileSync(p, 'utf8')) } catch (e) { throw new Error(`nimbledeck.config.json is not valid JSON (${e.message})`) }
  }
  const cfg = { ...DEFAULTS, ...user, python: { ...DEFAULTS.python, ...user.python }, limits: { ...DEFAULTS.limits, ...user.limits }, verify: { ...DEFAULTS.verify, ...user.verify } }
  const off = Number(process.env.NIMBLEDECK_PORT_OFFSET || 0)
  if (!off) return cfg
  return { ...cfg, port: cfg.port + off, demos: shift(cfg.demos, off), streams: shift(cfg.streams, off), runner: cfg.runner ? { ...cfg.runner, port: cfg.runner.port + off } : cfg.runner }
}

// Characters that a shell, or a command line, would treat as more than data. Spaces are fine (arguments are quoted or never
// go through a shell), but nothing that can end a command, substitute, redirect or inject an option is.
const UNSAFE = /[;&|`$<>"'\\%^!*?(){}[\]\r\n\0]/
const safe = (v) => typeof v === 'string' && v.length > 0 && !UNSAFE.test(v) && !v.startsWith('-')
const inside = (root, v) => { const r = relative(resolve(root), resolve(root, v)); return r !== '' && !r.startsWith('..') && !isAbsolute(r) }
const port = (v) => Number.isInteger(v) && v > 0 && v <= 65535

// Everything `nimbledeck run` passes to a command or a path must be well-formed and stay inside the project folder.
// Returns a list of readable problems (empty when the config is fine).
export function validateConfig(cfg, root) {
  const errors = []
  const path = (what, v) => {
    if (!safe(v)) errors.push(`${what}: ${JSON.stringify(v)} is empty or contains shell characters (; & | $ \` " ' < > ( ) { } * ? ! % ^) or starts with '-'`)
    else if (!inside(root, v)) errors.push(`${what}: ${JSON.stringify(v)} must stay inside the project folder`)
  }
  if (typeof cfg.python.version !== 'string' || !/^\d+(\.\d+){0,2}$/.test(cfg.python.version)) errors.push(`python.version: ${JSON.stringify(cfg.python.version)} must look like "3.12"`)
  path('python.requirements', cfg.python.requirements)
  path('publicDir', cfg.publicDir)
  if (!port(cfg.port)) errors.push(`port: ${JSON.stringify(cfg.port)} must be a port number`)
  for (const [kind, entries] of [['demos', cfg.demos], ['streams', cfg.streams]]) {
    for (const [name, e] of Object.entries(entries)) {
      if (!/^[\w.-]+$/.test(name)) errors.push(`${kind}.${name}: the name may only contain letters, digits, '_', '.' and '-'`)
      path(`${kind}.${name}.file`, e?.file)
      if (!port(e?.port)) errors.push(`${kind}.${name}.port: ${JSON.stringify(e?.port)} must be a port number`)
    }
  }
  const list = (what, v) => { if (!Array.isArray(v) || !v.length || v.some((x) => typeof x !== 'string' || !x.trim())) errors.push(`${what}: must be a non-empty list of strings`) }
  list('leadLayouts', cfg.leadLayouts)
  list('verify.chrome', cfg.verify.chrome)
  list('verify.bleed', cfg.verify.bleed)
  if (cfg.runner) {
    if (!port(cfg.runner.port)) errors.push(`runner.port: ${JSON.stringify(cfg.runner.port)} must be a port number`)
  }
  return errors
}
