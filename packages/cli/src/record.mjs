import { spawn, spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { homedir, tmpdir } from 'node:os'
import { basename, delimiter, dirname, join, relative, resolve } from 'node:path'
import { findChrome } from './chrome.mjs'
import { loadConfig, MAX_SECONDS, validateConfig } from './config.mjs'
import { mergeManifest, readManifest, recordingsDir, slideComponents, writeManifest } from './recordings.mjs'
import { killTree, startDeck } from './run.mjs'
import { splitSlides } from './slides.mjs'

// `nimbledeck record <deck.md>`: play the running deck in Chrome, and film each live component (LiveCode, PyStream, Demo)
// into public/recordings/<id>.webm (+ .mp4 when ffmpeg is on the PATH) and a poster. See docs/RECORDING.md.

const FPS = 30
const DENSITY = 2                                       // pixels per logical (CSS) pixel of a 1280 x 720 slide
const CAPTURE = { w: 1280 * DENSITY, h: 720 * DENSITY }  // the browser draws the slide at 2560 x 1440: text and canvases at native 2x, kept as they are

export function parseRecordArgs(args) {
  const o = { slides: [], seconds: 8, width: CAPTURE.w, out: null, url: null }
  const num = (flag, v) => { const n = Number(v); if (!Number.isFinite(n)) throw new Error(`${flag} needs a number (got ${JSON.stringify(v)})`); return n }
  for (let i = 0; i < args.length; i++) {
    const a = args[i]
    if (a === '--slide') {
      let any = false
      while (i + 1 < args.length && /^\d+$/.test(args[i + 1])) { o.slides.push(Number(args[++i])); any = true }
      if (!any) throw new Error('--slide needs one or more slide numbers, like --slide 11 19')
    } else if (a === '--seconds') o.seconds = num(a, args[++i])
    else if (a === '--width') o.width = num(a, args[++i])
    else if (a === '--out') o.out = args[++i]
    else if (a === '--url') o.url = args[++i]
    else throw new Error(`unknown option ${a} (use --slide, --seconds, --width, --out, --url)`)
  }
  if (o.slides.some((n) => n < 1)) throw new Error('slide numbers start at 1')
  if (!(o.seconds >= 1 && o.seconds <= MAX_SECONDS)) throw new Error(`--seconds must be from 1 to ${MAX_SECONDS}`)
  if (!(o.width >= 480 && o.width <= CAPTURE.w)) throw new Error(`--width must be from 480 to ${CAPTURE.w}`)
  if (o.out !== null && (!o.out || /[\0]/.test(o.out))) throw new Error('--out needs a folder')
  if (o.url !== null && !/^https?:\/\/[^\s/]+\/?$/.test(o.url)) throw new Error('--url must look like http://localhost:3030')
  return o
}

// Where the targets are: every slide with live components, or only the listed slides. [{ slide, comps }]
export function planTargets(slides, wanted = []) {
  const found = slides.map((s, i) => ({ slide: i + 1, comps: slideComponents(s.body, i + 1).filter((c) => c.id) })).filter((t) => t.comps.length)
  for (const n of wanted) {
    if (n > slides.length) throw new Error(`slide ${n} does not exist (the deck has ${slides.length})`)
    if (!found.some((t) => t.slide === n)) throw new Error(`slide ${n} has no <LiveCode>, <PyStream> or <Demo> to record`)
  }
  // The same stream or demo often appears on several slides: it is filmed once, on the first of them.
  const seen = new Set()
  const targets = []
  for (const t of found.filter((t) => !wanted.length || wanted.includes(t.slide))) {
    const ids = t.comps.map((c) => c.id)
    const dup = ids.find((id, i) => ids.indexOf(id) !== i)
    if (dup) throw new Error(`slide ${t.slide} has two components called ${dup}. Give each <LiveCode> its own id="..."`)
    const comps = t.comps.filter((c) => !seen.has(c.id))
    comps.forEach((c) => seen.add(c.id))
    if (comps.length) targets.push({ slide: t.slide, comps })
  }
  return targets
}

// Frames arrive when the screen changes, at irregular times. A timeline keeps the latest frame of every 1/fps slot, and
// plays them back at a steady rate (a still screen repeats its last frame).
export class Timeline {
  constructor(fps = FPS) { this.fps = fps; this.t0 = null; this.slots = new Map() }
  add(t, data) {
    this.t0 ??= t
    this.slots.set(Math.max(0, Math.floor((t - this.t0) * this.fps)), data)
  }
  // `seconds` of frames, one per slot; null when nothing was captured.
  frames(seconds) {
    if (!this.slots.size) return null
    const n = Math.max(1, Math.round(seconds * this.fps)), out = []
    let prev = this.slots.get(Math.min(...this.slots.keys()))
    for (let k = 0; k < n; k++) { prev = this.slots.get(k) ?? prev; out.push(prev) }
    return out
  }
}

const even = (n) => Math.max(2, Math.round(n / 2) * 2)

// The part of the capture to keep, and the size of the video. `box` is the component's box in capture pixels (the page is laid
// out at the capture size); `width` is the video width a whole slide would have. At the default (the capture width) nothing is
// scaled: the video holds every pixel of the box. `logical` is the box at the slide's own 1280 x 720 scale, in CSS pixels at
// 1x: the size the page lays the video out at (so it is sharp on a 2x screen and fine on a 1x one).
export function frameGeometry(box, width = CAPTURE.w) {
  const x = Math.max(0, Math.floor(box.x)), y = Math.max(0, Math.floor(box.y))
  const evenDown = (n) => Math.max(2, n - (n % 2))
  const w = evenDown(Math.min(CAPTURE.w - x, Math.ceil(box.width))), h = evenDown(Math.min(CAPTURE.h - y, Math.ceil(box.height)))
  const f = width / CAPTURE.w
  return { crop: { x, y, w, h }, w: f === 1 ? w : even(w * f), h: f === 1 ? h : even(h * f), logical: { w: Math.round(w / DENSITY), h: Math.round(h / DENSITY) } }
}

// The quality ladder (docs/RECORDING.md): constant-quality CRF, lower is better and bigger.
// The rates cap the clips that change on every frame (moving particles); a calm clip never reaches them.
export const QUALITY = { vp9Crf: 29, vp9MaxRate: '2800k', h264Crf: 21, h264MaxRate: '3400k', vp8Crf: 10, vp8Rate: '6M' }

// ffmpeg arguments: PNG frames on stdin, the cropped video out (scaled only when a smaller --width asks for it). `kind` is
// 'vp9' (webm), 'h264' (mp4) or 'vp8' (webm, the fallback of the ffmpeg Playwright ships). VP9 runs in two passes: pass 1
// writes only a log (`passlog`), pass 2 the file.
export function encodeArgs(kind, g, out, { fps = FPS, pass = 0, passlog = null } = {}) {
  const scale = g.w === g.crop.w && g.h === g.crop.h ? '' : `scale=${g.w}:${g.h}:flags=lanczos,`
  // RGB to BT.709 limited range, and tagged so: browsers decode HD video as BT.709, and untagged video drifts in colour.
  const vf = `crop=${g.crop.w}:${g.crop.h}:${g.crop.x}:${g.crop.y},${scale}scale=out_color_matrix=bt709:out_range=tv,format=yuv420p`
  const tags = ['-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-color_range', 'tv']
  const input = ['-hide_banner', '-loglevel', 'error', '-y', '-f', 'image2pipe', '-c:v', 'png', '-framerate', String(fps), '-i', 'pipe:0', '-vf', vf, '-an', '-r', String(fps), ...tags]
  const keyframes = ['-g', String(fps * 2)]
  if (kind === 'vp9') {
    const v = ['-c:v', 'libvpx-vp9', '-b:v', QUALITY.vp9MaxRate, '-crf', String(QUALITY.vp9Crf), '-row-mt', '1', '-tile-columns', '2', '-deadline', 'good', '-cpu-used', '1', ...keyframes, '-lag-in-frames', '25', '-auto-alt-ref', '1', '-tune-content', 'screen', '-pix_fmt', 'yuv420p']
    if (pass) v.push('-pass', String(pass), '-passlogfile', passlog)
    return [...input, ...v, ...(pass === 1 ? ['-f', 'null', '-'] : [out])]
  }
  if (kind === 'h264') return [...input, '-c:v', 'libx264', '-preset', 'slow', '-crf', String(QUALITY.h264Crf), '-maxrate', QUALITY.h264MaxRate, '-bufsize', '7M', '-profile:v', 'high', '-pix_fmt', 'yuv420p', ...keyframes, '-movflags', '+faststart', out]
  return [...input, '-c:v', 'libvpx', '-crf', String(QUALITY.vp8Crf), '-b:v', QUALITY.vp8Rate, '-deadline', 'good', '-cpu-used', '2', ...keyframes, '-auto-alt-ref', '0', out]
}

// ffmpeg binaries: the one Playwright downloaded (VP8 only, always the same build), and one on the PATH (H.264).
export function findFfmpeg({ platform = process.platform, env = process.env, home = homedir(), exists = existsSync, list = (d) => readdirSync(d) } = {}) {
  const exe = platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg'
  const system = (env.PATH ?? '').split(delimiter).filter(Boolean).map((d) => join(d, exe)).find((p) => exists(p)) ?? null
  const cache = env.PLAYWRIGHT_BROWSERS_PATH && env.PLAYWRIGHT_BROWSERS_PATH !== '0' ? env.PLAYWRIGHT_BROWSERS_PATH
    : platform === 'darwin' ? join(home, 'Library', 'Caches', 'ms-playwright')
    : platform === 'win32' ? join(env.LOCALAPPDATA ?? join(home, 'AppData', 'Local'), 'ms-playwright')
    : join(home, '.cache', 'ms-playwright')
  const file = platform === 'darwin' ? 'ffmpeg-mac' : platform === 'win32' ? 'ffmpeg-win64.exe' : 'ffmpeg-linux'
  let bundled = null
  try {
    const dirs = list(cache).filter((d) => /^ffmpeg-\d+$/.test(d)).sort((a, b) => Number(b.slice(7)) - Number(a.slice(7)))
    bundled = dirs.map((d) => join(cache, d, file)).find((p) => exists(p)) ?? null
  } catch { /* no Playwright cache */ }
  return { bundled, system }
}

// The encoders an ffmpeg binary was built with (`ffmpeg -encoders`), as a Set; empty when it cannot be asked.
export function ffmpegEncoders(bin) {
  const r = spawnSync(bin, ['-hide_banner', '-encoders'], { encoding: 'utf8' })
  return new Set(r.status === 0 ? [...r.stdout.matchAll(/^\s*V\S*\s+(\S+)/gm)].map((m) => m[1]) : [])
}

// Which formats to write, and with which ffmpeg: [{ ext, kind, bin }]. A system ffmpeg gives VP9 webm and H.264 mp4 (whatever
// its build has); without one the ffmpeg of Playwright writes VP8 webm only, at a visibly lower quality.
export function planEncodes(ff, encoders = ff.system ? ffmpegEncoders(ff.system) : new Set()) {
  const plan = []
  if (ff.system && encoders.has('libvpx-vp9')) plan.push({ ext: 'webm', kind: 'vp9', bin: ff.system })
  if (ff.system && encoders.has('libx264')) plan.push({ ext: 'mp4', kind: 'h264', bin: ff.system })
  if (!plan.some((p) => p.ext === 'webm') && ff.bundled) plan.push({ ext: 'webm', kind: 'vp8', bin: ff.bundled })
  return plan
}

// Runs ffmpeg with the frames on its stdin. Resolves with the file size, rejects with ffmpeg's own words.
function encode(bin, args, frames) {
  return new Promise((ok, fail) => {
    const p = spawn(bin, args, { stdio: ['pipe', 'ignore', 'pipe'] })
    let err = ''
    p.stderr.on('data', (d) => { err = (err + d).slice(-2000) })
    p.on('error', fail)
    p.stdin.on('error', () => { /* ffmpeg ended early: its exit code tells why */ })
    p.on('close', (code) => (code === 0 ? ok() : fail(new Error(`ffmpeg failed: ${err.trim().split('\n').pop()}`))))
    ;(async () => {
      for (const f of frames) if (!p.stdin.write(f)) await new Promise((r) => p.stdin.once('drain', r))
      p.stdin.end()
    })()
  })
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

// Same typist every time (a fixed seed), so a re-recording looks like the last one.
function rng(seed = 7) { return () => { seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296 } }

// How long to wait after typing `ch`: quick inside a word, a pause at spaces, punctuation and line ends. The editor re-runs
// 300 ms after the last key, so the pauses are where the plot updates.
export function typingDelay(ch, rand) {
  if (ch === '\n') return 350 + rand() * 250
  if (ch === ' ') return 110 + rand() * 170
  if (/[,)\]:]/.test(ch)) return 140 + rand() * 260
  return 45 + rand() * 70
}

