// The science deck cites its sources by key in the speaker notes (`refs: [bayes1763]`). Every cited key must be listed in
// examples/science/REFERENCES.md, and every entry there must be cited, so a reference never goes missing or stale.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { resolve, dirname } from 'node:path'

const dir = resolve(dirname(fileURLToPath(import.meta.url)), '../../../examples/science')
const deck = readFileSync(resolve(dir, 'science.md'), 'utf8')
const refs = readFileSync(resolve(dir, 'REFERENCES.md'), 'utf8')

const cited = new Set([...deck.matchAll(/refs:((?:\s*\[[a-z]+\d{4}\])+)/g)].flatMap((m) => [...m[1].matchAll(/\[([a-z]+\d{4})\]/g)].map((k) => k[1])))
const listed = new Set([...refs.matchAll(/^- \[([a-z]+\d{4})\]/gm)].map((m) => m[1]))

test('the deck cites at least one source', () => assert.ok(cited.size > 0))
test('every key cited in the notes is listed in REFERENCES.md', () => {
  for (const k of cited) assert.ok(listed.has(k), `${k} is cited in science.md but missing in REFERENCES.md`)
})
test('every entry of REFERENCES.md is cited in the notes', () => {
  for (const k of listed) assert.ok(cited.has(k), `${k} is in REFERENCES.md but no slide cites it`)
})
test('every entry has a DOI link and a checked note', () => {
  for (const line of refs.split('\n').filter((l) => /^- \[[a-z]+\d{4}\]/.test(l))) {
    assert.match(line, /https:\/\/doi\.org\/10\.\d{4,}\//, line.slice(0, 30))
    assert.match(line, /Checked:/, line.slice(0, 30))
  }
})
test('the references slide shows every DOI of the list', () => {
  for (const doi of refs.match(/(?<=https:\/\/doi\.org\/)10\.\S+?(?=\.\s)/g) ?? []) assert.ok(deck.toLowerCase().includes(doi.toLowerCase()), `${doi} is not on the references slides`)
})
test('no real disease is named and no em dash is used', () => {
  assert.ok(!/—/.test(deck) && !/—/.test(refs))
  assert.ok(!/cancer|diabetes|covid|hiv/i.test(deck.replace(/<!--[\s\S]*?-->/g, '')))
})
