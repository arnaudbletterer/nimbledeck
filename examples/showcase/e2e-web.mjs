// Browser test of the WEB edition, served the way a site serves it (under a sub-path, from static files).
// Build and serve it first, for example:
//   WEB_BASE=/nimbledeck/demos/showcase/ WEB_OUT=/tmp/site/nimbledeck/demos/showcase npm run build:web
//   (any static server rooted at /tmp/site)   then:   node e2e-web.mjs http://localhost:8123/nimbledeck/demos/showcase/
// It walks every slide with the arrow keys and asserts: no request fails (every media file returns 200 under the non-root
// base), no offline panel shows, the video plays, the compare images are decoded, and the two slides that need
// `nimbledeck run` are left out.
import { chromium } from 'playwright-chromium'
import { findChrome } from '../../packages/cli/src/chrome.mjs'

const base = process.argv[2]
if (!base) { console.error('usage: node e2e-web.mjs <url of the built edition, with its base path>'); process.exit(2) }
const full = Number(process.argv[3] ?? 19), skipped = 2
const chrome = findChrome()
const browser = await chromium.launch(chrome ? { executablePath: chrome, args: ['--use-gl=angle', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] } : {})
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
let failed = 0
const check = (name, ok, detail = '') => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' (' + detail + ')' : ''}`); if (!ok) failed++ }
const bad = [], media = new Set(), errors = []
page.on('response', (r) => { if (r.status() >= 400) bad.push(`${r.status()} ${r.url()}`); if (/\.(mp4|webm|jpg|png)(\?|$)/.test(r.url())) media.add(r.url()) })
// Chrome cancels an in-flight <video> request when it switches to byte ranges or the slide is left: not a failure.
page.on('requestfailed', (r) => { if (!(r.resourceType() === 'media' && /ERR_ABORTED/.test(r.failure()?.errorText ?? ''))) bad.push(`FAILED ${r.url()}`) })
page.on('pageerror', (e) => errors.push(e.message.slice(0, 200)))

await page.goto(base + '#/1', { waitUntil: 'domcontentloaded' })
await page.waitForTimeout(3500)
const seen = []
let offline = 0, videoPlayed = false, compareOk = false
for (let i = 0; i < full + 2; i++) {
  const info = await page.evaluate(() => {
    const vis = (s) => [...document.querySelectorAll(s)].filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 })
    const v = vis('video')[0]
    return { hash: location.hash.split('?')[0], off: vis('.nd-site-off').length, t: v ? v.currentTime : null, ready: v ? v.readyState : 0, imgs: vis('img.nd-cmp-img').map((x) => x.complete && x.naturalWidth > 0) }
  })
  if (!seen.includes(info.hash)) seen.push(info.hash)
  offline += info.off
  await page.waitForTimeout(2200)
  const t2 = await page.evaluate(() => { const v = [...document.querySelectorAll('video')].find((e) => e.getBoundingClientRect().width > 0); return v ? v.currentTime : null })
  if (info.t != null && t2 != null && t2 > info.t && info.ready >= 2) videoPlayed = true
  if (info.imgs.length === 2 && info.imgs.every(Boolean)) compareOk = true
  await page.keyboard.press('ArrowRight'); await page.waitForTimeout(600)
}
check('every request returns a success status under the sub-path', bad.length === 0, bad.join(' | '))
check('the video file is requested and plays', [...media].some((u) => /loop\.(mp4|webm)/.test(u)) && videoPlayed)
check('the compare images are requested and decoded', [...media].some((u) => /source\.jpg/.test(u)) && [...media].some((u) => /slide\.jpg/.test(u)) && compareOk)
check('no offline panel shows on any slide', offline === 0, String(offline))
check(`the slides that need nimbledeck run are left out (${full - skipped} pages)`, seen.length === full - skipped, `${seen.length} pages`)
check('no page errors', errors.length === 0, errors.join(' | '))
await browser.close()
console.log(failed ? `${failed} FAILED` : 'all passed')
process.exit(failed ? 1 : 0)
