// End-to-end test of the interactive components, in a real browser against the running example
// (start it with `npm run example`). Usage: node e2e-interactions.mjs [url] [deck.md]
// Any deck with slides titled "An interactive quiz" and "Flip, compare, count up" can be tested, e.g. a brand gallery.
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { chromium } from 'playwright-chromium'
import { splitSlides } from '../../packages/cli/src/slides.mjs'

const base = process.argv[2] || 'http://localhost:3030'
const deck = process.argv[3] ? resolve(process.argv[3]) : new URL('./how-it-works.md', import.meta.url)
const slides = splitSlides(readFileSync(deck, 'utf8'))
const at = (title) => slides.findIndex((s) => s.body.includes(`# ${title}`)) + 1
const quizSlide = at('An interactive quiz'), miscSlide = at('Flip, compare, count up')
if (!quizSlide || !miscSlide) throw new Error('example slides not found')
const liveSlide = at('Live code'), manualSlide = at('Live code, run on demand')
const frameSlide = slides.findIndex((s) => /<Demo name="compute" \/>/.test(s.body) && s.fm.layout === 'full') + 1

const chrome = ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].find((p) => { try { readFileSync(p); return true } catch { return false } })
const browser = await chromium.launch(chrome ? { executablePath: chrome } : {})
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
const errors = []; page.on('pageerror', (e) => errors.push(String(e).slice(0, 160)))
let failed = 0
const check = (name, ok, detail = '') => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' (' + detail + ')' : ''}`); if (!ok) failed++ }
const attr = (sel, a) => page.locator(sel).first().getAttribute(a)
const go = async (n) => { await page.goto(`${base}/${n}?clicks=99`, { waitUntil: 'domcontentloaded' }); await page.waitForFunction(() => [...document.querySelectorAll('.slidev-layout')].some((e) => e.getBoundingClientRect().width > 0)); await page.waitForTimeout(1200) }
const vis = (sel) => page.locator(sel).filter({ visible: true }).first()

// Quiz: wrong answer
await go(quizSlide)
check('quiz starts open', (await attr('[data-kind=quiz]', 'data-state')) === 'open')
await vis('.nd-choice:has(strong:text-is("C"))').click()
await page.waitForTimeout(700)
check('wrong answer -> bad state', (await attr('[data-kind=quiz]', 'data-state')) === 'bad')
check('the right answer B is revealed', await page.locator('.nd-choice.nd-correct:has(strong:text-is("B"))').count() > 0)
check('the picked answer C is marked wrong', await page.locator('.nd-choice.nd-wrong:has(strong:text-is("C"))').count() > 0)
check('the others fade', await page.locator('.nd-choice.nd-faded').count() === 2)
check('verdict names the answer', /answer is B/.test(await vis('.nd-verdict').innerText()))
check('explanation appears', await vis('.nd-explain').isVisible())
await page.screenshot({ path: 'e2e-quiz-wrong.png' })
// answering again does nothing
await vis('.nd-choice:has(strong:text-is("A"))').click()
check('a second click does not change the result', await page.locator('.nd-choice.nd-wrong').count() === 1)
// leaving the slide resets
await page.mouse.click(640, 30); await page.keyboard.press('ArrowRight'); await page.waitForTimeout(800); await page.keyboard.press('ArrowLeft'); await page.waitForTimeout(1200)
check('leaving and returning resets the quiz', (await attr('[data-kind=quiz]', 'data-state')) === 'open')
// right answer
await vis('.nd-choice:has(strong:text-is("B"))').click(); await page.waitForTimeout(700)
check('right answer -> good state', (await attr('[data-kind=quiz]', 'data-state')) === 'good')
check('verdict says Correct', /Correct/.test(await vis('.nd-verdict').innerText()))
await page.screenshot({ path: 'e2e-quiz-right.png' })
// keyboard: number key
await go(quizSlide); await page.mouse.click(640, 30); await page.keyboard.press('3'); await page.waitForTimeout(700)
check('number key 3 picks C', await page.locator('.nd-choice.nd-wrong:has(strong:text-is("C"))').count() > 0)

// Countdown
await go(quizSlide)
const c0 = Number(await attr('[data-kind=countdown]', 'data-left')); await page.waitForTimeout(2500)
const c1 = Number(await attr('[data-kind=countdown]', 'data-left'))
check('countdown runs', c1 < c0 && c1 >= c0 - 4, `${c0} -> ${c1}`)
await vis('[data-kind=countdown]').click(); await page.waitForTimeout(300); const p0 = await attr('[data-kind=countdown]', 'data-left'); await page.waitForTimeout(1500)
check('click pauses the countdown', (await attr('[data-kind=countdown]', 'data-left')) === p0)

// Flip, compare, count up
await go(miscSlide)
check('flip starts on the front', (await attr('[data-kind=flip]', 'data-state')) === 'front')
await vis('[data-kind=flip]').click(); await page.waitForTimeout(800)
check('click flips to the back', (await attr('[data-kind=flip]', 'data-state')) === 'back')
const box = await vis('[data-kind=compare]').boundingBox()
await page.mouse.move(box.x + box.width * 0.5, box.y + box.height / 2); await page.mouse.down(); await page.mouse.move(box.x + box.width * 0.25, box.y + box.height / 2, { steps: 5 }); await page.mouse.up()
const pos = Number(await attr('[data-kind=compare]', 'data-pos'))
check('dragging moves the compare divider', pos >= 22 && pos <= 28, `at ${pos}%`)
await page.waitForTimeout(1500)
check('number counts up to its target', Number(await attr('[data-kind=countup]', 'data-value')) === 3200)
await page.screenshot({ path: 'e2e-misc.png' })

// Command palette and shortcut help
{
  await go(2)
  await page.keyboard.press('?'); await page.waitForTimeout(400)
  check('? opens the shortcut cheat-sheet', await vis('[data-kind=help]').isVisible())
  check('the cheat-sheet lists the palette shortcut', /Command palette/.test(await vis('[data-kind=help]').innerText()))
  await page.keyboard.press('Escape'); await page.waitForTimeout(400)
  check('Esc closes the cheat-sheet', !(await page.locator('[data-kind=help]').count()))
  await page.keyboard.press('/'); await page.waitForTimeout(500)
  check('/ opens the command palette', await vis('[data-kind=palette]').isVisible())
  check('the palette input has focus', await page.evaluate(() => document.activeElement?.classList.contains('nd-pal-input')))
  await page.waitForFunction(() => document.querySelectorAll('.nd-pal-card .slidev-layout').length > 0, null, { timeout: 20000 })
  check('results show real slide thumbnails', true)
  await page.keyboard.type('adipiscing consectetur'); await page.waitForTimeout(700)   // words from a slide BODY, in reverse order
  const nos = await page.locator('.nd-pal-card').evaluateAll((els) => els.map((e) => Number(e.getAttribute('data-no'))))
  check('body text is searched, words in any order: the quiz slide is among the hits', nos.includes(quizSlide), `hits: ${nos.join(', ')}`)
  check('the matching words are highlighted', await page.locator('.nd-pal-snip mark').count() > 0)
  await page.keyboard.press('Enter'); await page.waitForTimeout(1200)
  check('Enter jumps to the top hit and closes the palette', page.url().endsWith('/' + nos[0]) && !(await page.locator('[data-kind=palette]').count()), page.url().split('/').pop())
  await page.keyboard.press('Control+k'); await page.waitForTimeout(400)
  check('Ctrl+K opens the palette too', await vis('[data-kind=palette]').isVisible())
  await page.keyboard.type('5'); await page.waitForTimeout(500)
  check('a number lists that slide first', (await vis('.nd-pal-card').getAttribute('data-no')) === '5')
  await page.keyboard.press('Escape'); await page.waitForTimeout(400)
  check('Esc closes the palette', !(await page.locator('[data-kind=palette]').count()))
  await page.keyboard.type('zzzzqqq')
  if (liveSlide) {
    await go(liveSlide); await page.waitForSelector('[data-kind=livecode] .cm-content'); await page.locator('[data-kind=livecode] .cm-content').first().click()
    await page.keyboard.type('/?'); await page.waitForTimeout(400)
    check('/ and ? typed in the code editor open nothing', !(await page.locator('[data-kind=palette],[data-kind=help]').count()))
  }
}

// Live code: edit Python in the slide, see the result change, survive errors and loops, and stay safe
if (liveSlide) {
  await go(liveSlide)
  const live = '[data-kind=livecode]'
  await page.waitForFunction((s) => document.querySelector(s + '[data-state=ok]'), live, { timeout: 60000 })
  check('live code runs its starting code and shows a figure', await page.locator(`${live} .nd-live-img`).count() === 1)
  const src0 = await attr(`${live} .nd-live-img`, 'src')
  const type = async (code) => { await vis(`${live} .cm-content`).click(); await page.keyboard.press(process.platform === 'darwin' ? 'Meta+A' : 'Control+A'); await page.keyboard.insertText(code) }
  await type('import matplotlib.pyplot as plt\nplt.bar(["a", "b"], [3, 7])\nprint("edited", 6 * 7)')
  await page.waitForFunction((s) => /edited 42/.test(document.querySelector(s + ' .nd-live-stdout')?.textContent ?? ''), live, { timeout: 30000 })
  check('editing the code changes the output', true)
  check('editing the code changes the picture', (await attr(`${live} .nd-live-img`, 'src')) !== src0)
  await type('def broken(:\n  pass')
  await page.waitForFunction((s) => document.querySelector(s + '[data-state=error]'), live, { timeout: 30000 })
  check('a syntax error is shown', /SyntaxError/.test(await vis(`${live} .nd-live-stderr`).innerText()))
  check('the last good picture stays while the code is broken', await page.locator(`${live} .nd-live-img`).count() === 1)
  await type('while True: pass')
  await page.waitForTimeout(1500)
  check('a long-running program shows as running', (await attr(live, 'data-state')) === 'running')
  const t0 = Date.now(); await type('print("replaced")')
  await page.waitForFunction((s) => /replaced/.test(document.querySelector(s + ' .nd-live-stdout')?.textContent ?? ''), live, { timeout: 30000 })
  check('a newer run replaces the stuck one quickly', Date.now() - t0 < 8000, `${Date.now() - t0} ms`)
  // keyboard: inside the editor the deck must not move; Esc gives the keyboard back
  const here = page.url()
  await vis(`${live} .cm-content`).click(); await page.keyboard.press('ArrowRight'); await page.waitForTimeout(500)
  check('arrow keys inside the editor do not navigate', page.url() === here)
  await page.keyboard.press('Escape'); await page.keyboard.press('ArrowRight'); await page.waitForTimeout(1200)
  check('Esc leaves the editor and the arrows navigate again', page.url() !== here)
  // security from a real browser: the runner must refuse other origins and wrong tokens
  await go(liveSlide)
  const cfg = await page.evaluate(() => fetch('/nimbledeck.json').then((r) => r.json()))
  const probe = (origin, token) => page.evaluate(({ port, token }) => new Promise((res) => { const w = new WebSocket(`ws://127.0.0.1:${port}/?t=${token}`); w.onopen = () => { w.close(); res('connected') }; w.onerror = () => res('refused') }), { port: cfg.runner.port, token })
  check('the deck origin with the right token connects', (await probe(base, cfg.runner.token)) === 'connected')
  check('a wrong token is refused', (await probe(base, 'wrong')) === 'refused')
  const other = await browser.newPage(); await other.goto('about:blank')   // a foreign page: its origin is not the deck's
  const foreign = await other.evaluate(({ port, token }) => new Promise((res) => { const w = new WebSocket(`ws://127.0.0.1:${port}/?t=${token}`); w.onopen = () => { w.close(); res('connected') }; w.onerror = () => res('refused') }), { port: cfg.runner.port, token: cfg.runner.token })
  check('another website with the right token is refused (origin check)', foreign === 'refused')
  await other.close()
  // :auto="false": typing must not run the code; Cmd/Ctrl+Enter must (CodeMirror binds it to "insert blank line" by default)
  if (manualSlide) {
    await go(manualSlide)
    await page.waitForFunction((s) => document.querySelector(s + '[data-state=ok]'), live, { timeout: 60000 })
    await vis(`${live} .cm-content`).click(); await page.keyboard.press(process.platform === 'darwin' ? 'Meta+A' : 'Control+A'); await page.keyboard.insertText('print("manual", 6 * 7)')
    await page.waitForTimeout(2000)                                  // well past the 600 ms auto-run debounce
    const out = async () => (await vis(`${live} .nd-live-stdout`).textContent().catch(() => '')) ?? ''
    check('typing does not auto-run when auto is false', !/manual 42/.test(await out()) && (await vis(live).getAttribute('data-state')) === 'ok')
    await page.keyboard.press(process.platform === 'darwin' ? 'Meta+Enter' : 'Control+Enter')
    await page.waitForFunction((s) => /manual 42/.test(document.querySelector(s + ' .nd-live-stdout')?.textContent ?? ''), live, { timeout: 30000 })
    check('Cmd/Ctrl+Enter runs the code and shows its output', /manual 42/.test(await out()))
    check('Cmd/Ctrl+Enter does not insert a blank line', (await vis(`${live} .cm-content`).locator('.cm-line').count()) === 1)
  } else console.log('SKIP  no run-on-demand live code slide in this deck')
} else console.log('SKIP  no live code slide in this deck')

