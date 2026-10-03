import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

export const DEFAULTS = { python: { version: '3.12', requirements: 'demos/requirements.txt' }, demos: {}, streams: {}, runner: null, publicDir: 'public', limits: { maxTitle: 40, maxBullets: 7, maxChars: 900, maxSubtitle: 55 }, port: 3030 }

export function loadConfig(root) {
  const p = resolve(root, 'nimbledeck.config.json')
  const user = existsSync(p) ? JSON.parse(readFileSync(p, 'utf8')) : {}
  return { ...DEFAULTS, ...user, python: { ...DEFAULTS.python, ...user.python }, limits: { ...DEFAULTS.limits, ...user.limits } }
}
