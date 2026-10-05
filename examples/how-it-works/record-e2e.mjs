// End-to-end test of recordings: record the example's PyStream, LiveCode and Demo slides with their real Python processes,
// build a static web edition, serve it WITHOUT any process under a non-root base path, and check that the recordings play
// where the live components would be. Usage: node record-e2e.mjs      (needs uv, Chrome and playwright-chromium)
// It starts its own deck on shifted ports (env NIMBLEDECK_PORT_OFFSET, else the first free offset from 1500). Its clips go to a temporary folder,
// so the recordings kept in public/recordings are not touched.
import { spawnSync } from 'node:child_process'
import { cpSync, createReadStream, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { createServer } from 'node:http'
import { tmpdir } from 'node:os'
import { dirname, extname, join, normalize } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright-chromium'
import { findChrome } from '../../packages/cli/src/chrome.mjs'
import { disableUnrecorded } from '../../packages/cli/src/recordings.mjs'
import { portFree, slidevBin } from '../../packages/cli/src/run.mjs'
import { splitSlides } from '../../packages/cli/src/slides.mjs'

const dir = dirname(fileURLToPath(import.meta.url))
const BASE = '/nimbledeck/demos/x/'
// Shifted ports for the deck and its processes: the given offset, else the first free one from 1500 on.
const PORTS = [3030, 2719, 2720, 2721, 18765, 18800]
let offset = process.env.NIMBLEDECK_PORT_OFFSET ? Number(process.env.NIMBLEDECK_PORT_OFFSET) : 1500
if (!process.env.NIMBLEDECK_PORT_OFFSET) while (!(await Promise.all(PORTS.map((p) => portFree(p + offset)))).every(Boolean)) offset += 100
const env = { ...process.env, NIMBLEDECK_PORT_OFFSET: String(offset) }
let failed = 0
const check = (name, ok, detail = '') => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' (' + detail + ')' : ''}`); if (!ok) failed++ }
const sh = (cmd, args, quiet = false) => { const r = spawnSync(cmd, args, { cwd: dir, env, stdio: quiet ? ['ignore', 'ignore', 'inherit'] : 'inherit' }); if (r.status !== 0) throw new Error(`${cmd} ${args.join(' ')} failed`) }

// 1. Record with the processes running, into a scratch folder inside the project.
const deck = readFileSync(join(dir, 'how-it-works.md'), 'utf8')
const scratch = join(dir, 'public/.record-e2e')
rmSync(scratch, { recursive: true, force: true })
sh(process.execPath, ['../../packages/cli/bin/nimbledeck.mjs', 'record', 'how-it-works.md', '--slide', '11', '12', '19', '--seconds', '6', '--out', 'public/.record-e2e'])
const pub = mkdtempSync(join(tmpdir(), 'nd-rec-pub-'))   // a public folder that holds only these recordings
mkdirSync(join(pub, 'recordings'))
cpSync(scratch, join(pub, 'recordings'), { recursive: true })
rmSync(scratch, { recursive: true, force: true })
for (const id of ['stream-nbody', 'demo-compute', 'live-19']) check(`${id}.webm and poster were written`, existsSync(join(pub, 'recordings', `${id}.webm`)) && existsSync(join(pub, 'recordings', `${id}.jpg`)))

// 2. A static web edition: slides whose live components are all recorded stay, the others are left out (hash routes, like
//    the real web builds). No nimbledeck.json: nothing here knows of any Python process.
const web = join(dir, '.record-e2e.md'), out = mkdtempSync(join(tmpdir(), 'nd-rec-e2e-'))
const { text, skipped, played } = disableUnrecorded(deck, pub)
check('slides with recordings stay, the others are left out', played >= 3 && skipped >= 1, `${played} kept, ${skipped} left out`)
writeFileSync(web, text.replace(/^---\n/, '---\nrouterMode: hash\n'))
try { sh(process.execPath, [slidevBin(dir), 'build', '.record-e2e.md', '--base', BASE, '--out', out], true) } finally { rmSync(web, { force: true }) }
rmSync(join(out, 'nimbledeck.json'), { force: true })
cpSync(join(pub, 'recordings'), join(out, 'recordings'), { recursive: true })   // this run's clips, not the ones kept in public/
check('the static build has no session file', !existsSync(join(out, 'nimbledeck.json')))

// 3. Serve it under /nimbledeck/demos/x/ (with Range requests, which video needs).
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webm': 'video/webm', '.mp4': 'video/mp4', '.jpg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.woff': 'font/woff' }
const server = createServer((req, res) => {
  const path = decodeURIComponent(new URL(req.url, 'http://x').pathname)
  const file = path.startsWith(BASE) ? normalize(join(out, path.slice(BASE.length) || 'index.html')) : null
  if (!file || !file.startsWith(out) || !existsSync(file) || !statSync(file).isFile()) { res.writeHead(404).end(); return }
  const size = statSync(file).size, range = req.headers.range?.match(/bytes=(\d*)-(\d*)/)
  const head = { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream', 'accept-ranges': 'bytes' }
  if (range) {
    const a = range[1] ? Number(range[1]) : 0, b = range[2] ? Number(range[2]) : size - 1
    res.writeHead(206, { ...head, 'content-range': `bytes ${a}-${b}/${size}`, 'content-length': b - a + 1 })
    if (req.method === 'HEAD') return res.end()
    return createReadStream(file, { start: a, end: b }).pipe(res)
  }
  res.writeHead(200, { ...head, 'content-length': size })
  if (req.method === 'HEAD') return res.end()
  createReadStream(file).pipe(res)
})
await new Promise((ok) => server.listen(0, '127.0.0.1', ok))
const url = `http://127.0.0.1:${server.address().port}${BASE}`

