// End-to-end test of the playground, in a real Chrome. Usage: node website/playground-e2e.mjs [dir] [--shots out/]
//   dir      a built playground (site/playground, site-src/playground); default: staged from docs/playground and the
//            current theme in a temporary folder, so no site build is needed
//   --shots  where the screenshots go (default: a temporary folder, printed at the end)
// It checks that every layout x a sample of motions sets data-nd-motion on the layout root and really animates, that
// the presets differ, the galleries, the recipe, Surprise me, the Tour, reduced motion, the stacked width, and that
// the page throws no error and asks for nothing outside localhost.
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { createServer } from 'node:http'
import { tmpdir } from 'node:os'
import { extname, join, resolve } from 'node:path'
import { chromium } from 'playwright-chromium'
import { findChrome } from '../packages/cli/src/chrome.mjs'
import { playgroundData } from './playground-data.mjs'
import { root } from './site.mjs'

const args = process.argv.slice(2)
const shotsAt = args.includes('--shots') ? resolve(args[args.indexOf('--shots') + 1]) : mkdtempSync(join(tmpdir(), 'playground-shots-'))
const given = args.find((a, i) => !a.startsWith('--') && args[i - 1] !== '--shots')
let dir
if (given) dir = resolve(given)
else {
  dir = mkdtempSync(join(tmpdir(), 'playground-'))
  cpSync(resolve(root, 'docs/playground'), dir, { recursive: true })
  writeFileSync(join(dir, 'data.json'), JSON.stringify(playgroundData()))
  cpSync(resolve(root, 'node_modules/vue/dist/vue.esm-browser.prod.js'), join(dir, 'vue.js'))
}
mkdirSync(shotsAt, { recursive: true })
if (!existsSync(join(dir, 'data.json'))) throw new Error(`${dir} has no data.json: build the site first or pass no folder`)

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json' }
const server = createServer((req, res) => {
  const f = join(dir, req.url.split('?')[0].replace(/^\/+$/, 'index.html'))
  if (!f.startsWith(dir) || !existsSync(f)) { res.writeHead(404).end(); return }
  res.writeHead(200, { 'content-type': TYPES[extname(f)] ?? 'application/octet-stream' }).end(readFileSync(f))
})
await new Promise((r) => server.listen(0, '127.0.0.1', r))
const url = `http://127.0.0.1:${server.address().port}/`

const chrome = findChrome()
const browser = await chromium.launch(chrome ? { executablePath: chrome } : {})
let failed = 0
const check = (name, ok, detail = '') => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` (${detail})` : ''}`); if (!ok) failed++ }
const errors = [], external = []
async function open(opts = {}) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, ...opts })
  const page = await ctx.newPage()
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 200)))
  page.on('console', (m) => { if (m.type() === 'error') errors.push(`console: ${m.text().slice(0, 200)}`) })
  page.on('response', (r) => { if (r.status() >= 400) errors.push(`${r.status()} ${r.url()}`) })
  await page.route('**/*', (route) => {
    const u = route.request().url()
    if (u.startsWith(url) || u.startsWith('data:') || u.startsWith('blob:')) return route.continue()
    external.push(u); return route.abort()
  })
  await page.goto(url)
  await page.waitForSelector('#thumbs li')
  await page.waitForSelector('#gallery .gcard')
  return page
}
const shot = (page, name) => page.screenshot({ path: join(shotsAt, `${name}.png`) })

const page = await open()
const tabTo = (t) => page.click(`#tabs [data-tab=${t}]`)
const kindTo = async (k) => { await tabTo('style'); await page.click(`#gtabs [data-k=${k}]`); await page.waitForSelector('#gallery .gcard') }
const ids = (sel) => page.$$eval(sel, (cs) => cs.map((c) => c.dataset.id))
const cardOf = (id) => page.locator(`#gallery .gcard[data-id="${id}"]`)
const slideText = () => page.inputValue('#ed-slide textarea')
const recipe = () => page.textContent('#recipe')
// The animation of the first animated element of the layout root, as name|duration|delay|timing, and how many animate.
const motionOf = () => page.evaluate(() => {
  const r = document.querySelector('#mount > .slidev-layout')
  const all = [r, ...r.querySelectorAll('*')].map((e) => getComputedStyle(e)).filter((c) => c.animationName !== 'none')
  // A layout may animate something of its own (my-layout's rail): the signature is every animation on the slide, in order.
  const sig = all.map((c) => `${c.animationName}|${c.animationDuration}|${c.animationDelay}`)
  return { attr: r.getAttribute('data-nd-motion'), sig: all.length ? [...new Set(sig)].join(' ') : null, n: all.length }
})