// The key names Playwright takes; "Mod" means Cmd on a Mac and Ctrl elsewhere.
export const keyName = (k) => k.replace(/^(Mod|Cmd\/Ctrl)\+/, 'ControlOrMeta+')

// The slider a step means: the one whose closest ancestor that holds the label text holds only that slider. Works for a
// <label> around an <input type=range>, and for the custom sliders of marimo.
async function findSlider(scope, label) {
  for (let tries = 0; tries < 30; tries++) {   // a demo may still be drawing its controls
    for (const h of await scope.locator('input[type=range], [role=slider]').elementHandles()) {
      const mine = await h.evaluate((el, src) => {
        for (let a = el.parentElement; a; a = a.parentElement) {
          if (new RegExp(src, 'i').test(a.textContent)) return a.querySelectorAll('input[type=range], [role=slider]').length === 1
        }
        return false
      }, esc(label))
      if (mine) return h
    }
    await sleep(500)
  }
  throw new Error(`no slider labelled "${label}"`)
}

async function runStep(page, root, scope, step, rand) {
  if ('wait' in step) return sleep(step.wait)
  if ('key' in step) return page.keyboard.press(keyName(step.key))
  if ('type' in step) {
    await root.locator('.cm-content').click()
    await page.keyboard.press('ControlOrMeta+End')
    if (step.replace) { await page.keyboard.press('ControlOrMeta+a'); await page.keyboard.press('Delete') }
    for (const ch of step.type) {
      if (ch === '\n') await page.keyboard.press('Enter'); else await page.keyboard.type(ch)
      await sleep(typingDelay(ch, rand))
    }
    return
  }
  if ('set' in step) {
    const slider = await findSlider(scope, step.set)
    if ((await slider.evaluate((el) => el.tagName)) === 'INPUT') {
      const from = Number(await slider.inputValue())
      for (let i = 1; i <= 10; i++) {   // a drag, not a jump
        await slider.evaluate((el, v) => { el.value = String(v); el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })) }, from + ((step.value - from) * i) / 10)
        await sleep(60)
      }
    } else {   // a custom slider (marimo's): arrow keys move it one step at a time
      await slider.focus()
      const now = async () => Number(await slider.getAttribute('aria-valuenow'))
      let unit = 0, last = NaN
      for (let i = 0; i < 200; i++) {
        const v = await now(), diff = step.value - v
        if (diff === 0 || v === last) break   // arrived, or the slider stopped moving (its end)
        last = v
        const up = diff > 0
        // Page keys move ten steps; the size of a step is learnt from the first arrow press.
        await page.keyboard.press(unit && Math.abs(diff) >= 10 * unit ? (up ? 'PageUp' : 'PageDown') : (up ? 'ArrowRight' : 'ArrowLeft'))
        await sleep(40)
        if (!unit) unit = Math.abs((await now()) - v)
      }
    }
    return
  }
  if ('click' in step) {
    const button = scope.getByRole('button', { name: step.click }).first()
    return (await button.count()) ? button.click() : scope.getByText(step.click).first().click()
  }
}

