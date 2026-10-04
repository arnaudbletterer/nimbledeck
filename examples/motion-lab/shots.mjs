// Screenshots of every lab slide at mid-animation and in the final state, plus the main-thread cost of each slide.
// Usage (with the lab running): node shots.mjs [url] [outDir]
import { mkdirSync } from 'node:fs'
import { chromium } from 'playwright-chromium'
import { findChrome } from '../../packages/cli/src/chrome.mjs'

const base = process.argv[2] || 'http://localhost:3030'
const out = process.argv[3] || 'shots'
mkdirSync(out, { recursive: true })
const chrome = findChrome()
const browser = await chromium.launch(chrome ? { executablePath: chrome } : {})
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
const errors = []; page.on('pageerror', (e) => errors.push(String(e).slice(0, 200))); page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 200)) })
const cdp = await page.context().newCDPSession(page)
await cdp.send('Performance.enable')
const busy = async (ms) => {
  const m = async () => Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map((x) => [x.name, x.value]))
  const a = await m(); await page.waitForTimeout(ms); const b = await m()
  return { main: 100 * (b.TaskDuration - a.TaskDuration) / (b.Timestamp - a.Timestamp), script: 100 * (b.ScriptDuration - a.ScriptDuration) / (b.Timestamp - a.Timestamp) }
}
const names = ['aurora-kinetic', 'kinetic-modes', 'typewriter', 'terminal', 'stat', 'marquee', 'spotlight', 'tilt']
const only = process.argv[4] ? process.argv[4].split(',').map(Number) : names.map((_, i) => i + 1)
for (const n of only) {
  await page.goto(`${base}/${n}?clicks=0`, { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => [...document.querySelectorAll('.slidev-layout')].some((e) => e.getBoundingClientRect().width > 0))
  const t0 = Date.now()
  if (n === 7) await page.mouse.move(400, 300)
  if (n === 8) await page.mouse.move(800, 200)
  await page.waitForTimeout(500 - Math.min(400, Date.now() - t0 - 300 > 0 ? 0 : 0))
  await page.screenshot({ path: `${out}/${n}-${names[n - 1]}-a.png` })
  await page.waitForTimeout(700)
  await page.screenshot({ path: `${out}/${n}-${names[n - 1]}-b.png` })
  await page.waitForTimeout(3500)
  await page.screenshot({ path: `${out}/${n}-${names[n - 1]}-final.png` })
  const c = await busy(3000)
  console.log(`${n} ${names[n - 1]}: main thread ${c.main.toFixed(1)}%  script ${c.script.toFixed(1)}%`)
}
console.log('errors:', errors.length ? errors : 'none')
await browser.close()