// ---- First impression: a bold preset on a dark look, on the first slide ----
{
  const m = await motionOf()
  const fm = (await slideText()).split('---')[1] ?? ''
  check('opens on a motion that animates the cover', !!m.attr && !!m.sig && /motion:/.test(fm), `${m.attr}, ${m.n} elements`)
  check('opens on a dark look', await page.evaluate(() => document.getElementById('frame').dataset.dark) === 'true')
  check('the recipe is shown first', /ndVariant: \S+/.test(await recipe()) && /motion: \S+/.test(await recipe()), (await recipe()).replace(/\n/g, ' / '))
  const hasBg = (await page.evaluate(async () => (await (await fetch('data.json')).json()).presets?.backgrounds?.length ?? 0)) > 0
  check('opens on an animated background when the theme has some', !hasBg || /background:/.test(fm))
  await shot(page, '1-first-impression')
}

// ---- Every layout x a sample of motions ----
await tabTo('slide')
const layouts = await page.$$eval('#cards .card:not(.new) .l', (ls) => ls.map((l) => l.textContent.replace(/\s*•$/, '').trim()))
check('there are layouts to try', layouts.length >= 10, layouts.join(' '))
await kindTo('motion')
const motions = (await ids('#gallery .gcard')).filter((i) => i !== 'none')
check('the motion gallery lists presets', motions.length >= 3, `${motions.length}`)
const sample = [...new Set([0, Math.floor(motions.length / 3), Math.floor((2 * motions.length) / 3), motions.length - 1])].map((i) => motions[i])
const allOff = []
for (const layout of layouts) {
  await tabTo('slide')
  await page.locator('#cards .card:not(.new)').filter({ has: page.locator('.l', { hasText: new RegExp(`^${layout}`) }) }).first().click()
  await kindTo('motion')
  const sigs = []
  for (const id of sample) {
    await cardOf(id).click()
    const m = await motionOf()
    if (m.attr !== id || !m.sig) allOff.push(`${layout}/${id}: attr=${m.attr} anim=${m.sig}`)
    sigs.push(m.sig)
  }
  if (new Set(sigs).size !== sigs.length) allOff.push(`${layout}: presets do not differ (${sigs.join(' ; ')})`)
}
check(`${layouts.length} layouts x ${sample.length} motions (${sample.join(', ')}): attribute set, animation running, presets differ`, allOff.length === 0, allOff.slice(0, 4).join(' | '))

// ---- Writes frontmatter, per slide and per deck ----
await tabTo('slide'); await page.locator('#cards .card:not(.new)').first().click()
await kindTo('motion')
await page.locator('#all').evaluate((e) => { if (e.checked) e.click() })   // the switch input is visually replaced
await cardOf(motions[1]).click()
check('a motion click writes `motion:` in the slide text', new RegExp(`motion: ${motions[1]}\\b`).test(await slideText()))
check('the recipe names it', (await recipe()).includes(`motion: ${motions[1]}`))
await page.click('label:has(#all)')
await cardOf(motions[2]).click()
check('"every slide" writes ndMotion in the deck header', (await recipe()).includes(`ndMotion: ${motions[2]}`) && !/\nmotion:/.test(await slideText()))
await page.click('#thumbs li:nth-child(2)')
check('the deck motion reaches another slide', (await motionOf()).attr === motions[2])
await page.click('#thumbs li:nth-child(1)')
await page.click('label:has(#all)')   // back to this slide only
const none = cardOf('none')
await none.click()
check('None removes the motion', (await motionOf()).attr === null || (await slideText()).includes('motion: none'))

// ---- Backgrounds ----
await kindTo('bg')
const bgs = (await ids('#gallery .gcard')).filter((i) => i !== 'none')
if (bgs.length) {
  await cardOf(bgs[0]).click()
  const root0 = await page.getAttribute('#mount > .slidev-layout', 'data-nd-bg')
  check('a background click sets data-nd-bg on the layout root and writes `background:`', root0 === bgs[0] && new RegExp(`background: ${bgs[0]}`).test(await slideText()), `${bgs.length} backgrounds`)
  const live = await page.evaluate(() => document.querySelector('#gallery .gcard:not([data-id=none]) .gbox') !== null)
  check('background cards have previews', live)
} else check('backgrounds gallery shows an honest empty state', /No backgrounds in this build/.test(await page.textContent('#gcount')))
check('the background note says canvas ones are approximated', /CSS/.test(await page.textContent('#allhint')))