// Hides what is not part of the slide: Slidev's controls, the mouse pointer, the status dot of a demo.
const CLEAN = '*{cursor:none!important}.slidev-nav,.slidev-controls,#slidev-goto-dialog,.slidev-toast,.nd-dot{visibility:hidden!important}'

// What "live" looks like in the DOM (data-state of the component), and what to wait for after that.
const READY = { stream: 'live', demo: 'live', live: 'ok' }

async function filmComponent({ page, cdp, base, slide, comp, cfgRec, o, log }) {
  const sel = `[data-rec-id="${comp.id}"]`
  const root = page.locator(sel).first()
  await page.goto(`${base}/${slide}?clicks=99`, { waitUntil: 'domcontentloaded', timeout: 30000 })
  try { await root.waitFor({ state: 'visible', timeout: 30000 }) } catch { throw new Error(`${comp.id} did not appear on slide ${slide} (is the deck at ${base} the one you gave?)`) }
  try { await page.locator(`${sel}[data-state="${READY[comp.kind]}"]`).waitFor({ state: 'attached', timeout: 45000 }) }
  catch { throw new Error(`${comp.id} never went live (state: ${await root.getAttribute('data-state')}). Is its Python process running?`) }
  let scope = root
  if (comp.kind === 'demo') {
    scope = page.frameLocator(`${sel} iframe`)
    try { await scope.locator('body').filter({ hasText: /\S{3}/ }).waitFor({ timeout: 20000 }) } catch { log(`  ${comp.id}: the demo shows nothing yet, recording anyway`) }
  }
  await page.addStyleTag({ content: CLEAN })
  await page.waitForTimeout(1500)
  await page.evaluate(() => document.activeElement?.blur?.())
  const geo = frameGeometry(await root.boundingBox(), o.width)

  const timeline = new Timeline()
  // The screencast of the DevTools protocol, as PNG: lossless, and 35 to 60 frames a second at this size (measured). It sends
  // frames in CSS pixels, so the page is laid out at the capture size itself rather than at 1280 x 720 with a 2x density:
  // the screencast of a 2x page is only 1280 x 720 (Page.captureScreenshot gives 2x but manages 16 to 25 frames a second).
  let raw = 0
  const onFrame = (f) => { raw++; timeline.add(f.metadata.timestamp, Buffer.from(f.data, 'base64')); cdp.send('Page.screencastFrameAck', { sessionId: f.sessionId }).catch(() => {}) }
  cdp.on('Page.screencastFrame', onFrame)
  await cdp.send('Page.startScreencast', { format: 'png', maxWidth: CAPTURE.w, maxHeight: CAPTURE.h, everyNthFrame: 1 })
  const started = Date.now()
  const rand = rng()
  let failure = null
  for (const step of cfgRec.steps ?? []) {
    try { await runStep(page, root, scope, step, rand) } catch (e) { failure = new Error(`step ${JSON.stringify(step).slice(0, 80)} failed: ${String(e.message).split('\n')[0]}`); break }
  }
  const wanted = (cfgRec.seconds ?? o.seconds) * 1000, spent = Date.now() - started
  if (!failure) await sleep(spent < wanted ? wanted - spent : 600)   // steps that run long get a short tail instead of being cut
  await cdp.send('Page.stopScreencast')
  cdp.off('Page.screencastFrame', onFrame)
  if (failure) throw failure
  const frames = timeline.frames(Math.min(MAX_SECONDS, (Date.now() - started) / 1000))
  if (!frames) throw new Error(`${comp.id}: the browser sent no frames`)
  return { frames, geo, seconds: frames.length / FPS, captured: raw / ((Date.now() - started) / 1000) }
}

