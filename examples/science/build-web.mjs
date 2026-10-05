// Builds the web edition of the science deck: a slide that needs `nimbledeck run` (PyStream, Demo, LiveCode) is left out,
// unless every live component on them has a recording in public/recordings.
// Usage: npm run build:web            (env WEB_BASE sets the base path, WEB_OUT the output folder; default dist/)
import { spawnSync } from 'node:child_process'
import { readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { disableUnrecorded } from '../../packages/cli/src/recordings.mjs'

const dir = dirname(fileURLToPath(import.meta.url))
const base = process.env.WEB_BASE ?? '/nimbledeck/demos/science/'
const out = resolve(dir, process.env.WEB_OUT ?? 'dist')
const tmp = resolve(dir, '.web-build.md')

const src = readFileSync(resolve(dir, 'science.md'), 'utf8')
const { text: web, skipped, played } = disableUnrecorded(src, resolve(dir, 'public'))
console.log(`web edition: ${skipped} slides that need nimbledeck run are left out, ${played} play a recording`)
// A static host has no fallback to index.html for /3, so the web copy uses hash routes.
writeFileSync(tmp, web.replace(/^---\n/, '---\nrouterMode: hash\n'))
try {
  const r = spawnSync('npx', ['slidev', 'build', '.web-build.md', '--base', base, '--out', out], { cwd: dir, stdio: 'inherit', shell: process.platform === 'win32' })
  if (r.status !== 0) process.exit(r.status ?? 1)
} finally {
  rmSync(tmp, { force: true })
}
rmSync(resolve(out, 'nimbledeck.json'), { force: true })   // holds the runner token: never publish it
console.log(`web edition ready in ${out}`)
