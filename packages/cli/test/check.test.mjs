import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import { checkDeck } from '../src/check.mjs'

function project(deck, { files = {}, config = {} } = {}) {
  const root = mkdtempSync(join(tmpdir(), 'nd-'))
  mkdirSync(join(root, 'layouts'), { recursive: true })
  writeFileSync(join(root, 'layouts', 'mine.vue'), '<template><slot/></template>')
  writeFileSync(join(root, 'nimbledeck.config.json'), JSON.stringify(config))
  for (const [p, c] of Object.entries(files)) { mkdirSync(join(root, p, '..'), { recursive: true }); writeFileSync(join(root, p), c) }
  writeFileSync(join(root, 'deck.md'), deck)
  return root
}
const run = (deck, opts) => { const root = project(deck, opts); return checkDeck(join(root, 'deck.md'), root) }

test('a clean deck has no errors', () => {
  const r = run('---\ntheme: none\n---\n\n# Hello\n\n- one\n- two\n\n---\nlayout: mine\n---\n\n# Second\n')
  assert.deepEqual(r.errors, [])
  assert.equal(r.slides, 2)
})

test('flags unknown layout, long title, inline HTML and CSS', () => {
  const r = run('---\ntheme: none\n---\n\n# Fine\n\n---\nlayout: nope\n---\n\n# ' + 'x'.repeat(60) + '\n\n<div style="color:red">raw</div>\n')
  const text = r.errors.join('\n')
  assert.match(text, /unknown layout 'nope'/)
  assert.match(text, /title 60 chars/)
  assert.match(text, /inline style=/)
  assert.match(text, /raw <div>/)
})

test('missing asset and unregistered demo are errors, registered ones pass', () => {
  const deck = '---\ntheme: none\n---\n\n# A\n\n<Demo name="ghost" />\n\n![x](/missing.png)\n\n---\n\n# B\n\n<Demo name="real" />\n'
  const config = { demos: { real: { file: 'demos/real.py', port: 2800 } } }
  const r = run(deck, { config, files: { 'demos/real.py': '#' } })
  const text = r.errors.join('\n')
  assert.match(text, /demo 'ghost' not in nimbledeck.config.json/)
  assert.match(text, /missing asset \/missing.png/)
  assert.doesNotMatch(text, /real/)
})

test('a --- inside a fenced code block does not split slides', () => {
  const r = run('---\ntheme: none\n---\n\n# A\n\n```md\n---\nlayout: x\n---\n```\n\n---\n\n# B\n')
  assert.equal(r.slides, 2)
  assert.deepEqual(r.errors, [])
})

test('too many bullets is a warning, not an error', () => {
  const r = run('---\ntheme: none\n---\n\n# A\n\n' + Array.from({ length: 9 }, (_, i) => `- b${i}`).join('\n') + '\n')
  assert.equal(r.errors.length, 0)
  assert.equal(r.warnings.length, 1)
})

test('theme: foo resolves to slidev-theme-foo, including layouts of addons the theme declares', () => {
  const root = project('---\ntheme: foo\n---\n\n# A\n\n---\nlayout: from-theme\n---\n\n# B\n\n---\nlayout: from-addon\n---\n\n# C\n')
  const pkg = (name, extra = {}) => { const d = join(root, 'node_modules', name); mkdirSync(join(d, 'layouts'), { recursive: true }); writeFileSync(join(d, 'package.json'), JSON.stringify({ name, ...extra })); return d }
  writeFileSync(join(pkg('slidev-theme-foo', { slidev: { defaults: { addons: ['slidev-addon-bar'] } } }), 'layouts', 'from-theme.vue'), '<template/>')
  writeFileSync(join(pkg('slidev-addon-bar'), 'layouts', 'from-addon.vue'), '<template/>')
  assert.deepEqual(checkDeck(join(root, 'deck.md'), root).errors, [])
})

test('<At> must fit its <Stage>, and a <Stage> must fit the content area', () => {
  const r = run('---\ntheme: none\n---\n\n# A\n\n<Stage :w="1140" :h="460">\n<At :x="600" :y="0" :w="700" :h="100">\nx\n</At>\n</Stage>\n\n<Stage :w="1200" :h="600">\n</Stage>\n\n---\nlayout: full\n---\n\n<Stage full>\n<At :w="1280" :h="720">\nok\n</At>\n</Stage>\n')
  const text = r.errors.join('\n')
  assert.match(text, /<At> at \(600,0\) size 700x100 falls outside its 1140x460 <Stage>/)
  assert.match(text, /<Stage> 1200x600 does not fit the content area/)
  assert.doesNotMatch(text, /slide 2/)
})

test('very text-heavy slides get a warning', () => {
  const r = run('---\ntheme: none\n---\n\n# A\n\n' + 'word '.repeat(300) + '\n')
  assert.equal(r.errors.length, 0)
  assert.match(r.warnings.join('\n'), /characters > 900/)
})

test('a quiz answer must be one of its choices', () => {
  const ok = '---\ntheme: none\n---\n\n# A\n\n<Quiz answer="B">\n<Choice letter="A">x</Choice>\n<Choice letter="B">y</Choice>\n</Quiz>\n'
  assert.deepEqual(run(ok).errors, [])
  const bad = ok.replace('answer="B"', 'answer="Z"')
  assert.match(run(bad).errors.join('\n'), /<Quiz answer="Z"> has no <Choice letter="Z">/)
})