// A poster from the last frame at full pixel size, cut (and scaled when asked) by the browser itself: the ffmpeg Playwright
// ships cannot write JPEG.
const poster = (page, frame, g) => page.evaluate(async ({ b64, g }) => {
  const bmp = await createImageBitmap(await (await fetch(`data:image/png;base64,${b64}`)).blob())
  const c = new OffscreenCanvas(g.w, g.h), x = c.getContext('2d')
  x.imageSmoothingQuality = 'high'; x.drawImage(bmp, g.crop.x, g.crop.y, g.crop.w, g.crop.h, 0, 0, g.w, g.h)
  const blob = await c.convertToBlob({ type: 'image/jpeg', quality: 0.93 })
  const r = new FileReader()
  await new Promise((done) => { r.onload = done; r.readAsDataURL(blob) })
  return r.result.split(',')[1]
}, { b64: frame.toString('base64'), g })

const kb = (file) => `${Math.round(statSync(file).size / 1024)} KB`

export async function recordDeck(deckPath, root, args) {
  const o = parseRecordArgs(args)
  const cfg = loadConfig(root)
  const problems = validateConfig(cfg, root)
  const out = resolve(root, o.out ?? join(cfg.publicDir, 'recordings'))
  const rel = relative(root, out)
  if (rel.startsWith('..') || resolve(rel) === rel) problems.push(`--out: ${out} must stay inside the project folder`)
  if (problems.length) throw new Error(`invalid nimbledeck.config.json or options:\n  ${problems.join('\n  ')}`)
  const slides = splitSlides(readFileSync(deckPath, 'utf8'))
  const targets = planTargets(slides, o.slides)
  if (!targets.length) throw new Error('no slide has a <LiveCode>, <PyStream> or <Demo>: nothing to record')

  let chromium
  try { ({ chromium } = createRequire(join(root, 'noop.js'))('playwright-chromium')) } catch { throw new Error('nimbledeck record needs playwright-chromium installed next to the deck') }
  const ff = findFfmpeg()
  const plan = planEncodes(ff)
  if (!plan.length) throw new Error('no ffmpeg found: install ffmpeg (with libvpx-vp9 and libx264) on your PATH, or run `npx playwright-chromium install ffmpeg`')
  if (!plan.some((p) => p.kind === 'vp9')) console.warn('no system ffmpeg with VP9: using the ffmpeg of Playwright (VP8 only, no mp4). Quality is limited; install ffmpeg to get VP9 and H.264.')

  const log = (m) => console.log(m)
  let deck = null
  if (!o.url) {
    log('starting the deck and its processes...')
    deck = await startDeck(basename(deckPath), root)
  }
  const base = (o.url ?? `http://localhost:${cfg.port}`).replace(/\/$/, '')
  const cleanup = async () => { if (deck) { await deck.stop(); deck.children.forEach((c) => killTree(c.child)) } }
  process.once('SIGINT', () => cleanup().then(() => process.exit(130)))

  const done = [], failed = []
  let browser
  try {
    // The deck needs a moment before it answers.
    for (let i = 0; ; i++) {
      try { if ((await fetch(base)).ok) break } catch { /* not yet */ }
      if (i > 120) throw new Error(`the deck did not answer at ${base}`)
      await sleep(500)
    }
    const chrome = findChrome()
    browser = await chromium.launch(chrome ? { executablePath: chrome } : {})
    const page = await browser.newPage({ viewport: { width: CAPTURE.w, height: CAPTURE.h }, deviceScaleFactor: 1 })
    page.on('dialog', (d) => d.dismiss())
    const cdp = await page.context().newCDPSession(page)
    mkdirSync(out, { recursive: true })
    for (const { slide, comps } of targets) {
      for (const comp of comps) {
        log(`slide ${slide}: ${comp.id}`)
        try {
          const { frames, geo, seconds, captured } = await filmComponent({ page, cdp, base, slide, comp, cfgRec: cfg.recordings[comp.id] ?? {}, o, log })
          const files = []
          const stem = join(out, comp.id)
          for (const { ext, kind, bin } of plan) {
            try {
              if (kind === 'vp9') { const passlog = join(tmpdir(), `nd-pass-${process.pid}-${comp.id}`); try { await encode(bin, encodeArgs(kind, geo, `${stem}.${ext}`, { pass: 1, passlog }), frames); await encode(bin, encodeArgs(kind, geo, `${stem}.${ext}`, { pass: 2, passlog }), frames) } finally { rmSync(`${passlog}-0.log`, { force: true }) } }
              else await encode(bin, encodeArgs(kind, geo, `${stem}.${ext}`), frames)
              files.push(`${comp.id}.${ext}`)
            } catch (e) { if (ext === 'webm') throw e; log(`  no ${ext} (${e.message})`); rmSync(`${stem}.${ext}`, { force: true }) }
          }
          if (!plan.some((p) => p.ext === 'mp4')) rmSync(`${stem}.mp4`, { force: true })
          writeFileSync(`${stem}.jpg`, Buffer.from(await poster(page, frames.at(-1), geo), 'base64'))
          log(`  ${seconds.toFixed(1)} s, ${geo.w}x${geo.h} px (${geo.logical.w}x${geo.logical.h} css), browser sent ${captured.toFixed(0)} frames/s: ${files.map((f) => `${f} ${kb(join(out, f))}`).join(', ')}, ${comp.id}.jpg ${kb(`${stem}.jpg`)}`)
          done.push({ id: comp.id, kind: comp.kind, seconds: Math.round(seconds * 10) / 10, width: geo.logical.w, height: geo.logical.h, pixelWidth: geo.w, pixelHeight: geo.h, fps: FPS, codecs: plan.filter((p) => files.includes(`${comp.id}.${p.ext}`)).map((p) => p.kind), files, poster: `${comp.id}.jpg` })
        } catch (e) { failed.push(comp.id); console.error(`  ERROR ${comp.id}: ${e.message}`) }
      }
    }
  } finally {
    await browser?.close()
    await cleanup()
  }
  if (done.length) writeManifest(out, mergeManifest(readManifest(out), done))
  console.log(`${done.length} recorded${failed.length ? `, ${failed.length} failed (${failed.join(', ')})` : ''}, manifest ${join(relative(root, out), 'index.json')}`)
  return failed.length ? 1 : 0
}
