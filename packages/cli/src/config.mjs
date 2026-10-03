import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

export const DEFAULTS = { python: { version: '3.12', requirements: 'demos/requirements.txt' }, demos: {}, streams: {}, runner: null, publicDir: 'public', limits: { maxTitle: 40, maxBullets: 7, maxChars: 900, maxSubtitle: 55 }, port: 3030 }

// NIMBLEDECK_PORT_OFFSET shifts every port (deck, demos, streams, runner) so several decks, or several agents on one machine,
// can run side by side without clashing. The browser components read the shifted ports from public/nimbledeck.json.
const shift = (entries, off) => Object.fromEntries(Object.entries(entries || {}).map(([k, v]) => [k, { ...v, port: v.port + off }]))

export function loadConfig(root) {
  const p = resolve(root, 'nimbledeck.config.json')
  const user = existsSync(p) ? JSON.parse(readFileSync(p, 'utf8')) : {}
  const cfg = { ...DEFAULTS, ...user, python: { ...DEFAULTS.python, ...user.python }, limits: { ...DEFAULTS.limits, ...user.limits } }
  const off = Number(process.env.NIMBLEDECK_PORT_OFFSET || 0)
  if (!off) return cfg
  return { ...cfg, port: cfg.port + off, demos: shift(cfg.demos, off), streams: shift(cfg.streams, off), runner: cfg.runner ? { ...cfg.runner, port: cfg.runner.port + off } : cfg.runner }
}
