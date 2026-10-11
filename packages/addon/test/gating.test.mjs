// Slidev keeps neighbouring slides mounted, so a component that polls, opens a socket, animates or embeds a page
// must gate on useActive() or every slide in the deck would run it at once. This test fails when a new live
// component forgets to.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readdirSync, readFileSync } from 'node:fs'

const dir = new URL('../components/', import.meta.url)
const LIVE = /\b(setInterval|WebSocket|requestAnimationFrame)\b|<iframe\b/

// Exceptions, each with the reason it is safe without its own gate.
const ALLOWED = {
  'FrameGuard.vue': 'its iframe is a child passed in by Demo.vue and Site.vue, which are gated',
  'SiteBar.vue': 'mounted once by global-top, outside the slides; it is the tour clock and renders nothing without window.__ND_SITE__',
}

const strip = (src) => src.replace(/<!--[\s\S]*?-->/g, '').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')
const files = readdirSync(dir).filter((f) => f.endsWith('.vue'))

test('every live component gates on useActive', () => {
  const offenders = files.filter((f) => {
    const code = strip(readFileSync(new URL(f, dir), 'utf8'))
    return LIVE.test(code) && !/\buseActive\b/.test(code) && !(f in ALLOWED)
  })
  assert.deepEqual(offenders, [], `import and use useActive() in: ${offenders.join(', ')} (or add a reasoned entry to ALLOWED)`)
})

test('the allow-list names only components that exist', () => {
  for (const f of Object.keys(ALLOWED)) assert.ok(files.includes(f), `${f} is allow-listed but does not exist`)
})

test('the embedding components mount their page only while active', () => {
  for (const f of ['Demo.vue', 'Site.vue']) {
    const src = readFileSync(new URL(f, dir), 'utf8')
    assert.match(src, /useActive\(\)/, `${f} must call useActive()`)
    assert.match(src, /v-if="[^"]*\b(live|active)\b/, `${f} must render its frame behind the active gate`)
  }
})

test('the quiz key handler ignores editable targets', () => {
  const src = readFileSync(new URL('Quiz.vue', dir), 'utf8')
  assert.match(src, /isContentEditable/)
  assert.match(src, /INPUT\|TEXTAREA/)
})

// The motion toolkit (Kinetic, Typewriter, Terminal, Aurora, Stat, Marquee, Spotlight, Tilt): every piece gates on the slide,
// labels itself, cleans up its frame loop, and respects reduced motion. Terminal only wraps Typewriter, which does all of that.
const MOTION = { Kinetic: 'kinetic', Typewriter: 'typewriter', Terminal: 'terminal', Aurora: 'aurora', Stat: 'stat', Marquee: 'marquee', Spotlight: 'spotlight', Tilt: 'tilt', Shader: 'shader', Livedeck: 'livedeck', Looks: 'looks', LookWall: 'lookwall' }
const motionSrc = (name) => strip(readFileSync(new URL(`${name}.vue`, dir), 'utf8'))
const sections = Object.fromEntries(readFileSync(new URL('../styles/index.css', import.meta.url), 'utf8').split('/* ==== Motion toolkit: ').slice(1).map((s) => [s.slice(0, s.indexOf(' ')), s]))

test('every motion component exists, is labelled with data-kind, has its CSS section, and is gated by the slide', () => {
  for (const [name, kind] of Object.entries(MOTION)) {
    assert.ok(files.includes(`${name}.vue`), `${name}.vue is missing`)
    assert.ok(sections[name], `${name} has no "Motion toolkit: ${name}" section in the stylesheet`)
    const src = motionSrc(name)
    assert.match(src, new RegExp(`data-kind="${kind}"`), `${name} needs data-kind="${kind}"`)
    if (name !== 'Terminal' && name !== 'Livedeck') assert.match(src, /\buseActive\(/, `${name} must call useActive()`)
  }
})

test('every frame loop of a motion component is cancelled on unmount', () => {
  for (const name of Object.keys(MOTION)) {
    if (/requestAnimationFrame|setInterval|setTimeout/.test(motionSrc(name))) assert.match(motionSrc(name), /(onBeforeUnmount|onUnmounted)\(/, `${name} must clean up its timers`)
  }
})

test('motion components respect prefers-reduced-motion', () => {
  for (const name of Object.keys(MOTION)) {
    if (name === 'Terminal') continue
    assert.ok(/prefers-reduced-motion/.test(motionSrc(name)) || /prefers-reduced-motion/.test(sections[name]), `${name} must handle reduced motion`)
  }
})

test('motion components do not measure their own box, except where a pointer or the content width needs it', () => {
  const MEASURES = { Marquee: 'it measures the width of its content (not its box) to size the loop', Spotlight: 'it maps the pointer into its box', Tilt: 'it maps the pointer into its box' }
  for (const name of Object.keys(MOTION)) {
    if (name in MEASURES) continue
    assert.doesNotMatch(motionSrc(name), /getBoundingClientRect|clientWidth|offsetWidth|clientHeight|offsetHeight|ResizeObserver/, `${name} must use a fixed logical size`)
  }
})
