// Alignment audit: does content jump when the look changes?
//   node align-audit.mjs [baseUrl] [--check] [--looks a,b] [--tolerance 2] [--all]
// Serves align.md (one slide per layout, a title, a paragraph, a list, a callout, a table, a footer) unless a base URL is given,
// then, for EVERY look of packages/theme/looks.json and every layout, measures the boxes of the title, its rule, the first body
// block, a list item, a callout, a table, the footer and the page number, and prints each deviation from the `plain` look
// beyond the tolerance as a table: look, layout, element, dx, dy, dwidth (pixels).
// Text is compared by its box (left edge and line box), never by glyph ink or text width, since fonts differ in metrics.
// Lead layouts (cover, divider, closing, statement centred; hero left) keep their own composition: only their alignment axis is
// compared. With --check the exit code is 1 when a deviation is not listed in EXCEPTIONS below (and in docs/THEMING.md).
// Not part of `npm test`: it needs a browser and a dev server.
import { spawn } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright-chromium'
import { findChrome } from '../../packages/cli/src/chrome.mjs'
import { killTree } from '../../packages/cli/src/run.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const args = process.argv.slice(2)
const opt = (name) => { const i = args.indexOf(`--${name}`); return i < 0 ? undefined : args[i + 1] }
const flag = (name) => args.includes(`--${name}`)
const given = args.find((a, i) => /^https?:/.test(a) && !args[i - 1]?.startsWith('--'))
const tolerance = Number(opt('tolerance') ?? 2)
const registry = JSON.parse(readFileSync(join(here, '../../packages/theme/looks.json'), 'utf8'))
const wanted = opt('looks')?.split(',')
const looks = wanted ? registry.filter((l) => wanted.includes(l.id)) : registry

// Deviations that are a look's character, on purpose (documented in docs/THEMING.md): `look/layout/element` with `*` as a wildcard.
// `swiss` and `slate-pro` set their lead titles flush left, a grid look and a corporate one; `high-contrast` sets its text larger, so
// what follows its first line of body text starts lower.
const EXCEPTIONS = [
  'swiss/cover/title', 'swiss/divider/title', 'swiss/closing/title', 'swiss/statement/title',
  'slate-pro/cover/title', 'slate-pro/divider/title', 'slate-pro/closing/title',
  'high-contrast/*/item', 'high-contrast/*/quote',
]

