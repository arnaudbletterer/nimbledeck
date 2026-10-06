import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import { checkDeck } from '../src/check.mjs'
import { frontmatterValues } from '../src/tourcheck.mjs'
import { splitSlides } from '../src/slides.mjs'

function run(deck, files = {}) {
  const root = mkdtempSync(join(tmpdir(), 'nd-'))
  writeFileSync(join(root, 'nimbledeck.config.json'), '{}')
  for (const [p, c] of Object.entries(files)) { mkdirSync(join(root, p, '..'), { recursive: true }); writeFileSync(join(root, p), c) }
  writeFileSync(join(root, 'deck.md'), deck)
  return checkDeck(join(root, 'deck.md'), root)
}
const slide = (fm, head = '') => `---\ntheme: none\n${head}---\n\n# One\n\n---\nlayout: default\n${fm}\n---\n\n# Two\n`

test('a multi-line frontmatter with a tour script is still read as frontmatter', () => {
  const [, s] = splitSlides(slide('tour: 14\ntourScript:\n  - { at: 1.5, click: "B" }\n  - { at: 5, drag: ".nd-compare", from: 0.15, to: 0.85, over: 2 }'))
  assert.equal(s.fm.layout, 'default')
  assert.equal(s.fm.tour, '14')
  assert.equal(s.fmLines.length, 5)
  assert.equal(s.body.trim(), '# Two')
})

test('the one-line flow maps are read with numbers, strings and commas inside quotes', () => {
  const v = frontmatterValues(['tour: 9', 'sound: whoosh', 'tourScript:', '  - { at: 2, click: "text:One, two", caption: \'Hi\' }', '  - {at: 3, wait: 1}'])
  assert.equal(v.tour, 9)
  assert.equal(v.sound, 'whoosh')
  assert.deepEqual(v.tourScript, [{ at: 2, click: 'text:One, two', caption: 'Hi' }, { at: 3, wait: 1 }])
})

test('a valid script and sounds produce no message', () => {
  const r = run(slide('tour: 14\nsound: whoosh\nsounds:\n  - { at: 2.5, src: pop, volume: 0.6 }\ntourScript:\n  - { at: 1.5, click: "B" }\n  - { at: 9, key: "3" }'))
  assert.deepEqual(r.errors, [])
  assert.deepEqual(r.warnings, [])
})

test('unknown step keys, bad numbers and missing actions are errors with the slide', () => {
  const r = run(slide('tourScript:\n  - { at: 1, clik: "B" }\n  - { at: -2, click: "B" }\n  - { at: 3 }\n  - { at: 4, drag: "x", to: 1.5 }'))
  const t = r.errors.join('\n')
  assert.match(t, /\(slide 2\): tourScript step 1: unknown key 'clik'/)
  assert.match(t, /step 2: 'at' must be a number/)
  assert.match(t, /step 3: give exactly one action/)
  assert.match(t, /step 4: 'to' is a position/)
})

test('a step after the slide time is a warning', () => {
  const r = run(slide('tour: 6\ntourScript:\n  - { at: 8, click: "A" }'))
  assert.deepEqual(r.errors, [])
  assert.match(r.warnings.join('\n'), /starts at 8 s, after the slide's 6 s/)
})

test('sound names and files of public/ are checked', () => {
  const r = run(slide('sound: boing\nsounds:\n  - { at: 1, src: /audio/theme.mp3 }\n  - { at: 2, src: /audio/there.mp3 }'), { 'public/audio/there.mp3': 'x' })
  const t = r.errors.join('\n')
  assert.match(t, /sound: 'boing' is neither a built-in sound/)
  assert.match(t, /sound file \/audio\/theme\.mp3 is not in public\//)
  assert.doesNotMatch(t, /there\.mp3/)
})

test('a missing file is reported even when it is the only sound', () => {
  assert.match(run(slide('sound: /audio/gone.mp3')).errors.join('\n'), /gone\.mp3 is not in public/)
})

test('the deck-level bed and slide sound are checked', () => {
  const r = run(slide('', 'ndSound: nope\nndSlideSound: whoosh\n'))
  assert.match(r.errors.join('\n'), /headmatter: ndSound 'nope'/)
  assert.doesNotMatch(r.errors.join('\n'), /ndSlideSound/)
  assert.deepEqual(run(slide('', 'ndSound: pad\nndSlideSound: whoosh\n')).errors, [])
  assert.deepEqual(run(slide('', 'ndSound: uplift\nndSlideSound: whoosh\n')).errors, [])
})

test('a bad tour value is an error', () => {
  assert.match(run(slide('tour: soon')).errors.join('\n'), /tour must be a number/)
})
