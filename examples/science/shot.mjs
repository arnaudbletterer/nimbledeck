// One slide, one screenshot after a wait: node shot.mjs <url> <slide> <seconds> <out.png>
import { chromium } from 'playwright-chromium'
import { findChrome } from '../../packages/cli/src/chrome.mjs'

const [url, n, secs, out] = process.argv.slice(2)
const browser = await chromium.launch({ executablePath: findChrome() })
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
await page.goto(`${url.replace(/\/$/, '')}/${n}`, { waitUntil: 'load' })
await page.waitForTimeout(Number(secs) * 1000)
await page.screenshot({ path: out })
await browser.close()
