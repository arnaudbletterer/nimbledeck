// Browser end-to-end test of the scripted tour and of sound, on the built web edition of the showcase.
// Usage: node e2e-tour.mjs [--dist <folder>] [--shots <folder>] [--full]
//   --dist   the folder `npm run build:web` wrote (default dist/, built with WEB_BASE=/)
//   --shots  write PNGs of the cursor mid-glide, mid-click, the answered quiz and the compare drag
//   --full   also play the whole tour in real time and print, per slide, the time to settle and the time on the slide
// It injects the site bar's `window.__ND_SITE__` (the real site build does it in website/build.mjs), keeps every request
// outside 127.0.0.1 hanging, and checks: the quiz is answered and the compare divider moves by the tour's own events, those
// events never stop the tour but a real key press does, the cursor appears and goes, sound starts on the play click (the
// AudioContext runs and cues are scheduled; whether it is audible is not tested), and no page error or external request.
import { createServer } from 'node:http'
import { mkdirSync, readFileSync, statSync } from 'node:fs'
import { extname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright-chromium'
import { findChrome } from '../../packages/cli/src/chrome.mjs'

const here = fileURLToPath(new URL('.', import.meta.url))
const arg = (n) => (process.argv.includes(n) ? process.argv[process.argv.indexOf(n) + 1] : null)
const dist = resolve(arg('--dist') ?? join(here, 'dist'))
const shots = arg('--shots') ? resolve(arg('--shots')) : null
const full = process.argv.includes('--full')
if (shots) mkdirSync(shots, { recursive: true })

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg', '.png': 'image/png', '.mp4': 'video/mp4', '.webm': 'video/webm', '.woff2': 'font/woff2', '.woff': 'font/woff', '.mp3': 'audio/mpeg' }
const server = createServer((req, res) => {
  let p = join(dist, decodeURIComponent(new URL(req.url, 'http://x').pathname))
  try { if (statSync(p).isDirectory()) p = join(p, 'index.html') } catch { p = join(dist, 'index.html') }
  try { res.writeHead(200, { 'content-type': TYPES[extname(p)] ?? 'application/octet-stream' }); res.end(readFileSync(p)) } catch { res.writeHead(404); res.end() }
}).listen(0, '127.0.0.1')
await new Promise((r) => server.once('listening', r))
const origin = `http://127.0.0.1:${server.address().port}`

const chrome = findChrome()
const browser = await chromium.launch({ ...(chrome ? { executablePath: chrome } : {}), args: ['--autoplay-policy=no-user-gesture-required'] })
let failed = 0
const check = (name, ok, detail = '') => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' (' + detail + ')' : ''}`); if (!ok) failed++ }
const errors = [], external = []

async function open(url, opts = {}) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, ...opts })
  await context.route((u) => new URL(u.href).hostname !== '127.0.0.1', (route) => { external.push(route.request().url()) })
  await context.addInitScript(() => {
    window.__ND_SITE__ = { docs: '/docs/', playground: '/playground/', github: 'https://example.invalid/' }
    document.addEventListener('DOMContentLoaded', () => document.documentElement.classList.add('nd-site-bar'))
    window.__tourLog = []
    window.addEventListener('nd-tour-slide', (e) => window.__tourLog.push(e.detail))
  })
  const page = await context.newPage()
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 200)))
  page.on('console', (m) => { if (m.type() === 'error' && !/FloatingVue/.test(m.text())) errors.push(m.text().slice(0, 200)) })   // Slidev's own FloatingVue patch warning is not ours
  await page.goto(url, { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => [...document.querySelectorAll('.slidev-layout')].some((e) => e.getBoundingClientRect().width > 0), null, { timeout: 15000 })
  return { context, page }
}
const hash = (page) => page.evaluate(() => location.hash)
const playing = (page) => page.locator('.ndb-tour').getAttribute('aria-pressed')
const cursorCount = (page) => page.locator('.nd-cursor').count()
const shot = async (page, name) => { if (shots) await page.screenshot({ path: join(shots, name) }) }

// 1. Slide 11 (the quiz) and 12 (the compare slider), played by the tour from the play button.
{
  const { context, page } = await open(`${origin}/#/12`)   // the web edition has the sound slide, so the quiz is slide 11 and the compare slide 12
  const quizPage = await page.evaluate(() => [...document.querySelectorAll('[data-kind="quiz"]')].length)
  check('the quiz is in the deck', quizPage === 1)
  const qNo = await page.evaluate(() => Number(document.querySelector('[data-kind="quiz"]').closest('[data-slidev-no]')?.dataset.slidevNo))
  const cNo = await page.evaluate(() => Number(document.querySelector('[data-kind="compare"]').closest('[data-slidev-no]')?.dataset.slidevNo))
  check('slides carry their number for the tour to find', qNo > 0 && cNo > 0, `quiz ${qNo}, compare ${cNo}`)
  await page.goto(`${origin}/#/${qNo}`)
  await page.waitForTimeout(600)
  check('sound is off until asked', await page.evaluate(() => window.__ndSound.enabled === false && window.__ndSound.state === 'none'))
  check('the speaker button says so', (await page.locator('.nd-sound-btn').getAttribute('aria-pressed')) === 'false')
  await page.locator('.ndb-tour').click()
  check('Play turns the tour on', (await playing(page)) === 'true')
  await page.waitForFunction(() => window.__ndSound.state === 'running', null, { timeout: 4000 }).catch(() => {})
  check('the play click turns sound on and the AudioContext runs', await page.evaluate(() => window.__ndSound.enabled && window.__ndSound.state === 'running'), await page.evaluate(() => window.__ndSound.state))
  check('the speaker button shows it', (await page.locator('.nd-sound-btn').getAttribute('aria-pressed')) === 'true')
  check('the sound choice is stored', await page.evaluate(() => localStorage.getItem('nimbledeck:sound') === '1'))

  await page.waitForSelector('.nd-cursor', { state: 'attached', timeout: 5000 }).catch(() => {})
  check('the cursor appears', (await cursorCount(page)) === 1)
  check('the cursor ignores the pointer and is hidden from assistive technology', await page.evaluate(() => { const c = document.querySelector('.nd-cursor'); return !!c && getComputedStyle(c).pointerEvents === 'none' && c.getAttribute('aria-hidden') === 'true' }))
  // Watch the cursor: one picture while it glides, one while its click ripples.
  const got = new Set()
  for (let i = 0; i < 250 && got.size < 2; i++) {
    const s = await page.evaluate(() => ({ glide: !!document.querySelector('.nd-cur-glide'), ripple: !!document.querySelector('.nd-cur-ripple-on'), caption: document.querySelector('.nd-cur-caption')?.textContent ?? '' }))
    if (s.glide && s.caption && !got.has('glide')) { got.add('glide'); await shot(page, 'cursor-glide.png') }
    if (s.ripple && !got.has('ripple')) { got.add('ripple'); await shot(page, 'cursor-click.png') }
    await page.waitForTimeout(30)
  }
  check('the cursor glides with a caption, and its click ripples', got.has('glide') && got.has('ripple'), [...got].join(','))
  await page.waitForFunction(() => document.querySelector('[data-kind="quiz"]')?.dataset.state !== 'open', null, { timeout: 8000 }).catch(() => {})
  check('the tour answers the quiz (and the answer is right)', (await page.locator('[data-kind="quiz"]').getAttribute('data-state')) === 'good')
  await page.waitForTimeout(500)
  await shot(page, 'quiz-answered.png')
  check('the tour was not stopped by its own events', (await playing(page)) === 'true')
  check('cues were scheduled on the way', await page.evaluate(() => window.__ndSound.log.length >= 2), await page.evaluate(() => window.__ndSound.log.map((l) => l.src).join(',')))

  // On to the compare slide, by the tour.
  await page.waitForFunction((n) => location.hash === `#/${n}`, cNo, { timeout: 12000 })
  const p0 = await page.locator('[data-kind="compare"]').getAttribute('data-pos')
  const seen = new Set()
  for (let i = 0; i < 70; i++) { seen.add(await page.locator('[data-kind="compare"]').getAttribute('data-pos').catch(() => null)); if (i === 24) await shot(page, 'compare-drag.png'); await page.waitForTimeout(100) }
  const lo = Math.min(...[...seen].map(Number)), hi = Math.max(...[...seen].map(Number))
  check('the tour drags the compare divider both ways', lo <= 20 && hi >= 80, `${p0} then ${lo}..${hi}`)
  check('still playing after the drags', (await playing(page)) === 'true')

  // A real key press stops it, and the cursor goes.
  await page.keyboard.press('Shift')
  await page.waitForTimeout(500)
  check('a trusted key press stops the tour', (await playing(page)) === 'false')
  check('the cursor is gone when the tour stops', (await cursorCount(page)) === 0)
  await context.close()
}

