import { isRecorded, readManifest, slideComponents } from './recordings.mjs'
import { normalize, splitSlides } from './slides.mjs'
import { join } from 'node:path'

// Slides that need `nimbledeck run` (a Python process or the local runner): a static host cannot serve them.
export const NEEDS_RUN = /<(PyStream|Demo|LiveCode)\b/

// The web edition of a deck: slides that need `nimbledeck run` get `disabled: true` (Slidev skips them) and the router uses
// hash routes, because a static host has no fallback to index.html for /3. The first slide is never disabled: it carries
// the headmatter. Returns the new markdown (LF line endings), the 1-based numbers of the slides left out, and how many slides
// play a recording. With `pub` (the deck's public folder), a slide whose live components all have a recording in
// public/recordings stays, and its <LiveCode> gets the id (its slide number) that names the recording.
export function webEdition(src, pub) {
  const lines = normalize(src).split('\n')
  const slides = splitSlides(lines.join('\n'))
  const skipped = []
  let played = 0
  const manifest = pub ? readManifest(join(pub, 'recordings')) : null
  const edits = new Map()   // 0-based line index -> replacement text, or null to drop the line
  slides.forEach((s, i) => {
    const comps = pub ? slideComponents(s.body, i + 1) : []
    if (pub && comps.length && (i === 0 || comps.every((c) => isRecorded(pub, c, manifest)))) {
      played++
      const end = i + 1 < slides.length ? slides[i + 1].line - 1 : lines.length
      for (let l = s.line - 1; l < end; l++) lines[l] = lines[l].replace(/<LiveCode\b(?![^>]*\sid=)/g, `<LiveCode id="${i + 1}"`)
      return
    }
    if (i === 0 || !(pub ? comps.length : NEEDS_RUN.test(s.body))) return
    skipped.push(i + 1)
    // With frontmatter the key goes right under the opening `---`; a bare `---` separator becomes a frontmatter block.
    edits.set(s.line - 1, s.fmEnd ? `${lines[s.line - 1]}\ndisabled: true` : '---\ndisabled: true\n---')
  })

  const first = slides[0]
  const headmatter = first?.fmEnd > 0 && first.line === 1 && lines[0].trim() === '---'
  if (headmatter) {
    for (let k = 1; k < first.fmEnd - 1; k++) if (/^routerMode:/.test(lines[k])) edits.set(k, null)   // ours replaces it
    edits.set(0, '---\nrouterMode: hash')
  }
  const body = lines.flatMap((l, k) => (edits.has(k) ? edits.get(k) ?? [] : l)).join('\n')
  return { markdown: headmatter ? body : `---\nrouterMode: hash\n---\n${body}`, skipped, played }
}
