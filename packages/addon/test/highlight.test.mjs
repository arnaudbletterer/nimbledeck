// The Typewriter's highlighter: it must keep every character, in order, and classify the basics.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { highlight } from '../composables/highlight.ts'

const join = (t) => t.map((x) => x.text).join('')
const cls = (tokens, text) => tokens.find((t) => t.text === text)?.cls

test('highlighting never loses or reorders a character, whatever the language', () => {
  const samples = {
    md: '# Title\n\nSome **bold** and `code` and [a link](x)\n- item\n<!-- note -->',
    sh: '$ npm test --run # go\nok 12 passed\n$ echo "hi" | cat',
    py: 'def f(x):\n    return "a" + str(1.5)  # note\n',
    json: '{"a": [1, true, null], "b": "x"}',
    html: '<div class="a">text <!-- c --></div>',
    unknown: 'just some text',
  }
  for (const [lang, src] of Object.entries(samples)) {
    const t = highlight(src, lang)
    assert.equal(join(t), src, lang)
    let at = 0
    for (const x of t) { assert.equal(x.start, at, `${lang}: start offsets must be contiguous`); at += x.text.length }
  }
})

test('sh: a "$ " line is a command, any other line is output', () => {
  const t = highlight('$ npm test\nall green', 'sh')
  assert.equal(cls(t, '$ '), 'p')
  assert.equal(cls(t, 'npm'), 'k')
  assert.equal(cls(t, 'all green'), 'o')
})

test('md headings, py keywords and json keys get their own classes', () => {
  assert.equal(highlight('# Hello', 'md')[0].cls, 'h')
  assert.equal(cls(highlight('def f(): pass', 'py'), 'def'), 'k')
  const j = highlight('{"key": "value"}', 'json')
  assert.equal(cls(j, '"key"'), 'k')
  assert.equal(cls(j, '"value"'), 's')
})