// ---- Looks ----
await kindTo('look')
const looks = await ids('#gallery .gcard')
const dark = await page.$$eval('#gallery .gcard.dark', (c) => c.map((x) => x.dataset.id)), light = await page.$$eval('#gallery .gcard.light', (c) => c.map((x) => x.dataset.id))
check('looks come in light and dark groups', dark.length > 0 && light.length > 0 && (await page.$$('#gallery .ggroup')).length === 2, `${light.length} light, ${dark.length} dark`)
await cardOf(light[light.length - 1]).click()
check('a light look sets the variant and the frame contrast', (await page.getAttribute('#stage', 'data-nd-variant')) === light[light.length - 1] && (await page.getAttribute('#frame', 'data-dark')) === 'false')
check('the recipe names the look', (await recipe()).includes(`ndVariant: ${light[light.length - 1]}`))
await page.fill('#gq', dark[0].slice(0, 4))
const shown = await page.$$eval('#gallery .gcard:not([hidden])', (c) => c.length)
check('search filters the looks', shown >= 1 && shown < looks.length, `${shown} of ${looks.length}`)
await page.fill('#gq', 'zzzz-nothing')
check('search with no hit says so', /No look matches/.test(await page.textContent('#gcount')))
await page.fill('#gq', '')

// ---- Keyboard ----
await kindTo('motion')
await page.locator('#gallery .gcard[tabindex="0"]').focus()
const first = await page.evaluate(() => document.activeElement.dataset.id)
await page.keyboard.press('ArrowRight')
const second = await page.evaluate(() => document.activeElement.dataset.id)
check('arrow keys move through the gallery', !!second && first !== second, `${first} -> ${second}`)
check('a focused card previews (is-live) and the others do not', await page.evaluate(() => document.querySelectorAll('#gallery .is-live').length) === 1)
await page.keyboard.press('Enter')
check('Enter applies and sets aria-pressed', (await cardOf(second).getAttribute('aria-pressed')) === 'true')
check('the pressed card shows a visible mark, not colour alone', await page.evaluate(() => getComputedStyle(document.querySelector('#gallery .gcard[aria-pressed=true] .gbox'), '::after').content.includes('Applied')))
const before = await page.evaluate(() => document.getElementById('count').textContent)
await page.keyboard.press('ArrowLeft')
check('arrows in the gallery do not change the slide', before === await page.evaluate(() => document.getElementById('count').textContent))

// ---- Hover: only the card under the pointer plays ----
const hovered = motions[Math.min(3, motions.length - 1)]
await cardOf(hovered).hover()
const playing = await page.evaluate(() => [...document.querySelectorAll('#gallery .gcard')].filter((c) => c.querySelector('.mini > *')?.hasAttribute('data-nd-motion')).map((c) => c.dataset.id))
check('hover plays only that card', playing.length === 1 && playing[0] === hovered, playing.join(','))
const anim = await page.evaluate((id) => { const r = document.querySelector(`#gallery .gcard[data-id="${id}"] .mini > *`); return [r, ...r.querySelectorAll('*')].some((e) => getComputedStyle(e).animationName !== 'none') }, hovered)
check('the hovered preview really animates', anim)
const still = await page.evaluate((id) => [...document.querySelectorAll(`#gallery .gcard:not([data-id="${id}"]) .mini *`)].every((e) => getComputedStyle(e).animationName === 'none'), hovered)
check('the other previews are static', still)
await page.mouse.move(5, 5)

// ---- Speed of the main stage ----
const times = []
for (let i = 0; i < 8; i++) { await page.click('#next'); times.push(parseFloat(await page.textContent('#ms'))) }
times.sort((a, b) => a - b)
check('the main stage renders in under 2 ms (median)', times[4] < 2, `median ${times[4]} ms, max ${times[7]} ms`)
await page.click('#thumbs li:nth-child(1)')

// ---- Surprise me and Tour ----
const seen = new Set()
for (let i = 0; i < 6; i++) { await page.click('#surprise'); seen.add((await recipe()).replace(/\s+/g, ' ')) }
check('Surprise me changes the recipe each time', seen.size >= 3, `${seen.size} different of 6`)
check('Surprise me says what it picked, with a contrast', /Surprise: .*\d+\.\d:1/.test(await page.textContent('#tourtxt')))
await kindTo('motion')
await page.click('#tour')
const t1 = await page.textContent('#tourtxt'); await page.waitForTimeout(2700)
const t2 = await page.textContent('#tourtxt')
check('the Tour steps through presets and shows where it is', /Tour: .* \(1 of \d+\)/.test(t1) && t1 !== t2, `${t1} -> ${t2}`)
await shot(page, '2-tour')
await page.keyboard.press('Escape')
check('Escape stops the Tour', await page.isHidden('#tourbar'))
await page.click('#tour'); await page.click('#tourkeep')
check('Keep this applies the preset on show', await page.isHidden('#tourbar') && /motion: \S+/.test(await recipe()))

