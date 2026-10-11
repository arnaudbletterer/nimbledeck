// Builds the web edition of the science deck. The deck needs no Python, so the web edition is the deck itself: nothing is left out
// and nothing is replaced by a recording.
// Usage: npm run build:web            (env WEB_BASE sets the base path, WEB_OUT the output folder; default dist/)
import { spawnSync } from 'node:child_process'
import { readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const dir = dirname(fileURLToPath(import.meta.url))
const base = process.env.WEB_BASE ?? '/nimbledeck/demos/science/'
const out = resolve(dir, process.env.WEB_OUT ?? 'dist')
const tmp = resolve(dir, '.web-build.md')

const src = readFileSync(resolve(dir, 'science.md'), 'utf8')
// A static host has no fallback to index.html for /3, so the web copy uses hash routes.
writeFileSync(tmp, src.replace(/^---\n/, '---\nrouterMode: hash\n'))
try {
  const r = spawnSync('npx', ['slidev', 'build', '.web-build.md', '--base', base, '--out', out], { cwd: dir, stdio: 'inherit', shell: process.platform === 'win32' })
  if (r.status !== 0) process.exit(r.status ?? 1)
} finally {
  rmSync(tmp, { force: true })
}
// website/build.mjs and the hosted decks expect a session file; an empty one stands in so that no request ends in a 404.
writeFileSync(resolve(out, 'nimbledeck.json'), '{"demos":{},"streams":{}}\n')
console.log(`web edition ready in ${out}`)
