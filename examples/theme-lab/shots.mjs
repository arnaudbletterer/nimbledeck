// Screenshots of every slide of a running lab deck: node shots.mjs [baseUrl] [outDir] [prefix]
// Start the deck first, e.g. NIMBLEDECK_PORT_OFFSET=600 npm run dev (serves on http://localhost:3630).
import { mkdirSync } from 'node:fs'
import { chromium } from 'playwright-chromium'

const [base = 'http://localhost:3630', out = 'shots', prefix = 'lab'] = process.argv.slice(2)
const chrome = process.env.NIMBLEDECK_CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
mkdirSync(out, { recursive: true })
const browser = await chromium.launch({ executablePath: chrome })
const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 })
for (let n = 1; ; n++) {
  await page.goto(`${base}/${n}?clicks=99`, { waitUntil: 'networkidle' })
  const total = await page.evaluate(() => window.__slidev__.nav.total)
  await page.waitForTimeout(1500)
  await page.screenshot({ path: `${out}/${prefix}-${String(n).padStart(2, '0')}.png` })
  if (n >= total) break
}
await browser.close()
