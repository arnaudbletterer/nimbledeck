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
const frameSlide = slides.findIndex((s) => /<Demo name="compute" \/>/.test(s.body) && /layout: full/.test(s.fm.layout ? 'layout: full' : '')) + 1

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

// Full-frame embedded page: the presentation must stay controllable (needs a deck with a full-frame <Demo>)
if (frameSlide) {
  await go(frameSlide)
  await page.waitForSelector('[data-kind=guard]', { timeout: 20000 })
  check('embedded page starts guarded', (await attr('[data-kind=guard]', 'data-state')) === 'guarded')
  await page.mouse.click(640, 360)                                    // click inside the frame: must NOT trap focus yet
  check('click on the shield makes it interactive', (await attr('[data-kind=guard]', 'data-state')) === 'interactive')
  check('the control bar is visible', await vis('.nd-bar').isVisible())
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
