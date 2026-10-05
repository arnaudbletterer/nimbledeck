// Contact sheets of the presets lab: every motion preset on its three layouts at 0, 200 and 500 ms and settled, and every
// background on its three layouts. Usage: node presets-shots.mjs [baseUrl] [outDir] [id ...]
// Start the lab first, e.g. NIMBLEDECK_PORT_OFFSET=700 nimbledeck run presets.md (serves on http://localhost:3730).
// The animations are paused and set to a given time instead of waiting, so a frame is the same on every run.
import { mkdirSync, readFileSync } from 'node:fs'
import { chromium } from 'playwright-chromium'
import { findChrome } from '../../packages/cli/src/chrome.mjs'

const [base = 'http://localhost:3730', out = 'shots/presets', ...only] = process.argv.slice(2)
const TIMES = [0, 200, 500, 'settled']
mkdirSync(out, { recursive: true })
const chrome = findChrome()
const browser = await chromium.launch(chrome ? { executablePath: chrome } : {})
const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 0.5 })

const freeze = (t) => page.evaluate((t) => {
  for (const a of document.getAnimations()) {
    a.pause()
    if (t !== 'settled') a.currentTime = t
    else if (a.effect.getTiming().iterations === Infinity) a.currentTime = 4000
    else a.finish()
  }
}, t)

const groups = new Map()   // "motion:fade-up" or "bg:aurora" -> [{ n, frames: [dataUrl] }]
await page.goto(`${base}/1`, { waitUntil: 'networkidle' })
const total = await page.evaluate(() => window.__slidev__.nav.total)
for (let n = 2; n <= total; n++) {
  await page.goto(`${base}/${n}`, { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => [...document.querySelectorAll('.slidev-layout')].some((e) => e.getBoundingClientRect().width > 0 && (e.dataset.ndMotion || e.dataset.ndBg)))
  const info = await page.evaluate(() => {
    const e = [...document.querySelectorAll('.slidev-layout')].find((x) => x.getBoundingClientRect().width > 0)
    return { motion: e.dataset.ndMotion, bg: e.dataset.ndBg, layout: [...e.classList].find((c) => !['slidev-layout', 'nd-root', 'nd-lead'].includes(c)) }
  })
  const key = info.bg ? `bg:${info.bg}` : `motion:${info.motion}`
  if (only.length && !only.includes(key.split(':')[1])) continue
  const frames = []
  for (const t of info.bg ? ['settled'] : TIMES) {
    await freeze(t)
    await page.waitForTimeout(60)
    frames.push((await page.screenshot()).toString('base64'))
  }
  if (!groups.has(key)) groups.set(key, [])
  groups.get(key).push({ n, layout: info.layout, frames })
  process.stderr.write(`slide ${n}/${total} ${key}\r`)
}

const sheet = await browser.newPage({ viewport: { width: 1700, height: 800 }, deviceScaleFactor: 1 })
for (const [key, rows] of groups) {
  const [kind, id] = key.split(':')
  const labels = kind === 'bg' ? ['settled'] : TIMES.map((t) => (t === 'settled' ? 'settled' : `${t} ms`))
  const html = `<body style="margin:0;background:#222;color:#ddd;font:14px system-ui"><div style="padding:8px 12px">${kind === 'bg' ? 'background' : 'motion'}: <b>${id}</b></div>
    <div style="display:grid;grid-template-columns:repeat(${labels.length},1fr);gap:6px;padding:0 6px 6px">
    ${rows.flatMap((r) => r.frames.map((f, i) => `<figure style="margin:0"><img src="data:image/png;base64,${f}" style="width:100%;display:block"><figcaption style="padding:2px 4px;font-size:12px">slide ${r.n} ${r.layout ?? ''} ${labels[i]}</figcaption></figure>`)).join('')}</div></body>`
  await sheet.setContent(html)
  await sheet.screenshot({ path: `${out}/${kind}-${id}.png`, fullPage: true })
}
await browser.close()
console.log(`\n${groups.size} contact sheets in ${out}`)
