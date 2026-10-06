// Measures the sound engine in Chrome with an OfflineAudioContext: the real sound manager (bed, cues, ducking, limiter, master)
// renders to samples, and this script computes RMS and peak in dBFS and asserts the level, headroom and loop rules written in
// docs/TOUR.md. It also writes two WAV files to listen to.
// Usage: node measure-sound.mjs [--out <folder>]      (default /private/tmp/claude-501/uplift)
import { createServer } from 'node:http'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { extname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright-chromium'
import { findChrome } from '../../packages/cli/src/chrome.mjs'

const root = resolve(fileURLToPath(new URL('../..', import.meta.url)))
const arg = (n) => (process.argv.includes(n) ? process.argv[process.argv.indexOf(n) + 1] : null)
const outDir = resolve(arg('--out') ?? '/private/tmp/claude-501/uplift')
mkdirSync(outDir, { recursive: true })

const server = createServer((req, res) => {
  const p = new URL(req.url, 'http://x').pathname
  if (p === '/blank.html') { res.writeHead(200, { 'content-type': 'text/html' }); return res.end('<!doctype html><title>m</title>') }
  let body
  try { body = readFileSync(join(root, p)) } catch { res.writeHead(404); return res.end() }
  res.writeHead(200, { 'content-type': extname(p) === '.mjs' ? 'text/javascript' : 'text/plain' }); res.end(body)
}).listen(0, '127.0.0.1')
await new Promise((r) => server.once('listening', r))
const chrome = findChrome()
const browser = await chromium.launch(chrome ? { executablePath: chrome } : {})
const page = await browser.newPage()
await page.goto(`http://127.0.0.1:${server.address().port}/blank.html`)

// Renders `seconds` of the real chain. `bed` is a built-in bed name or null; `cues` are { at, src, volume }.
// Returns the mono mean of the two channels as a plain array (a Float32 round trip through JSON is exact enough).
async function render({ seconds, bed = null, cues = [], sr = 44100 }) {
  const b64 = await page.evaluate(async ({ seconds, bed, cues, sr }) => {
    const { createSoundManager } = await import('/packages/addon/composables/soundManager.mjs')
    const ctx = new OfflineAudioContext(2, Math.ceil(seconds * sr), sr)
    const m = createSoundManager({ AudioContextCtor: function () { return ctx }, storage: { getItem: () => '1', setItem() {} } })
    m.ensure()
    if (bed) m.startBed(bed)
    for (const c of cues) {
      const at = Math.max(0, c.at)
      if (at === 0) m.play(c.src, { volume: c.volume })
      else ctx.suspend(at).then(() => { m.play(c.src, { volume: c.volume }); ctx.resume() })
    }
    const buf = await ctx.startRendering()
    const l = buf.getChannelData(0), r = buf.getChannelData(1), mono = new Float32Array(l.length)
    for (let i = 0; i < l.length; i++) mono[i] = (l[i] + r[i]) / 2
    let s = ''; const u8 = new Uint8Array(mono.buffer)
    for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000))
    return btoa(s)
  }, { seconds, bed, cues, sr })
  const u8 = Buffer.from(b64, 'base64')
  return new Float32Array(u8.buffer, u8.byteOffset, u8.length / 4)
}

const SR = 44100
const db = (x) => 20 * Math.log10(Math.max(x, 1e-9))
const rms = (a, from = 0, to = a.length) => { let s = 0; for (let i = from; i < to; i++) s += a[i] * a[i]; return Math.sqrt(s / (to - from)) }
const peak = (a, from = 0, to = a.length) => { let m = 0; for (let i = from; i < to; i++) m = Math.max(m, Math.abs(a[i])); return m }
const mean = (a, from = 0, to = a.length) => { let s = 0; for (let i = from; i < to; i++) s += a[i]; return s / (to - from) }
function wav(a, path) {
  const n = a.length, buf = Buffer.alloc(44 + n * 2)
  buf.write('RIFF', 0); buf.writeUInt32LE(36 + n * 2, 4); buf.write('WAVEfmt ', 8); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(1, 22)
  buf.writeUInt32LE(SR, 24); buf.writeUInt32LE(SR * 2, 28); buf.writeUInt16LE(2, 32); buf.writeUInt16LE(16, 34); buf.write('data', 36); buf.writeUInt32LE(n * 2, 40)
  for (let i = 0; i < n; i++) buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, a[i])) * 32767), 44 + i * 2)
  writeFileSync(path, buf)
}

