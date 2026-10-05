// Screenshots of the sample deck (looks.md) under every look of packages/theme/looks.json, and a contact sheet per look.
//   node looks-shots.mjs [baseUrl] [outDir] [--looks a,b] [--slides 1,4,9] [--no-sheets]
// Start the deck first: NIMBLEDECK_PORT_OFFSET=700 nimbledeck run looks.md   (serves http://localhost:3730)
// The look is switched through the `data-nd-variant` attribute on <html>, as the Looks component does, with a fresh page per
// look so that Mermaid reads the tokens of that look when its slide first renders.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { chromium } from 'playwright-chromium'
import { findChrome } from '../../packages/cli/src/chrome.mjs'

const args = process.argv.slice(2)
const opt = (name) => { const i = args.indexOf(`--${name}`); return i < 0 ? undefined : args[i + 1] }
const pos = args.filter((a, i) => !a.startsWith('--') && !(i > 0 && args[i - 1].startsWith('--') && !['--no-sheets'].includes(args[i - 1])))
const [base = 'http://localhost:3730', out = 'shots'] = pos
const registry = JSON.parse(readFileSync(new URL('../../packages/theme/looks.json', import.meta.url), 'utf8'))
const wanted = opt('looks')?.split(',')
const looks = wanted ? registry.filter((l) => wanted.includes(l.id)) : registry
const only = opt('slides')?.split(',').map(Number)
mkdirSync(out, { recursive: true })

const chrome = findChrome()
const browser = await chromium.launch(chrome ? { executablePath: chrome } : {})
// Text that is cut off: an h1 or a card figure whose content is wider than its box (ellipsis), or any text element that leaves the
// slide or the clipping box of an ancestor. Runs in the page, on the slide on screen.
function clipped() {
  const slides = [...document.querySelectorAll('.slidev-layout')].filter((e) => { const r = e.getBoundingClientRect(); return r.width > 1000 && r.left > -5 && r.left < 5 })
  const cur = slides[slides.length - 1]
  if (!cur) return ['no slide on screen']
  const out = []
  const describe = (e) => `${e.tagName.toLowerCase()}.${[...e.classList].join('.')} "${(e.textContent || '').trim().slice(0, 40)}"`
  for (const e of cur.querySelectorAll('h1, h2, h4, .nd-choice, th, td, li, p')) {
    if (e.scrollWidth > e.clientWidth + 1 && getComputedStyle(e).display !== 'inline' && e.clientWidth > 0) out.push(`overflows its box: ${describe(e)} (${e.scrollWidth} > ${e.clientWidth})`)
  }
  for (const e of cur.querySelectorAll('*')) {
    if (![...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())) continue
    const r = e.getBoundingClientRect()
    if (!r.width || !r.height) continue
    if (r.right > 1282 || r.bottom > 722 || r.left < -2 || r.top < -2) { out.push(`leaves the slide: ${describe(e)}`); continue }
    for (let a = e.parentElement; a && a !== cur.parentElement; a = a.parentElement) {
      const cs = getComputedStyle(a)
      if (cs.overflow === 'visible' && cs.overflowX === 'visible') continue
      const ar = a.getBoundingClientRect()
      if (a.tagName === 'CANVAS' || ar.width === 0) continue
      if (r.right > ar.right + 2 || r.bottom > ar.bottom + 2 || r.left < ar.left - 2 || r.top < ar.top - 2) { out.push(`clipped by ${a.tagName.toLowerCase()}.${[...a.classList].join('.')}: ${describe(e)}`); break }
    }
  }
  return out
}
let problems = 0
const pad = (n) => String(n).padStart(2, '0')
const files = {}

for (const look of looks) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 })
  const page = await ctx.newPage()
  page.on('pageerror', (e) => console.log(`  [${look.id}] page error: ${String(e).slice(0, 160)}`))
  await page.goto(`${base}/1?clicks=99`, { waitUntil: 'networkidle' })
  const total = await page.evaluate(() => window.__slidev__.nav.total)
  await page.evaluate(({ id, dark }) => { const r = document.documentElement; r.dataset.ndVariant = id; r.classList.toggle('dark', dark) }, { id: look.id, dark: look.dark })
  files[look.id] = []
  for (let n = 1; n <= total; n++) {
    if (only && !only.includes(n)) continue
    await page.evaluate((k) => window.__slidev__.nav.go(k, 99), n)
    await page.waitForTimeout(n >= 9 ? 1800 : 1100)
    const bad = await page.evaluate(clipped)
    for (const b of bad) console.log(`  [${look.id}] slide ${n}: ${b}`)
    problems += bad.length
    const file = `${out}/${look.id}-${pad(n)}.png`
    await page.screenshot({ path: file })
    files[look.id].push(file)
    if (n === 11) {   // the quiz after a wrong answer: the good and bad tints of the look
      await page.keyboard.press('1')
      await page.waitForTimeout(900)
      await page.screenshot({ path: `${out}/${look.id}-11b.png` })
      files[look.id].push(`${out}/${look.id}-11b.png`)
    }
  }
  await ctx.close()
  console.log(`${look.id}: ${files[look.id].length} slides`)
}

// Contact sheets: an HTML grid of the screenshots of one look, rendered to a PNG.
if (!args.includes('--no-sheets')) {
  const sheetPage = await browser.newPage({ viewport: { width: 1700, height: 900 } })
  const cols = 4
  const w = 410, h = 231
  for (const look of looks) {
    const imgs = files[look.id].map((f, i) => `<figure><img src="${resolve(f)}" width="${w}" height="${h}"><figcaption>${i + 1}</figcaption></figure>`).join('')
    const rows = Math.ceil(files[look.id].length / cols)
    await sheetPage.setViewportSize({ width: cols * (w + 12) + 28, height: 70 + rows * (h + 34) + 20 })
    const html = `<style>body{margin:0;padding:14px;background:#2a2a2e;font:14px system-ui;color:#ddd}h2{margin:0 0 10px;font:600 20px system-ui}main{display:grid;grid-template-columns:repeat(${cols},${w}px);gap:12px}
      figure{margin:0}img{display:block;border:1px solid #555}figcaption{font-size:12px;color:#999;padding-top:2px}</style>
      <h2>${look.id}: ${look.description}</h2><main>${imgs}</main>`
    const sheetFile = resolve(out, `sheet-${look.id}.html`)
    writeFileSync(sheetFile, html)
    await sheetPage.goto('file://' + sheetFile, { waitUntil: 'load' })
    await sheetPage.waitForTimeout(300)
    await sheetPage.screenshot({ path: `${out}/sheet-${look.id}.png`, fullPage: true })
  }
}
await browser.close()
console.log(problems ? `${problems} text problems` : 'no text is clipped')
process.exitCode = problems ? 1 : 0
