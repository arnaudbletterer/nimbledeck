import { existsSync, readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

// The motion and background presets a deck may name (docs/MOTION.md). The registry is `presets.json` in the deck's theme
// package; a theme without one uses the base theme's, since the presets come from the addon every theme lists.
// Returns null when no registry can be found, so the checker then says nothing about presets rather than guess.
export function loadPresets(root, theme) {
  const req = createRequire(join(root, 'noop.js'))
  const tries = []
  if (theme && theme !== 'none') for (const name of theme.startsWith('slidev-theme-') ? [theme] : [`slidev-theme-${theme}`, theme]) tries.push(`${name}/presets.json`)
  tries.push('slidev-theme-nimbledeck/presets.json')
  for (const t of tries) { try { return JSON.parse(readFileSync(req.resolve(t), 'utf8')) } catch { /* next */ } }
  const here = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'theme', 'presets.json')
  return existsSync(here) ? JSON.parse(readFileSync(here, 'utf8')) : null
}

// The looks of the base theme, for `ndVariant`.
export const BASE_LOOKS = ['plain', 'paper', 'night', 'studio', 'studio-light']

// A frontmatter value as the author meant it: without quotes and without a trailing comment.
export const bare = (v) => String(v ?? '').replace(/\s+#.*$/, '').trim().replace(/^(['"])(.*)\1$/, '$2').trim()

function distance(a, b) {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)])
  for (let j = 1; j <= b.length; j++) d[0][j] = j
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++)
    d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1))
  return d[a.length][b.length]
}

// The closest valid id, if one is close enough to be a typo.
export function didYouMean(value, ids) {
  const v = value.toLowerCase()
  let best = null, bestD = Infinity
  for (const id of ids) {
    const d = id.startsWith(v) || v.startsWith(id) ? 1 : distance(v, id)
    if (d < bestD) { best = id; bestD = d }
  }
  return best && bestD <= Math.max(2, Math.floor(best.length / 3)) ? best : null
}

// Messages for one key: [] when the value is fine.
export function checkChoice(key, raw, ids, { allowNone = true } = {}) {
  const value = bare(raw)
  if (!value) return []
  const ok = new Set(allowNone ? [...ids, 'none'] : ids)
  if (ok.has(value)) return []
  const near = didYouMean(value, ids)
  return [`${key}: unknown '${value}'${near ? `. Did you mean '${near}'?` : ''} Valid: ${[...ok].join(', ')}`]
}
