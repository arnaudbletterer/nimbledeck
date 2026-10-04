// Browser test of the motion components against the running lab (`NIMBLEDECK_PORT_OFFSET=500 npm run dev` in this folder,
// or `nimbledeck run lab.md`). Usage: node lab-e2e.mjs [url]
import { chromium } from 'playwright-chromium'
import { findChrome } from '../../packages/cli/src/chrome.mjs'

const base = process.argv[2] || 'http://localhost:3030'
const chrome = findChrome()
const browser = await chromium.launch(chrome ? { executablePath: chrome } : {})
const errors = []
let failed = 0
const check = (name, ok, detail = '') => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' (' + detail + ')' : ''}`); if (!ok) failed++ }
const open = async (reduced = false) => {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 }, reducedMotion: reduced ? 'reduce' : 'no-preference' })
  const page = await ctx.newPage()
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 200)))
  return page
}
const go = async (page, n) => { await page.goto(`${base}/${n}?clicks=0`, { waitUntil: 'domcontentloaded' }); await page.waitForFunction(() => [...document.querySelectorAll('.slidev-layout')].some((e) => e.getBoundingClientRect().width > 0)) }
// The element of the slide on screen: neighbouring slides stay mounted, so filter by visibility.
const vis = (page, sel) => page.locator(sel).filter({ visible: true }).first()
const opacities = (page) => page.evaluate(() => [...document.querySelectorAll('[data-kind=kinetic]')].filter((k) => k.getBoundingClientRect().width > 0).flatMap((k) => [...k.querySelectorAll('.nd-k-u')].map((u) => +getComputedStyle(u).opacity)))
const key = async (page, k) => { await page.keyboard.press(k); await page.waitForTimeout(150) }

const page = await open()

// Kinetic: plays, finishes, replays on re-entry
await go(page, 2)
await page.waitForTimeout(150)
const early = await opacities(page)
check('kinetic starts hidden and is mid-animation shortly after entry', early.length > 10 && early.some((o) => o < 0.99), `${early.length} units`)
await page.waitForTimeout(4000)
check('kinetic ends fully visible', (await opacities(page)).every((o) => o === 1))
await key(page, 'ArrowRight'); await key(page, 'ArrowLeft')
await page.waitForTimeout(100)
check('kinetic replays when the slide is entered again', (await opacities(page)).some((o) => o < 0.99))

// Typewriter: types, exposes nd-done, resets when left, and a held Kinetic waits for a click
await go(page, 3)
await page.waitForTimeout(800)
const tw = vis(page, '[data-kind=typewriter]')
check('typewriter is typing (not done yet)', !(await tw.evaluate((e) => e.classList.contains('nd-done'))))
const partial = await tw.locator('.nd-tw-live').textContent()
await page.waitForFunction(() => [...document.querySelectorAll('[data-kind=typewriter]')].some((e) => e.getBoundingClientRect().width > 0 && e.classList.contains('nd-done')), null, { timeout: 15000 })
const full = await tw.locator('.nd-tw-live').textContent()
check('typewriter types the whole fenced block, in order', full.startsWith('# Nimbledeck') && full.includes('**Markdown**') && full.length > partial.length, `${partial.length} -> ${full.length} chars`)
check('typewriter reserves its final size (no layout shift)', await tw.evaluate((e) => Math.abs(e.querySelector('.nd-tw-ghost').getBoundingClientRect().height - e.getBoundingClientRect().height) < 1))
check('a held kinetic text stays hidden before the click', await page.evaluate(() => [...document.querySelectorAll('[data-kind=kinetic]')].filter((k) => k.getBoundingClientRect().width > 0).every((k) => !k.classList.contains('nd-k-play'))))
await key(page, 'ArrowRight')
await page.waitForTimeout(300)
check('the held kinetic text plays after the click', await page.evaluate(() => [...document.querySelectorAll('[data-kind=kinetic]')].some((k) => k.classList.contains('nd-k-play'))))
await key(page, 'ArrowRight'); await page.waitForTimeout(900)   // now on the terminal slide (a left slide stays active for 650 ms while it fades out)
check('leaving the slide resets the typewriter', await page.evaluate(() => [...document.querySelectorAll('[data-kind=typewriter]')].every((e) => !e.classList.contains('nd-done') && e.querySelector('.nd-tw-live').textContent === '')))

// Terminal
await page.waitForFunction(() => [...document.querySelectorAll('[data-kind=terminal]')].some((e) => e.getBoundingClientRect().width > 0 && e.classList.contains('nd-done')), null, { timeout: 20000 })
const term = await vis(page, '[data-kind=terminal] .nd-tw-live').textContent()
check('terminal shows commands and their output', /\$ nimbledeck check deck\.md\nok {2}12 slides, no errors\n\$ nimbledeck run deck\.md\ndeck ready/.test(term))

// Stat: counts, never changes its width, label arrives after
await go(page, 5)
await page.waitForTimeout(250)
const w0 = await vis(page, '[data-kind=stat]').evaluate((e) => e.getBoundingClientRect().width)
const lab0 = await vis(page, '.nd-stat-label').evaluate((e) => +getComputedStyle(e).opacity)
await page.waitForTimeout(3000)
const w1 = await vis(page, '[data-kind=stat]').evaluate((e) => e.getBoundingClientRect().width)
check('stat lands on its value', (await vis(page, '.nd-stat-live').textContent()) === '60')
check('stat width does not change while counting', Math.abs(w0 - w1) < 0.5, `${w0} vs ${w1}`)
check('stat label is still hidden early and visible at the end', lab0 < 0.2 && (await vis(page, '.nd-stat-label').evaluate((e) => +getComputedStyle(e).opacity)) === 1, `early ${lab0.toFixed(2)}`)

// Aurora: frame rate, pause when the slide is left
const fps = await page.evaluate(() => new Promise((res) => { let n = 0; const t0 = performance.now(); const f = (t) => { n++; if (t - t0 < 2000) requestAnimationFrame(f); else res(n / ((t - t0) / 1000)) }; requestAnimationFrame(f) }))
check('aurora slide holds the display frame rate', fps > 55, `${fps.toFixed(1)} fps`)
const snap = () => page.evaluate(() => { const c = [...document.querySelectorAll('[data-kind=aurora] canvas')].find((e) => e.getBoundingClientRect().width > 0); return c.toDataURL().length + ':' + c.toDataURL().slice(-200) })
const s1 = await snap(); await page.waitForTimeout(500); const s2 = await snap()
check('aurora draws while its slide is on screen', s1 !== s2)
await go(page, 6); await page.waitForTimeout(300)
const hidden = await page.evaluate(() => { const c = document.querySelector('[data-kind=aurora] canvas'); const a = c.toDataURL(); return new Promise((r) => setTimeout(() => r(a === c.toDataURL()), 600)) })
check('aurora stops drawing when its slide is left', hidden)

// Marquee: moves, loops seamlessly
const mq = vis(page, '[data-kind=marquee]')
const x0 = await mq.locator('.nd-mq-track').evaluate((e) => new DOMMatrix(getComputedStyle(e).transform).m41)
await page.waitForTimeout(700)
const x1 = await mq.locator('.nd-mq-track').evaluate((e) => new DOMMatrix(getComputedStyle(e).transform).m41)
check('marquee scrolls left', x1 < x0, `${x0.toFixed(1)} -> ${x1.toFixed(1)}`)
const cover = await mq.evaluate((e) => { const set = e.querySelector('.nd-mq-set').offsetWidth, n = e.querySelectorAll('.nd-mq-set').length; return { set, n, total: set * n } })
check('marquee holds enough copies to cover the slide plus one loop', cover.total >= 1280 + cover.set, `${cover.n} x ${cover.set}`)

// Spotlight follows the pointer
await go(page, 7)
await page.waitForTimeout(500)
await page.mouse.move(300, 200); await page.waitForTimeout(700)
const g1 = await vis(page, '.nd-spot-glow').evaluate((e) => e.style.transform)
await page.mouse.move(1000, 500); await page.waitForTimeout(900)
const g2 = await vis(page, '.nd-spot-glow').evaluate((e) => e.style.transform)
check('spotlight glow follows the pointer', g1 !== g2 && g1 !== '' && g2 !== '', `${g1} -> ${g2}`)

// Tilt: leans toward the pointer, 8 degrees at most, settles back
await go(page, 8)
await page.waitForTimeout(400)
await page.mouse.move(900, 180); await page.waitForTimeout(700)
const rot = await vis(page, '.nd-tilt-card').evaluate((e) => { const m = e.style.transform.match(/rotateX\((-?[\d.]+)deg\) rotateY\((-?[\d.]+)deg\)/); return m ? [+m[1], +m[2]] : null })
check('tilt leans toward the pointer within 8 degrees', !!rot && Math.abs(rot[0]) > 1 && Math.abs(rot[1]) > 1 && Math.abs(rot[0]) <= 8.01 && Math.abs(rot[1]) <= 8.01, JSON.stringify(rot))
await page.mouse.move(5, 5); await page.waitForTimeout(1200)
check('tilt settles flat again', await vis(page, '.nd-tilt-card').evaluate((e) => { const m = e.style.transform.match(/rotateX\((-?[\d.]+)deg\) rotateY\((-?[\d.]+)deg\)/); return !m || (Math.abs(+m[1]) < 0.05 && Math.abs(+m[2]) < 0.05) }))
await page.context().close()

// Reduced motion: final states at once, no tilt
const rm = await open(true)
await go(rm, 2); await rm.waitForTimeout(150)
check('reduced motion: kinetic text is fully visible at once', (await opacities(rm)).every((o) => o === 1))
await go(rm, 3); await rm.waitForTimeout(300)
check('reduced motion: typewriter is done at once', await rm.evaluate(() => [...document.querySelectorAll('[data-kind=typewriter]')].some((e) => e.getBoundingClientRect().width > 0 && e.classList.contains('nd-done'))))
await go(rm, 8); await rm.mouse.move(900, 180); await rm.waitForTimeout(400)
check('reduced motion: tilt does not tilt', (await vis(rm, '.nd-tilt-card').evaluate((e) => e.style.transform)) === '')
await rm.context().close()

const real = errors.filter((e) => !/FloatingVue/.test(e))
check('no page errors', real.length === 0, real.join(' | '))
await browser.close()
console.log(failed ? `${failed} FAILED` : 'all passed')
process.exit(failed ? 1 : 0)
