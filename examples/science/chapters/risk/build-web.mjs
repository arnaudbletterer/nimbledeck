// Builds the web edition of the risk chapter. <Crowd> and <Polls> run in the browser, so they stay live on a static host; the one
// slide that needs Python (the live code) plays its recording from public/recordings.
// Usage: node build-web.mjs      (env WEB_BASE sets the base path, WEB_OUT the output folder; default dist/)
import { spawnSync } from 'node:child_process'
import { readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { disableUnrecorded } from '../../../../packages/cli/src/recordings.mjs'

const dir = dirname(fileURLToPath(import.meta.url))
const base = process.env.WEB_BASE ?? '/nimbledeck/demos/science/risk/'
const out = resolve(dir, process.env.WEB_OUT ?? 'dist')
const tmp = resolve(dir, '.web-build.md')
const slidev = resolve(dir, '../../../../node_modules/@slidev/cli/bin/slidev.mjs')

const src = readFileSync(resolve(dir, 'risk.md'), 'utf8')
const { text: web, skipped, played } = disableUnrecorded(src, resolve(dir, 'public'))
console.log(`web edition: ${skipped} slides that need nimbledeck run are left out, ${played} play a recording`)
// A static host has no fallback to index.html for /3, so the web copy uses hash routes.
writeFileSync(tmp, web.replace(/^---\n/, '---\nrouterMode: hash\n'))
try {
  const r = spawnSync('node', [slidev, 'build', '.web-build.md', '--base', base, '--out', out], { cwd: dir, stdio: 'inherit' })
  if (r.status !== 0) process.exit(r.status ?? 1)
} finally {
  rmSync(tmp, { force: true })
}
// The session file holds the runner token: never publish it. An empty one stands in so that no request ends in a 404.
writeFileSync(resolve(out, 'nimbledeck.json'), '{"demos":{},"streams":{}}\n')
console.log(`web edition ready in ${out}`)
