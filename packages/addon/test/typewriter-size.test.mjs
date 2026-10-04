// Typewriter and Terminal take a `size` (slide pixels or a CSS length). The default stays 22 px.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8')

test('Typewriter exposes size through --nd-tw-size and keeps 22px as the default', () => {
  const src = read('../components/Typewriter.vue')
  assert.match(src, /size\?: number \| string/)
  assert.match(src, /'--nd-tw-size'/)
  assert.match(read('../styles/index.css'), /\.nd-typewriter \{[^}]*font: var\(--nd-tw-size, 22px\)\/1\.55/)
})

test('Terminal passes its size on to the Typewriter', () => {
  const src = read('../components/Terminal.vue')
  assert.match(src, /size\?: number \| string/)
  assert.match(src, /:size="size"/)
})
