// Offline end-to-end test: the deck must be usable when the network is gone or only hangs.
// Usage: node offline-e2e.mjs [url] [deck.md]
// Without a url it builds the deck (slidev build) and serves the build on a free local port. With a url (a running dev server
// or any static copy of a build) it uses that. Every request to a host other than localhost / 127.0.0.1 is captured and
// either left hanging forever or aborted; the only external address a deck may try is a <Site url> of its own.
import { spawnSync } from 'node:child_process'
import { readFileSync, existsSync, statSync } from 'node:fs'
import { createServer } from 'node:http'
import { createRequire } from 'node:module'
import { extname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright-chromium'
import { findChrome } from '../../packages/cli/src/chrome.mjs'
import { splitSlides } from '../../packages/cli/src/slides.mjs'

const here = fileURLToPath(new URL('.', import.meta.url))
const deckFile = process.argv[3] ? resolve(process.argv[3]) : join(here, 'how-it-works.md')
const root = resolve(deckFile, '..')
const slides = splitSlides(readFileSync(deckFile, 'utf8'))
const siteSlide = slides.findIndex((s) => /<Site url=/.test(s.body)) + 1
const siteUrl = slides.map((s) => s.body.match(/<Site url="([^"]+)"/)?.[1]).find(Boolean)
const siteHost = siteUrl ? new URL(siteUrl).host : null

let server = null
let base = process.argv[2]
if (!base) {
  const slidev = createRequire(join(root, 'noop.js')).resolve('@slidev/cli/bin/slidev.mjs')
  const b = spawnSync(process.execPath, [slidev, 'build', deckFile], { cwd: root, stdio: 'ignore' })
  if (b.status !== 0) throw new Error('slidev build failed')
  const dist = join(root, 'dist')
  const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.jpg': 'image/jpeg', '.png': 'image/png', '.mp4': 'video/mp4', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' }
  server = createServer((req, res) => {
    let f = join(dist, decodeURIComponent(new URL(req.url, 'http://x').pathname))
    if (!f.startsWith(dist) || !existsSync(f) || statSync(f).isDirectory()) f = join(dist, 'index.html')   // single-page fallback
    res.setHeader('content-type', types[extname(f)] || 'application/octet-stream')
    res.end(readFileSync(f))
  })
  await new Promise((ok) => server.listen(0, '127.0.0.1', ok))
  base = `http://127.0.0.1:${server.address().port}`
}