// What to measure, per layout: [name, selector, mode, after]. Text is compared by its box, never by glyph ink or width (fonts differ):
//   text   left and top of the content box (a line box, so font size and glyph metrics do not count)
//   block  the same plus the content width, for a block as wide as its column
//   fit    left and top of the border box, for a box sized by its content (callout, table)
//   box    left, top and width of the border box (cards)
//   rule   left, bottom edge and width of the title bar, where its rule sits
//   centre centre of the border box (centred lead titles)
//   foot   left edge and bottom edge        page   right edge and bottom edge
// `after` names an element earlier in the same flow: a later element is judged by the step from it, since an element that
// follows a block moves with that block, and only a changed step is a change of rhythm.
const CASES = [
  { n: 1, layout: 'cover', lead: true, els: [['title', 'h1', 'centre']] },
  { n: 2, layout: 'agenda', els: [['title', 'h1', 'text'], ['rule', 'h1', 'rule'], ['body', 'ol', 'block'], ['item', 'ol li', 'text', 'body'], ['foot', '.nd-foot', 'foot'], ['page', '.nd-page', 'page']] },
  { n: 3, layout: 'divider', lead: true, els: [['title', 'h1', 'centre']] },
  { n: 4, layout: 'default', els: [['title', 'h1', 'text'], ['rule', 'h1', 'rule'], ['body', '.nd-body > p', 'block'], ['item', 'ul li', 'text', 'body'], ['quote', 'blockquote', 'fit', 'item'], ['foot', '.nd-foot', 'foot'], ['page', '.nd-page', 'page']] },
  { n: 5, layout: 'default+h4', els: [['title', 'h1', 'text'], ['rule', 'h1', 'rule'], ['subtitle', 'h4', 'text'], ['body', '.nd-body > p', 'block', 'subtitle'], ['item', 'ul li', 'text', 'body']] },
  { n: 6, layout: 'two-cols', els: [['title', 'h1', 'text'], ['rule', 'h1', 'rule'], ['body', '.nd-col-l p', 'block'], ['item', '.nd-col-l li', 'text', 'body'], ['quote', 'blockquote', 'fit', 'item'], ['body-r', '.nd-col-r p', 'block'], ['foot', '.nd-foot', 'foot'], ['page', '.nd-page', 'page']] },
  { n: 7, layout: 'photo-right', els: [['title', 'h1', 'text'], ['rule', 'h1', 'rule'], ['body', '.nd-col-l p', 'block'], ['item', '.nd-col-l li', 'text', 'body'], ['quote', 'blockquote', 'fit', 'item'], ['foot', '.nd-foot', 'foot'], ['page', '.nd-page', 'page']] },
  { n: 9, layout: 'hero', lead: true, els: [['title', 'h1', 'text']] },
  { n: 10, layout: 'statement', lead: true, els: [['title', 'h1', 'centre']] },
  { n: 11, layout: 'split', els: [['title', 'h1', 'text'], ['subtitle', 'h4', 'text'], ['body', '.nd-split-l p', 'block', 'subtitle'], ['item', '.nd-split-l li', 'text', 'body']] },
  { n: 12, layout: 'stage', els: [['foot', '.nd-caption', 'foot'], ['page', '.nd-pill', 'page']] },
  { n: 13, layout: 'numbers', els: [['title', 'h1', 'text'], ['rule', 'h1', 'rule'], ['body', '.nd-num', 'box'], ['foot', '.nd-foot', 'foot'], ['page', '.nd-page', 'page']] },
  { n: 14, layout: 'closing', lead: true, els: [['title', 'h1', 'centre']] },
  { n: 15, layout: 'default+table', els: [['title', 'h1', 'text'], ['table', 'table', 'fit']] },
  // `full` (n = 8) has no chrome: its slot is the whole slide, so there is nothing to align.
]

// Runs in the page: the measure of one element as {x, y, w}, or null when it is absent.
function measure({ n, sel, mode }) {
  const root = document.querySelector(`[data-slidev-no="${n}"] .slidev-layout`)
  const el = root?.querySelector(sel)
  if (!el) return null
  const r = el.getBoundingClientRect(), cs = getComputedStyle(el)
  const px = (k) => parseFloat(cs[k]) || 0
  const cx = r.left + px('borderLeftWidth') + px('paddingLeft'), cy = r.top + px('borderTopWidth') + px('paddingTop')
  if (mode === 'block') return { x: cx, y: cy, w: r.width - px('borderLeftWidth') - px('borderRightWidth') - px('paddingLeft') - px('paddingRight') }
  if (mode === 'text') return { x: cx, y: cy, w: 0 }
  if (mode === 'fit') return { x: r.left, y: r.top, w: 0 }
  if (mode === 'box') return { x: r.left, y: r.top, w: r.width }
  if (mode === 'rule') return { x: r.left, y: r.bottom, w: r.width }
  if (mode === 'centre') return { x: (r.left + r.right) / 2, y: 0, w: 0 }
  if (mode === 'foot') return { x: r.left, y: r.bottom, w: 0 }
  return { x: r.right, y: r.bottom, w: 0 }
}

async function start() {
  if (given) return { origin: given.replace(/\/$/, ''), stop() {} }
  const env = { ...process.env, NIMBLEDECK_PORT_OFFSET: process.env.NIMBLEDECK_PORT_OFFSET ?? '900' }
  const origin = `http://localhost:${3030 + Number(env.NIMBLEDECK_PORT_OFFSET)}`
  const child = spawn(process.execPath, [join(here, '../../packages/cli/bin/nimbledeck.mjs'), 'run', 'align.md'], { cwd: here, env, detached: process.platform !== 'win32', stdio: 'ignore' })
  for (let i = 0; i < 120; i++) {
    if (await fetch(`${origin}/1`).then((r) => r.ok, () => false)) return { origin, stop: () => killTree(child) }
    await new Promise((r) => setTimeout(r, 1000))
  }
  killTree(child)
  throw new Error('the sample deck did not start')
}

