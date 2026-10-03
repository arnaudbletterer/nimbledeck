import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { existsSync } from 'node:fs'
import { loadConfig } from './config.mjs'
import { knownLayouts } from './layouts.mjs'
import { parseHeadmatter, splitSlides } from './slides.mjs'

const LEAD = new Set(['cover', 'divider', 'closing', 'end', 'section', 'intro', 'none'])

// Lint a deck. Returns { errors, warnings, slides }. Rules mirror docs/WRITING.md.
export function checkDeck(deckPath, root = dirname(deckPath)) {
  const text = readFileSync(deckPath, 'utf8')
  const cfg = loadConfig(root)
  const head = parseHeadmatter(text)
  const layouts = knownLayouts(root, head)
  const slides = splitSlides(text)
  const errors = [], warnings = []
  const name = deckPath.split(/[\\/]/).pop()

  slides.forEach((s, idx) => {
    const n = idx + 1, body = s.body, where = `${name}:${s.line} (slide ${n})`
    const layout = s.fm.layout || (n === 1 ? head.layout : undefined) || 'default'
    if (!layouts.has(layout)) errors.push(`${where}: unknown layout '${layout}'`)
    const h1 = body.match(/^# (.+)$/m)
    if (!LEAD.has(layout) && !h1) errors.push(`${where}: missing '# title'`)
    if (h1 && h1[1].length > cfg.limits.maxTitle) errors.push(`${where}: title ${h1[1].length} chars > ${cfg.limits.maxTitle}, would be cut off`)
    const bullets = (body.match(/^\s*[-*] /gm) || []).length
    if (bullets > cfg.limits.maxBullets) warnings.push(`${where}: ${bullets} bullets > ${cfg.limits.maxBullets}, split the slide`)
    for (const [re, msg] of [[/<style/, '<style> block'], [/style=/, 'inline style='], [/<div/, 'raw <div>']])
      if (re.test(body)) errors.push(`${where}: ${msg}, use a layout or component instead`)
    for (const m of body.matchAll(/(?:src=|\]\()"?(\/[^\s")]+\.(?:png|jpg|jpeg|gif|svg|mp4|webm))/g))
      if (!existsSync(join(root, cfg.publicDir, m[1].replace(/^\//, '')))) errors.push(`${where}: missing asset ${m[1]}`)
    for (const [tag, key] of [['Demo', 'demos'], ['PyStream', 'streams']])
      for (const m of body.matchAll(new RegExp(`<${tag}\\s+name="([^"]+)"`, 'g'))) {
        const entry = cfg[key][m[1]]
        if (!entry) errors.push(`${where}: ${tag.toLowerCase()} '${m[1]}' not in nimbledeck.config.json (${key})`)
        else if (!existsSync(join(root, entry.file))) errors.push(`${where}: ${entry.file} missing`)
      }
  })
  return { errors, warnings, slides: slides.length }
}
