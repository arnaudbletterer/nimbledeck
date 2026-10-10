import { spawn, spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, readdirSync, readFileSync, renameSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { homedir, tmpdir } from 'node:os'
import { basename, delimiter, dirname, join, relative, resolve } from 'node:path'
import { findChrome } from './chrome.mjs'
import { loadConfig, MAX_SECONDS, validateConfig } from './config.mjs'
import { chooseClock, DEFAULT_FPS, LockstepClock, MAX_FPS, MIN_FPS, PAGE_SHIM, ticksFor, withTimeout } from './lockstep.mjs'
import { mergeManifest, readManifest, recordingsDir, slideComponents, writeManifest } from './recordings.mjs'
import { killTree, startDeck } from './run.mjs'
import { splitSlides } from './slides.mjs'

// `nimbledeck record <deck.md>`: play the running deck in Chrome, and film each live component (LiveCode, PyStream, Demo)
// into public/recordings/<id>.webm (+ .mp4 when ffmpeg is on the PATH) and a poster. By default the recorder drives time
// (lockstep, lockstep.mjs) and takes one lossless frame per 1/60 s of virtual time; `--realtime` films what the screen shows
// as it goes. See docs/RECORDING.md.

const FPS = DEFAULT_FPS
const DENSITY = 2                                       // pixels per logical (CSS) pixel of a 1280 x 720 slide
// Chrome flags for lockstep. Without the first one, a screenshot taken while virtual time is paused can wait for a "new content
// rendering" timeout that only virtual time could end: it never answers (measured: after the deck mounts its other slides, on
// Chrome 154 and the headless shell; advancing virtual time by a few seconds unsticks it, the flag avoids it). The others make
// the compositor draw every stage before a screenshot and keep animations on the main thread, where the shim sets them.
const LOCKSTEP_FLAGS = ['--disable-new-content-rendering-timeout', '--run-all-compositor-stages-before-draw', '--disable-threaded-animation', '--disable-threaded-scrolling', '--disable-checker-imaging']
const CAPTURE = { w: 1280 * DENSITY, h: 720 * DENSITY }  // the browser draws the slide at 2560 x 1440: text and canvases at native 2x, kept as they are

export function parseRecordArgs(args) {
  const o = { slides: [], seconds: 8, width: CAPTURE.w, out: null, url: null, fps: FPS, realtime: false, timeout: 900 }
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
    else if (a === '--fps') o.fps = num(a, args[++i])
    else if (a === '--timeout') o.timeout = num(a, args[++i])
    else if (a === '--realtime') o.realtime = true
    else throw new Error(`unknown option ${a} (use --slide, --seconds, --width, --out, --url, --fps, --realtime, --timeout)`)
  }
  if (o.slides.some((n) => n < 1)) throw new Error('slide numbers start at 1')
  if (!(o.seconds >= 1 && o.seconds <= MAX_SECONDS)) throw new Error(`--seconds must be from 1 to ${MAX_SECONDS}`)
  if (!(o.width >= 480 && o.width <= CAPTURE.w)) throw new Error(`--width must be from 480 to ${CAPTURE.w}`)
  if (!(Number.isInteger(o.fps) && o.fps >= MIN_FPS && o.fps <= MAX_FPS)) throw new Error(`--fps must be a whole number from ${MIN_FPS} to ${MAX_FPS}`)
  if (!(o.timeout >= 30 && o.timeout <= 7200)) throw new Error('--timeout must be from 30 to 7200 seconds (the wall-clock limit of one clip)')
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
// writes only a log (`passlog`), pass 2 the file. With `file`, the input is a lossless video already cut, scaled and tagged
// (the intermediate of a lockstep clip, which is read twice), not PNG frames.
export function encodeArgs(kind, g, out, { fps = FPS, pass = 0, passlog = null, file = null } = {}) {
  const scale = g.w === g.crop.w && g.h === g.crop.h ? '' : `scale=${g.w}:${g.h}:flags=lanczos,`
  // RGB to BT.709 limited range, and tagged so: browsers decode HD video as BT.709, and untagged video drifts in colour.
  const vf = `crop=${g.crop.w}:${g.crop.h}:${g.crop.x}:${g.crop.y},${scale}scale=out_color_matrix=bt709:out_range=tv,format=yuv420p`
  const tags = ['-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-color_range', 'tv']
  const input = file
    ? ['-hide_banner', '-loglevel', 'error', '-y', '-i', file, '-an', '-r', String(fps), ...tags]
    : ['-hide_banner', '-loglevel', 'error', '-y', '-f', 'image2pipe', '-c:v', 'png', '-framerate', String(fps), '-i', 'pipe:0', '-vf', vf, '-an', '-r', String(fps), ...tags]
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

// Runs ffmpeg with the frames on its stdin (none when it reads a file). Resolves when it ends, rejects with ffmpeg's own words.
function encode(bin, args, frames = null) {
  return new Promise((ok, fail) => {
    const p = spawn(bin, args, { stdio: [frames ? 'pipe' : 'ignore', 'ignore', 'pipe'] })
    let err = ''
    p.stderr.on('data', (d) => { err = (err + d).slice(-2000) })
    p.on('error', fail)
    p.stdin?.on('error', () => { /* ffmpeg ended early: its exit code tells why */ })
    p.on('close', (code) => (code === 0 ? ok() : fail(new Error(`ffmpeg failed: ${err.trim().split('\n').pop()}`))))
    if (!frames) return
    ;(async () => {
      for (const f of frames) if (!p.stdin.write(f)) await new Promise((r) => p.stdin.once('drain', r))
      p.stdin.end()
    })()
  })
}

// ffmpeg arguments of the intermediate of a lockstep clip: the frames cut, scaled, converted and tagged exactly as the final
// encodes would, and kept lossless (FFV1), so the two VP9 passes and the H.264 pass read a file instead of a pipe.
export function intermediateArgs(g, out, fps = FPS) {
  const a = encodeArgs('vp8', g, out, { fps })
  return [...a.slice(0, a.indexOf('-c:v', a.indexOf('-vf'))), '-c:v', 'ffv1', '-level', '3', '-g', '1', '-pix_fmt', 'yuv420p', out]
}

// A running ffmpeg that takes frames one at a time (a lockstep clip: nothing is kept in memory). `end()` waits for the file.
class FrameSink {
  constructor(bin, args) {
    this.p = spawn(bin, args, { stdio: ['pipe', 'ignore', 'pipe'] })
    let err = '', closed = false
    this.p.stderr.on('data', (d) => { err = (err + d).slice(-2000) })
    this.p.stdin.on('error', () => { /* its exit code tells why */ })
    this.done = new Promise((ok, fail) => {
      this.p.on('error', fail)
      this.p.on('close', (code) => { closed = true; code === 0 ? ok() : fail(new Error(`ffmpeg failed: ${err.trim().split('\n').pop() || `exit ${code}`}`)) })
    })
    this.done.catch(() => {})
    this.isClosed = () => closed
  }
  async write(buf) {
    if (this.isClosed()) await this.done   // throws ffmpeg's own error
    if (!this.p.stdin.write(buf)) await Promise.race([new Promise((r) => this.p.stdin.once('drain', r)), this.done])
  }
  async end() { this.p.stdin.end(); await this.done }
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
async function findSlider(scope, label, wait = sleep) {
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
    await wait(500)
  }
  throw new Error(`no slider labelled "${label}"`)
}

// One scripted step. `wait(ms)` is how time passes: a real sleep, or ticks of the lockstep clock (then every frame of the wait is
// taken). In lockstep the page is driven without Playwright's locators, whose waits poll with timers of their own.
async function runStep(page, root, scope, step, rand, wait = sleep, lockstep = false) {
  if ('wait' in step) return wait(step.wait)
  if ('key' in step) return page.keyboard.press(keyName(step.key))
  if ('type' in step) {
    if (lockstep) await root.evaluate((el) => el.querySelector('.cm-content').focus())
    else await root.locator('.cm-content').click()
    await page.keyboard.press('ControlOrMeta+End')
    if (step.replace) { await page.keyboard.press('ControlOrMeta+a'); await page.keyboard.press('Delete') }
    for (const ch of step.type) {
      if (ch === '\n') await page.keyboard.press('Enter'); else await page.keyboard.type(ch)
      await wait(typingDelay(ch, rand))
    }
    return
  }
  if ('set' in step) {
    const slider = await findSlider(scope, step.set, wait)
    if ((await slider.evaluate((el) => el.tagName)) === 'INPUT') {
      const from = Number(await slider.inputValue())
      for (let i = 1; i <= 10; i++) {   // a drag, not a jump
        await slider.evaluate((el, v) => { el.value = String(v); el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })) }, from + ((step.value - from) * i) / 10)
        await wait(60)
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
        await wait(40)
        if (!unit) unit = Math.abs((await now()) - v)
      }
    }
    return
  }
  if ('click' in step) {
    if (lockstep) {
      const hit = await root.evaluate((el, text) => { const b = [...el.querySelectorAll('button')].find((x) => x.textContent.includes(text)); b?.click(); return !!b }, step.click)
      if (!hit) throw new Error(`no button "${step.click}"`)
      return
    }
    const button = scope.getByRole('button', { name: step.click }).first()
    return (await button.count()) ? button.click() : scope.getByText(step.click).first().click()
  }
}

