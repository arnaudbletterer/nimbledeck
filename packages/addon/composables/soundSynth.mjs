// The built-in sounds, synthesised with the Web Audio API: no files, no network, works offline. Every recipe is
// `(ctx, out, t, rnd) => { dur, sources }`: it builds nodes into `out` starting at time `t` and returns its length in
// seconds (Infinity for a loop) and the sources the manager must stop. Peaks are low on purpose; the manager adds a
// master gain and a limiter on top.

import { createScheduler, midiHz } from './upliftScore.mjs'

const FLOOR = 0.0001

function tone(ctx, out, list, { type = 'sine', f, f2, t, dur, peak = 0.2, attack = 0.005, detune = 0 }) {
  const o = ctx.createOscillator(), g = ctx.createGain()
  o.type = type
  o.frequency.setValueAtTime(f, t)
  if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur)
  if (detune) o.detune.value = detune
  g.gain.setValueAtTime(FLOOR, t)
  g.gain.linearRampToValueAtTime(peak, t + attack)
  g.gain.exponentialRampToValueAtTime(FLOOR, t + dur)
  o.connect(g); g.connect(out)
  o.start(t); o.stop(t + dur + 0.05)
  list.push(o)
  return g
}

const noises = new WeakMap()
function noiseBuffer(ctx) {
  let b = noises.get(ctx)
  if (!b) {
    b = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate)
    const d = b.getChannelData(0)
    let seed = 20240607   // seeded: every render of a cue is the same
    for (let i = 0; i < d.length; i++) { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; d[i] = (seed / 4294967296) * 2 - 1 }
    noises.set(ctx, b)
  }
  return b
}

// Filtered noise whose centre frequency glides from f to f2, with an attack and an exponential release.
function hiss(ctx, out, list, { type = 'bandpass', f, f2, q = 1, t, dur, peak = 0.2, attack = 0.005 }) {
  const s = ctx.createBufferSource(), flt = ctx.createBiquadFilter(), g = ctx.createGain()
  s.buffer = noiseBuffer(ctx); s.loop = true
  flt.type = type; flt.Q.value = q
  flt.frequency.setValueAtTime(f, t)
  if (f2) flt.frequency.exponentialRampToValueAtTime(f2, t + dur)
  g.gain.setValueAtTime(FLOOR, t)
  g.gain.linearRampToValueAtTime(peak, t + attack)
  g.gain.exponentialRampToValueAtTime(FLOOR, t + dur)
  s.connect(flt); flt.connect(g); g.connect(out)
  s.start(t); s.stop(t + dur + 0.05)
  list.push(s)
}

// A generated room: stereo noise with an exponential decay and a darkening lowpass, the same on every run.
function impulse(ctx, seconds) {
  const n = Math.floor(ctx.sampleRate * seconds), buf = ctx.createBuffer(2, n, ctx.sampleRate)
  for (let c = 0; c < 2; c++) {
    const d = buf.getChannelData(c)
    let seed = 12345 + c * 977, lo = 0
    for (let i = 0; i < n; i++) {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0
      const w = (seed / 4294967296) * 2 - 1, k = 0.55 - 0.45 * (i / n)
      lo += k * (w - lo)
      d[i] = lo * Math.exp(-4.2 * i / n) * (i < 600 ? i / 600 : 1)
    }
  }
  return buf
}

