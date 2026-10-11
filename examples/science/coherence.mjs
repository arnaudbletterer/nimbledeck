// Audits the slide grammar of the science deck (examples/science/README.md): the same title, sentence, source line, footer and page
// number on every content slide, in the same place, with the same size and colour.
// It opens every slide in Chrome, measures the boxes and the computed styles of each role, and compares them with the first
// content slide. Any move beyond 2 px, or a different font size, weight or colour for the same role, is a deviation; the cover and the
// closing slide (the lead layouts) must carry no footer and no page number.
// Usage: node coherence.mjs [url]   (default http://localhost:3030; a static build: http://localhost:4173/base/#)
// Exports `audit(page, base, n)` for the science e2e.
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright-chromium'
import { findChrome } from '../../packages/cli/src/chrome.mjs'
import { splitSlides } from '../../packages/cli/src/slides.mjs'

const TOL = 2   // px
const dir = dirname(fileURLToPath(import.meta.url))

// What each role looks like on the open slide: box (x, y, right, bottom, w, h) and the style that has to match.
const measure = (n) => {
  const root = document.querySelector(`[data-slidev-no="${n}"] .slidev-layout`)
  if (!root) return null
  const R = root.getBoundingClientRect()
  const box = (el) => { const r = el.getBoundingClientRect(); return { x: r.left - R.left, y: r.top - R.top, right: r.right - R.left, bottom: r.bottom - R.top, w: r.width, h: r.height } }
  const text = (el) => { const g = document.createRange(); g.selectNodeContents(el); return box(g) }   // where the words themselves start
  const style = (el) => { const c = getComputedStyle(el); return { size: c.fontSize, weight: c.fontWeight, colour: c.color, family: c.fontFamily.split(',')[0], line: c.lineHeight } }
  const role = (el, own) => (el ? { box: own ? text(el) : box(el), style: style(el) } : null)
  const body = root.querySelector('.nd-body')
  const kids = body ? [...body.children] : []
  const h1 = body?.querySelector(':scope > h1')
  const sentence = kids.find((e) => e.tagName === 'P')
  const first = root.querySelector('.nd-stage > .nd-at, .nd-num')   // the first block of the picture, under the sentence
  const stage = root.querySelector('.nd-stage')
  const page = root.querySelector('.nd-page')
  return {
    layout: [...root.classList].find((c) => ['hero', 'closing', 'default', 'numbers', 'split', 'stage'].includes(c)),
    title: role(h1),
    titleText: h1 ? text(h1) : null,
    sentence: role(sentence, true),
    foot: role(root.querySelector('.nd-foot'), true),
    page: role(page, true),
    pageText: page?.textContent?.trim() ?? null,
    source: role(root.querySelector('.nd-caption'), true),
    first: first ? box(first) : null,
    stageTop: stage ? box(stage).y : null,
    pill: !!root.querySelector('.nd-pill'),
  }
}

// Compares one slide with the reference. Returns the lines to print.
export function compare(n, m, ref, total) {
  const bad = []
  const near = (what, a, b) => { if (a == null || b == null) return; if (Math.abs(a - b) > TOL) bad.push(`slide ${n}: ${what} is ${a.toFixed(1)}, the grammar says ${b.toFixed(1)}`) }
  const same = (what, a, b) => { if (a !== b) bad.push(`slide ${n}: ${what} is ${a}, the grammar says ${b}`) }
  const style = (name, a, b) => { for (const k of ['size', 'weight', 'colour', 'family', 'line']) same(`${name} ${k}`, a[k], b[k]) }
  for (const role of ['title', 'sentence', 'foot', 'page']) if (!m[role]) bad.push(`slide ${n}: no ${role}`)
  if (m.pill) bad.push(`slide ${n}: a page pill (another chrome)`)
  if (m.pageText !== `${n}/${total}`) bad.push(`slide ${n}: the page number reads "${m.pageText}"`)
  if (bad.length) return bad
  for (const role of ['title', 'foot', 'page']) { style(role, m[role].style, ref[role].style) }
  style('sentence', m.sentence.style, ref.sentence.style)
  near('title top', m.title.box.y, ref.title.box.y); near('title height', m.title.box.h, ref.title.box.h); near('title width', m.title.box.w, ref.title.box.w)
  near('title text left', m.titleText.x, ref.titleText.x)
  near('sentence left', m.sentence.box.x, ref.sentence.box.x); near('sentence top', m.sentence.box.y, ref.sentence.box.y)
  near('footer left', m.foot.box.x, ref.foot.box.x); near('footer top', m.foot.box.y, ref.foot.box.y)
  near('page right', m.page.box.right, ref.page.box.right); near('page top', m.page.box.y, ref.page.box.y)
  near('gutter: footer against title text', m.foot.box.x, m.titleText.x); near('gutter: sentence against title text', m.sentence.box.x, m.titleText.x)
  if (m.source) {
    if (ref.sourceRef) { style('source', m.source.style, ref.sourceRef.style); near('source left', m.source.box.x, ref.sourceRef.box.x); near('source top', m.source.box.y, ref.sourceRef.box.y) }
    near('gutter: source against title text', m.source.box.x, m.titleText.x)
  }
  if (m.first) near('gap from the sentence to the picture', m.first.y - m.sentence.box.bottom, ref.gap)
  return bad
}

export async function audit(page, base, slides, hash) {
  const out = []
  let ref = null, sourceRef = null
  for (let n = 1; n <= slides; n++) {
    await page.goto(`${base}/${n}`, { waitUntil: 'load' })
    if (hash) await page.reload({ waitUntil: 'load' })
    await page.waitForSelector(`[data-slidev-no="${n}"] .slidev-layout`, { timeout: 20000 })
    await page.waitForTimeout(3200)
    const m = await page.evaluate(measure, n)
    assert.ok(m, `slide ${n} did not render`)
    if (m.layout === 'hero' || m.layout === 'closing') {
      if (m.foot || m.page) out.push(`slide ${n}: a ${m.layout} slide carries a footer or a page number`)
      continue
    }
    if (!ref) ref = { ...m, gap: m.first.y - m.sentence.box.bottom, sourceRef: null }
    if (m.source && !sourceRef) sourceRef = m.source
    ref.sourceRef = sourceRef
    out.push(...compare(n, m, ref, slides))
  }
  return out
}

// A colour is a token, never a literal: the deck's Markdown names none, so the look decides the pink, the grey and the amber.
export function colourCode() {
  const md = readFileSync(resolve(dir, 'science.md'), 'utf8').replace(/<!--[\s\S]*?-->/g, '')
  return [...md.matchAll(/#[0-9a-fA-F]{3,8}\b|style\s*=|rgb\(|hsl\(/g)].map((x) => `science.md writes a literal colour or style: ${x[0]}`)
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const base = (process.argv[2] ?? 'http://localhost:3030').replace(/\/$/, '')
  const total = splitSlides(readFileSync(resolve(dir, 'science.md'), 'utf8')).length
  const browser = await chromium.launch({ executablePath: findChrome() })
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
  const deviations = [...colourCode(), ...(await audit(page, base, total, base.endsWith('#')))]
  await browser.close()
  if (deviations.length) { console.error(deviations.join('\n')); console.error(`${deviations.length} deviation(s)`); process.exit(1) }
  console.log(`coherence: ${total} slides, 0 deviations`)
}
