// Browser end-to-end test of the built site (run `npm run docs:build` first).
// Usage: node website/site-e2e.mjs [--shots <dir>]
// It serves site/ under its real base path and opens it in Chrome with every external request left hanging. It checks the
// deck-first home page: first slide time, the hint, the bar on every slide (never over the slide, Docs always reachable),
// the tour (starts, plays, pauses on a key, stops at the end), a phone screen, print, reduced motion, an old docs address
// that redirects, and that nothing outside the site is ever requested.
import { mkdirSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { chromium } from 'playwright-chromium'
import { findChrome } from '../packages/cli/src/chrome.mjs'
import { serve } from './preview.mjs'
import { siteConfig } from './site.mjs'

const shots = process.argv.includes('--shots') ? resolve(process.argv[process.argv.indexOf('--shots') + 1]) : null
if (shots) mkdirSync(shots, { recursive: true })
const { base } = siteConfig()
const server = await serve(0)
const origin = `http://127.0.0.1:${server.address().port}`
const home = origin + base
const chrome = findChrome()
const browser = await chromium.launch(chrome ? { executablePath: chrome } : {})
let failed = 0
const check = (name, ok, detail = '') => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' (' + detail + ')' : ''}`); if (!ok) failed++ }
const external = []
const errors = []
async function open(viewport, opts = {}) {
  const context = await browser.newContext({ viewport, ...opts })
  await context.route((u) => new URL(u.href).hostname !== '127.0.0.1', (route) => { external.push(route.request().url()) })   // left hanging
  const page = await context.newPage()
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 160)))
  return { context, page }
}
const shown = (page) => page.waitForFunction(() => [...document.querySelectorAll('.slidev-layout')].some((e) => e.getBoundingClientRect().width > 0), null, { timeout: 15000 })
const hash = (page) => page.evaluate(() => location.hash)
const aria = (page) => page.locator('.ndb-tour').getAttribute('aria-pressed')

// 1. Desktop, 1440x900.
{
  const { context, page } = await open({ width: 1440, height: 900 })
  const t0 = Date.now()
  await page.goto(home, { waitUntil: 'domcontentloaded' })
  await shown(page)
  const ms = Date.now() - t0
  check('the first slide shows within 3 s', ms < 3000, `${ms} ms`)
  check('the page has its title, description and canonical address', await page.evaluate(() => /Nimbledeck/.test(document.title) && !!document.querySelector('meta[name=description]') && !!document.querySelector('link[rel=canonical]')))
  check('the hint asks for the right arrow', (await page.locator('.ndb-hint').innerText()) === 'or press the right arrow to browse')
  if (shots) await page.screenshot({ path: join(shots, 'desktop-first.png') })
  await page.keyboard.press('ArrowRight')
  await page.waitForTimeout(500)
  check('the hint is gone after the first move', (await page.locator('.ndb-hint').count()) === 0)

  // The bar on every slide: it ends where the slide begins, and Docs is always a visible, clickable link.
  const total = Number((await page.locator('.ndb-count').innerText()).split('/')[1])
  let bad = []
  await page.goto(`${home}#/1`)
  for (let n = 1; n <= total; n++) {
    await page.waitForTimeout(450)
    const g = await page.evaluate(() => {
      const bar = document.querySelector('.ndb').getBoundingClientRect()
      const slide = document.querySelector('#slide-content').getBoundingClientRect()
      const docs = document.querySelector('.ndb-docs').getBoundingClientRect()
      const hit = document.elementFromPoint(docs.left + docs.width / 2, docs.top + docs.height / 2)
      return { barBottom: bar.bottom, slideTop: slide.top, docsOk: docs.width > 20 && hit?.classList.contains('ndb-docs'), page: location.hash }
    })
    if (g.slideTop < g.barBottom - 0.5 || !g.docsOk) bad.push(`${n}: ${JSON.stringify(g)}`)
    if (shots && (n === 1 || n === 6 || n === 9)) await page.screenshot({ path: join(shots, `desktop-${n}.png`) })
    // one step may be a click build: the page number only changes once its builds are done
    for (let k = 0; k < 6; k++) { const before = await hash(page); await page.keyboard.press('ArrowRight'); await page.waitForTimeout(80); if ((await hash(page)) !== before) break }
  }
  check(`the bar never covers a slide and Docs is reachable on all ${total} slides`, bad.length === 0, bad.join('; '))
  check('the bar links to Docs, Playground and GitHub', await page.evaluate(() => ['Docs', 'Playground', 'GitHub'].every((t) => [...document.querySelectorAll('.ndb a')].some((a) => a.textContent === t))))

  // The tour. Time is faked so that a dwell of ten seconds takes no time at all.
  await context.close()
}
{
  const { context, page } = await open({ width: 1440, height: 900 })
  await page.clock.install()
  await page.goto(`${home}#/1`, { waitUntil: 'domcontentloaded' })
  await shown(page)
  const total = Number((await page.locator('.ndb-count').innerText()).split('/')[1])
  check('the tour is off until asked', (await aria(page)) === 'false')
  await page.locator('.ndb-tour').click()
  check('Play the tour turns it on', (await aria(page)) === 'true')
  check('while the tour plays, a real pointer is kept off the slide by a shield', await page.evaluate(() => document.elementFromPoint(640, 450)?.classList.contains('ndb-shield')))
  await page.clock.runFor(11000)
  await page.waitForTimeout(300)
  const h1 = await hash(page)
  check('the tour moves on by itself', h1 !== '#/1' && h1 !== '', h1)
  await page.clock.runFor(60000)
  await page.waitForTimeout(300)
  check('the tour keeps going', Number((await hash(page)).slice(2)) > Number(h1.slice(2)), await hash(page))
  await page.keyboard.press('ArrowRight')
  check('a key press pauses the tour', (await aria(page)) === 'false')
  check('and the shield is gone, the slide is the viewer\'s again', await page.evaluate(() => !document.querySelector('.ndb-shield') && !document.elementFromPoint(640, 450)?.classList.contains('ndb-shield')))
  const h2 = await hash(page)
  await page.clock.runFor(30000)
  check('a paused tour stays put', (await hash(page)) === h2)
  // The end: the tour stops after the last slide's time and does not wrap. (Started on the last slide it plays again from the start.)
  await page.goto(`${home}#/${total - 1}`)
  await page.waitForTimeout(400)
  await page.locator('.ndb-tour').click()
  await page.clock.runFor(40000)
  check('the tour stops at the end', (await aria(page)) === 'false' && (await hash(page)) === `#/${total}`, `${await hash(page)}`)
  await context.close()
}