// ---- Screenshots of 8 combinations (full screen) ----
const combos = []
const L = await (async () => { await kindTo('look'); return ids('#gallery .gcard') })()
const B = bgs
const pickAt = (xs, i) => xs[Math.min(xs.length - 1, i)]
const plan = [['cover', 0, 0, 0], ['agenda', 1, 1, 1], ['default', 2, 2, 2], ['two-cols', 3, 3, 3], ['divider', 4, 4, 4], ['statement', 5, 5, 5], ['closing', 6, 6, 6], ['hero', 7, 7, 7]]
for (const [layout, li, mi, bi] of plan) {
  if (!layouts.includes(layout)) continue
  await tabTo('slide')
  await page.locator('#cards .card:not(.new)').filter({ has: page.locator('.l', { hasText: new RegExp(`^${layout}`) }) }).first().click()
  await kindTo('look'); await cardOf(pickAt(L, li * 2 + 1)).click()
  await kindTo('motion'); await cardOf(pickAt(motions, mi * 2)).click()
  if (B.length) { await kindTo('bg'); await cardOf(pickAt(B, bi)).click() }
  await page.mouse.move(5, 5)
  await page.waitForTimeout(1500)
  await shot(page, `3-combo-${layout}`)
  combos.push(layout)
}
await kindTo('look')
await shot(page, '4-looks-gallery')
await kindTo('bg')
await shot(page, '5-backgrounds-gallery')

// ---- The interface itself: keyboard focus ring, dark page, Slide and Code tabs ----
await kindTo('motion')
await page.locator('#gallery .gcard[tabindex="0"]').focus()
await page.keyboard.press('ArrowRight'); await page.keyboard.press('ArrowRight')
const ring = await page.evaluate(() => { const s = getComputedStyle(document.activeElement); return `${s.outlineStyle} ${s.outlineWidth}` })
check('a focused card has a visible focus ring', /solid 2px/.test(ring), ring)
await page.waitForTimeout(700)
await shot(page, '7-focus-and-live-preview')
await tabTo('slide'); await page.waitForTimeout(350); await shot(page, '7-slide-tab')
await tabTo('code'); await page.waitForTimeout(350); await shot(page, '7-code-tab')
{
  const p = await open({ colorScheme: 'dark' })
  await p.click('#gtabs [data-k=look]')
  await shot(p, '7-dark-page-looks')
  await p.context().close()
}

// ---- Reduced motion: final state, a note, no hover play ----
{
  const p = await open({ reducedMotion: 'reduce' })
  await p.click('#gtabs [data-k=motion]')
  check('reduced motion: a note says previews show the final state', /reduced motion/.test(await p.textContent('#allhint')))
  const id = (await p.$$eval('#gallery .gcard', (c) => c.map((x) => x.dataset.id))).find((i) => i !== 'none')
  await p.locator(`#gallery .gcard[data-id="${id}"]`).hover()
  check('reduced motion: hover plays nothing', await p.evaluate(() => document.querySelectorAll('#gallery .is-live').length) === 0)
  check('reduced motion: nothing animates on the stage', await p.evaluate(() => [...document.querySelectorAll('#mount *')].every((e) => getComputedStyle(e).animationName === 'none')))
  check('reduced motion: the Tour of motions is off', await p.isDisabled('#tour'))
  await p.context().close()
}

// ---- The embedded width: stacked, no sideways scroll ----
for (const [w, h] of [[760, 900], [420, 900]]) {
  const p = await open({ viewport: { width: w, height: h } })
  const over = await p.evaluate(() => document.documentElement.scrollWidth - innerWidth)
  check(`width ${w}: no horizontal scroll`, over <= 0, `${over}px`)
  const reach = await p.evaluate(() => { const g = document.getElementById('gallery').getBoundingClientRect(); return g.width })
  check(`width ${w}: the gallery has room`, reach >= 280, `${Math.round(reach)}px`)
  await shot(p, `6-width-${w}`)
  await p.evaluate(() => document.getElementById('gallery').scrollIntoView({ block: 'end' }))
  await p.waitForTimeout(200)
  const top = await p.evaluate(() => { const r = document.getElementById('frame').getBoundingClientRect(); return [Math.round(r.top), Math.round(r.bottom)] })
  check(`width ${w}: the slide stays in view while the gallery scrolls`, top[0] >= 0 && top[1] > 40 && top[1] <= h, top.join('..'))
  await shot(p, `6-width-${w}-scrolled`)
  await p.context().close()
}

check('no page errors or console errors', errors.length === 0, errors.slice(0, 3).join(' | '))
check('no request leaves localhost', external.length === 0, external.slice(0, 3).join(' '))
await browser.close(); server.close()
console.log(`screenshots in ${shotsAt}`)
process.exit(failed ? 1 : 0)
