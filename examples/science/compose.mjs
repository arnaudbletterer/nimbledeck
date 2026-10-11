// Builds science.md, the one Markdown file of the talk, from the files in chapters/: open.md, one file per chapter, close.md.
// The chapters stay the place to edit; science.md is generated and committed, because the CLI, the web edition and the
// recorder all read one flat file (Slidev's `src:` import would hide the slides from them).
//
//   node compose.mjs                   write science.md
//   node compose.mjs --check           exit 1 when science.md is not what the chapters give (CI)
//   node compose.mjs --only risk,gw    write science-risk-gw.md (not committed): only those chapters, to work on one
//                                      of them with `nimbledeck run science-risk-gw.md`; same config, demos and recordings
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { splitSlides } from '../../packages/cli/src/slides.mjs'

const dir = dirname(fileURLToPath(import.meta.url))

// The talk, in order.
export const CHAPTERS = ['risk', 'ai', 'evolution', 'climate', 'gw']

// A chapter file starts with a header of its own, so that it is a deck on its own: the deck keys belong to open.md.
const DECK_KEYS = /^(theme|ndVariant|ndMotion|title|transition):/

function slidesOf(file) {
  return splitSlides(readFileSync(resolve(dir, 'chapters', file), 'utf8'))
}

function emit(slide, { keepDeck }) {
  const fm = (slide.fmLines ?? []).filter((l) => keepDeck || !DECK_KEYS.test(l))
  const body = slide.body.replace(/\s+$/, '')
  return `${fm.length ? `---\n${fm.join('\n')}\n---` : '---'}\n${body}\n`
}

export function compose(only) {
  const open = slidesOf('open.md')
  const out = []
  if (!only) open.forEach((s) => out.push(emit(s, { keepDeck: true })))
  for (const id of CHAPTERS) {
    if (only && !only.includes(id)) continue
    slidesOf(`${id}.md`).forEach((s) => {
      let slide = s
      if (only && out.length === 0) slide = { ...s, fmLines: [...open[0].fmLines.filter((l) => DECK_KEYS.test(l)), ...(s.fmLines ?? [])] }
      out.push(emit(slide, { keepDeck: only && out.length === 0 }))
    })
  }
  if (!only) slidesOf('close.md').forEach((s) => out.push(emit(s, { keepDeck: false })))
  return out.join('\n')
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2)
  const onlyArg = args.includes('--only') ? args[args.indexOf('--only') + 1] : null
  const only = onlyArg ? onlyArg.split(',') : null
  if (only) for (const id of only) if (!CHAPTERS.includes(id)) { console.error(`unknown chapter ${id}`); process.exit(1) }
  const text = compose(only)
  if (args.includes('--check')) {
    let have = ''
    try { have = readFileSync(resolve(dir, 'science.md'), 'utf8') } catch { /* missing */ }
    if (have !== text) { console.error('science.md is out of date: run node compose.mjs'); process.exit(1) }
    console.log('science.md is up to date')
  } else {
    const name = only ? `science-${only.join('-')}.md` : 'science.md'
    writeFileSync(resolve(dir, name), text)
    console.log(`wrote ${name}: ${splitSlides(text).length} slides`)
  }
}
