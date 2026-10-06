// The score of the `uplift` bed and its lookahead scheduler. Pure: no Web Audio, no timers, so tests drive it with a fake clock.
//
// G major, I-V-vi-IV (G D Em C), two bars per chord, 4/4 at 104 bpm. The grid is the eighth note (`step`): 8 steps a bar,
// 16 a chord, 64 a pass of the progression, 128 (16 bars, about 37 s) before the whole score repeats. The second pass differs
// from the first (a melody on the chord changes, a run into the loop point) so the loop does not feel mechanical.
// Every step is a pure function of its index, so the loop point is as seamless as any other bar line.

export const BPM = 104
export const STEPS_PER_BAR = 8
export const STEPS_PER_CHORD = 16
export const LOOP_STEPS = 128
export const stepSeconds = (bpm = BPM) => 60 / bpm / 2
export const loopSeconds = (bpm = BPM) => LOOP_STEPS * stepSeconds(bpm)

// midi: bass root, pad voicing (close, around G3), arpeggio tones (G4 to G5 region)
export const CHORDS = [
  { name: 'G', bass: 43, pad: [55, 59, 62], arp: [67, 71, 74, 79] },
  { name: 'D', bass: 50, pad: [54, 57, 62], arp: [66, 69, 74, 78] },
  { name: 'Em', bass: 40, pad: [55, 59, 64], arp: [64, 67, 71, 76] },
  { name: 'C', bass: 48, pad: [55, 60, 64], arp: [67, 72, 76, 79] },
]
const PATTERNS = [[0, 1, 2, 3, 2, 1, 2, 1], [0, 2, 1, 3, 2, 3, 1, 2]]

export const midiHz = (m) => 440 * 2 ** ((m - 69) / 12)

// A small integer hash to [0, 1): the "random" of the variations, the same on every pass and every machine.
export function hash(n) {
  let x = Math.imul(n | 0, 0x9e3779b1) >>> 0
  x ^= x >>> 15; x = Math.imul(x, 0x85ebca6b) >>> 0
  x ^= x >>> 13; x = Math.imul(x, 0xc2b2ae35) >>> 0
  x ^= x >>> 16
  return (x >>> 0) / 4294967296
}

// The events that start on step `n` (any integer; the score repeats every LOOP_STEPS). Each is
// { kind: pad|bass|pluck|kick|hat, midi?, vel, dur }, `dur` in seconds.
export function eventsAt(n, bpm = BPM) {
  const s = ((n % LOOP_STEPS) + LOOP_STEPS) % LOOP_STEPS
  const bar = Math.floor(s / STEPS_PER_BAR), inBar = s % STEPS_PER_BAR
  const chordIx = Math.floor(s / STEPS_PER_CHORD) % 4, chord = CHORDS[chordIx]
  const second = s >= 64, beat = Math.floor(inBar / 2), onBeat = inBar % 2 === 0
  const beatSec = 60 / bpm
  const out = []

  // A pad chord for the two bars, longer than them so the change is a cross-fade.
  if (s % STEPS_PER_CHORD === 0) for (const m of chord.pad) out.push({ kind: 'pad', midi: m, vel: 1, dur: 8 * beatSec })

  // Bass on the root: long on the downbeat, a short answer on beat 3 of every other bar, a few pickups.
  if (inBar === 0) out.push({ kind: 'bass', midi: chord.bass, vel: 1, dur: beatSec * 2.6 })
  else if (inBar === 4 && bar % 2 === 1) out.push({ kind: 'bass', midi: chord.bass + (chordIx % 3 === 0 ? 7 : 0), vel: 0.7, dur: beatSec * 1.4 })
  else if (inBar === 5 && hash(s + 7) < 0.3) out.push({ kind: 'bass', midi: chord.bass, vel: 0.55, dur: beatSec * 0.9 })

  // A soft kick on beats 1 and 3, a ghost pickup on the "and" of 3 in the second pass.
  if (inBar === 0 || inBar === 4) out.push({ kind: 'kick', vel: inBar === 0 ? 1 : 0.8, dur: 0.22 })
  else if (inBar === 5 && bar % 2 === 1 && second) out.push({ kind: 'kick', vel: 0.4, dur: 0.18 })

  // A quiet shaker on the off-beat eighths, a touch stronger on the "and" of 2 and 4.
  if (!onBeat) out.push({ kind: 'hat', vel: Math.min(1, (beat % 2 === 1 ? 1 : 0.75) * (0.85 + 0.3 * hash(s))), dur: 0.08 })

  // The marimba-like arpeggio: eighth notes, a different shape every other bar, an occasional rest, accented downbeats.
  const rest = inBar !== 0 && inBar !== 4 && hash(s * 3 + 1) < 0.14
  if (!rest) {
    const pat = PATTERNS[bar % 2]
    out.push({ kind: 'pluck', midi: chord.arp[pat[inBar]], vel: Math.min(1, (onBeat ? 0.95 : 0.7) * (0.88 + 0.24 * hash(s * 5 + 2))), dur: beatSec * 1.1 })
  }

  // Second pass only: a melody note an octave up on the chord change, and a rising run into the loop point.
  if (second && inBar === 0 && bar % 2 === 0) out.push({ kind: 'pluck', midi: chord.arp[(bar / 2) % 4 === 1 ? 2 : 3] + 12, vel: 0.8, dur: beatSec * 2 })
  if (second && bar === 15 && inBar >= 5) out.push({ kind: 'pluck', midi: chord.arp[inBar - 5] + 12, vel: 0.65, dur: beatSec * 1.2 })
  return out
}

// A lookahead scheduler on a clock the caller supplies (the AudioContext's currentTime). `advance(now)` returns the events
// that start before now + lookahead and have not been returned yet, each with an absolute time `t`. Steps already past by
// more than `late` seconds (a stalled tab) are skipped, not played in a burst.
export function createScheduler({ start = 0, bpm = BPM, lookahead = 1.6, late = 0.1 } = {}) {
  const sec = stepSeconds(bpm)
  let next = 0
  return {
    bpm, stepSeconds: sec,
    get nextStep() { return next },
    advance(now) {
      const out = []
      while (start + next * sec < now + lookahead) {
        const t = start + next * sec
        if (t >= now - late) {
          const bar = Math.floor(next / STEPS_PER_BAR) % 16, chord = CHORDS[Math.floor(next / STEPS_PER_CHORD) % 4].name
          for (const e of eventsAt(next, bpm)) out.push({ ...e, t, step: next, bar, chord })
        }
        next++
      }
      return out
    },
  }
}