// 2. A trusted click on the slide stops the tour; the speaker toggle persists the choice across a reload.
{
  const { context, page } = await open(`${origin}/#/2`)
  await page.locator('.ndb-tour').click()
  await page.waitForTimeout(400)
  check('the tour runs', (await playing(page)) === 'true')
  await page.mouse.click(700, 400)
  await page.waitForTimeout(300)
  check('a real click stops the tour', (await playing(page)) === 'false')
  await page.locator('.nd-sound-btn').click()
  check('the speaker button switches sound off', await page.evaluate(() => localStorage.getItem('nimbledeck:sound') === '0' && !window.__ndSound.enabled))
  await page.reload({ waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(800)
  check('the choice survives a reload, and no context starts without a gesture', await page.evaluate(() => !window.__ndSound.enabled && window.__ndSound.state === 'none'))
  await page.locator('.nd-sound-btn').focus()
  await page.waitForTimeout(400)
  check('the label shows on focus and the button is a labelled toggle', await page.evaluate(() => { const b = document.querySelector('.nd-sound-btn'); return b.getAttribute('aria-label').startsWith('Sound') && getComputedStyle(b.querySelector('.nd-sound-text')).opacity === '1' }))
  await context.close()
}

// 3. The first impression: the big button says "with sound", and the pill can turn it off.
{
  const { context, page } = await open(`${origin}/`)
  check('the big play button reads "Watch the tour, with sound"', (await page.locator('.ndb-play').innerText()).includes('Watch the tour, with sound'))
  await page.locator('.ndb-with').click()
  check('the pill turns sound off for the tour', (await page.locator('.ndb-play').innerText()).includes('Watch the tour') && !(await page.locator('.ndb-play').innerText()).includes('with sound'))
  await shot(page, 'first-impression.png')
  await context.close()
}

// 4. Reduced motion: the cursor jumps, the tour still answers the quiz.
{
  const { context, page } = await open(`${origin}/#/1`, { reducedMotion: 'reduce' })
  const qNo = await page.evaluate(() => Number(document.querySelector('[data-kind="quiz"]')?.closest('[data-slidev-no]')?.dataset.slidevNo ?? 0))
  const target = qNo || 11
  await page.goto(`${origin}/#/${target}`)
  await page.waitForTimeout(500)
  await page.locator('.ndb-tour').click()
  await page.waitForFunction(() => document.querySelector('[data-kind="quiz"]')?.dataset.state !== 'open', null, { timeout: 9000 }).catch(() => {})
  check('reduced motion: the quiz is still answered', (await page.locator('[data-kind="quiz"]').getAttribute('data-state')) === 'good')
  await context.close()
}

// 5. The whole tour in real time, with the time of each slide.
if (full) {
  const { context, page } = await open(`${origin}/#/1`)
  await page.locator('.ndb-tour').click()
  const t0 = Date.now()
  await page.waitForFunction(() => document.querySelector('.ndb-tour')?.getAttribute('aria-pressed') === 'false', null, { timeout: 240000, polling: 500 })
  const total = (Date.now() - t0) / 1000
  const log = await page.evaluate(() => window.__tourLog)
  console.log('\n slide  settled  on slide  why')
  for (const l of log) console.log(`${String(l.page).padStart(6)}  ${l.settled == null ? '    -  ' : l.settled.toFixed(1).padStart(6) + 's'}  ${l.spent.toFixed(1).padStart(7)}s  ${l.why}`)
  console.log(`total ${total.toFixed(1)} s for ${log.length} slides`)
  check('the whole tour ends by itself', (await hash(page)).startsWith('#/'))
  check('the tour is about two minutes or less', total < 150, `${total.toFixed(0)} s`)
  await context.close()
}

check('no page error', errors.length === 0, errors.slice(0, 3).join(' | '))
check('no request left the machine', external.length === 0, external.slice(0, 3).join(' '))
await browser.close()
server.close()
console.log(failed ? `\n${failed} check(s) failed` : '\nall checks passed')
process.exit(failed ? 1 : 0)
