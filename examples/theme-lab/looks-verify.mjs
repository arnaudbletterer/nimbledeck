// Runs `nimbledeck verify` on the sample deck under some looks, with the look set in the deck header (so the theme's own setup
// applies it, dark class included). Usage: node looks-verify.mjs [id ...]   (default: a dark look, a light one, a mono one, high-contrast)
// Each look gets a copy of looks.md next to it (.looks-verify-<id>.md, ignored by git); the copies are removed afterwards.
import { spawnSync } from 'node:child_process'
import { readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const cli = join(here, '../../packages/cli/bin/nimbledeck.mjs')
const ids = process.argv.length > 2 ? process.argv.slice(2) : ['neon', 'editorial', 'terminal', 'high-contrast']
const deck = readFileSync(join(here, 'looks.md'), 'utf8')
let failed = 0
for (const id of ids) {
  const file = join(here, `.looks-verify-${id}.md`)
  writeFileSync(file, deck.replace(/^ndVariant: .*$/m, `ndVariant: ${id}`))
  console.log(`\n== ${id}`)
  const r = spawnSync('node', [cli, 'verify', file], { cwd: here, stdio: 'inherit', env: { ...process.env, NIMBLEDECK_PORT_OFFSET: process.env.NIMBLEDECK_PORT_OFFSET ?? '800' } })
  rmSync(file, { force: true })
  if (r.status !== 0) failed++
}
console.log(failed ? `\n${failed} look(s) with problems` : '\nverify is clean under every look tried')
process.exitCode = failed ? 1 : 0