// 2. Wide screen, a tablet and a phone: the 16:9 slide fits, the bar is usable with touch.
for (const [name, vp] of [['1080p', { width: 1920, height: 1080 }], ['tablet', { width: 820, height: 1180 }], ['phone', { width: 390, height: 844 }]]) {
  const touch = name !== '1080p'
  const { context, page } = await open(vp, touch ? { hasTouch: true, isMobile: true } : {})
  await page.goto(home, { waitUntil: 'domcontentloaded' })
  await shown(page)
  await page.waitForTimeout(800)
  const g = await page.evaluate(() => {
    const r = (s) => document.querySelector(s)?.getBoundingClientRect()
    const slide = r('#slide-content'), bar = r('.ndb'), tour = r('.ndb-tour'), docs = r('.ndb-docs')
    return { slide: [slide.left, slide.top, slide.right, slide.bottom].map(Math.round), barBottom: bar.bottom, w: innerWidth, h: innerHeight,
      tour: [tour.left, tour.right, tour.height].map(Math.round), docs: [docs.left, docs.right, docs.height].map(Math.round), scrolls: document.scrollingElement.scrollWidth > innerWidth }
  })
  check(`${name}: the slide fits the screen below the bar`, g.slide[0] >= -1 && g.slide[2] <= g.w + 1 && g.slide[3] <= g.h + 1 && g.slide[1] >= g.barBottom - 1, JSON.stringify(g.slide))
  check(`${name}: Docs and the tour button are inside the screen`, g.docs[1] <= g.w && g.tour[1] <= g.w && g.docs[0] >= 0, `docs ${g.docs}, tour ${g.tour}`)
  if (touch) check(`${name}: touch targets are at least 34 px high`, g.tour[2] >= 34 && g.docs[2] >= 34, `${g.tour[2]} ${g.docs[2]}`)
  check(`${name}: no sideways scroll`, !g.scrolls)
  if (shots) await page.screenshot({ path: join(shots, `${name}-first.png`) })
  if (touch) {
    check(`${name}: the hint speaks of swiping`, (await page.locator('.ndb-hint').innerText()).startsWith('or swipe'))
    // A swipe left moves to the next slide (Slidev's own touch control).
    const before = await hash(page)
    const cdp = await context.newCDPSession(page)
    const y = Math.round(vp.height / 2)
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: vp.width - 40, y }] })
    for (let i = 1; i <= 8; i++) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: vp.width - 40 - i * 30, y }] })
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
    await page.waitForTimeout(700)
    check(`${name}: a swipe moves to the next slide`, (await hash(page)) !== before, `${before} to ${await hash(page)}`)
    // The tour button works with a tap.
    await page.locator('.ndb-tour').tap()
    check(`${name}: the tour button answers a tap`, (await aria(page)) === 'true')
  }
  await context.close()
}

// 3. Print, reduced motion, an old address, the 404.
{
  const { context, page } = await open({ width: 1280, height: 720 }, { reducedMotion: 'reduce' })
  await page.goto(home, { waitUntil: 'domcontentloaded' })
  await shown(page)
  check('reduced motion: the bar and the hint do not animate', await page.evaluate(() => document.querySelector('.ndb').classList.contains('ndb-calm') && getComputedStyle(document.querySelector('.ndb-play')).animationName === 'none'))
  await page.emulateMedia({ media: 'print' })
  check('print: the bar and the hint are not printed', await page.evaluate(() => getComputedStyle(document.querySelector('.ndb')).display === 'none' && getComputedStyle(document.querySelector('.ndb-cta')).display === 'none'))
  await page.goto(`${home}layouts/`, { waitUntil: 'domcontentloaded' })
  await page.waitForURL(`${home}docs/layouts/`, { timeout: 5000 }).catch(() => {})
  check('an old docs address redirects into /docs/', page.url() === `${home}docs/layouts/`, page.url())
  const r = await page.goto(`${home}no-such-page/`)
  check('an unknown address gets the 404 page', r.status() === 404 && (await page.content()).includes('Page not found'))
  await context.close()
}

check('no request left the site', external.length === 0, [...new Set(external)].slice(0, 4).join(' ') || 'none')
check('no page errors', errors.length === 0, errors.join(' | '))
await browser.close()
server.close()
console.log(failed ? `\n${failed} FAILED` : '\nall passed')
process.exit(failed ? 1 : 0)