export const SYNTH = {
  click(ctx, out, t) {
    const sources = []
    hiss(ctx, out, sources, { f: 3200, q: 2, t, dur: 0.03, peak: 0.28 })
    tone(ctx, out, sources, { f: 1800, f2: 900, t, dur: 0.05, peak: 0.12 })
    return { dur: 0.1, sources }
  },
  tick(ctx, out, t) {
    const sources = []
    tone(ctx, out, sources, { f: 2200, t, dur: 0.05, peak: 0.2, attack: 0.003 })
    return { dur: 0.1, sources }
  },
  pop(ctx, out, t) {
    const sources = []
    tone(ctx, out, sources, { f: 620, f2: 190, t, dur: 0.13, peak: 0.34 })
    hiss(ctx, out, sources, { f: 1400, q: 1, t, dur: 0.04, peak: 0.1 })
    return { dur: 0.2, sources }
  },
  whoosh(ctx, out, t) {
    const sources = []
    hiss(ctx, out, sources, { f: 260, f2: 2600, q: 1.1, t, dur: 0.55, peak: 0.42, attack: 0.22 })
    hiss(ctx, out, sources, { f: 1800, f2: 500, q: 0.8, t: t + 0.18, dur: 0.45, peak: 0.12, attack: 0.1 })
    return { dur: 0.8, sources }
  },
  riser(ctx, out, t) {
    const sources = [], dur = 2.4
    hiss(ctx, out, sources, { f: 300, f2: 6000, q: 1.6, t, dur, peak: 0.28, attack: dur * 0.9 })
    tone(ctx, out, sources, { type: 'sawtooth', f: 110, f2: 880, t, dur, peak: 0.07, attack: dur * 0.9 })
    tone(ctx, out, sources, { f: 220, f2: 1760, t, dur, peak: 0.1, attack: dur * 0.9 })
    return { dur: dur + 0.1, sources }
  },
  chime(ctx, out, t) {
    const sources = []
    tone(ctx, out, sources, { f: 987.8, t, dur: 1.6, peak: 0.22 })
    tone(ctx, out, sources, { f: 1480, t, dur: 1.1, peak: 0.1 })
    tone(ctx, out, sources, { f: 2960, t, dur: 0.5, peak: 0.04 })
    return { dur: 1.7, sources }
  },
  success(ctx, out, t) {
    const sources = []
    ;[523.25, 659.25, 783.99, 1046.5].forEach((f, i) => {
      tone(ctx, out, sources, { type: 'triangle', f, t: t + i * 0.085, dur: i === 3 ? 1.1 : 0.45, peak: 0.2 })
      tone(ctx, out, sources, { f: f * 2, t: t + i * 0.085, dur: 0.3, peak: 0.04 })
    })
    return { dur: 1.5, sources }
  },
  'soft-boom'(ctx, out, t) {
    const sources = []
    tone(ctx, out, sources, { f: 90, f2: 34, t, dur: 1.1, peak: 0.55, attack: 0.012 })
    hiss(ctx, out, sources, { type: 'lowpass', f: 400, f2: 80, q: 0.7, t, dur: 0.7, peak: 0.25 })
    return { dur: 1.2, sources }
  },
  typing(ctx, out, t, rnd = Math.random) {
    const sources = []
    let at = 0
    for (let i = 0; i < 22; i++) {
      hiss(ctx, out, sources, { f: 1500 + rnd() * 1800, q: 3, t: t + at, dur: 0.022, peak: 0.16 + rnd() * 0.1 })
      tone(ctx, out, sources, { f: 180 + rnd() * 60, t: t + at, dur: 0.03, peak: 0.08 })
      at += 0.05 + rnd() * 0.07
    }
    return { dur: at + 0.1, sources }
  },
  swell(ctx, out, t) {
    const sources = [], dur = 2.4
    for (const [f, d] of [[220, -7], [220, 7], [330, 0], [440, 4]])
      tone(ctx, out, sources, { type: 'sawtooth', f, t, dur, peak: 0.045, attack: dur * 0.55, detune: d * 3 })
    hiss(ctx, out, sources, { type: 'lowpass', f: 300, f2: 2400, q: 0.6, t, dur, peak: 0.1, attack: dur * 0.6 })
    return { dur: dur + 0.1, sources }
  },
  // A calm, dark drone for a bed: a loop that never ends by itself, slow beating between detuned voices. Moody on
  // purpose, and not for the showcase, which uses `uplift`.
  pad(ctx, out, t) {
    const sources = []
    const lp = ctx.createBiquadFilter()
    lp.type = 'lowpass'; lp.frequency.value = 900; lp.Q.value = 0.5
    lp.connect(out)
    const lfo = ctx.createOscillator(), depth = ctx.createGain()
    lfo.frequency.value = 0.07; depth.gain.value = 260
    lfo.connect(depth); depth.connect(lp.frequency)
    lfo.start(t); sources.push(lfo)
    for (const [f, d, type] of [[110, -6, 'sawtooth'], [110, 6, 'sawtooth'], [164.8, 3, 'triangle'], [220, -4, 'sine'], [277.2, 5, 'sine']]) {
      const o = ctx.createOscillator(), g = ctx.createGain()
      o.type = type; o.frequency.value = f; o.detune.value = d
      g.gain.value = type === 'sawtooth' ? 0.05 : 0.07
      o.connect(g); g.connect(lp); o.start(t); sources.push(o)
    }
    return { dur: Infinity, sources }
  },
  // A warm, optimistic bed: a marimba-like arpeggio, a soft pad, bass on the roots, a light kick and shaker, in G major at
  // 104 bpm (the score is in upliftScore.mjs). Notes are scheduled ahead on the AudioContext clock; a timer only wakes the
  // scheduler, so a late timer never moves a note. An OfflineAudioContext knows its length, so its whole render is scheduled at once.
  uplift(ctx, out, t) {
    const sources = []
    const lp = ctx.createBiquadFilter()
    lp.type = 'lowpass'; lp.frequency.value = 4200; lp.Q.value = 0.4
    const send = ctx.createGain(), room = ctx.createConvolver()
    send.gain.value = 0.34
    room.buffer = impulse(ctx, 1.7)
    lp.connect(out); lp.connect(send); send.connect(room); room.connect(out)
    const padLp = ctx.createBiquadFilter()
    padLp.type = 'lowpass'; padLp.frequency.value = 1100; padLp.Q.value = 0.3
    padLp.connect(lp)
    const sink = []   // the notes end by themselves; only the scheduler's timer has to be stopped
    const play = (e) => {
      const at = e.t
      if (e.kind === 'pluck') {
        const f = midiHz(e.midi), v = e.vel
        tone(ctx, lp, sink, { f, t: at, dur: 1.0, peak: 0.1 * v, attack: 0.008 })
        tone(ctx, lp, sink, { f: f * 4, t: at, dur: 0.22, peak: 0.022 * v, attack: 0.006 })
        tone(ctx, lp, sink, { type: 'triangle', f, t: at, dur: 0.45, peak: 0.04 * v, attack: 0.01 })
      } else if (e.kind === 'bass') {
        const f = midiHz(e.midi)
        tone(ctx, lp, sink, { f, t: at, dur: e.dur, peak: 0.2 * e.vel, attack: 0.02 })
        tone(ctx, lp, sink, { type: 'triangle', f: f * 2, t: at, dur: e.dur * 0.6, peak: 0.03 * e.vel, attack: 0.03 })
      } else if (e.kind === 'kick') {
        tone(ctx, lp, sink, { f: 118, f2: 46, t: at, dur: e.dur, peak: 0.22 * e.vel, attack: 0.006 })
      } else if (e.kind === 'hat') {
        hiss(ctx, lp, sink, { type: 'highpass', f: 6500, q: 0.5, t: at, dur: e.dur, peak: 0.018 * e.vel, attack: 0.012 })
      } else if (e.kind === 'pad') {
        const f = midiHz(e.midi)
        for (const d of [-7, 7]) {
          const o = ctx.createOscillator(), g = ctx.createGain()
          o.type = 'triangle'; o.frequency.value = f; o.detune.value = d
          g.gain.setValueAtTime(FLOOR, at)
          g.gain.linearRampToValueAtTime(0.034, at + 1.1)
          g.gain.setValueAtTime(0.034, at + e.dur - 0.6)
          g.gain.exponentialRampToValueAtTime(FLOOR, at + e.dur + 1.4)
          o.connect(g); g.connect(padLp); o.start(at); o.stop(at + e.dur + 1.5)
        }
      }
    }
    const horizon = ctx.length ? ctx.length / ctx.sampleRate : null
    if (horizon != null) {
      for (const e of createScheduler({ start: t + 0.05, lookahead: horizon + 1, late: Infinity }).advance(0)) if (e.t < horizon) play(e)
    } else {
      const sch = createScheduler({ start: t + 0.05 })
      let timer = 0
      const tick = () => { for (const e of sch.advance(ctx.currentTime)) play(e); timer = setTimeout(tick, 200) }
      tick()
      sources.push({ stop() { clearTimeout(timer) } })
    }
    return { dur: Infinity, sources }
  },
}
