import { existsSync, readFileSync } from 'node:fs'
import { isAbsolute, relative, resolve } from 'node:path'

export const DEFAULTS = { python: { version: '3.12', requirements: 'demos/requirements.txt' }, demos: {}, streams: {}, runner: null, recordings: {}, publicDir: 'public', limits: { maxTitle: 40, maxBullets: 7, maxChars: 900, maxSubtitle: 55 }, port: 3030,
  // Layouts whose slides need no '# title' and no text limits (cover-like slides).
  leadLayouts: ['cover', 'divider', 'closing', 'full', 'hero', 'statement', 'split', 'stage', 'end', 'section', 'intro', 'none'],
  // CSS selectors for `nimbledeck verify`: `chrome` is the slide furniture (footer, page number) that is exempt from the
  // placement checks, `bleed` is media that is meant to reach the slide edge. A theme with its own classes lists them here.
  verify: { chrome: ['.nd-foot', '.nd-page', '.nd-caption', '.nd-pill', 'footer'], bleed: ['.nd-photo', '.nd-media', '.nd-bg', '.nd-split-r'] } }

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
  errors.push(...validateRecordings(cfg.recordings, cfg))
  return errors
}

// `recordings` scripts what `nimbledeck record` does on a slide (docs/RECORDING.md):
//   { "stream-nbody": { "seconds": 10, "steps": [ { "wait": 800 }, { "set": "gravity", "value": 2 } ] } }
// `isolate: true` hides the rest of the slide, so the clip holds only the component (a stream with a paragraph or equations laid over it).
// `realtime: true` films this clip as it plays on the screen, without driving time (docs/RECORDING.md, "Lockstep").
// A step has one action: wait (ms), type (text typed into a LiveCode editor, with "replace": true to clear it first),
// key (a key press), set (a slider, found by its label, with a "value"), click (a button, found by its text).
const ACTIONS = ['wait', 'type', 'key', 'set', 'click']
const STEP_KEYS = { wait: ['wait'], type: ['type', 'replace'], key: ['key'], set: ['set', 'value'], click: ['click'] }
export const MAX_SECONDS = 60
export function validateRecordings(rec, cfg) {
  const errors = []
  if (rec === undefined || rec === null) return errors
  if (typeof rec !== 'object' || Array.isArray(rec)) return ['recordings: must be an object keyed by recording name, like "stream-nbody"']
  for (const [id, r] of Object.entries(rec)) {
    const at = `recordings.${id}`
    const m = id.match(/^(live|stream|demo)-([\w.-]+)$/)
    if (!m) { errors.push(`${at}: the name must be live-<id>, stream-<name> or demo-<name>`); continue }
    if (m[1] !== 'live' && !(cfg[`${m[1]}s`] ?? {})[m[2]]) errors.push(`${at}: no ${m[1]} called "${m[2]}" in ${m[1]}s`)
    if (!r || typeof r !== 'object' || Array.isArray(r)) { errors.push(`${at}: must be an object with "seconds" and "steps"`); continue }
    for (const k of Object.keys(r)) if (!['seconds', 'steps', 'isolate', 'realtime'].includes(k)) errors.push(`${at}.${k}: unknown key (use "seconds", "steps", "isolate" and "realtime")`)
    for (const k of ['isolate', 'realtime']) if (r[k] !== undefined && typeof r[k] !== 'boolean') errors.push(`${at}.${k}: must be true or false`)
    if (r.seconds !== undefined && !(typeof r.seconds === 'number' && r.seconds >= 1 && r.seconds <= MAX_SECONDS)) errors.push(`${at}.seconds: ${JSON.stringify(r.seconds)} must be a number from 1 to ${MAX_SECONDS}`)
    if (r.steps === undefined) continue
    if (!Array.isArray(r.steps) || r.steps.length > 200) { errors.push(`${at}.steps: must be a list of at most 200 steps`); continue }
    r.steps.forEach((s, i) => {
      const sa = `${at}.steps[${i}]`
      if (!s || typeof s !== 'object' || Array.isArray(s)) { errors.push(`${sa}: must be an object like { "wait": 800 }`); return }
      const acts = ACTIONS.filter((a) => a in s)
      if (acts.length !== 1) { errors.push(`${sa}: needs exactly one of ${ACTIONS.join(', ')} (found ${acts.length ? acts.join(' and ') : 'none'})`); return }
      const a = acts[0]
      for (const k of Object.keys(s)) if (!STEP_KEYS[a].includes(k)) errors.push(`${sa}.${k}: not used by "${a}"`)
      if (a === 'wait' && !(typeof s.wait === 'number' && s.wait >= 0 && s.wait <= 30000)) errors.push(`${sa}.wait: must be a number of milliseconds from 0 to 30000`)
      if (a === 'type') {
        if (typeof s.type !== 'string' || !s.type || s.type.length > 5000) errors.push(`${sa}.type: must be a non-empty text of at most 5000 characters`)
        if (m[1] !== 'live') errors.push(`${sa}.type: only a live-<id> recording has an editor to type into`)
        if (s.replace !== undefined && typeof s.replace !== 'boolean') errors.push(`${sa}.replace: must be true or false`)
      }
      if (a === 'key' && !(typeof s.key === 'string' && /^[A-Za-z0-9]+(\+[A-Za-z0-9]+)*$/.test(s.key))) errors.push(`${sa}.key: ${JSON.stringify(s.key)} must look like "Enter" or "ControlOrMeta+Enter"`)
      if (a === 'set') {
        if (typeof s.set !== 'string' || !s.set.trim()) errors.push(`${sa}.set: must be the label text of a slider`)
        if (typeof s.value !== 'number' || !Number.isFinite(s.value)) errors.push(`${sa}.value: a number is needed for "set"`)
      }
      if (a === 'click' && (typeof s.click !== 'string' || !s.click.trim())) errors.push(`${sa}.click: must be the text of a button`)
    })
  }
  return errors
}
