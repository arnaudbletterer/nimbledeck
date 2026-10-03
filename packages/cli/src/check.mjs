import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { existsSync } from 'node:fs'
import { imageSize } from './imagesize.mjs'
import { loadConfig } from './config.mjs'
import { knownLayouts } from './layouts.mjs'
import { parseHeadmatter, splitSlides } from './slides.mjs'

const LEAD = new Set(['cover', 'divider', 'closing', 'closing-photo', 'full', 'end', 'section', 'intro', 'none'])

// Slide canvas is 1280 x 720. Content area of a normal slide: 1140 wide, about 500 tall.
const CONTENT = { w: 1140, h: 500 }, SLIDE = { w: 1280, h: 720 }
const num = (attrs, name) => { const m = attrs.match(new RegExp(`(?:^|\\s):?${name}="(-?\\d+(?:\\.\\d+)?)"`)); return m ? Number(m[1]) : undefined }

// Placement rules for <Stage> and <At>: everything must fit its box, and the box must fit the slide.
function checkStages(body, layout, where, errors) {
  for (const st of body.matchAll(/<Stage\b([^>]*)>([\s\S]*?)<\/Stage>/g)) {
    const full = /(^|\s):?full\b/.test(st[1])
    const w = full ? SLIDE.w : num(st[1], 'w') ?? 1140, h = full ? SLIDE.h : num(st[1], 'h') ?? 460
    const max = layout === 'full' ? SLIDE : CONTENT
    if (w > max.w || h > max.h) errors.push(`${where}: <Stage> ${w}x${h} does not fit the ${layout === 'full' ? 'slide' : 'content area'} (max ${max.w}x${max.h})`)
    for (const at of st[2].matchAll(/<At\b([^>]*)>/g)) {
      const x = num(at[1], 'x') ?? 0, y = num(at[1], 'y') ?? 0, aw = num(at[1], 'w'), ah = num(at[1], 'h')
      if (x < 0 || y < 0 || x + (aw ?? 0) > w || y + (ah ?? 0) > h) errors.push(`${where}: <At> at (${x},${y}) size ${aw ?? '?'}x${ah ?? '?'} falls outside its ${w}x${h} <Stage>`)
    }
  }
}

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
    const sub = body.match(/^#### (.+)$/m)
    if (!LEAD.has(layout) && sub && sub[1].length > cfg.limits.maxSubtitle) warnings.push(`${where}: subtitle ${sub[1].length} chars > ${cfg.limits.maxSubtitle}, would be cut off`)
    const bullets = (body.match(/^\s*[-*] /gm) || []).length
    if (bullets > cfg.limits.maxBullets) warnings.push(`${where}: ${bullets} bullets > ${cfg.limits.maxBullets}, split the slide`)
    checkStages(body, layout, where, errors)
    if (/<LiveCode\b/.test(body) && !cfg.runner) errors.push(`${where}: <LiveCode> needs a "runner" entry in nimbledeck.config.json`)
    // An interactive quiz needs its answer to be one of its choices.
    for (const q of body.matchAll(/<Quiz\b([^>]*)>([\s\S]*?)<\/Quiz>/g)) {
      const ans = q[1].match(/\banswer="([^"]+)"/)?.[1]
      if (ans && !new RegExp(`<Choice\\b[^>]*\\bletter="${ans}"`).test(q[2])) errors.push(`${where}: <Quiz answer="${ans}"> has no <Choice letter="${ans}">`)
    }
    // Images must hold enough pixels for the box they fill, or they look soft on high-resolution screens.
    for (const m of body.matchAll(/(?:<At\b([^>]*)>\s*)?<Photo\b([^>]*?)\bsrc="(\/[^"]+)"/g)) {
      const file = join(root, cfg.publicDir, m[3].replace(/^\//, ''))
      const box = (m[1] && num(m[1], 'w')) || (layout === 'full' && !m[1] ? 1280 : 1140)
      const sz = existsSync(file) ? imageSize(file) : null
      if (sz && sz.w < box * 1.5) warnings.push(`${where}: ${m[3]} is ${sz.w}px wide for a ${box}px box, it will look soft on high-resolution screens (use at least ${Math.round(box * 1.5)}px)`)
    }
    const prose = body.replace(/```[\s\S]*?```/g, '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ')
    if (!LEAD.has(layout) && prose.length > cfg.limits.maxChars) warnings.push(`${where}: ${prose.length} characters > ${cfg.limits.maxChars}, the text may not fit`)
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
