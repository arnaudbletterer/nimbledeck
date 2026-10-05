// The web edition marks the slides that need `nimbledeck run` as disabled and switches to hash routes. Both build scripts
// (website/build.mjs and examples/showcase/build-web.mjs) share this logic, so a regression here ships a broken static deck.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { splitSlides } from '../src/slides.mjs'
import { NEEDS_RUN, webEdition } from '../src/webedition.mjs'

const deck = (...slides) => slides.join('\n---\n')
const head = '---\ntheme: nimbledeck\ntitle: T\n---\n\n# Cover\n'
const plain = (n) => `layout: default\n---\n\n# Slide ${n}\n`
const live = '---\nlayout: full\n---\n\n<LiveCode>\nprint(1)\n</LiveCode>\n'

// The slides Slidev would actually show, after the edit.
const shown = (md) => splitSlides(md).filter((s) => s.fm.disabled !== 'true')

test('NEEDS_RUN matches the three components that need the runner and not look-alikes', () => {
  for (const c of ['<PyStream name="x" />', '<Demo name="x" />', '<LiveCode>', '<LiveCode\n>']) assert.ok(NEEDS_RUN.test(c), c)
  for (const c of ['<DemoCard />', '<PyStreamer />', '<Livecode>', 'LiveCode without a bracket']) assert.ok(!NEEDS_RUN.test(c), c)
})

test('slides that need the runner are disabled, the others are untouched', () => {
  const src = deck(head + 'layout: hero', plain(2), live.replace(/^---\n/, ''), plain(4))
  const { markdown, skipped } = webEdition(src)
  assert.deepEqual(skipped, [3])
  const slides = splitSlides(markdown)
  assert.equal(slides.length, 4, 'no slide is added or lost')
  assert.deepEqual(slides.map((s) => s.fm.disabled), [undefined, undefined, 'true', undefined])
  assert.equal(slides[2].fm.layout, 'full', 'the slide keeps its own frontmatter')
  assert.ok(slides[2].body.includes('<LiveCode>'), 'and its content')
})

test('the router uses hash routes, added to the headmatter', () => {
  const { markdown } = webEdition(head)
  assert.equal(splitSlides(markdown)[0].fm.routerMode, 'hash')
  assert.equal(splitSlides(markdown)[0].fm.theme, 'nimbledeck', 'the other headmatter keys survive')
  assert.ok(markdown.startsWith('---\nrouterMode: hash\n'))
})

test('an existing routerMode is replaced, not duplicated', () => {
  const { markdown } = webEdition('---\nrouterMode: history\ntheme: x\n---\n\n# Cover\n')
  assert.equal(markdown.match(/routerMode:/g).length, 1)
  assert.equal(splitSlides(markdown)[0].fm.routerMode, 'hash')
})

test('a deck without headmatter gets one for the router', () => {
  const { markdown, skipped } = webEdition('# Cover\n\n---\n\n# Two\n\n---\n\n<Demo name="a" />\n')
  assert.ok(markdown.startsWith('---\nrouterMode: hash\n---\n# Cover'))
  assert.deepEqual(skipped, [3])
  assert.equal(shown(markdown).length, 2)
})

test('a slide separated by a bare --- (no frontmatter) is disabled with a new frontmatter block', () => {
  const src = head + '\n---\n\n# Two\n\n---\n\n<PyStream name="s" />\n\n---\n\n# Four\n'
  const { markdown, skipped } = webEdition(src)
  assert.deepEqual(skipped, [3])
  const slides = splitSlides(markdown)
  assert.equal(slides.length, 4)
  assert.equal(slides[2].fm.disabled, 'true')
  assert.ok(slides[2].body.includes('<PyStream'))
  assert.ok(!slides[1].fm.disabled && !slides[3].fm.disabled, 'its neighbours are not disabled')
})

test('a --- inside a code fence is not a slide boundary', () => {
  const fenced = '---\nlayout: default\n---\n\n```md\n---\nlayout: full\n---\n\n<LiveCode>\n```\n'
  const src = deck(head.trimEnd(), fenced.replace(/^---\n/, ''), plain(3))
  const { markdown, skipped } = webEdition(src)
  assert.deepEqual(skipped, [2], 'the fenced component mention disables its own slide, once')
  assert.equal(splitSlides(markdown).length, 3, 'the fence is not split into extra slides')
  assert.equal((markdown.match(/disabled: true/g) ?? []).length, 1)
})

test('a fenced --- followed by a plain slide does not disable the plain slide', () => {
  const fenced = '---\nlayout: default\n---\n\n```yaml\na: 1\n---\nb: 2\n```\n'
  const { markdown, skipped } = webEdition(deck(head.trimEnd(), fenced.replace(/^---\n/, ''), plain(3)))
  assert.deepEqual(skipped, [])
  assert.equal(splitSlides(markdown).length, 3)
  assert.ok(!markdown.includes('disabled'))
})

test('Windows line endings are accepted and the output is LF', () => {
  const src = deck(head + 'layout: hero', plain(2), live.replace(/^---\n/, '')).replace(/\n/g, '\r\n')
  const { markdown, skipped } = webEdition(src)
  assert.deepEqual(skipped, [3])
  assert.ok(!markdown.includes('\r'))
  assert.equal(shown(markdown).length, 2)
  assert.equal(splitSlides(markdown)[0].fm.routerMode, 'hash')
})

test('a deck with nothing to leave out only gains the router mode', () => {
  const src = deck(head, plain(2), plain(3))
  const { markdown, skipped } = webEdition(src)
  assert.deepEqual(skipped, [])
  assert.equal(markdown, src.replace(/^---\n/, '---\nrouterMode: hash\n'))
})

test('the first slide is never disabled, even when it uses a live component', () => {
  const src = deck('---\ntheme: x\n---\n\n<Demo name="a" />\n', plain(2))
  const { markdown, skipped } = webEdition(src)
  assert.deepEqual(skipped, [])
  assert.ok(!markdown.includes('disabled'))
})

test('the edit is idempotent on the slide count and does not mutate a second run', () => {
  const src = deck(head, plain(2), live.replace(/^---\n/, ''))
  const once = webEdition(src)
  const twice = webEdition(once.markdown)
  assert.equal(splitSlides(twice.markdown).length, splitSlides(once.markdown).length)
  assert.equal(twice.markdown.match(/routerMode:/g).length, 1)
})

test('an empty deck does not throw', () => {
  assert.deepEqual(webEdition('').skipped, [])
})