let failed = 0
const results = {}
const check = (name, ok, detail) => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${name} (${detail})`); if (!ok) failed++ }
const f1 = (x) => x.toFixed(1)

// 1. The bed alone, 3 passes of the loop (about 111 s). The rate is 52 kHz so that one 8th-note step (60/104/2 s) is exactly
//    15000 samples and a pass of the loop an exact whole number of samples; the seam test then compares sample for sample.
const { loopSeconds, LOOP_STEPS } = await import('../../packages/addon/composables/upliftScore.mjs')
const LR = 52000, Ls = LOOP_STEPS * 15000, L = loopSeconds(), off = Math.round(0.05 * LR)   // the score starts 50 ms in
const bed = await render({ seconds: L * 3 + 2, bed: 'uplift', sr: LR })
const bedRms = rms(bed, 4 * LR, bed.length), bedPeak = peak(bed), bedDc = mean(bed, 4 * LR, bed.length)
results.bed = { rmsDb: db(bedRms), peakDb: db(bedPeak), dc: bedDc }
console.log(`bed: RMS ${f1(db(bedRms))} dBFS, peak ${f1(db(bedPeak))} dBFS, DC ${bedDc.toExponential(1)}`)
check('bed does not clip', bedPeak < 0.98, `peak ${f1(db(bedPeak))} dBFS`)
check('bed has no DC offset', Math.abs(bedDc) < 0.001, `mean ${bedDc.toExponential(1)}`)

// 2. Fade in: the first half second is much quieter than seconds 3 to 4.
results.fade = { first: db(rms(bed, 0, LR / 2)), fourth: db(rms(bed, 3 * LR, 4 * LR)) }
check('bed fades in', rms(bed, 0, LR / 2) < 0.4 * rms(bed, 3 * LR, 4 * LR), `0 to 0.5 s ${f1(results.fade.first)} dBFS, 3 to 4 s ${f1(results.fade.fourth)} dBFS`)

// 3. Loop seam: pass 3 must repeat pass 2 (the score repeats exactly), and no click at the seam between them.
const p2 = off + Ls, p3 = off + 2 * Ls
let err = 0, ref = 0
for (let i = 0; i < Ls; i++) { const d = bed[p2 + i] - bed[p3 + i]; err += d * d; ref += bed[p2 + i] ** 2 }
const repeatDb = 10 * Math.log10(err / ref)
const jump = (from, to) => { let m = 0; for (let i = from; i < to; i++) m = Math.max(m, Math.abs(bed[i] - bed[i - 1])); return m }
const win = Math.round(0.02 * LR)
const seamJump = jump(p3 - win, p3 + win), typical = jump(p2 + win, p3 - win)
results.loop = { seconds: L, repeatErrDb: repeatDb, seamJump, typicalMaxJump: typical, startSample: bed[p2], endSample: bed[p3 - 1], nextSample: bed[p3] }
check('loop repeats exactly (pass 3 equals pass 2)', repeatDb < -60, `error ${f1(repeatDb)} dB below the signal`)
check('no click at the loop point', seamJump <= typical * 1.05, `max step within 20 ms of the seam ${seamJump.toExponential(2)}, elsewhere ${typical.toExponential(2)}`)
check('loop start and end samples are continuous', Math.abs(bed[p3] - bed[p3 - 1]) <= typical, `|x[start] - x[end]| ${Math.abs(bed[p3] - bed[p3 - 1]).toExponential(2)}`)

// 4. Cues alone through the same chain, at the volumes a deck uses.
const CUES = ['click', 'tick', 'pop', 'whoosh', 'riser', 'chime', 'success', 'soft-boom', 'typing', 'swell']
const cuePeaks = {}
for (const src of CUES) {
  const x = await render({ seconds: 3.2, cues: [{ at: 0.1, src, volume: 0.8 }] })
  cuePeaks[src] = { peakDb: db(peak(x)), rmsDb: db(rms(x, 0, Math.round(1.5 * SR))) }
  check(`cue ${src} does not clip`, peak(x) < 0.98, `peak ${f1(db(peak(x)))} dBFS`)
}
results.cues = cuePeaks
const weakest = Math.min(...Object.values(cuePeaks).map((c) => c.peakDb)), weakestName = CUES.find((s) => cuePeaks[s].peakDb === weakest)
const margin = weakest - db(bedRms)
results.marginDb = margin
check('bed RMS is at least 9 dB below every cue peak', margin >= 9, `weakest cue ${weakestName} peaks at ${f1(weakest)} dBFS, bed RMS ${f1(db(bedRms))} dBFS, margin ${f1(margin)} dB`)

// 5. Ducking: render the bed with a quiet chime and again without; the ducked bed is the difference of the two.
const base = await render({ seconds: 14, bed: 'uplift' })
const withCue = await render({ seconds: 14, bed: 'uplift', cues: [{ at: 8, src: 'chime', volume: 0.05 }] })
const cueOnly = await render({ seconds: 14, cues: [{ at: 8, src: 'chime', volume: 0.05 }] })
const w0 = Math.round(8.6 * SR), w1 = Math.round(9.4 * SR)
const duckedPart = new Float32Array(withCue.length)
for (let i = 0; i < duckedPart.length; i++) duckedPart[i] = withCue[i] - cueOnly[i]
const duckDb = db(rms(duckedPart, w0, w1)) - db(rms(base, w0, w1))
results.duckDb = duckDb
check('bed ducks 4 to 6 dB under a cue', duckDb <= -4 && duckDb >= -6.5, `${f1(duckDb)} dB`)

// 6. Listening files: the bed alone (30 s) and the bed with a few cues (30 s).
const demoCues = [[3, 'whoosh', 0.9], [6, 'pop', 0.8], [9, 'chime', 0.8], [13, 'click', 0.8], [14.5, 'click', 0.8], [16, 'success', 0.8], [20, 'typing', 0.8], [24, 'swell', 0.6], [27, 'soft-boom', 0.8]].map(([at, src, volume]) => ({ at, src, volume }))
const bedOnly = await render({ seconds: 30, bed: 'uplift' })
const mixed = await render({ seconds: 30, bed: 'uplift', cues: demoCues })
wav(bedOnly, join(outDir, 'uplift-bed-30s.wav')); wav(mixed, join(outDir, 'uplift-bed-with-cues-30s.wav'))
results.files = [join(outDir, 'uplift-bed-30s.wav'), join(outDir, 'uplift-bed-with-cues-30s.wav')]
results.mixedPeakDb = db(peak(mixed))
check('bed with cues does not clip', peak(mixed) < 0.98, `peak ${f1(db(peak(mixed)))} dBFS`)

writeFileSync(join(outDir, 'measurements.json'), JSON.stringify(results, null, 2))
console.log(JSON.stringify(results, null, 2))
await browser.close(); server.close()
process.exit(failed ? 1 : 0)
