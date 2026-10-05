// The vocabulary of a scripted tour and of slide sounds, shared by the browser engine and by `nimbledeck check`.
// Pure functions, no DOM: they take what Slidev parsed from the frontmatter and return normalised steps plus messages.

export const BUILTIN_SOUNDS = ['click', 'tick', 'pop', 'whoosh', 'riser', 'chime', 'success', 'soft-boom', 'typing', 'swell', 'pad']
export const AUDIO_EXT = /\.(mp3|ogg|wav|m4a|aac|webm)$/i
export const ACTIONS = ['click', 'hover', 'drag', 'key', 'type', 'wait']
const KEYS = { common: ['at', 'caption'], click: [], hover: [], drag: ['from', 'to', 'over'], key: [], type: ['into', 'speed'], wait: [] }
const ALL_KEYS = [...new Set([...KEYS.common, ...ACTIONS, 'from', 'to', 'over', 'into', 'speed'])]
export const GLIDE_MS = 800            // how long the cursor takes to reach a target (the engine shortens it for a short hop)
export const CLICK_MS = 350            // a click, from arrival to the end of its ripple
export const TYPE_MS = 55              // default pause between two typed characters

const isNum = (v) => typeof v === 'number' && Number.isFinite(v)
const isText = (v) => typeof v === 'string' && v.trim() !== ''

// How a target string is read: "B" is a quiz choice, "text:Studio" an element holding that text, anything else a CSS selector.
export function targetKind(t) {
  if (/^[A-Z]$/.test(t)) return { kind: 'letter', value: t }
  if (/^text:/i.test(t)) return { kind: 'text', value: t.replace(/^text:\s*/i, '') }
  return { kind: 'css', value: t }
}

// 'pop' | 'whoosh' ... -> { kind: 'builtin' }, '/audio/theme.mp3' -> { kind: 'file' }, anything else -> { kind: 'invalid' }.
export function soundKind(src) {
  if (typeof src !== 'string') return { kind: 'invalid' }
  if (BUILTIN_SOUNDS.includes(src)) return { kind: 'builtin' }
  if (src.startsWith('/') && !src.startsWith('//') && AUDIO_EXT.test(src)) return { kind: 'file' }
  return { kind: 'invalid' }
}

// Validate and normalise a `tourScript` list. `seconds` (the slide's `tour:` value, optional) lets `at` past the end be flagged.
export function parseScript(raw, { seconds } = {}) {
  const errors = [], warnings = [], steps = []
  if (raw === undefined || raw === null) return { steps, errors, warnings }
  if (!Array.isArray(raw)) return { steps, errors: ['tourScript must be a list of steps, each like { at: 1.5, click: "B" }'], warnings }
  if (raw.length > 40) errors.push(`tourScript has ${raw.length} steps, at most 40`)
  raw.forEach((s, i) => {
    const w = `tourScript step ${i + 1}`
    if (!s || typeof s !== 'object' || Array.isArray(s)) return errors.push(`${w}: expected { at: <seconds>, <action>: ... }`)
    const bad = Object.keys(s).filter((k) => !ALL_KEYS.includes(k))
    if (bad.length) return errors.push(`${w}: unknown key '${bad[0]}' (known: ${ALL_KEYS.join(', ')})`)
    if (!isNum(s.at) || s.at < 0 || s.at > 600) return errors.push(`${w}: 'at' must be a number of seconds from 0 to 600`)
    const acts = ACTIONS.filter((a) => a in s)
    if (acts.length !== 1) return errors.push(`${w}: give exactly one action (${ACTIONS.join(', ')}), found ${acts.length ? acts.join(' and ') : 'none'}`)
    const a = acts[0]
    const stray = Object.keys(s).filter((k) => !KEYS.common.includes(k) && k !== a && !KEYS[a].includes(k))
    if (stray.length) return errors.push(`${w}: '${stray[0]}' does not go with '${a}'`)
    const step = { at: s.at, action: a }
    if (s.caption !== undefined) {
      if (!isText(s.caption) || s.caption.length > 48) return errors.push(`${w}: 'caption' must be a short text (at most 48 characters)`)
      step.caption = s.caption
    }
    const v = s[a]
    if (a === 'wait') {
      if (!isNum(v) || v <= 0 || v > 60) return errors.push(`${w}: 'wait' must be a number of seconds above 0 and at most 60`)
      step.seconds = v
    } else if (a === 'key') {
      const k = typeof v === 'number' ? String(v) : v
      if (!isText(k)) return errors.push(`${w}: 'key' must be a key name such as "3" or "ArrowRight"`)
      step.key = k
    } else if (a === 'type') {
      if (typeof v !== 'string' || v === '') return errors.push(`${w}: 'type' must be the text to type`)
      step.text = v
      if (s.into !== undefined) { if (!isText(s.into)) return errors.push(`${w}: 'into' must be a target`); step.into = s.into }
      if (s.speed !== undefined) { if (!isNum(s.speed) || s.speed < 10 || s.speed > 500) return errors.push(`${w}: 'speed' is milliseconds per character, 10 to 500`); step.speed = s.speed }
    } else {
      if (!isText(v)) return errors.push(`${w}: '${a}' needs a target: a quiz letter ("B"), "text:Some words", or a CSS selector`)
      step.target = v
      if (a === 'drag') {
        for (const [k, d] of [['from', 0.1], ['to', 0.9]]) {
          if (s[k] !== undefined && (!isNum(s[k]) || s[k] < 0 || s[k] > 1)) return errors.push(`${w}: '${k}' is a position along the target, 0 to 1`)
          step[k] = s[k] ?? d
        }
        if (s.over !== undefined && (!isNum(s.over) || s.over <= 0 || s.over > 20)) return errors.push(`${w}: 'over' is a duration in seconds, above 0 and at most 20`)
        step.over = s.over ?? 1.2
      }
    }
    if (seconds !== undefined && step.at > seconds) warnings.push(`${w}: starts at ${step.at} s, after the slide's ${seconds} s (tour: ${seconds})`)
    steps.push(step)
  })
  if (errors.length) return { steps: [], errors, warnings }
  return { steps: steps.sort((x, y) => x.at - y.at), errors, warnings }
}