const server = await start()
const chrome = findChrome()
const browser = await chromium.launch(chrome ? { executablePath: chrome } : {})
const results = {}   // look -> layout -> element -> {x, y, w}
try {
  for (const look of ['plain', ...looks.map((l) => l.id).filter((id) => id !== 'plain')]) {
    const dark = registry.find((l) => l.id === look).dark
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 })
    const page = await ctx.newPage()
    results[look] = {}
    for (const c of CASES) {
      await page.goto(`${server.origin}/${c.n}?clicks=99`, { waitUntil: 'networkidle' })
      await page.addStyleTag({ content: '*, *::before, *::after { animation: none !important; transition: none !important; }' })
      await page.evaluate(({ id, dark }) => { const r = document.documentElement; r.dataset.ndVariant = id; r.classList.toggle('dark', dark) }, { id: look, dark })
      await page.waitForSelector(`[data-slidev-no="${c.n}"] .slidev-layout`)
      await page.waitForTimeout(250)
      const row = results[look][c.layout] = {}
      for (const [name, sel, mode] of c.els) row[name] = await page.evaluate(measure, { n: c.n, sel, mode })
    }
    await ctx.close()
  }
} finally {
  await browser.close()
  server.stop()
}

const round = (v) => Math.round(v * 10) / 10
const excepted = (look, layout, el) => EXCEPTIONS.some((e) => [look, layout, el].every((v, i) => { const p = e.split('/')[i]; return p === '*' || p === v }))
const rows = []
for (const look of Object.keys(results)) {
  if (look === 'plain') continue
  for (const c of CASES) for (const [el, , , after] of c.els) {
    const a = results.plain[c.layout][el], b = results[look][c.layout][el]
    if (!a || !b) { rows.push({ look, layout: c.layout, el, missing: true }); continue }
    let dy = b.y - a.y
    if (after) { const pa = results.plain[c.layout][after], pb = results[look][c.layout][after]; if (pa && pb) dy -= pb.y - pa.y }
    const dx = round(b.x - a.x), dw = round(b.w - a.w)
    dy = round(dy)
    // A lead layout keeps its own composition: only its alignment axis counts.
    const bad = c.lead ? Math.abs(dx) > tolerance : [dx, dy, dw].some((d) => Math.abs(d) > tolerance)
    if (bad) rows.push({ look, layout: c.layout, el, dx, dy, dw, allowed: excepted(look, c.layout, el) })
  }
}
const pad = (s, n) => String(s).padEnd(n)
console.log(`${pad('look', 15)}${pad('layout', 13)}${pad('element', 10)}${pad('dx', 8)}${pad('dy', 8)}dwidth`)
for (const r of rows) console.log(`${pad(r.look, 15)}${pad(r.layout, 13)}${pad(r.el, 10)}${r.missing ? 'not found' : `${pad(r.dx, 8)}${pad(r.dy, 8)}${r.dw}${r.allowed ? '   (documented exception)' : ''}`}`)
console.log('\ndeviations per look (beyond ' + tolerance + ' px, documented exceptions not counted):')
for (const look of Object.keys(results)) if (look !== 'plain') {
  const mine = rows.filter((r) => r.look === look)
  console.log(`  ${pad(look, 15)}${mine.filter((r) => !r.allowed).length}${mine.some((r) => r.allowed) ? ` (+${mine.filter((r) => r.allowed).length} documented)` : ''}`)
}
const failing = rows.filter((r) => !r.allowed)
console.log(failing.length ? `\n${failing.length} deviation(s)` : '\nevery look keeps the grid of plain')
if (flag('check')) process.exitCode = failing.length ? 1 : 0
