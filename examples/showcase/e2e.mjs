// End-to-end test of the showcase deck, in a real Chrome.
//
//   node e2e.mjs                    web edition: builds it (npm run build:web), serves the static files and walks every slide
//   node e2e.mjs --no-build         web edition, reusing an existing dist/ built with the same WEB_BASE
//   node e2e.mjs --edition full     full edition: starts `nimbledeck run` (needs uv), checks LiveCode runs and PyStream streams
//   node e2e.mjs --edition all      both
//
// It asserts structure and behaviour, never copy or pixel positions: the slides come from showcase.md, so a reworded or
// re-laid-out deck keeps passing while a broken component, a missing asset, a console error, a request to the outside world
// or content cut off by the 1280 x 720 frame (the same measure as `nimbledeck verify`) fails it.
import { spawn, spawnSync } from 'node:child_process'
import { existsSync, readFileSync, statSync } from 'node:fs'
import { createServer } from 'node:http'
import { extname, join, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright-chromium'
import { findChrome } from '../../packages/cli/src/chrome.mjs'
import { loadConfig } from '../../packages/cli/src/config.mjs'
import { killTree } from '../../packages/cli/src/run.mjs'
import { splitSlides } from '../../packages/cli/src/slides.mjs'
import { measure } from '../../packages/cli/src/verify.mjs'
import { webEdition } from '../../packages/cli/src/webedition.mjs'

const here = fileURLToPath(new URL('.', import.meta.url))
const args = process.argv.slice(2)
const opt = (name, dflt) => { const i = args.indexOf(`--${name}`); return i < 0 ? dflt : args[i + 1] }
const edition = opt('edition', 'web')
if (!['web', 'full', 'all'].includes(edition)) { console.error('--edition must be web, full or all'); process.exit(2) }

const source = readFileSync(join(here, 'showcase.md'), 'utf8')
const allSlides = splitSlides(source)
// What the web edition shows: every slide except those that need `nimbledeck run` and have no recording (the first stays).
const leftOut = webEdition(source, join(here, 'public')).skipped
const webSlides = allSlides.filter((_, i) => !leftOut.includes(i + 1))

// Components of the motion toolkit and the built-in ones, by the data-kind each puts on its root.
const KINDS = { Kinetic: 'kinetic', Typewriter: 'typewriter', Terminal: 'terminal', Aurora: 'aurora', Stat: 'stat', Marquee: 'marquee',
  Spotlight: 'spotlight', Tilt: 'tilt', Chart: 'chart', Scene3D: 'webgl', Orbit: 'orbit', Compare: 'compare', Quiz: 'quiz', LookWall: 'lookwall', MotionWall: 'wall-motion' }
// A wall's cards are slides that carry their own presets, so MotionWall cannot carry data-kind (a preset leaves everything below a data-kind alone): it is found by data-wall.
const selOf = (k) => (k.startsWith('wall-') ? `[data-wall=${k.slice(5)}]` : `[data-kind=${k}]`)
const kindsOf = (slide) => [...new Set([...slide.body.matchAll(/<([A-Z]\w*)\b/g)].map((m) => KINDS[m[1]]).filter(Boolean))]
const LIVE_KINDS = ['livecode', 'pystream', 'demo']

let failed = 0, passed = 0
const check = (name, ok, detail = '') => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' (' + detail + ')' : ''}`); ok ? passed++ : failed++ }
const section = (t) => console.log(`\n== ${t} ==`)

const chrome = findChrome()
const launchOptions = chrome ? { executablePath: chrome } : {}
if (!chrome) console.log('note: no system Chrome found, using the browser bundled with playwright-chromium')

// ---------------------------------------------------------------------------------------------------------------------
// Page helpers (the same for both editions). `route(n)` is how a slide is addressed: #/n in the web edition, /n in the full one.
const shown = (page, timeout = 15000) => page.waitForFunction(() => [...document.querySelectorAll('.slidev-layout')].some((e) => e.getBoundingClientRect().width > 0), null, { timeout })
// Neighbouring slides stay mounted (hidden at 0 x 0): everything below looks inside the layout that has a real size.
const inSlide = (page, fn, arg) => page.evaluate(([src, a]) => {
  const root = [...document.querySelectorAll('.slidev-layout')].find((e) => e.getBoundingClientRect().width > 0)
  return root ? new Function('root', 'arg', `return (${src})(root, arg)`)(root, a) : null
}, [fn.toString(), arg])
const kindsHere = (page) => inSlide(page, (root) => [...new Set([...root.querySelectorAll('[data-kind]')].map((e) => e.dataset.kind).concat([...root.querySelectorAll('[data-wall]')].map((e) => 'wall-' + e.dataset.wall)))])

// A browser context that records what a deck must never do: throw, log errors, fail to load its own files, or talk to the
// outside world. `network`: 'abort' answers every external request with a failure, 'hang' never answers (a dead connection).
async function open(browser, { origin, network = 'abort', reduced = false, dpr = 1 } = {}) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: dpr, reducedMotion: reduced ? 'reduce' : 'no-preference' })
  const log = { errors: [], external: [], failed: [], media: [] }
  const local = (u) => new URL(u).origin === origin
  await context.route((u) => !/^(http|https|ws|wss):$/.test(u.protocol) || local(u.href) ? false : true, (r) => {
    log.external.push(r.request().url().slice(0, 120))
    if (network === 'abort') r.abort('internetdisconnected')   // 'hang': never answered
  })
  const page = await context.newPage()
  page.on('pageerror', (e) => log.errors.push(`pageerror: ${String(e).slice(0, 200)}`))
  // Slidev's own FloatingVue patch fails on every load of any deck: upstream noise, not ours.
  page.on('console', (m) => { if (m.type() === 'error' && !/FloatingVue/.test(m.text())) log.errors.push(`console: ${m.text().slice(0, 200)}`) })
  page.on('requestfailed', (r) => { if (local(r.url()) && !/ERR_ABORTED/.test(r.failure()?.errorText ?? '')) log.failed.push(`${r.url()} ${r.failure()?.errorText}`) })
  page.on('response', (r) => {
    if (!local(r.url())) return
    const type = r.request().resourceType()
    if (r.status() >= 400) log.failed.push(`${r.status()} ${r.url()}`)
    if (['image', 'media', 'font', 'script', 'stylesheet'].includes(type)) log.media.push({ type, status: r.status(), url: r.url() })
  })
  return { context, page, log }
}

// ---------------------------------------------------------------------------------------------------------------------
async function webTests(browser) {
  const base = process.env.WEB_BASE ?? '/nimbledeck/demos/showcase/'
  const dist = resolve(here, process.env.WEB_OUT ?? 'dist')
  if (!args.includes('--no-build')) {
    section('build')
    const t = Date.now()
    const b = spawnSync('npm', ['run', 'build:web'], { cwd: here, stdio: 'ignore', shell: process.platform === 'win32', env: process.env })
    check('npm run build:web succeeds', b.status === 0, `${((Date.now() - t) / 1000).toFixed(1)} s`)
    if (b.status !== 0) return
  }
  check('the build is there and holds no runner token', existsSync(join(dist, 'index.html')) && !(existsSync(join(dist, 'nimbledeck.json')) && /token/.test(readFileSync(join(dist, 'nimbledeck.json'), 'utf8'))))
  if (!existsSync(join(dist, 'index.html'))) return

  // A static server mounted at the deck's base path, like the real host. Unknown paths are 404s the page will report.
  const types = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.jpg': 'image/jpeg', '.png': 'image/png', '.mp4': 'video/mp4', '.webm': 'video/webm', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.woff': 'font/woff', '.wasm': 'application/wasm' }
  const server = createServer((req, res) => {
    const path = decodeURIComponent(new URL(req.url, 'http://x').pathname)
    let file = path.startsWith(base) ? resolve(dist, path.slice(base.length)) : null
    if (file && (file === dist || file.startsWith(dist + sep)) && existsSync(file) && statSync(file).isDirectory()) file = join(file, 'index.html')
    if (!file || !(file === dist || file.startsWith(dist + sep)) || !existsSync(file)) { res.statusCode = 404; return res.end('not found') }
    res.setHeader('content-type', types[extname(file)] || 'application/octet-stream')
    res.end(readFileSync(file))
  })
  await new Promise((ok) => server.listen(0, '127.0.0.1', ok))
  const origin = `http://127.0.0.1:${server.address().port}`
  const url = (n, q = '') => `${origin}${base}#/${n}${q}`
  const total = webSlides.length
  const routeOf = (page) => Number(new URL(page.url()).hash.match(/^#\/(\d+)/)?.[1] ?? 0)
  const expected = (n) => kindsOf(webSlides[n - 1])
  const problems = (log, what) => {
    check(`${what}: no page errors or console errors`, log.errors.length === 0, [...new Set(log.errors)].slice(0, 3).join(' | '))
    check(`${what}: every local file loads`, log.failed.length === 0, [...new Set(log.failed)].slice(0, 3).join(' | '))
    const notOk = log.media.filter((m) => ![200, 206, 304].includes(m.status))
    check(`${what}: every image, video, font, script and style answers 200`, notOk.length === 0, notOk.slice(0, 3).map((m) => `${m.status} ${m.url}`).join(' | '))
    check(`${what}: no request leaves the machine`, log.external.length === 0, [...new Set(log.external)].slice(0, 3).join(' '))
  }

  try {
    section('the deck, walked with the keyboard')
    check('the source has slides to show', total >= 2 && allSlides.length >= total, `${total} of ${allSlides.length} slides in the web edition`)
    const { context, page, log } = await open(browser, { origin })
    await page.goto(url(1), { waitUntil: 'domcontentloaded' })
    await shown(page)
    await page.mouse.click(640, 30)   // focus the page without hitting anything

    const seen = []   // the route of each slide, in the order the keyboard reaches them
    const bad = { missing: [], inactive: [], leaked: [], offline: [], stray: [] }
    let stuck = 0, presses = 0
    for (; presses < 300 && stuck < 8; presses++) {
      const n = routeOf(page)
      if (!seen.includes(n)) {
        seen.push(n)
        await shown(page)
        const want = expected(n)
        // Components mount with their slide: wait for the expected ones rather than sleeping.
        await page.waitForFunction((w) => { const r = [...document.querySelectorAll('.slidev-layout')].find((e) => e.getBoundingClientRect().width > 0); return !!r && w.every((k) => r.querySelector(k.startsWith('wall-') ? `[data-wall=${k.slice(5)}]` : `[data-kind=${k}]`)) }, want, { timeout: 8000 }).catch(() => {})
        const kinds = await kindsHere(page)
        const miss = want.filter((k) => !kinds.includes(k))
        if (miss.length) bad.missing.push(`slide ${n}: ${miss.join(', ')}`)
        const leaked = kinds.includes('recording') ? [] : LIVE_KINDS.filter((k) => kinds.includes(k))   // a recorded live component is expected: it plays its clip
        if (leaked.length) bad.leaked.push(`slide ${n}: ${leaked.join(', ')}`)
        // Components that animate switch themselves on while their slide is on screen (and never before: see the next check).
        const ACTIVE = { aurora: 'nd-on', stat: 'nd-on', marquee: 'nd-mq-run' }
        for (const [kind, cls] of Object.entries(ACTIVE)) {
          if (!want.includes(kind)) continue
          const ok = await page.waitForFunction(([k, c]) => { const r = [...document.querySelectorAll('.slidev-layout')].find((e) => e.getBoundingClientRect().width > 0); return !!r && [...r.querySelectorAll(`[data-kind=${k}]`)].some((e) => e.classList.contains(c)) }, [kind, cls], { timeout: 8000 }).then(() => true, () => false)
          if (!ok) bad.inactive.push(`slide ${n}: ${kind} never became active`)
        }
        const off = await inSlide(page, (root) => [...root.querySelectorAll('[data-state=offline], .nd-off, .nd-site-off, .nd-live-msg')].filter((e) => !e.closest('[data-kind=recording]') && !e.querySelector('[data-kind=recording]')).length)   // a recording that stands in for a process is not an offline panel
        if (off) bad.offline.push(`slide ${n}: ${off} offline panel(s)`)
        const said = await inSlide(page, (root) => /Start everything with|is not running|nimbledeck run/i.test(root.innerText))   // the text of any offline notice, panel or not
        if (said) bad.offline.push(`slide ${n}: says to run nimbledeck`)
        // Slides that are mounted but not on screen must be quiet.
        const awake = await page.evaluate(() => [...document.querySelectorAll('.slidev-layout')].filter((e) => e.getBoundingClientRect().width === 0).flatMap((e) => [...e.querySelectorAll('.nd-on, .nd-mq-run, .nd-k-play')]).length)
        if (awake) bad.stray.push(`slide ${n}: ${awake} animated element(s) running on a hidden slide`)
      }
      await page.keyboard.press('ArrowRight')
      await page.waitForTimeout(220)
      stuck = routeOf(page) === n && n === total ? stuck + 1 : 0   // at the last slide, clicks run out and the page stops moving
    }
    check('the keyboard reaches every slide of the web edition, in order, and stops at the last', seen.length === total && seen.every((n, i) => n === i + 1), `visited ${seen.join(',')} of ${total}`)
    check('the slides that need `nimbledeck run` and have no recording are absent, no live-only component is mounted', bad.leaked.length === 0 && total === allSlides.length - leftOut.length, bad.leaked.join('; ') || `${allSlides.length - total} left out`)
    check('every slide mounts the live components its source asks for', bad.missing.length === 0, bad.missing.join('; '))
    check('animated components are active on their slide', bad.inactive.length === 0, bad.inactive.join('; '))
    check('no animation keeps running on a slide that is not shown', bad.stray.length === 0, bad.stray.join('; '))
    check('no slide shows an offline or "run it locally" panel', bad.offline.length === 0, bad.offline.join('; '))
    // Back through the deck: a few presses of ArrowLeft move to an earlier slide and the page keeps showing one.
    for (let i = 0; i < 6; i++) { await page.keyboard.press('ArrowLeft'); await page.waitForTimeout(150) }
    await page.waitForTimeout(400)
    check('the keyboard walks back', routeOf(page) < total && (await shown(page).then(() => true, () => false)), `slide ${routeOf(page)}`)
    problems(log, 'the walk')
    await context.close()

    section('direct loads and reload')
    const mid = Math.ceil(total / 2)
    {
      const s = await open(browser, { origin })
      await s.page.goto(url(mid), { waitUntil: 'domcontentloaded' })
      await shown(s.page)
      check('a middle slide loaded by its address shows that slide', routeOf(s.page) === mid, `slide ${routeOf(s.page)}`)
      const want = expected(mid)
      const kinds = await kindsHere(s.page)
      check('and its components are mounted', want.every((k) => kinds.includes(k)), want.join(',') || 'no live component')
      await s.page.reload({ waitUntil: 'domcontentloaded' })
      await shown(s.page)
      check('reloading keeps the slide', routeOf(s.page) === mid, `slide ${routeOf(s.page)}`)
      await s.page.keyboard.press('ArrowRight'); await s.page.waitForTimeout(600)
      check('and the keyboard still works after the reload', routeOf(s.page) === mid + 1 || routeOf(s.page) === mid, `slide ${routeOf(s.page)} (a click may be pending)`)
      check('the first and the last slide load directly too', await (async () => {
        for (const n of [1, total]) { await s.page.goto(url(n), { waitUntil: 'domcontentloaded' }); await shown(s.page); if (routeOf(s.page) !== n) return false }
        return true
      })())
      problems(s.log, 'direct loads')
      await s.context.close()
    }

    section('every slide, loaded directly, measured like nimbledeck verify')
    {
      const cfg = loadConfig(here)
      const s = await open(browser, { origin, dpr: 2 })   // verify measures at 2x: the canvases must be crisp there
      const issues = [], missing = [], videos = [], crops = []
      for (let n = 1; n <= total; n++) {
        await s.page.goto(url(n, '?clicks=99'), { waitUntil: 'domcontentloaded' })
        await shown(s.page)
        await s.page.waitForTimeout(/webgl|orbit|chart/.test(expected(n).join()) ? 3000 : 1300)
        const kinds = await kindsHere(s.page)
        const miss = expected(n).filter((k) => !kinds.includes(k))
        if (miss.length) missing.push(`slide ${n}: ${miss.join(', ')}`)
        // Video: it plays (readyState >= 2) or, where this Chrome lacks the codec, it is at least there and its file answered.
        const vids = await inSlide(s.page, (root) => [...root.querySelectorAll('video')].map((v) => ({ src: v.currentSrc || v.src, ready: v.readyState, error: v.error?.code ?? 0, h264: !!document.createElement('video').canPlayType('video/mp4; codecs="avc1.42E01E"') })))
        for (const v of vids) {
          const t = Date.now()
          let ready = v.ready
          while (ready < 2 && Date.now() - t < 6000) { await s.page.waitForTimeout(250); ready = (await inSlide(s.page, (root) => root.querySelector('video')?.readyState)) ?? 0 }
          const got = s.log.media.find((m) => m.url === v.src || v.src.endsWith(new URL(m.url).pathname))
          if (ready >= 2) continue
          if (v.h264) videos.push(`slide ${n}: video not ready (readyState ${ready}, error ${v.error})`)
          else { console.log(`note  slide ${n}: this Chrome cannot decode H.264, so the video is only checked for presence and a 200`); if (!got || got.status !== 200) videos.push(`slide ${n}: video file ${v.src} not served`) }
        }
        // Canvases (Orbit, Aurora, Scene3D...) must sit inside the slide box, never cropped by it.
        const crop = await inSlide(s.page, (root) => { const f = root.getBoundingClientRect(); return [...root.querySelectorAll('canvas')].map((c) => { const r = c.getBoundingClientRect(); return { r, kind: c.closest('[data-kind]')?.dataset.kind } }).filter(({ r }) => r.width > 0 && (r.left < f.left - 2 || r.top < f.top - 2 || r.right > f.right + 2 || r.bottom > f.bottom + 2)).map(({ kind, r }) => `${kind ?? 'canvas'} ${Math.round(r.left - f.left)},${Math.round(r.top - f.top)} to ${Math.round(r.right - f.right)},${Math.round(r.bottom - f.bottom)}`) })
        if (crop?.length) crops.push(`slide ${n}: ${crop.join('; ')}`)
        const r = await s.page.evaluate(measure, { chrome: cfg.verify.chrome, bleed: cfg.verify.bleed, lead: cfg.leadLayouts })
        if (r.error) issues.push(`slide ${n}: ${r.error}`)
        else if (r.frame[0] !== 1280 || r.frame[1] !== 720) issues.push(`slide ${n}: frame is ${r.frame.join('x')}`)
        else for (const i of r.issues) issues.push(`slide ${n}: ${i.kind}: ${i.el} (${i.detail})`)
      }
      check('each slide loaded directly mounts its components', missing.length === 0, missing.join('; '))
      check('every video plays, or is present and served where Chrome has no H.264', videos.length === 0, videos.join('; '))
      check('every canvas lies inside its slide box (nothing cropped)', crops.length === 0, crops.join('; '))
      check('nothing is clipped, outside the slide, in the footer zone or soft', issues.length === 0, [...new Set(issues)].slice(0, 4).join(' | '))
      problems(s.log, 'the measured pass')
      await s.context.close()
    }

    section('the walls: every look and every motion, live')
    {
      const lookNo = webSlides.findIndex((x) => /<LookWall\b/.test(x.body)) + 1, motionNo = webSlides.findIndex((x) => /<MotionWall\b/.test(x.body)) + 1
      check('the deck has a look wall and a motion wall', lookNo > 0 && motionNo > 0, `slides ${lookNo} and ${motionNo}`)
      const s = await open(browser, { origin })
      await s.page.goto(url(lookNo), { waitUntil: 'domcontentloaded' })
      await shown(s.page)
      await s.page.waitForFunction(() => document.querySelectorAll('.nd-lw-card').length > 0, null, { timeout: 8000 })
      await s.page.waitForTimeout(3500)   // the cascade and the first ring step are over
      const wall = await inSlide(s.page, (root) => {
        const f = root.getBoundingClientRect(), cards = [...root.querySelectorAll('.nd-lw-card')], rects = cards.map((c) => c.getBoundingClientRect())
        const ids = document.documentElement.dataset.ndLooks.split(',')
        const tokens = cards.map((c) => getComputedStyle(c).getPropertyValue('--nd-bg').trim() + '|' + getComputedStyle(c).getPropertyValue('--nd-accent').trim())
        const overlap = rects.some((a, i) => rects.some((b, j) => j > i && a.left < b.right - 4 && b.left < a.right - 4 && a.top < b.bottom - 4 && b.top < a.bottom - 4))
        const inside = rects.every((r) => r.left >= f.left && r.top >= f.top && r.right <= f.right && r.bottom <= f.bottom)
        const sized = cards.every((c) => { const t = c.querySelector('.nd-lw-title'); return t.scrollWidth <= t.clientWidth + 1 && t.clientHeight > 8 })
        return { n: cards.length, ids: ids.length, ownIds: cards.every((c, i) => c.dataset.ndVariant === ids[i]), distinct: new Set(tokens).size, overlap, inside, sized, visible: cards.every((c) => +getComputedStyle(c).opacity === 1) }
      })
      check('the look wall shows one card for every look of the theme', wall.n === wall.ids && wall.ids >= 8 && wall.ownIds, `${wall.n} cards, ${wall.ids} looks`)
      check('each card takes its own colours from its look', wall.distinct >= wall.ids - 2, `${wall.distinct} distinct colour sets`)
      check('no card overlaps another, spills out of the slide, or loses its title', !wall.overlap && wall.inside && wall.sized && wall.visible, JSON.stringify({ overlap: wall.overlap, inside: wall.inside, sized: wall.sized, visible: wall.visible }))
      const variant = () => s.page.evaluate(() => document.documentElement.dataset.ndVariant)
      const deck = await variant()
      const ids = await s.page.evaluate(() => document.documentElement.dataset.ndLooks.split(','))
      const pick = ids.findIndex((v) => v !== deck)
      await s.page.hover(`.nd-lw-card:nth-child(${pick + 1})`)
      await s.page.waitForFunction((v) => document.documentElement.dataset.ndVariant === v, ids[pick], { timeout: 4000 }).catch(() => {})
      check('hovering a card puts the whole slide in that look', (await variant()) === ids[pick], await variant())
      await s.page.mouse.move(640, 710)
      await s.page.waitForFunction((v) => document.documentElement.dataset.ndVariant === v, deck, { timeout: 4000 }).catch(() => {})
      check('and moving away puts the deck look back', (await variant()) === deck, await variant())
      const keep = ids.findIndex((v, i) => v !== deck && i !== pick)
      await s.page.click(`.nd-lw-card:nth-child(${keep + 1})`)
      await s.page.mouse.move(640, 710)
      await s.page.waitForTimeout(1800)
      check('clicking a card keeps its look after the pointer leaves', (await variant()) === ids[keep], await variant())
      check('and the label on the slide names it', (await s.page.evaluate(() => document.querySelector('.nd-wd[data-wall=look] .nd-wd-pill')?.textContent)) === `ndVariant: ${ids[keep]}`)
      check('the click does not keep the arrow keys from turning the page', await s.page.evaluate(() => document.activeElement === document.body || !document.activeElement?.classList.contains('nd-lw-card')))
      await s.page.keyboard.press('ArrowRight')
      await s.page.waitForFunction((v) => document.documentElement.dataset.ndVariant === v, deck, { timeout: 4000 }).catch(() => {})
      check('leaving the slide restores the deck look', (await variant()) === deck && routeOf(s.page) !== lookNo, `${await variant()} on slide ${routeOf(s.page)}`)

      // The motion wall: every preset is a card, every card plays its own preset, the backdrops move.
      await s.page.goto(url(motionNo), { waitUntil: 'domcontentloaded' })
      await shown(s.page)
      await s.page.waitForFunction(() => document.querySelectorAll('.nd-mw-card').length > 0, null, { timeout: 8000 })
      await s.page.waitForTimeout(4200)
      const mw = await inSlide(s.page, (root) => {
        const f = root.getBoundingClientRect(), cards = [...root.querySelectorAll('.nd-mw-card')], motions = document.documentElement.dataset.ndMotions.split(','), bgs = document.documentElement.dataset.ndBackgrounds.split(',')
        const roots = cards.map((c) => c.querySelector('.slidev-layout')), bgRoots = [...root.querySelectorAll('.nd-mw-bg .slidev-layout')]
        const rects = [...cards, ...root.querySelectorAll('.nd-mw-bg')].map((c) => c.getBoundingClientRect())
        return {
          n: cards.length, motions: motions.length, own: roots.every((r, i) => r.getAttribute('data-nd-motion') === motions[i]),
          bgs: bgRoots.length, bgsWant: bgs.length, bgOwn: bgRoots.every((r, i) => r.getAttribute('data-nd-bg') === bgs[i]), layers: bgRoots.filter((r) => r.querySelector(':scope > .nd-bgx')).length,
          inside: rects.every((r) => r.left >= f.left && r.top >= f.top && r.right <= f.right && r.bottom <= f.bottom), seen: cards.filter((c) => +getComputedStyle(c.querySelector('.slidev-layout')).opacity === 1).length,
        }
      })
      check('the motion wall has a card for every motion preset, each playing its own', mw.n === mw.motions && mw.n >= 10 && mw.own, `${mw.n} cards, ${mw.motions} motions`)
      check('and a backdrop for every background preset, each with its layer', mw.bgs === mw.bgsWant && mw.bgOwn && mw.layers === mw.bgs, `${mw.bgs} backdrops, ${mw.layers} layers`)
      check('every card is shown and the whole wall lies inside the slide', mw.seen === mw.n && mw.inside, `${mw.seen} shown`)
      await s.page.evaluate(() => { window.__plays = 0; new MutationObserver((m) => { for (const r of m) if (r.target.getAttribute('data-nd-motion')) window.__plays++ }).observe(document.querySelector('.nd-mw'), { subtree: true, attributes: true, attributeFilter: ['data-nd-motion'] }) })
      await s.page.click('.nd-mw-card:nth-child(3)')
      await s.page.waitForTimeout(300)
      check('clicking a motion card replays that card', (await s.page.evaluate(() => window.__plays)) >= 1)
      // The slide itself plays the clicked preset: its own title carries the real preset's animation, the label and the typed line name it.
      const pickId = await s.page.evaluate(() => document.documentElement.dataset.ndMotions.split(',')[10])
      await s.page.click('.nd-mw-card:nth-child(11)')
      await s.page.waitForTimeout(120)
      const own = await s.page.evaluate(() => { const r = document.querySelector('.nd-wd-root'), h = r?.querySelector('h1'); return { id: r?.dataset.ndMotion, running: h ? h.getAnimations().length : 0, pill: document.querySelector('.nd-wd-pill')?.textContent, card: document.querySelector('.nd-mw-card:nth-child(11)').classList.contains('nd-mw-applied') } })
      check('clicking a motion card plays that preset on the slide\'s own title', own.id === pickId && own.running > 0, JSON.stringify(own))
      check('the label and the clicked card say what was applied', own.pill === `motion: ${pickId}` && own.card)
      await s.page.waitForTimeout(2600)   // the typed block retypes the frontmatter
      check('the typed block shows the clicked id', await s.page.evaluate((id) => document.querySelector('.nd-wd-root .nd-typewriter').textContent.includes(`motion: ${id}`), pickId))
      const bgId = await s.page.evaluate(() => document.documentElement.dataset.ndBackgrounds.split(',')[3])
      await s.page.click('.nd-mw-bg:nth-child(4)')
      await s.page.waitForTimeout(900)
      const bgs = await s.page.evaluate(() => ({ on: document.querySelector('.nd-wd-bgwrap').classList.contains('nd-wd-bgon'), id: document.querySelector('.nd-wd-bg')?.dataset.ndBg, layer: !!document.querySelector('.nd-wd-bg > .nd-bgx'), pill: document.querySelector('.nd-wd-pill')?.textContent }))
      check('clicking a backdrop applies it behind the slide, for a few seconds', bgs.on && bgs.id === bgId && bgs.layer && bgs.pill === `background: ${bgId}`, JSON.stringify(bgs))
      check('walls ' + 'raise no page error', s.log.errors.length === 0, s.log.errors.slice(0, 2).join(' | '))
      await s.context.close()
      // Reduced motion: both walls are there at once, in their final state, with nothing to play.
      const r = await open(browser, { origin, reduced: true })
      await r.page.goto(url(lookNo), { waitUntil: 'domcontentloaded' }); await shown(r.page); await r.page.waitForTimeout(500)
      const still = await inSlide(r.page, (root) => [...root.querySelectorAll('.nd-lw-card')].every((c) => +getComputedStyle(c).opacity === 1 && getComputedStyle(c).animationName === 'none'))
      check('reduced motion: the look wall is complete at once', still)
      await r.page.goto(url(motionNo), { waitUntil: 'domcontentloaded' }); await shown(r.page); await r.page.waitForTimeout(500)
      const still2 = await inSlide(r.page, (root) => [...root.querySelectorAll('.nd-mw-card')].every((c) => +getComputedStyle(c).opacity === 1 && +getComputedStyle(c.querySelector('.slidev-layout')).opacity === 1 && !c.querySelector('.slidev-layout').hasAttribute('data-nd-motion')))
      check('reduced motion: the motion wall shows every card finished, with nothing playing', still2)
      await r.context.close()
    }

    section('reduced motion: the final state at once')
    {
      const s = await open(browser, { origin, reduced: true })
      const stuckAt = []
      for (let n = 1; n <= total; n++) {
        const want = expected(n)
        if (!want.some((k) => ['kinetic', 'stat', 'typewriter', 'terminal', 'marquee'].includes(k))) continue
        await s.page.goto(url(n, '?clicks=99'), { waitUntil: 'domcontentloaded' })
        await shown(s.page)
        await s.page.waitForTimeout(1200)   // mounting takes a moment; typing the blocks out would take several seconds
        const r = await inSlide(s.page, (root) => ({
          units: [...root.querySelectorAll('[data-kind=kinetic] .nd-k-u')].filter((u) => +getComputedStyle(u).opacity < 1).length,
          counts: [...root.querySelectorAll('[data-kind=stat]')].filter((e) => e.querySelector('.nd-stat-live').textContent.trim() !== e.querySelector('.nd-stat-ghost').textContent.trim() || +getComputedStyle(e.querySelector('.nd-stat-label') ?? e).opacity < 1).length,
          typing: [...root.querySelectorAll('[data-kind=typewriter], [data-kind=terminal]')].filter((e) => !e.classList.contains('nd-done')).map((e) => e.dataset.kind + '.' + e.className + ' in ' + e.parentElement.className).join(' / '),
          moving: [...root.querySelectorAll('[data-kind=marquee].nd-mq-run')].length,
        }))
        if (r.units) stuckAt.push(`slide ${n}: ${r.units} kinetic unit(s) not shown`)
        if (r.counts) stuckAt.push(`slide ${n}: ${r.counts} stat(s) not at the final value`)
        if (r.typing) stuckAt.push(`slide ${n}: typed block(s) not done: ${r.typing}`)
        if (r.moving) stuckAt.push(`slide ${n}: marquee still scrolls`)
      }
      check('with reduced motion Kinetic, Stat, Typewriter and Terminal show their final state and Marquee stands still', stuckAt.length === 0, stuckAt.join('; '))
      problems(s.log, 'reduced motion')
      await s.context.close()
    }

    section('the network is blocked')
    for (const network of ['hang', 'abort']) {
      const s = await open(browser, { origin, network })
      const t0 = Date.now()
      await s.page.goto(url(1), { waitUntil: 'domcontentloaded' })
      await shown(s.page, 8000)
      const first = Date.now() - t0
      check(`${network}: the first slide shows within 4 s with every external request ${network === 'hang' ? 'unanswered' : 'refused'}`, first < 4000, `${first} ms`)
      const t1 = Date.now()
      await s.page.goto(url(mid), { waitUntil: 'domcontentloaded' })
      await shown(s.page, 8000)
      check(`${network}: a middle slide loaded directly shows within 4 s`, Date.now() - t1 < 4000, `${Date.now() - t1} ms`)
      await s.page.keyboard.press('ArrowRight'); await s.page.waitForTimeout(500)
      check(`${network}: no request was even attempted, and no page error`, s.log.external.length === 0 && s.log.errors.length === 0, [...s.log.external, ...s.log.errors].slice(0, 3).join(' | '))
      await s.context.close()
    }
  } finally {
    server.close()
  }
}

// ---------------------------------------------------------------------------------------------------------------------
async function fullTests(browser) {
  section('full edition (nimbledeck run)')
  const uv = spawnSync('uv', ['--version'], { shell: process.platform === 'win32', encoding: 'utf8' })
  if (uv.status !== 0) { console.log('SKIP  the full edition needs uv (https://docs.astral.sh/uv/) and it was not found on PATH'); return }
  const offset = Number(opt('port-offset', process.env.SHOWCASE_E2E_PORT_OFFSET ?? 600))
  const env = { ...process.env, NIMBLEDECK_PORT_OFFSET: String(offset) }
  const cfg = (() => { const o = process.env.NIMBLEDECK_PORT_OFFSET; process.env.NIMBLEDECK_PORT_OFFSET = String(offset); const c = loadConfig(here); if (o === undefined) delete process.env.NIMBLEDECK_PORT_OFFSET; else process.env.NIMBLEDECK_PORT_OFFSET = o; return c })()
  const origin = `http://localhost:${cfg.port}`
  const cli = resolve(here, '../../packages/cli/bin/nimbledeck.mjs')
  const child = spawn(process.execPath, [cli, 'run', 'showcase.md'], { cwd: here, env, detached: process.platform !== 'win32', stdio: 'ignore' })
  let exited = false
  child.on('exit', () => { exited = true })
  const stop = () => killTree(child)
  process.on('exit', stop)
  try {
    const t0 = Date.now()
    let up = false
    while (!up && !exited && Date.now() - t0 < 120000) {
      up = await fetch(`${origin}/1`).then((r) => r.ok, () => false)
      if (!up) await new Promise((r) => setTimeout(r, 500))
    }
    check('nimbledeck run starts the deck', up, `${((Date.now() - t0) / 1000).toFixed(1)} s on ${origin}`)
    if (!up) return

    const s = await open(browser, { origin: new URL(origin).origin })
    // The runner and the stream are on 127.0.0.1 (a different origin from localhost): they are the deck's own, not "external".
    await s.context.unroute(() => true).catch(() => {})
    const ext = []
    s.page.on('request', (r) => { const u = new URL(r.url()); if (!/^(localhost|127\.0\.0\.1)$/.test(u.hostname) && /^https?:$/.test(u.protocol)) ext.push(r.url().slice(0, 100)) })
    const go = async (n) => { await s.page.goto(`${origin}/${n}?clicks=99`, { waitUntil: 'domcontentloaded' }); await shown(s.page, 30000) }

    const liveIdx = allSlides.findIndex((x) => /<LiveCode\b/.test(x.body)) + 1
    const streamIdx = allSlides.findIndex((x) => /<PyStream\b/.test(x.body)) + 1
    check('the deck has a LiveCode slide and a PyStream slide', liveIdx > 0 && streamIdx > 0, `slides ${liveIdx} and ${streamIdx}`)

    await go(liveIdx)
    const live = s.page.locator('[data-kind=livecode]').filter({ visible: true }).first()
    const ran = await s.page.waitForFunction(() => [...document.querySelectorAll('[data-kind=livecode]')].some((e) => e.getBoundingClientRect().width > 0 && ['ok', 'error'].includes(e.dataset.state)), null, { timeout: 90000 }).then(() => true, () => false)
    check('LiveCode connects to the runner and runs its code', ran && (await live.getAttribute('data-state')) === 'ok', `state ${await live.getAttribute('data-state')}`)
    check('and shows a result (printed output or a figure)', (await live.locator('.nd-live-stdout, .nd-live-img').count()) > 0)
    check('with no stderr', (await live.locator('.nd-live-stderr').count()) === 0)
    // Editing re-runs: type a statement that prints a marker the deck's own code cannot contain.
    await live.locator('.cm-content').click()
    await s.page.keyboard.press(process.platform === 'darwin' ? 'Meta+End' : 'Control+End')
    await s.page.keyboard.type('\nprint("e2e-marker-7")')
    const reran = await s.page.waitForFunction(() => [...document.querySelectorAll('[data-kind=livecode]')].some((e) => e.getBoundingClientRect().width > 0 && e.dataset.state === 'ok' && /e2e-marker-7/.test(e.textContent.replace(/print\("e2e-marker-7"\)/, ''))), null, { timeout: 30000 }).then(() => true, () => false)
    check('editing the code runs it again', reran)

    await go(streamIdx)
    const streamed = await s.page.waitForFunction(() => [...document.querySelectorAll('[data-kind=pystream]')].some((e) => e.getBoundingClientRect().width > 0 && e.dataset.state === 'live' && Number(e.dataset.fps) > 0), null, { timeout: 60000 }).then(() => true, () => false)
    check('PyStream connects and frames arrive', streamed)
    const drawn = await s.page.evaluate(() => { const c = [...document.querySelectorAll('[data-kind=pystream] canvas')].find((e) => e.getBoundingClientRect().width > 0); const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; for (let i = 3; i < d.length; i += 4) if (d[i]) return true; return false })
    check('and particles are drawn on the canvas', drawn)

    // The whole deck, keyboard only, from slide 1.
    await s.page.goto(`${origin}/1`, { waitUntil: 'domcontentloaded' }); await shown(s.page)
    await s.page.mouse.click(640, 30)
    const route = () => Number(new URL(s.page.url()).pathname.split('/').filter(Boolean)[0] || 1)
    let last = 1, still = 0
    for (let i = 0; i < 300 && still < 8; i++) { await s.page.keyboard.press('ArrowRight'); await s.page.waitForTimeout(200); const n = route(); still = n === last && n === allSlides.length ? still + 1 : 0; last = n }
    check('the keyboard reaches the last of all slides', last === allSlides.length, `slide ${last} of ${allSlides.length}`)
    check('no external request, no page error in the full edition', ext.length === 0 && s.log.errors.length === 0, [...ext, ...s.log.errors].slice(0, 3).join(' | '))
    await s.context.close()

    const v = spawnSync(process.execPath, [cli, 'verify', 'showcase.md', '--url', origin], { cwd: here, encoding: 'utf8', env })
    check('nimbledeck verify finds no placement problem on any of the slides', v.status === 0, (v.stdout.split('\n').filter((l) => /ERROR/.test(l)).slice(0, 3).join(' | ') || v.stdout.trim().split('\n').pop()))
  } finally {
    stop()
  }
}

// ---------------------------------------------------------------------------------------------------------------------
const browser = await chromium.launch(launchOptions)
try {
  if (edition !== 'full') await webTests(browser)
  if (edition !== 'web') await fullTests(browser)
} finally {
  await browser.close()
}
console.log(`\n${failed ? `${failed} FAILED, ${passed} passed` : `all ${passed} passed`}`)
process.exit(failed ? 1 : 0)