// Seconds a step takes once it has started.
export const stepLength = (s) => (s.action === 'drag' ? s.over : s.action === 'wait' ? s.seconds : s.action === 'type' ? (s.text.length * (s.speed ?? TYPE_MS)) / 1000 : s.action === 'key' ? 0.1 : CLICK_MS / 1000)
// When the last step is over: the slide must stay at least this long.
export const scriptEnd = (steps) => steps.reduce((m, s) => Math.max(m, s.at + stepLength(s)), 0)

// Validate `sound` (one source), `sounds` (cues) and optionally `ndSound` (the deck's bed). Returns normalised cues.
export function parseSounds({ sound, sounds, bed } = {}, { seconds } = {}) {
  const errors = [], warnings = [], cues = []
  const src = (v, w) => {
    const k = soundKind(v)
    if (k.kind === 'invalid') errors.push(`${w}: '${v}' is neither a built-in sound (${BUILTIN_SOUNDS.join(', ')}) nor a file of public/ such as /audio/theme.mp3`)
    return k.kind !== 'invalid'
  }
  if (sound !== undefined && src(sound, 'sound')) cues.push({ at: 0, src: sound, volume: 1 })
  if (bed !== undefined) src(bed, 'ndSound')
  if (sounds !== undefined) {
    if (!Array.isArray(sounds)) errors.push('sounds must be a list, each like { at: 2.5, src: "pop", volume: 0.6 }')
    else sounds.forEach((c, i) => {
      const w = `sounds cue ${i + 1}`
      if (!c || typeof c !== 'object') return errors.push(`${w}: expected { at: <seconds>, src: <sound> }`)
      const bad = Object.keys(c).filter((k) => !['at', 'src', 'volume'].includes(k))
      if (bad.length) return errors.push(`${w}: unknown key '${bad[0]}' (known: at, src, volume)`)
      if (!isNum(c.at) || c.at < 0 || c.at > 600) return errors.push(`${w}: 'at' must be a number of seconds from 0 to 600`)
      if (c.volume !== undefined && (!isNum(c.volume) || c.volume <= 0 || c.volume > 1)) return errors.push(`${w}: 'volume' must be above 0 and at most 1`)
      if (!src(c.src, w)) return
      if (seconds !== undefined && c.at > seconds) warnings.push(`${w}: starts at ${c.at} s, after the slide's ${seconds} s`)
      cues.push({ at: c.at, src: c.src, volume: c.volume ?? 1 })
    })
  }
  return { cues: cues.sort((a, b) => a.at - b.at), errors, warnings }
}

// Run steps in order against an injected clock. Each step first moves (the glide ends exactly at `at`), then acts.
// A step that is late runs at once; the next one keeps its own time, so the script never drifts. `cancelled()` ends it.
export async function runScript(steps, { now, sleep, glide = () => 0, move, act, cancelled = () => false }) {
  const t0 = now()
  const until = async (ms) => { const d = t0 + ms - now(); if (d > 0) await sleep(d) }
  for (const s of steps) {
    await until(Math.max(0, s.at * 1000 - glide(s)))
    if (cancelled()) return
    if (move) await move(s)
    if (cancelled()) return
    await until(s.at * 1000)
    if (cancelled()) return
    await act(s)
  }
}
