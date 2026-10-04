import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, symlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'
import { checkDeck } from '../src/check.mjs'
import { scaffoldDeck } from '../src/new.mjs'

const repo = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..')
const fresh = () => join(mkdtempSync(join(tmpdir(), 'nd-new-')), 'my deck')
const json = (p) => JSON.parse(readFileSync(p, 'utf8'))

test('scaffolds every file a deck project needs', () => {
  const dir = fresh()
  const written = scaffoldDeck(dir)
  for (const f of ['package.json', 'nimbledeck.config.json', 'slides.md', '.gitignore', '.gitattributes', 'demos/requirements.txt', 'public/.gitkeep']) {
    assert.ok(existsSync(join(dir, f)), f)
    assert.ok(written.includes(f), `${f} reported`)
  }
  assert.equal(readFileSync(join(dir, '.gitattributes'), 'utf8').trim(), '* text=auto eol=lf')
  const ignore = readFileSync(join(dir, '.gitignore'), 'utf8').split('\n')
  for (const l of ['node_modules', 'dist', '.nimbledeck', 'public/nimbledeck.json']) assert.ok(ignore.includes(l), l)
  assert.ok(!written.some((f) => f.includes('{{')))
})

test('package.json has the scripts, a valid name and links to this checkout', () => {
  const dir = fresh()
  scaffoldDeck(dir)
  const pkg = json(join(dir, 'package.json'))
  assert.equal(pkg.name, 'my-deck')
  for (const s of ['dev', 'check', 'verify', 'export']) assert.ok(pkg.scripts[s], s)
  assert.doesNotMatch(readFileSync(join(dir, 'package.json'), 'utf8'), /\{\{/)
  const link = pkg.dependencies['slidev-theme-nimbledeck'].replace(/^file:/, '')
  assert.ok(existsSync(join(dir, link, 'package.json')), `${link} resolves to the theme`)
})

test('dependency versions are exact and match the example', () => {
  const dir = fresh()
  scaffoldDeck(dir)
  const deps = json(join(dir, 'package.json')).dependencies
  const example = json(join(repo, 'examples', 'how-it-works', 'package.json')).dependencies
  for (const name of ['@slidev/cli', 'playwright-chromium']) {
    assert.match(deps[name], /^\d+\.\d+\.\d+$/)
    assert.equal(deps[name], example[name])
  }
})

test('the produced deck passes nimbledeck check', () => {
  const dir = fresh()
  scaffoldDeck(dir)
  // checkDeck resolves the theme from the deck's node_modules, as after npm install
  mkdirSync(join(dir, 'node_modules'), { recursive: true })
  for (const p of ['theme', 'addon']) symlinkSync(join(repo, 'packages', p), join(dir, 'node_modules', `slidev-${p}-nimbledeck`), 'junction')
  const r = checkDeck(join(dir, 'slides.md'), dir)
  assert.deepEqual(r.errors, [])
  assert.equal(r.slides, 4)
})

test('refuses a target that is not empty, and leaves it alone', () => {
  const dir = fresh()
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, 'keep.txt'), 'mine')
  assert.throws(() => scaffoldDeck(dir), /not empty/)
  assert.equal(readFileSync(join(dir, 'keep.txt'), 'utf8'), 'mine')
  assert.ok(!existsSync(join(dir, 'package.json')))
})

test('accepts an existing empty folder', () => {
  const dir = fresh()
  mkdirSync(dir, { recursive: true })
  assert.ok(scaffoldDeck(dir).length > 0)
})

test('the CLI command creates the deck, and refuses a non-empty folder with an error', () => {
  const dir = fresh()
  const bin = join(repo, 'packages', 'cli', 'bin', 'nimbledeck.mjs')
  assert.equal(spawnSync(process.execPath, [bin, 'new', dir]).status, 0)
  assert.ok(existsSync(join(dir, 'slides.md')))
  const again = spawnSync(process.execPath, [bin, 'new', dir], { encoding: 'utf8' })
  assert.equal(again.status, 2)                       // the CLI reports thrown errors as `error: ...` with exit code 2
  assert.match(again.stderr, /^error: /)
})
