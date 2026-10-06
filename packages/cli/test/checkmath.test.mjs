// The checker must not read LaTeX as prose, HTML or bullets (docs/EQUATIONS.md).
import assert from 'node:assert/strict'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import { checkDeck } from '../src/check.mjs'

function run(deck, config = {}) {
  const root = mkdtempSync(join(tmpdir(), 'nd-math-'))
  writeFileSync(join(root, 'nimbledeck.config.json'), JSON.stringify(config))
  writeFileSync(join(root, 'deck.md'), deck)
  return checkDeck(join(root, 'deck.md'), root)
}
const head = '---\ntheme: none\n---\n\n'
const long = 'x'.repeat(140)

test('display and inline LaTeX is not counted as prose, HTML or bullets', () => {
  const eq = '$$\n\\begin{aligned}\n a &< b \\\\\n - c &> d\n\\end{aligned}\n$$'
  const r = run(`${head}# Maths\n\n${eq}\n\nInline $a<b$ and $\\sigma(y-x)$ stay out. ${long}\n`, { limits: { maxChars: 200, maxBullets: 0 } })
  assert.deepEqual(r.errors, [])
  assert.deepEqual(r.warnings, [])
})

test('a price or a shell prompt is not LaTeX, so it still counts as text', () => {
  const t = run(`${head}# Shell\n\n$ run one $ and $ run two. It costs $5 and later $6. ${long}\n`, { limits: { maxChars: 120 } })
  assert.match(t.warnings.join('\n'), /characters > 120/)
})
