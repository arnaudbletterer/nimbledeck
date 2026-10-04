import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { normalize, splitSlides } from './slides.mjs'

// Recordings of live components (see docs/RECORDING.md): which components a slide holds, what they are called on disk,
// the manifest public/recordings/index.json, and the web edition rule "a slide that needs `nimbledeck run` stays when
// every live component on it has a recording".

export const KINDS = { PyStream: 'stream', Demo: 'demo', LiveCode: 'live' }
export const MANIFEST = 'index.json'
export const EXTENSIONS = ['webm', 'mp4']

const COMPONENT = /<(PyStream|Demo|LiveCode)\b((?:[^>"']|"[^"]*"|'[^']*')*)>/g
const attr = (attrs, name) => attrs.match(new RegExp(`(?:^|\\s)${name}=(?:"([^"]*)"|'([^']*)')`))?.slice(1).find((v) => v !== undefined)

// The live components of one slide (n is its 1-based number): [{ kind, id, recording? }]. `id` is the file name stem:
// stream-<name>, demo-<name>, live-<id> (a LiveCode without id is called live-<slide number>). `recording` is the
// explicit path given by a `recording="..."` prop, when there is one. `id` is null when the name is not a plain string
// (`:name="x"`): such a component cannot be recorded by name. Fenced code is ignored.
export function slideComponents(body, n) {
  const text = body.replace(/^\s*(```|~~~)[\s\S]*?^\s*\1/gm, '')
  const found = []
  for (const m of text.matchAll(COMPONENT)) {
    const kind = KINDS[m[1]], attrs = m[2]
    const name = kind === 'live' ? (attr(attrs, 'id') ?? String(n)) : attr(attrs, 'name')
    found.push({ kind, id: name ? `${kind}-${name}` : null, ...(attr(attrs, 'recording') ? { recording: attr(attrs, 'recording') } : {}) })
  }
  return found
}

export const recordingsDir = (root, publicDir = 'public') => join(root, publicDir, 'recordings')

export function readManifest(dir) {
  try {
    const m = JSON.parse(readFileSync(join(dir, MANIFEST), 'utf8'))
    return Array.isArray(m?.recordings) ? m : { version: 1, recordings: [] }
  } catch { return { version: 1, recordings: [] } }
}

// Add or replace entries (by id), keep the others, sorted by id. Entry: { id, kind, seconds, width, height, files, poster }.
export function mergeManifest(manifest, entries) {
  const byId = new Map(manifest.recordings.map((r) => [r.id, r]))
  for (const e of entries) byId.set(e.id, e)
  return { version: 1, recordings: [...byId.values()].sort((a, b) => a.id.localeCompare(b.id)) }
}

export function writeManifest(dir, manifest) {
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, MANIFEST), `${JSON.stringify(manifest, null, 2)}\n`)
}

// Is there a playable recording for this component in the public folder? A `recording` prop names its own path (no
// extension, relative to the public folder); otherwise the manifest must list the id and one of its files must exist.
export function isRecorded(pub, comp, manifest = readManifest(join(pub, 'recordings'))) {
  const has = (stem) => EXTENSIONS.some((x) => existsSync(join(pub, `${stem}.${x}`)))
  if (comp.recording) return !comp.recording.includes('..') && has(comp.recording.replace(/^\/+/, '').replace(/[?#].*$/, ''))
  return comp.id !== null && manifest.recordings.some((r) => r.id === comp.id) && has(`recordings/${comp.id}`)
}

// Web edition: a static host runs no Python, so a slide with live components is left out, unless every one of them has a
// recording. Slidev skips a slide whose frontmatter says `disabled: true`. A kept LiveCode gets its id written in, because
// the slide numbers in a web copy with skipped slides must not change the name of its recording.
// Slides are numbered the way Slidev does (see slides.mjs). Returns { text, skipped, played } (played = slides kept because
// they have recordings).
export function disableUnrecorded(src, pub) {
  const manifest = readManifest(join(pub, 'recordings'))
  const lines = normalize(src).split('\n'), slides = splitSlides(src)
  let skipped = 0, played = 0
  slides.forEach((slide, i) => {
    const comps = slideComponents(slide.body, i + 1)
    if (!comps.length) return
    const open = slide.line - 1   // the `---` that opens the slide
    if (i > 0 && comps.some((c) => !isRecorded(pub, c, manifest))) {
      skipped++
      lines[open] = Object.keys(slide.fm).length ? '---\ndisabled: true' : '---\ndisabled: true\n---'
      return
    }
    played++
    const end = i + 1 < slides.length ? slides[i + 1].line - 1 : lines.length
    for (let l = open; l < end; l++) lines[l] = lines[l].replace(/<LiveCode\b(?![^>]*\sid=)/g, `<LiveCode id="${i + 1}"`)
  })
  return { text: lines.join('\n'), skipped, played }
}
