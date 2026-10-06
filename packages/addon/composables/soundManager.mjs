// One shared sound engine for the deck. Sound is off until the viewer opts in; the AudioContext is only created from a
// gesture (a click on a sound control, or the first key press or tap after the viewer opted in on an earlier visit).
//
// Signal path:  voice gain -> bus -> limiter (DynamicsCompressor) -> master gain -> analyser -> destination
// The limiter keeps a stack of cues from getting loud; `volume` per cue and the master volume stay below 1.
// Everything is injectable (AudioContext class, storage, file loader) so it runs in tests with a fake context.
import { SYNTH } from './soundSynth.mjs'
import { soundKind } from './tourScript.mjs'

export const STORE_KEY = 'nimbledeck:sound'
const MASTER = 0.8
// Bed gain and its ducked gain under cues, per built-in bed (a file bed uses `pad`'s). `uplift` is written quiet: its level is
// measured (docs/TOUR.md) to sit well under the cues, and it ducks 5 dB under them.
// Effects are written at full scale and played about 6 dB lower: the owner found them too aggressive next to the bed.
export const CUE_GAIN = 0.5
export const BEDS = { pad: { level: 0.5, ducked: 0.22 }, uplift: { level: 0.22, ducked: 0.12 } }
const FADE_IN = 2, FADE_OUT = 1