// Hides what is not part of the slide: Slidev's controls, the mouse pointer, the status dot of a demo.
const CLEAN = '*{cursor:none!important}.slidev-nav,.slidev-controls,#slidev-goto-dialog,.slidev-toast,.nd-dot{visibility:hidden!important}'

// What "live" looks like in the DOM (data-state of the component), and what to wait for after that.
const READY = { stream: 'live', demo: 'live', live: 'ok' }

// Hides everything on the slide that is not the component or what it sits in (its parents keep their backgrounds): a clip of a
// stream that has a paragraph and equations laid over it holds only the stream. `visibility`, so nothing moves.
const isolate = (sel) => {
  const el = document.querySelector(sel)
  for (let a = el; a && a !== document.body; a = a.parentElement) {
    for (const sib of a.parentElement?.children ?? []) if (sib !== a && !/^(SCRIPT|STYLE|LINK)$/.test(sib.tagName)) sib.style.setProperty('visibility', 'hidden', 'important')
  }
}

// Opens the slide, waits until the component is live and still, and measures its box.
async function openComponent({ page, base, slide, comp, cfgRec, o, log }) {
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
  if (cfgRec.isolate) await page.evaluate(isolate, sel)
  await page.waitForTimeout(1500)
  await page.evaluate(() => document.activeElement?.blur?.())
  return { root, scope, geo: frameGeometry(await root.boundingBox(), o.width) }
}