// Full-frame embedded page: the presentation must stay controllable (needs a deck with a full-frame <Demo>)
if (frameSlide) {
  await go(frameSlide)
  await page.waitForSelector('[data-kind=guard]', { timeout: 20000 })
  check('embedded page starts guarded', (await attr('[data-kind=guard]', 'data-state')) === 'guarded')
  await page.mouse.click(640, 360)                                    // click inside the frame: must NOT trap focus yet
  check('click on the shield makes it interactive', (await attr('[data-kind=guard]', 'data-state')) === 'interactive')
  check('the control bar is visible', await vis('.nd-bar').isVisible())
  // regression: an interactive guard once picked up the LiveCode grid class and shrank the page to ~634x500
  const boxes = await page.evaluate(() => {
    const r = (e) => { const b = e.getBoundingClientRect(); return [b.x, b.y, b.width, b.height].map(Math.round) }
    const g = [...document.querySelectorAll('[data-kind=guard]')].find((e) => e.getBoundingClientRect().width > 0)
    return { guard: r(g), frame: r(g.querySelector('iframe')), slide: r(g.closest('.slidev-layout')) }
  })
  check('the interactive iframe fills its guard', boxes.frame.join() === boxes.guard.join(), `${boxes.frame} vs ${boxes.guard}`)
  check('the interactive guard fills the slide', boxes.guard[2] >= boxes.slide[2] - 2 && boxes.guard[3] >= boxes.slide[3] - 2, `${boxes.guard} vs ${boxes.slide}`)
  const before = page.url()
  await vis('.nd-bar button[aria-label=Next]').click(); await page.waitForTimeout(1200)
  check('the bar Next button navigates even from inside the frame', page.url() !== before, `${before.split('/').pop()} -> ${page.url().split('/').pop()}`)
  await go(frameSlide)
  await page.mouse.click(640, 360); await vis('.nd-bar .nd-bar-main').click(); await page.waitForTimeout(500)
  check('Back to slides re-guards the page', (await attr('[data-kind=guard]', 'data-state')) === 'guarded')
  const b2 = page.url(); await page.keyboard.press('ArrowRight'); await page.waitForTimeout(1200)
  check('arrow keys drive the deck again', page.url() !== b2, `${b2.split('/').pop()} -> ${page.url().split('/').pop()}`)
  await go(frameSlide)                                                  // guarded from the start: keys work immediately
  const b3 = page.url(); await page.keyboard.press('ArrowRight'); await page.waitForTimeout(1200)
  check('keys work immediately on a guarded full-frame slide', page.url() !== b3)
} else console.log('SKIP  no full-frame <Demo> slide in this deck')

check('no page errors', errors.length === 0, errors.join(' | '))
await browser.close()
console.log(failed ? `${failed} FAILED` : 'all passed')
process.exit(failed ? 1 : 0)
