// scratch: screenshots of slides at several moments. node _shots.mjs <port> <outDir> <slide:t1,t2,t3> ...
import { chromium } from 'playwright-chromium'
import { findChrome } from '../../../../packages/cli/src/chrome.mjs'
import { mkdirSync } from 'node:fs'

const [port, out, ...specs] = process.argv.slice(2)
mkdirSync(out, { recursive: true })
const browser = await chromium.launch({ executablePath: findChrome(), args: ['--enable-unsafe-swiftshader'] })
const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 2 })
page.on('console', (m) => { if (m.type() === 'error') console.log('console error:', m.text().slice(0, 200)) })
for (const spec of specs) {
  const [n, times] = spec.split(':')
  await page.goto(`http://localhost:${port}/${n}`, { waitUntil: 'load' })
  await page.waitForTimeout(1500); let last = 0
  for (const t of times.split(',').map(Number)) {
    await page.waitForTimeout((t - last) * 1000)
    last = t
    await page.screenshot({ path: `${out}/s${n}-t${t}.png` })
    console.log('shot', n, t)
  }
}
await browser.close()