// After a step, the screen of a demo that computes elsewhere changes once the answer is back, then stays still: wait for that.
async function settle(lastFrame, since) {
  const t0 = Date.now()
  while (Date.now() - t0 < 20000) {
    const quiet = Date.now() - lastFrame()
    if (lastFrame() >= since ? quiet >= 700 : Date.now() - since >= 3000) return
    await sleep(100)
  }
}

// Real time: the screencast of the DevTools protocol delivers a frame when the screen changes, the timeline keeps the latest of
// every 1/fps slot and holds the last frame on a still screen. How many frames the machine managed is printed.
async function filmRealtime({ page, cdp, ready, comp, cfgRec, o }) {
  const { root, scope } = ready
  const timeline = new Timeline(o.fps)
  // The screencast sends frames in CSS pixels, so the page is laid out at the capture size itself rather than at 1280 x 720 with a 2x density:
  // the screencast of a 2x page is only 1280 x 720 (Page.captureScreenshot gives 2x but manages 16 to 25 frames a second).
  let raw = 0, lastFrame = Date.now()
  const onFrame = (f) => { raw++; lastFrame = Date.now(); timeline.add(f.metadata.timestamp, Buffer.from(f.data, 'base64')); cdp.send('Page.screencastFrameAck', { sessionId: f.sessionId }).catch(() => {}) }
  cdp.on('Page.screencastFrame', onFrame)
  await cdp.send('Page.startScreencast', { format: 'png', maxWidth: CAPTURE.w, maxHeight: CAPTURE.h, everyNthFrame: 1 })
  const started = Date.now()
  const rand = rng()
  let failure = null
  for (const step of cfgRec.steps ?? []) {
    try {
      await runStep(page, root, scope, step, rand)
      if (comp.kind === 'demo' && 'set' in step) await settle(() => lastFrame, Date.now())
    } catch (e) { failure = new Error(`step ${JSON.stringify(step).slice(0, 80)} failed: ${String(e.message).split('\n')[0]}`); break }
  }
  const wanted = (cfgRec.seconds ?? o.seconds) * 1000, spent = Date.now() - started
  if (!failure) await sleep(spent < wanted ? wanted - spent : 600)   // steps that run long get a short tail instead of being cut
  await cdp.send('Page.stopScreencast')
  cdp.off('Page.screencastFrame', onFrame)
  if (failure) throw failure
  const wall = (Date.now() - started) / 1000
  const frames = timeline.frames(Math.min(MAX_SECONDS, wall))
  if (!frames) throw new Error(`${comp.id}: the browser sent no frames`)
  return { frames, seconds: frames.length / o.fps, count: frames.length, wall, detail: `browser sent ${(raw / wall).toFixed(0)} frames/s, the rest holds the last frame`, posterFrame: frames.at(-1), posterGeo: ready.geo }
}

