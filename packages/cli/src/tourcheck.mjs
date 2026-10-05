import { existsSync } from 'node:fs'
import { join } from 'node:path'
// The vocabulary lives next to the browser engine that runs it, so the checker and the tour can never disagree.
import { parseScript, parseSounds, soundKind } from '../../addon/composables/tourScript.mjs'

// The frontmatter of a slide is read line by line (no YAML library): top-level `key: value`, and lists of one-line flow
// maps under a key, which is all that `tourScript` and `sounds` use:
//   tourScript:
//     - { at: 1.5, click: "B", caption: "Pick an answer" }
function scalar(v) {
  v = v.trim()
  if (/^-?\d+(\.\d+)?$/.test(v)) return Number(v)
  if (v === 'true' || v === 'false') return v === 'true'
  const q = v.match(/^(["'])([\s\S]*)\1$/)
  return q ? q[2] : v
}
function flowMap(text) {
  const t = text.trim()
  if (!/^\{[\s\S]*\}$/.test(t)) return undefined
  const parts = []
  let cur = '', quote = ''
  for (const ch of t.slice(1, -1)) {
    if (quote) { cur += ch; if (ch === quote) quote = '' } else if (ch === '"' || ch === "'") { quote = ch; cur += ch } else if (ch === ',') { parts.push(cur); cur = '' } else cur += ch
  }
  if (cur.trim()) parts.push(cur)
  const o = {}
  for (const p of parts) {
    const m = p.match(/^\s*([\w-]+)\s*:\s*([\s\S]*)$/)
    if (!m) return undefined
    o[m[1]] = scalar(m[2])
  }
  return o
}
export function frontmatterValues(lines = []) {
  const out = {}
  let key = null
  for (const l of lines) {
    const k = l.match(/^([\w-]+):\s*(.*)$/)
    if (k) { key = k[1]; out[key] = k[2].trim() === '' ? [] : scalar(k[2]); continue }
    const item = l.match(/^\s*-\s+([\s\S]*)$/)
    if (key && item && Array.isArray(out[key])) out[key].push(flowMap(item[1]) ?? item[1])
  }
  return out
}

// Check the tour and sound keys of one slide. Messages are pushed onto `errors` and `warnings`, already prefixed with `where`.
export function checkTourKeys(slide, { where, root, publicDir, errors, warnings }) {
  const v = frontmatterValues(slide.fmLines)
  if (!('tour' in v) && !('tourScript' in v) && !('sound' in v) && !('sounds' in v)) return
  const seconds = typeof v.tour === 'number' ? v.tour : undefined
  if ('tour' in v && (typeof v.tour !== 'number' || v.tour <= 0 || v.tour > 120)) errors.push(`${where}: tour must be a number of seconds above 0 and at most 120`)
  const script = parseScript(v.tourScript, { seconds })
  const sounds = parseSounds({ sound: v.sound, sounds: v.sounds }, { seconds })
  for (const m of [...script.errors, ...sounds.errors]) errors.push(`${where}: ${m}`)
  for (const m of [...script.warnings, ...sounds.warnings]) warnings.push(`${where}: ${m}`)
  for (const c of sounds.cues) checkFile(c.src, `${where}: sound`, root, publicDir, errors)
}

export function checkDeckSound(head, { root, publicDir, errors }) {
  for (const key of ['ndSound', 'ndSlideSound']) {
    if (head[key] === undefined) continue
    const src = scalar(String(head[key]))
    if (soundKind(src).kind === 'invalid') errors.push(`headmatter: ${key} '${src}' is neither a built-in sound nor a file of public/ such as /audio/theme.mp3`)
    else checkFile(src, `headmatter: ${key}`, root, publicDir, errors)
  }
}

function checkFile(src, label, root, publicDir, errors) {
  if (soundKind(src).kind === 'file' && !existsSync(join(root, publicDir, src.replace(/^\//, '')))) errors.push(`${label} file ${src} is not in ${publicDir}/`)
}
