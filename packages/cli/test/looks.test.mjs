import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import { checkDeck } from '../src/check.mjs'
import { parseHeadmatter } from '../src/slides.mjs'

// A deck next to a tiny theme that ships a looks.json (a theme given as a relative path resolves from the deck's folder).
function run(variant, { looks = [{ id: 'calm' }, { id: 'loud' }], theme = './theme' } = {}) {
  const root = mkdtempSync(join(tmpdir(), 'nd-looks-'))
  mkdirSync(join(root, 'theme', 'layouts'), { recursive: true })
  writeFileSync(join(root, 'theme', 'package.json'), '{"name":"slidev-theme-tiny"}')
  if (looks) writeFileSync(join(root, 'theme', 'looks.json'), JSON.stringify(looks))
  writeFileSync(join(root, 'nimbledeck.config.json'), '{}')
  writeFileSync(join(root, 'deck.md'), `---\ntheme: ${theme}\n${variant === undefined ? '' : `ndVariant: ${variant}\n`}---\n\n# Hello\n`)
  return checkDeck(join(root, 'deck.md'), root).errors
}

test('ndVariant must be a look listed in the looks.json of the theme', () => {
  assert.deepEqual(run('calm'), [])
  assert.deepEqual(run('"loud"'), [])
  assert.deepEqual(run(undefined), [])
  const errors = run('neonn')
  assert.equal(errors.length, 1)
  assert.match(errors[0], /unknown look ndVariant 'neonn' \(known: calm, loud\)/)
})

test('a theme without a looks.json (a brand theme) is not checked', () => {
  assert.deepEqual(run('anything', { looks: null }), [])
  assert.deepEqual(run('anything', { theme: 'none' }), [])
})

test('every example deck uses a look of the base theme', () => {
  const looks = new Set(JSON.parse(readFileSync(new URL('../../theme/looks.json', import.meta.url), 'utf8')).map((l) => l.id))
  const examples = new URL('../../../examples/', import.meta.url)
  let seen = 0
  for (const dir of readdirSync(examples)) {
    let files = []
    try { files = readdirSync(new URL(`${dir}/`, examples)).filter((f) => f.endsWith('.md') && f !== 'README.md') } catch { continue }
    for (const f of files) {
      const v = parseHeadmatter(readFileSync(new URL(`${dir}/${f}`, examples), 'utf8')).ndVariant
      if (v === undefined) continue
      seen++
      assert.ok(looks.has(v.replace(/["']/g, '')), `${dir}/${f}: ndVariant ${v}`)
    }
  }
  assert.ok(seen > 3)
})
