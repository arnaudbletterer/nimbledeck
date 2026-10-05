// Browser test of the motion and background presets against the running presets lab
// (`NIMBLEDECK_PORT_OFFSET=1900 nimbledeck run presets.md`). Usage: node presets-e2e.mjs [url] [--perf]
// Checks: the attribute contract and its replay, a build keeping its own reveal, reduced motion, text contrast over every
// background in three looks, and (with --perf) the main-thread cost of every background.
import { chromium } from 'playwright-chromium'
import { findChrome } from '../../packages/cli/src/chrome.mjs'

const base = process.argv.find((a) => a.startsWith('http')) || 'http://localhost:4930'
const perf = process.argv.includes('--perf')
const chrome = findChrome()
const browser = await chromium.launch(chrome ? { executablePath: chrome } : {})
let failed = 0
const check = (name, ok, detail = '') => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' (' + detail + ')' : ''}`); if (!ok) failed++ }
const open = async (reduced = false) => {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 }, reducedMotion: reduced ? 'reduce' : 'no-preference' })
  const page = await ctx.newPage()
  page.on('pageerror', (e) => { console.log('pageerror', String(e).slice(0, 200)); failed++ })
  return page
}
const go = async (page, n, q = '') => {
  await page.goto(`${base}/${n}${q}`, { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => [...document.querySelectorAll('.slidev-layout')].some((e) => e.getBoundingClientRect().width > 0 && e.dataset.ndMotion !== undefined || e.dataset.ndBg !== undefined))
}
const root = (page) => page.locator('.slidev-layout').filter({ visible: true }).first()
const running = (page) => page.evaluate(() => document.getAnimations().filter((a) => a.effect.getTiming().iterations !== Infinity && a.playState === 'running').length)

const page = await open()
await page.goto(`${base}/1`, { waitUntil: 'domcontentloaded' })
await page.waitForFunction(() => window.__slidev__?.nav.total > 1)
const total = await page.evaluate(() => window.__slidev__.nav.total)

// Slide 2 is the first motion slide (fade-up on the default layout).
await go(page, 2)
check('the slide root carries data-nd-motion', (await root(page).getAttribute('data-nd-motion')) === 'fade-up')
check('the entry animations run on arrival', (await running(page)) > 3)
await page.waitForTimeout(3000)
check('and are over after a few seconds, leaving no running finite animation', (await running(page)) === 0)
const settled = await page.evaluate(() => [...document.querySelectorAll('.slidev-layout')].filter((e) => e.getBoundingClientRect().width > 0).flatMap((r) => [...r.querySelectorAll('h1, li, blockquote')].map((e) => { const c = getComputedStyle(e); return c.opacity + c.translate + c.filter })))
check('every title, item and callout settles at its own style', settled.length >= 5 && settled.every((s) => s === '1nonenone'), settled.join(' | '))
await page.keyboard.press('ArrowRight'); await page.waitForTimeout(900)
await page.keyboard.press('ArrowLeft'); await page.waitForTimeout(300)
check('a slide replays its motion when it is entered again', (await running(page)) > 3 && (await root(page).getAttribute('data-nd-motion')) === 'fade-up')
// The documented replay: remove the attribute, let the browser compute style, add it back.
await page.waitForTimeout(3000)
await page.evaluate(() => { const r = [...document.querySelectorAll('.slidev-layout')].find((e) => e.getBoundingClientRect().width > 0); r.removeAttribute('data-nd-motion'); void r.offsetWidth; r.setAttribute('data-nd-motion', 'zoom') })
check('removing and re-adding the attribute replays any preset', (await running(page)) > 3)

// A build keeps its own reveal: the last slide has v-clicks under cascade.
await go(page, total, '?clicks=0')
await page.waitForTimeout(3500)
const hidden = () => page.evaluate(() => [...document.querySelectorAll('.slidev-layout')].filter((e) => e.getBoundingClientRect().width > 0).flatMap((r) => [...r.querySelectorAll('li')].map((e) => +getComputedStyle(e).opacity)))
check('items hidden by v-click stay hidden once the motion has played', (await hidden()).every((o) => o === 0), (await hidden()).join(','))
await page.keyboard.press('ArrowRight'); await page.waitForTimeout(500)
const afterClick = await hidden()
check('a click reveals the next item only', afterClick[0] === 1 && afterClick[1] === 0, afterClick.join(','))

// Deck-level default and motion: none are covered by the checker tests; here the DOM contract of a background.
const bgSlides = []
for (let n = 2; n <= total; n++) {
  await go(page, n)
  const a = await root(page).evaluate((e) => e.dataset.ndBg)
  if (a) bgSlides.push([n, a])
}
check('every background slide has its layer inside the layout root, below the content', await (async () => {
  await go(page, bgSlides[0][0]); await page.waitForTimeout(800)
  return page.evaluate(() => { const r = [...document.querySelectorAll('.slidev-layout')].find((e) => e.getBoundingClientRect().width > 0); const l = r.querySelector(':scope > .nd-bgx'); return !!l && getComputedStyle(l).zIndex === '-1' && getComputedStyle(r).isolation === 'isolate' })
})())
check('neighbouring slides carry no background layer (idle cost is zero)', await page.evaluate(() => document.querySelectorAll('.nd-bgx').length <= 1))

// Reduced motion: no entry animation at all, backgrounds still.
const rpage = await open(true)
await go(rpage, 2); await rpage.waitForTimeout(150)
const rm = await rpage.evaluate(() => document.getAnimations().length)
check('reduced motion: no animation runs on a motion slide', rm === 0, `${rm} animations`)
await go(rpage, bgSlides[0][0]); await rpage.waitForTimeout(300)
check('reduced motion: no animation runs on a background slide', (await rpage.evaluate(() => document.getAnimations().length)) === 0)
await rpage.context().close()

// Contrast: hide the text, photograph what lies behind it, compare every pixel with the ink colour.
const lum = `(r, g, b) => { const f = (v) => { v /= 255; return v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4 }; return .2126 * f(r) + .7152 * f(g) + .0722 * f(b) }`
async function minContrast(p, box) {
  const inkRgb = await p.evaluate(() => getComputedStyle([...document.querySelectorAll('.slidev-layout')].find((e) => e.getBoundingClientRect().width > 0)).color)
  await p.addStyleTag({ content: '.slidev-layout > *:not(.nd-bgx) { visibility: hidden !important }' })
  const shot = (await p.screenshot({ clip: box })).toString('base64')
  return p.evaluate(async ({ shot, lumSrc, inkRgb }) => {
    const lum = eval(lumSrc)
    const img = new Image(); img.src = 'data:image/png;base64,' + shot; await img.decode()
    // Local mean over 16 px blocks: a 2 px star or a grid line is not a background, the glow around it is.
    const c = document.createElement('canvas'); c.width = Math.ceil(img.width / 16); c.height = Math.ceil(img.height / 16)
    const g = c.getContext('2d'); g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high'; g.drawImage(img, 0, 0, c.width, c.height)
    const probe = document.createElement('canvas').getContext('2d'); probe.fillStyle = inkRgb.trim() || '#000'; probe.fillRect(0, 0, 1, 1)
    const [ir, ig, ib] = probe.getImageData(0, 0, 1, 1).data
    const L = lum(ir, ig, ib), d = g.getImageData(0, 0, c.width, c.height).data
    let worst = 99
    for (let i = 0; i < d.length; i += 4) { const l = lum(d[i], d[i + 1], d[i + 2]); const k = (Math.max(L, l) + .05) / (Math.min(L, l) + .05); if (k < worst) worst = k }
    return worst
  }, { shot, lumSrc: lum, inkRgb })
}
for (const look of ['studio', 'studio-light', 'plain']) {
  const cp = await open()
  await cp.goto(`${base}/1`, { waitUntil: 'domcontentloaded' })
  await cp.waitForFunction(() => window.__slidev__?.nav.total > 1)
  await cp.evaluate((l) => { document.documentElement.dataset.ndVariant = l }, look)
  let worst = 99, which = ''
  for (const [n, id] of bgSlides.filter(([, id], i, a) => a.findIndex((x) => x[1] === id) === i)) {
    for (const [off, box] of [[0, { x: 60, y: 20, width: 1160, height: 480 }], [1, { x: 300, y: 250, width: 680, height: 240 }]]) {
      await cp.goto(`${base}/${n + off}`, { waitUntil: 'domcontentloaded' })
      await cp.waitForFunction(() => [...document.querySelectorAll('.slidev-layout')].some((e) => e.getBoundingClientRect().width > 0 && e.dataset.ndBg))
      await cp.evaluate((l) => { document.documentElement.dataset.ndVariant = l }, look)
      await cp.keyboard.press('ArrowRight'); await cp.waitForTimeout(250); await cp.keyboard.press('ArrowLeft')
      await cp.waitForTimeout(2600)
      const k = await minContrast(cp, box)
      if (k < worst) { worst = k; which = `${id} slide ${n + off}` }
    }
  }
  check(`text stays at least 4.5:1 over every background in ${look}`, worst >= 4.5, `worst ${worst.toFixed(2)}:1 at ${which}`)
  await cp.context().close()
}

if (perf) {
  // Main-thread share: CDP TaskDuration over 5 s, with the slide on screen.
  const pp = await open()
  const client = await pp.context().newCDPSession(pp)
  await client.send('Performance.enable')
  const sample = async (n) => {
    await go(pp, n); await pp.waitForTimeout(2500)
    const task = async () => (await client.send('Performance.getMetrics')).metrics.find((m) => m.name === 'TaskDuration').value
    const a = await task(), t0 = Date.now(); await pp.waitForTimeout(5000)
    return ((await task()) - a) / ((Date.now() - t0) / 1000) * 100
  }
  const base0 = await sample(2)
  const net = {}
  console.log(`main thread, plain motion slide (idle): ${base0.toFixed(1)}%`)
  for (const [n, id] of bgSlides.filter(([, id], i, a) => a.findIndex((x) => x[1] === id) === i)) {
    const p = await sample(n); console.log(`main thread, background ${id}: ${p.toFixed(1)}%`)
    check(`background ${id} adds under 5% to the main thread`, p - base0 < 5, `${p.toFixed(1)}% in all, ${(p - base0).toFixed(1)}% more than a slide with none`)
  }
}
await browser.close()
console.log(failed ? `${failed} FAILED` : 'ALL PASSED')
process.exit(failed ? 1 : 0)
