import { chromium } from 'playwright-chromium'
import { findChrome } from '../../../../packages/cli/src/chrome.mjs'
const browser = await chromium.launch({ executablePath: findChrome() })
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
page.on('console', (m) => console.log('console', m.type(), m.text().slice(0, 300)))
page.on('websocket', (w) => { console.log('ws', w.url()); w.on('framereceived', () => {}); w.on('close', () => console.log('ws closed')) })
await page.goto(`http://localhost:${process.argv[2]}/2`)
await page.waitForTimeout(6000)
console.log(await page.evaluate(() => [...document.querySelectorAll('[data-kind=pystream]')].map((e) => [e.dataset.state, e.dataset.fps])))
console.log(await page.evaluate(() => { const c = document.querySelector('canvas'); const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let n = 0; for (let i = 3; i < d.length; i += 4) if (d[i]) n++; return [c.width, c.height, n, getComputedStyle(c).display] }))
await browser.close()