const chrome = findChrome()
const browser = await chromium.launch(chrome ? { executablePath: chrome } : {})
let failed = 0
const check = (name, ok, detail = '') => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' (' + detail + ')' : ''}`); if (!ok) failed++ }
const local = (u) => /^(localhost|127\.0\.0\.1)$/.test(new URL(u).hostname)

// mode "hang": the connection is up as far as the browser knows but no external request ever answers.
// mode "abort": the browser reports itself offline (navigator.onLine false) and every external request fails at once.
for (const mode of ['hang', 'abort']) {
  console.log(`\n== ${mode} ==`)
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 } })
  if (mode === 'abort') await context.addInitScript(() => {
    let on = false
    Object.defineProperty(Navigator.prototype, 'onLine', { get: () => on, configurable: true })
    window.__setOnline = (v) => { on = v; window.dispatchEvent(new Event(v ? 'online' : 'offline')) }
  })
  const external = []
  let siteMode = mode   // flips to "fulfil" for the recovery checks
  await context.route((u) => !local(u.href), (route) => {
    const url = route.request().url()
    external.push(url)
    if (siteMode === 'fulfil' && siteHost && new URL(url).host === siteHost) return route.fulfill({ contentType: 'text/html', body: '<h1>back online</h1>' })
    if (mode === 'abort') return route.abort('internetdisconnected')
    // hang: never fulfil, never continue, never abort
  })
  const page = await context.newPage()
  const errors = []
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 160)))
  const pageNo = () => Number(new URL(page.url()).pathname.split('/').filter(Boolean)[0] || 1)
  const shown = () => page.waitForFunction(() => [...document.querySelectorAll('.slidev-layout')].some((e) => e.getBoundingClientRect().width > 0), null, { timeout: 15000 })

  const t0 = Date.now()
  await page.goto(`${base}/1`, { waitUntil: 'domcontentloaded' })
  await shown()
  const ms = Date.now() - t0
  check('the first slide shows', true, `${ms} ms`)
  check('the first slide shows within 3 s', ms < 3000, `${ms} ms`)
  await page.mouse.click(640, 30)
  await page.keyboard.press('ArrowRight'); await page.keyboard.press('ArrowRight')
  await page.waitForTimeout(600)
  check('the keyboard moves through the slides', pageNo() > 1, `slide ${pageNo()}`)

  // Walk to the last slide, one key press at a time.
  let guard = 0
  while (pageNo() < slides.length && guard++ < 400) { await page.keyboard.press('ArrowRight'); await page.waitForTimeout(120) }
  check('the keyboard reaches the last slide', pageNo() === slides.length, `slide ${pageNo()} of ${slides.length}`)
  for (let i = 0; i < 3; i++) { await page.keyboard.press('ArrowLeft'); await page.waitForTimeout(120) }
  check('the keyboard walks back', pageNo() < slides.length)

  // A slide loaded directly (reload in the middle of the deck).
  const mid = Math.ceil(slides.length / 2)
  const t1 = Date.now()
  await page.goto(`${base}/${mid}`, { waitUntil: 'domcontentloaded' })
  await shown()
  check('a middle slide loaded directly shows within 3 s', Date.now() - t1 < 3000, `${Date.now() - t1} ms`)

  // The website slide: a calm offline panel, then recovery.
  if (siteSlide) {
    await page.goto(`${base}/${siteSlide}`, { waitUntil: 'domcontentloaded' })
    await shown()
    const state = () => page.locator('[data-kind=site]').filter({ visible: true }).first().getAttribute('data-state')
    await page.waitForFunction(() => [...document.querySelectorAll('[data-kind=site]')].some((s) => s.getBoundingClientRect().width > 0 && s.dataset.state === 'offline'), null, { timeout: 15000 }).catch(() => {})
    check('the website slide shows an offline panel instead of an empty frame', (await state()) === 'offline', await state())
    const panel = page.locator('.nd-site-off').filter({ visible: true }).first()
    check('the panel names the address and offers Retry', (await panel.innerText()).includes(siteUrl) && (await panel.locator('button').count()) === 1)
    check('the offline panel has no iframe', (await page.locator('[data-kind=site] iframe').count()) === 0)
    await page.screenshot({ path: join(here, '..', '..', 'out-offline-site.png') })

    // Recovery: the connection comes back.
    siteMode = 'fulfil'
    if (mode === 'abort') await page.evaluate(() => window.__setOnline(true))
    else await page.locator('.nd-site-off button').filter({ visible: true }).first().click()
    await page.waitForFunction(() => [...document.querySelectorAll('[data-kind=site]')].some((s) => s.getBoundingClientRect().width > 0 && s.dataset.state === 'live'), null, { timeout: 15000 }).catch(() => {})
    check(mode === 'abort' ? 'the site comes back by itself when the connection returns' : 'Retry brings the site back', (await state()) === 'live', await state())
  }

  const stray = [...new Set(external.filter((u) => new URL(u).host !== siteHost).map((u) => u.slice(0, 100)))]
  check('no external request except the deck\'s own <Site> address', stray.length === 0, stray.join(' ') || 'none')
  console.log(`   external requests attempted: ${[...new Set(external.map((u) => u.slice(0, 80)))].join(', ') || 'none'}`)
  check('no page errors', errors.length === 0, errors.join(' | '))
  await context.close()
}

await browser.close()
server?.close()
console.log(failed ? `\n${failed} FAILED` : '\nall passed')
process.exit(failed ? 1 : 0)