// Lockstep: the recorder drives time (lockstep.mjs). Each tick is 1/fps second of virtual time, then one lossless screenshot of the
// box of the component, piped to ffmpeg at once into a lossless intermediate file (two-pass VP9 and H.264 read it afterwards).
async function filmLockstep({ page, cdp, ready, comp, cfgRec, o, plan, tmp, log }) {
  const { root, scope, geo } = ready
  const frameGeo = { ...geo, crop: { x: 0, y: 0, w: geo.crop.w, h: geo.crop.h } }   // the screenshots are already cut
  const direct = !plan.some((p) => p.kind === 'vp9')   // VP8 only (the ffmpeg of Playwright): one pass, straight from the pipe
  const mezz = join(tmp, `nd-lockstep-${process.pid}-${comp.id}.mkv`)
  const sink = direct
    ? new FrameSink(plan[0].bin, encodeArgs('vp8', frameGeo, join(tmp, `nd-lockstep-${process.pid}-${comp.id}.webm`), { fps: o.fps }))
    : new FrameSink(plan[0].bin, intermediateArgs(frameGeo, mezz, o.fps))
  const clock = new LockstepClock({ page, cdp, fps: o.fps })
  const clip = { x: geo.crop.x, y: geo.crop.y, width: geo.crop.w, height: geo.crop.h, scale: 1 }
  const deadline = Date.now() + o.timeout * 1000
  let last = null
  clock.capture = async () => {
    if (Date.now() > deadline) throw new Error(`${comp.id}: more than ${o.timeout} s of wall time for one clip (--timeout); stopped at frame ${clock.n}`)
    const r = await withTimeout(cdp.send('Page.captureScreenshot', { format: 'png', clip, captureBeyondViewport: false, fromSurface: true, optimizeForSpeed: true }), 60000, `${comp.id}: frame ${clock.n}, the browser took no screenshot`)
    last = Buffer.from(r.data, 'base64')
    await withTimeout(sink.write(last), 120000, `${comp.id}: frame ${clock.n}, ffmpeg did not take the frame`)
    if (clock.n % (o.fps * 2) === 0) log(`    ${clock.n} frames (${(clock.n / o.fps).toFixed(0)} s of video) after ${((Date.now() - started) / 1000).toFixed(0)} s`)
  }
  const started = Date.now()
  try {
    await clock.start()
    const rand = rng(), wait = (ms) => clock.sleep(ms)
    for (const step of cfgRec.steps ?? []) {
      try { await runStep(page, root, scope, step, rand, wait, true) } catch (e) { throw new Error(`step ${JSON.stringify(step).slice(0, 80)} failed: ${String(e.message).split('\n')[0]}`) }
    }
    const total = Math.min(MAX_SECONDS * o.fps, Math.max(Math.round((cfgRec.seconds ?? o.seconds) * o.fps), clock.n + ticksFor(600, o.fps)))   // steps that run long get a short tail
    while (clock.n < total) await clock.tick()
    await sink.end()
  } catch (e) {
    try { sink.p.kill() } catch { /* gone */ }
    rmSync(mezz, { force: true })
    throw e
  }
  const wall = (Date.now() - started) / 1000
  return { mezz: direct ? null : mezz, direct, seconds: clock.n / o.fps, count: clock.n, wall, detail: `${(wall / (clock.n / o.fps)).toFixed(1)} s of wall time per second of video`, posterFrame: last, posterGeo: frameGeo, frameGeo }
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
  let browser, lockBrowser = null   // lockstep needs its own flags (LOCKSTEP_FLAGS): a second browser, started on first use
  try {
    // The deck needs a moment before it answers.
    for (let i = 0; ; i++) {
      try { if ((await fetch(base)).ok) break } catch { /* not yet */ }
      if (i > 120) throw new Error(`the deck did not answer at ${base}`)
      await sleep(500)
    }
    const chrome = findChrome()
    const launch = (args = []) => chromium.launch({ ...(chrome ? { executablePath: chrome } : {}), args })
    browser = await launch()
    mkdirSync(out, { recursive: true })
    for (const { slide, comps } of targets) {
      for (const comp of comps) {
        const cfgRec = cfg.recordings[comp.id] ?? {}
        const mode = chooseClock({ realtime: o.realtime, kind: comp.kind, cfgRealtime: cfgRec.realtime })
        log(`slide ${slide}: ${comp.id} (${mode.lockstep ? `lockstep, ${o.fps} fps` : `real time, ${o.fps} fps${mode.reason ? `; ${mode.reason}` : ''}`})`)
        const page = await (mode.lockstep ? (lockBrowser ??= await launch(LOCKSTEP_FLAGS)) : browser).newPage({ viewport: { width: CAPTURE.w, height: CAPTURE.h }, deviceScaleFactor: 1 })
        let film = null
        try {
          page.on('dialog', (d) => d.dismiss())
          if (mode.lockstep) await page.addInitScript(PAGE_SHIM)
          const ready = await openComponent({ page, base, slide, comp, cfgRec, o, log })
          const cdp = await page.context().newCDPSession(page)
          const geo = ready.geo
          film = await (mode.lockstep ? filmLockstep : filmRealtime)({ page, cdp, ready, comp, cfgRec, o, plan, tmp: tmpdir(), log })
          const files = []
          const stem = join(out, comp.id)
          const t0 = Date.now()
          for (const { ext, kind, bin } of plan) {
            try {
              if (film.direct) { renameSync(join(tmpdir(), `nd-lockstep-${process.pid}-${comp.id}.webm`), `${stem}.${ext}`) }
              else if (kind === 'vp9') { const passlog = join(tmpdir(), `nd-pass-${process.pid}-${comp.id}`); try { await encode(bin, encodeArgs(kind, geo, `${stem}.${ext}`, { pass: 1, passlog, fps: o.fps, file: film.mezz }), film.mezz ? null : film.frames); await encode(bin, encodeArgs(kind, geo, `${stem}.${ext}`, { pass: 2, passlog, fps: o.fps, file: film.mezz }), film.mezz ? null : film.frames) } finally { rmSync(`${passlog}-0.log`, { force: true }) } }
              else await encode(bin, encodeArgs(kind, geo, `${stem}.${ext}`, { fps: o.fps, file: film.mezz }), film.mezz ? null : film.frames)
              files.push(`${comp.id}.${ext}`)
            } catch (e) { if (ext === 'webm') throw e; log(`  no ${ext} (${e.message})`); rmSync(`${stem}.${ext}`, { force: true }) }
          }
          if (!plan.some((p) => p.ext === 'mp4')) rmSync(`${stem}.mp4`, { force: true })
          // The poster is cut by a page of its own: the clip's page may have its virtual time paused, which stalls the file reader.
          const pp = await browser.newPage()
          try { writeFileSync(`${stem}.jpg`, Buffer.from(await poster(pp, film.posterFrame, film.posterGeo), 'base64')) } finally { await pp.close().catch(() => {}) }
          log(`  ${mode.lockstep ? 'lockstep' : 'real time'}: ${film.count} frames, ${film.seconds.toFixed(2)} s at ${o.fps} fps, ${geo.w}x${geo.h} px (${geo.logical.w}x${geo.logical.h} css); filmed in ${film.wall.toFixed(0)} s (${film.detail}), encoded in ${((Date.now() - t0) / 1000).toFixed(0)} s`)
          log(`  ${files.map((f) => `${f} ${kb(join(out, f))}`).join(', ')}, ${comp.id}.jpg ${kb(`${stem}.jpg`)}`)
          done.push({ id: comp.id, kind: comp.kind, seconds: Math.round(film.seconds * 100) / 100, width: geo.logical.w, height: geo.logical.h, pixelWidth: geo.w, pixelHeight: geo.h, fps: o.fps, frames: film.count, lockstep: mode.lockstep, ...(mode.reason ? { reason: mode.reason } : {}), codecs: plan.filter((p) => files.includes(`${comp.id}.${p.ext}`)).map((p) => p.kind), files, poster: `${comp.id}.jpg` })
        } catch (e) { failed.push(comp.id); console.error(`  ERROR ${comp.id}: ${e.message}`) }
        finally {
          if (film?.mezz) rmSync(film.mezz, { force: true })
          await page.close().catch(() => {})
        }
      }
    }
  } finally {
    await lockBrowser?.close()
    await browser?.close()
    await cleanup()
  }
  if (done.length) writeManifest(out, mergeManifest(readManifest(out), done))
  console.log(`${done.length} recorded${failed.length ? `, ${failed.length} failed (${failed.join(', ')})` : ''}, manifest ${join(relative(root, out), 'index.json')}`)
  return failed.length ? 1 : 0
}
