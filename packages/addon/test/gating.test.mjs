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
