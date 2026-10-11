// Walks every slide of the running (or built) science deck in Chrome, takes two screenshots of each (the slide as it opens, then with every click
// shown), and reports what a reader would call broken: a console error, a request to another origin, a KaTeX error, a media file that does not
// answer 200.
// Usage: node walk.mjs [url] [outdir]    url: http://localhost:3030 (default); a static build: http://localhost:4173/base/#
import { mkdirSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright-chromium'
import { findChrome } from '../../packages/cli/src/chrome.mjs'
import { splitSlides } from '../../packages/cli/src/slides.mjs'

const base = (process.argv[2] ?? 'http://localhost:3030').replace(/\/$/, '')
const out = process.argv[3] ?? 'shots'
mkdirSync(out, { recursive: true })
const origin = new URL(base.replace(/#$/, '')).origin
const browser = await chromium.launch({ executablePath: findChrome() })
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
const problems = []
const here = () => page.url().replace(/^.*(?:#\/|\/)(\d+)(?:\?.*)?$/, '$1')
page.on('console', (m) => { if (m.type() === 'error' && !/FloatingVue/.test(m.text())) problems.push(`slide ${here()} console: ${m.text().slice(0, 160)}`) })
page.on('pageerror', (e) => problems.push(`slide ${here()} pageerror: ${e.message.slice(0, 160)}`))
page.on('request', (r) => { const u = r.url(); if (!u.startsWith(origin) && !/^(data|blob):/.test(u) && !/^(ws|http)s?:\/\/(127\.0\.0\.1|localhost)[:/]/.test(u)) problems.push(`slide ${here()} external request: ${u}`) })
page.on('response', (r) => { if (r.url().startsWith(origin) && r.status() >= 400 && !/favicon/.test(r.url())) problems.push(`slide ${here()} ${r.status()}: ${r.url()}`) })

const hash = base.endsWith('#')
const slideUrl = (n, clicks) => `${base}/${n}${clicks ? `?clicks=${clicks}` : ''}`
const dir = dirname(fileURLToPath(import.meta.url))
const N = Number(process.env.SLIDES) || splitSlides(readFileSync(resolve(dir, 'science.md'), 'utf8')).length
for (let n = 1; n <= N; n++) {
  await page.goto(slideUrl(n), { waitUntil: 'load' })
  if (hash) await page.reload({ waitUntil: 'load' })
  await page.waitForTimeout(Number(process.env.FIRST) || 2600)
  await page.screenshot({ path: `${out}/${String(n).padStart(2, '0')}a.png` })
  await page.goto(slideUrl(n, 9), { waitUntil: 'load' })
  if (hash) await page.reload({ waitUntil: 'load' })
  await page.waitForTimeout(Number(process.env.LATER) || 3200)
  await page.screenshot({ path: `${out}/${String(n).padStart(2, '0')}b.png` })
  const bad = await page.evaluate(() => document.querySelectorAll('.katex-error').length)
  if (bad) problems.push(`slide ${n}: ${bad} .katex-error`)
}
await browser.close()
console.log(problems.length ? problems.join('\n') : 'no problems')