// 4. A browser with no processes behind it: the recordings play instead of the offline panels.
const chrome = findChrome()
const browser = await chromium.launch(chrome ? { executablePath: chrome } : {})
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
  const errors = []; page.on('pageerror', (e) => errors.push(String(e).slice(0, 160)))
  const slideOf = (re) => splitSlides(deck).findIndex((s) => re.test(s.body)) + 1
  const go = async (n) => { await page.goto(`${url}#/${n}`, { waitUntil: 'domcontentloaded' }); await page.waitForFunction(() => [...document.querySelectorAll('.slidev-layout')].some((e) => e.getBoundingClientRect().width > 0)) }
  const time = (sel) => page.locator(sel).evaluate((v) => v.currentTime)
  for (const [name, n, id] of [['PyStream', slideOf(/<PyStream name="nbody" controls/), 'stream-nbody'], ['Demo', slideOf(/<Demo name="compute"/), 'demo-compute'], ['LiveCode', slideOf(/<LiveCode>/), 'live-19']]) {
    await go(n)
    const box = `[data-rec-id="${id}"]`, video = `${box} video.nd-rec-media`
    try { await page.locator(video).waitFor({ state: 'visible', timeout: 15000 }) } catch { /* reported below */ }
    check(`${name} (slide ${n}): the recording shows`, await page.locator(video).count() === 1)
    check(`${name}: no offline panel`, await page.locator(`${box} .nd-off, ${box} .nd-down p, ${box} .nd-live-msg`).count() === 0)
    check(`${name}: the video comes from the base path`, (await page.locator(video).evaluate((v) => v.currentSrc)).includes(`${BASE}recordings/${id}.`))
    check(`${name}: pill and hint are there`, /Recording of a live run/.test(await page.locator(`${box} .nd-rec-pill`).textContent()) && /Run it locally to make it live/.test(await page.locator(`${box} .nd-rec-hint`).textContent()))
    const props = await page.locator(video).evaluate((v) => ({ muted: v.muted, loop: v.loop, inline: v.playsInline, w: v.videoWidth }))
    check(`${name}: muted, looping, inline, decoded`, props.muted && props.loop && props.inline && props.w > 100, JSON.stringify(props))
    const t0 = await time(video); await page.waitForTimeout(1500); const t1 = await time(video)
    check(`${name}: the video is playing`, t1 > t0 + 0.5, `currentTime ${t0.toFixed(2)} -> ${t1.toFixed(2)}`)
    if (process.env.E2E_SHOTS) await page.screenshot({ path: join(process.env.E2E_SHOTS, `${id}.png`) })   // to look at the playback by eye
  }
  // Reduced motion: the poster only.
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await go(slideOf(/<PyStream name="nbody" controls/))
  await page.locator('[data-rec-id="stream-nbody"] img.nd-rec-media').waitFor({ state: 'visible', timeout: 15000 }).catch(() => {})
  check('prefers-reduced-motion shows the poster, not the video', await page.locator('[data-rec-id="stream-nbody"] img.nd-rec-media').count() === 1 && await page.locator('[data-rec-id="stream-nbody"] video').count() === 0)
  check('no page errors', errors.length === 0, errors.join(' | '))
} finally {
  await browser.close()
  server.close()
  rmSync(out, { recursive: true, force: true })
  rmSync(pub, { recursive: true, force: true })
}
console.log(failed ? `${failed} FAILED` : 'all passed')
process.exit(failed ? 1 : 0)
