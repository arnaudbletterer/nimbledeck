// Browser test of the risk chapter (slides 4 to 6 of the composed deck): the sliders move the numbers, a term of the equation lights its group, the polls
// respond to their sliders, and nothing logs an error or reaches another origin.
// Usage: node e2e.mjs [url]   (default http://localhost:3030, start the deck with `nimbledeck run science.md` first;
//        for a static build use the hash form, e.g. http://localhost:4173/base/#)
import assert from 'node:assert/strict'
import { chromium } from 'playwright-chromium'
import { findChrome } from '../../packages/cli/src/chrome.mjs'

const base = (process.argv[2] ?? 'http://localhost:3030').replace(/\/$/, '')
const hash = base.endsWith('#')
const go = (n) => `${base}${hash ? '/' : '/'}${n}`
const origin = new URL(base.replace(/#$/, '')).origin
const browser = await chromium.launch({ executablePath: findChrome() })
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
const problems = []
page.on('console', (m) => { if (m.type() === 'error' && !/FloatingVue/.test(m.text())) problems.push(`console: ${m.text().slice(0, 200)}`) })
page.on('pageerror', (e) => problems.push(`pageerror: ${e.message.slice(0, 200)}`))
page.on('request', (r) => { if (!r.url().startsWith(origin) && !r.url().startsWith('data:') && !r.url().startsWith('blob:') && !r.url().startsWith('ws://127.0.0.1')) problems.push(`external request: ${r.url()}`) })
const setRange = (sel, v) => page.$eval(sel, (el, v) => { el.value = v; el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })) }, v)
const next = async () => { await page.evaluate(() => document.activeElement?.blur()); await page.keyboard.press('ArrowRight') }
const ppv = () => page.$eval('.nd-crowd', (e) => Number(e.dataset.ppv))

// the crowd
await page.goto(go(4), { waitUntil: 'load' })
await page.waitForSelector('.nd-crowd-ctl input', { timeout: 30000 })
await page.waitForTimeout(1500)
assert.equal(await ppv(), 9.0, 'default: 99 percent accurate, 1 in 1000: 9 percent')
await setRange('.nd-crowd-ctl label:nth-child(1) input', 12)          // prevalence 10 percent
assert.ok((await ppv()) > 85, 'at 10 percent prevalence a positive is right about 9 times in 10')
await setRange('.nd-crowd-ctl label:nth-child(3) input', 90)          // specificity 90 percent
assert.ok((await ppv()) < 60, 'a worse test lowers it')
assert.match(await page.textContent('.nd-crowd-big'), /\d+ of [\d,]+ positives are sick/)
await page.hover('.nd-crowd-key li:nth-child(2)')
await page.waitForSelector('.nd-crowd-chip')
assert.match(await page.textContent('.nd-crowd-chip'), /false alarm/)

// the equation shows the same crowd, and a term lights a group
await next()
await page.waitForSelector('.nd-eq [data-term="3"]', { timeout: 30000 })
await page.waitForTimeout(1500)
const live = await page.$eval('.nd-eq', (e) => e.textContent)
assert.ok(/9\s*%/.test(live) || /\d+\s*%/.test(live), 'the equation shows a percentage')
const b = await page.locator('.nd-eq [data-term="4"]').first().boundingBox()
await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2)
await page.locator('.nd-crowd-chip:visible').waitFor()
assert.match(await page.locator('.nd-crowd-chip:visible').textContent(), /false alarm/)

// the polls
await next()
await page.waitForSelector('.nd-polls-ctl input', { timeout: 30000 })
await page.waitForTimeout(2500)
const wrong = () => page.$eval('.nd-polls', (e) => Number(e.dataset.wrong))
const w0 = await wrong()
assert.ok(w0 > 5 && w0 < 16, `1,000 people, 52 percent: about one poll in ten names the wrong winner (got ${w0})`)
await setRange('.nd-polls-ctl label:nth-child(1) input', 10)          // 10,000 people
await page.waitForTimeout(300)
assert.ok((await wrong()) < w0 / 3, 'ten times the people: far fewer wrong winners')
await setRange('.nd-polls-ctl label:nth-child(4) input', 10)          // 10 percent of A supporters do not answer
await page.waitForTimeout(300)
assert.ok((await wrong()) > 80, 'with bias and a huge sample the polls are confidently wrong')

await browser.close()
assert.deepEqual(problems, [], problems.join('\n'))
console.log('risk e2e: ok')
