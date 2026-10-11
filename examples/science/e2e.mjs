// Browser test of the science deck: the guess quiz answers, the clicks reveal the dots, the sliders change the plain sentence, a term of
// the equation lights its dots, the slides keep one grammar (coherence.mjs), the site bar plays the tour (the guess is scripted), and nothing logs an
// error or reaches another origin.
// Usage: node e2e.mjs [url]   (default http://localhost:3030: start the deck with `npm run dev` first;
//        for a static build use the hash form, e.g. http://localhost:4173/base/#)
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright-chromium'
import { findChrome } from '../../packages/cli/src/chrome.mjs'
import { splitSlides } from '../../packages/cli/src/slides.mjs'
import { audit, colourCode } from './coherence.mjs'

const base = (process.argv[2] ?? 'http://localhost:3030').replace(/\/$/, '')
const hash = base.endsWith('#')
let at = 1
const q = (sel) => `[data-slidev-no="${at}"] ${sel}`   // Slidev keeps the neighbouring slides mounted: always ask the slide under test
const go = async (n) => { at = n; await page.goto(`${base}/${n}`, { waitUntil: 'load' }); if (hash) await page.reload({ waitUntil: 'load' }); await page.waitForTimeout(1800) }
const origin = new URL(base.replace(/#$/, '')).origin
const browser = await chromium.launch({ executablePath: findChrome() })
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
const problems = []
page.on('console', (m) => { if (m.type() === 'error' && !/FloatingVue/.test(m.text())) problems.push(`console: ${m.text().slice(0, 200)}`) })
page.on('pageerror', (e) => problems.push(`pageerror: ${e.message.slice(0, 200)}`))
page.on('request', (r) => { const u = r.url(); if (!u.startsWith(origin) && !/^(data|blob):/.test(u) && !/^wss?:\/\/(127\.0\.0\.1|localhost)/.test(u)) problems.push(`external request: ${u}`) })
page.on('response', (r) => { if (r.url().startsWith(origin) && r.status() >= 400 && !/favicon/.test(r.url())) problems.push(`${r.status()}: ${r.url()}`) })
const setRange = (sel, v) => page.$eval(q(sel), (el, v) => { el.value = v; el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })) }, v)
const step = () => page.$eval(q('.nd-chance'), (e) => Number(e.dataset.step))
const text = (sel) => page.textContent(q(sel))
const click = async () => { await page.evaluate(() => document.activeElement?.blur()); await page.keyboard.press('ArrowRight'); await page.waitForTimeout(500) }

// 3: the guess. A wrong answer is marked, a right one revealed.
await go(3)
await page.keyboard.press('2')
await page.waitForTimeout(600)
assert.equal(await page.$eval(q('.nd-quiz'), (e) => e.dataset.state), 'bad', 'about 90 in 100 is not the answer')
await go(3)
await page.keyboard.press('4')
await page.waitForTimeout(600)
assert.equal(await page.$eval(q('.nd-quiz'), (e) => e.dataset.state), 'good', 'about 9 in 100 is the answer')

// 5 and 6: one click shows the sick, two more show who tests positive
await go(5)
assert.equal(await step(), 0, 'slide 5 opens with plain dots')
await click()
assert.equal(await step(), 1, 'one click shows the sick')
await go(6)
assert.equal(await step(), 1)
await click(); assert.equal(await step(), 2)
await click(); assert.equal(await step(), 3)
assert.match(await text('.nd-chance-key'), /Test positive: 110/)

// 7: the second row arrives on a click
await go(7)
assert.match(await text('.nd-chance'), /Sick people who test positive: 10/)
await click()
assert.equal(await step(), 2)
assert.match(await text('.nd-chance'), /Healthy people who test positive too: 100/)

// 8: the prevalence slider rewrites the sentence
await go(8)
assert.match(await text('.nd-chance-say'), /If 1 in 1,000 people were sick.*about 9 times in 100/)
await setRange('.nd-chance-read input', 5)   // 1 in 100
assert.match(await text('.nd-chance-say'), /If 1 in 100 people were sick.*about 50 times in 100/)
assert.equal(await page.$eval(q('.nd-chance'), (e) => e.dataset.right), '50')
await setRange('.nd-chance-read input', 8)   // 1 in 10
assert.match(await text('.nd-chance-say'), /about 92 times in 100/)

// 9: the accuracy sliders, in plain words
await go(9)
assert.match(await text('.nd-chance-read'), /Catches sick people/)
assert.match(await text('.nd-chance-read'), /Clears healthy people/)
await setRange('.nd-chance-read label:nth-of-type(2) input', 99.9)
assert.match(await text('.nd-chance-say'), /clears 99\.9 of 100 healthy people.*about 50 times in 100/)

// 12: pointing at a term lights its group
await go(12)
await page.waitForSelector(q('.nd-eq [data-term="3"]'), { timeout: 20000 })
await page.hover(q('.nd-t4'), { force: true })
await page.waitForSelector(q('.nd-linkchip'), { timeout: 5000 })
assert.match(await text('.nd-linkchip'), /false alarm/)

// The slides keep one grammar: title, sentence, source line, footer and page number in the same place, with the same style.
const total = splitSlides(readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), 'science.md'), 'utf8')).length
const deviations = [...colourCode(), ...(await audit(page, base, total, hash))]
assert.deepEqual(deviations, [], 'the slide grammar')

// The site bar (injected by the hosted build as window.__ND_SITE__; here by the test): the big button, the clock, a tour that plays the guess,
// a shield against the real pointer, no speaker (the deck has no sound), and a real key takes over.
const site = await browser.newPage({ viewport: { width: 1280, height: 720 } })
site.on('pageerror', (e) => problems.push(`pageerror: ${e.message.slice(0, 200)}`))
await site.addInitScript(() => { window.__ND_SITE__ = { docs: '/docs/', playground: '/playground/', github: 'https://github.com/' }; document.addEventListener('DOMContentLoaded', () => document.documentElement.classList.add('nd-site-bar')) })
await site.goto(`${base}/1`, { waitUntil: 'load' })
if (hash) await site.reload({ waitUntil: 'load' })
await site.waitForSelector('.ndb', { timeout: 20000 })
assert.match(await site.textContent('.ndb-play'), /Watch the tour\s*\d+:\d\d$/, 'the big button shows the length')
assert.equal(await site.locator('.nd-sound-btn, .ndb-with').count(), 0, 'no sound controls on a deck without sound')
assert.equal(await site.locator('.ndb a:text("Science")').count(), 0, 'no link from the science deck to itself')
await site.click('.ndb-play')
await site.waitForSelector('.ndb-shield', { timeout: 5000 })
const slideNo = () => site.evaluate(() => Number(location.href.replace(/^.*(?:#\/|\/)(\d+)(?:\?.*)?$/, '$1')))
await site.waitForFunction(() => /(?:#\/|\/)3(?:\?.*)?$/.test(location.href), null, { timeout: 60000 })
await site.waitForFunction(() => document.querySelector('[data-slidev-no="3"] .nd-quiz')?.dataset.state === 'good', null, { timeout: 20000 })   // the tour guessed, then chose D
assert.match(await site.textContent('.ndb-time'), /^\d+:\d\d \/ \d+:\d\d$/, 'the clock')
await site.keyboard.press('ArrowRight')   // a real key takes over
await site.waitForSelector('.ndb-shield', { state: 'detached', timeout: 5000 })
assert.equal(await site.getAttribute('.ndb-tour', 'aria-pressed'), 'false')
await site.close()

await browser.close()
if (problems.length) { console.error(problems.join('\n')); process.exit(1) }
console.log('science e2e: ok')