export function createSoundManager({ AudioContextCtor = globalThis.AudioContext ?? globalThis.webkitAudioContext, storage = globalThis.localStorage, loadFile, clock = () => performance.now() } = {}) {
  let ctx = null, bus = null, master = null, analyser = null, bedGain = null
  let bed = null                       // { src, voice, gain, level, ducked }
  let enabled = false
  const voices = new Set()             // { scope, gain, sources, end }
  const buffers = new Map()            // file address -> Promise<AudioBuffer>
  const listeners = new Set()
  const log = []                       // the last cues that were started, for tests and the console
  let duckUntil = 0
  let tour = false                     // a tour is playing: the soundtrack cues may sound
  const lastSfx = new Map(); let lastAny = -1e9

  try { enabled = storage?.getItem(STORE_KEY) === '1' } catch { /* private window */ }
  const emit = () => listeners.forEach((f) => f(enabled))

  function ensure() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume?.().catch?.(() => {}); return ctx }
    if (!AudioContextCtor) return null
    try { ctx = new AudioContextCtor({ latencyHint: 'interactive' }) } catch { return null }
    bus = ctx.createGain()
    const limiter = ctx.createDynamicsCompressor()
    limiter.threshold.value = -14; limiter.knee.value = 6; limiter.ratio.value = 20; limiter.attack.value = 0.003; limiter.release.value = 0.25
    master = ctx.createGain(); master.gain.value = MASTER
    analyser = ctx.createAnalyser(); analyser.fftSize = 256; analyser.smoothingTimeConstant = 0.8
    bus.connect(limiter); limiter.connect(master); master.connect(analyser); analyser.connect(ctx.destination)
    ctx.resume?.().catch?.(() => {})
    return ctx
  }

  function voice(scope, volume) {
    const gain = ctx.createGain()
    gain.gain.value = Math.min(1, Math.max(0, volume)) * (scope === 'cue' ? CUE_GAIN : 1)
    gain.connect(bus)
    const v = { scope, gain, sources: [], end: 0 }
    voices.add(v)
    return v
  }
  function release(v, fade = 0.08) {
    if (!voices.delete(v)) return
    const t = ctx.currentTime
    try { v.gain.gain.cancelScheduledValues(t); v.gain.gain.setValueAtTime(v.gain.gain.value, t); v.gain.gain.linearRampToValueAtTime(0, t + fade) } catch { /* node already gone */ }
    for (const s of v.sources) { try { s.stop(t + fade + 0.02) } catch { /* not started or already stopped */ } }
    setTimeout(() => { try { v.gain.disconnect() } catch { /* already disconnected */ } }, (fade + 0.2) * 1000)
  }
  function prune() { const t = ctx.currentTime; for (const v of [...voices]) if (v.end < t - 0.5) release(v, 0) }

  function duck(seconds) {
    if (!bedGain) return
    const t = ctx.currentTime
    duckUntil = Math.max(duckUntil, t + seconds)
    const now = bedGain.gain.value
    bedGain.gain.cancelScheduledValues(t)
    bedGain.gain.setValueAtTime(now, t)   // keep where a fade-in or an earlier duck has got to
    bedGain.gain.setTargetAtTime(bed.ducked, t, 0.08)
    bedGain.gain.setTargetAtTime(bed.level, duckUntil, 0.5)
  }

  async function buffer(src) {
    if (!buffers.has(src)) buffers.set(src, (async () => ctx.decodeAudioData(await (loadFile ? loadFile(src) : fetch(src).then((r) => { if (!r.ok) throw new Error(String(r.status)); return r.arrayBuffer() }))))())
    return buffers.get(src)
  }

  // Start a sound now (or `delay` seconds from now). Returns a handle with stop(), or null when sound is off or locked.
  function play(src, { volume = 1, delay = 0, scope = 'cue', pitch = 0 } = {}) {
    if (!enabled || !ctx) return null
    const kind = soundKind(src).kind
    if (kind === 'invalid') return null
    prune()
    const v = voice(scope, volume)
    const t = ctx.currentTime + Math.max(0, delay) + 0.01
    log.push({ src, scope, at: ctx.currentTime, volume }); if (log.length > 60) log.shift()
    if (kind === 'builtin') {
      const r = SYNTH[src](ctx, v.gain, t)
      if (pitch) for (const o of r.sources) { if (o.detune) o.detune.value = pitch; else if (o.playbackRate) o.playbackRate.value = 2 ** (pitch / 1200) }
      v.sources = r.sources; v.end = t + r.dur
      if (scope === 'cue') duck(r.dur + delay)
    } else {
      buffer(src).then((buf) => {
        if (!voices.has(v)) return
        const s = ctx.createBufferSource(); s.buffer = buf; s.connect(v.gain); s.start(t)
        v.sources = [s]; v.end = t + buf.duration
        if (scope === 'cue') duck(buf.duration + delay)
      }).catch(() => release(v, 0))   // a missing file is silent, never an error on the slide
      v.end = t + 30
    }
    return { stop: () => release(v) }
  }

  // A tour soundtrack cue (frontmatter `sounds:`): sounds only while the tour plays, unless the author says `when: always`.
  function cue(src, o = {}) { return o.when === 'always' || tour ? play(src, { volume: o.volume, delay: o.delay }) : null }
  // A sound for something that happened on the page (a click, a landing number). Free when sound is off, and rate limited
  // per name (`gap` ms) and overall (25 ms) so a burst of events never machine-guns. `pitch` is in cents.
  function sfx(name, { volume = 0.5, pitch = 0, gap = 90, key = name } = {}) {
    if (!enabled || !ctx) return null
    const now = clock()
    if (now - (lastSfx.get(key) ?? -1e9) < gap || now - lastAny < 25) return null
    lastSfx.set(key, now); lastAny = now
    return play(name, { volume, pitch, scope: 'sfx' })
  }
  function setTour(on) { on = !!on; if (on === tour) return; tour = on; if (!on) stopScope('cue') }

  function startBed(src) {
    if (!enabled || !ctx || !src || bed?.src === src) return
    stopBed()
    const kind = soundKind(src).kind
    if (kind === 'invalid') return
    bedGain = ctx.createGain(); bedGain.gain.value = 0.0001; bedGain.connect(bus)
    const { level, ducked } = BEDS[src] ?? BEDS.pad
    bedGain.gain.linearRampToValueAtTime(level, ctx.currentTime + FADE_IN)
    const v = { scope: 'bed', gain: ctx.createGain(), sources: [], end: Infinity }
    v.gain.gain.value = 1; v.gain.connect(bedGain); voices.add(v)
    bed = { src, voice: v, gain: bedGain, level, ducked }
    log.push({ src, scope: 'bed', at: ctx.currentTime, volume: level })
    if (kind === 'builtin') v.sources = SYNTH[src](ctx, v.gain, ctx.currentTime).sources
    else buffer(src).then((buf) => { if (bed?.voice !== v) return; const s = ctx.createBufferSource(); s.buffer = buf; s.loop = true; s.connect(v.gain); s.start(); v.sources = [s] }).catch(() => {})
  }
  function stopBed() {
    if (!bed) return
    const { voice: v, gain } = bed
    bed = null; bedGain = null
    release(v, FADE_OUT)
    try { const t = ctx.currentTime; gain.gain.cancelScheduledValues(t); gain.gain.setValueAtTime(gain.gain.value, t); gain.gain.linearRampToValueAtTime(0, t + FADE_OUT) } catch { /* gone */ }
    setTimeout(() => { try { gain.disconnect() } catch { /* gone */ } }, (FADE_OUT + 0.3) * 1000)
  }
  function stopScope(scope) { for (const v of [...voices]) if (v.scope === scope) release(v) }
  function stopAll() { stopBed(); for (const v of [...voices]) release(v) }

  // A control the viewer clicked: this is a gesture, so the context may be created and resumed.
  function setEnabled(on) {
    on = !!on
    if (on === enabled && (!on || ctx)) return
    enabled = on
    try { storage?.setItem(STORE_KEY, on ? '1' : '0') } catch { /* private window */ }
    if (on) ensure(); else if (ctx) stopAll()
    emit()
  }
  // The first key press or tap after a visit in which the viewer had sound on: create the context now.
  function unlock() { if (enabled && !ctx) ensure() }

  // `n` bars of the live output spectrum, each 0..1. Silent (all zeros) when the sound is off or nothing plays.
  function levels(n = 16) {
    const out = new Array(n).fill(0)
    if (!analyser) return out
    const data = new Uint8Array(analyser.frequencyBinCount)
    analyser.getByteFrequencyData(data)
    const top = Math.floor(data.length * 0.6)   // the highest bins hold almost nothing in music or in these sounds
    for (let i = 0; i < n; i++) {
      const a = Math.floor(Math.pow(i / n, 1.7) * top), b = Math.max(a + 1, Math.floor(Math.pow((i + 1) / n, 1.7) * top))
      let m = 0
      for (let k = a; k < b; k++) m = Math.max(m, data[k])
      out[i] = m / 255
    }
    return out
  }

  return {
    get enabled() { return enabled },
    get running() { return ctx?.state === 'running' },
    get state() { return ctx?.state ?? 'none' },
    get analyser() { return analyser },
    get log() { return log },
    get tour() { return tour },
    setTour, cue, sfx, setEnabled, unlock, ensure, play, startBed, stopBed, stopScope, stopAll, levels,
    subscribe(f) { listeners.add(f); return () => listeners.delete(f) },
    dispose() { if (ctx) { stopAll(); ctx.close?.().catch?.(() => {}); ctx = null; analyser = null } listeners.clear() },
  }
}
