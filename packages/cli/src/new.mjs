import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { basename, dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const TEMPLATE = join(here, '..', 'templates', 'deck')
// npm drops files called .gitignore when it packs a package, so the template stores them without the dot.
const RENAMED = { _gitignore: '.gitignore', _gitattributes: '.gitattributes' }

function* files(dir, base = '') {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const rel = base ? `${base}/${e.name}` : e.name
    if (e.isDirectory()) yield* files(join(dir, e.name), rel)
    else yield rel
  }
}

// Create a ready-to-run deck project in `target`. The deck depends on this checkout of Nimbledeck through file: links
// (Nimbledeck is not on the npm registry), so `source` is the root of that checkout; it defaults to the one this CLI runs from.
// Returns the list of files written. Throws when the target holds anything already.
export function scaffoldDeck(target, { source = resolve(here, '..', '..', '..') } = {}) {
  const dest = resolve(target)
  if (existsSync(dest) && readdirSync(dest).length) throw new Error(`${target} is not empty, refusing to overwrite it`)
  if (!existsSync(join(source, 'packages', 'theme', 'package.json'))) throw new Error(`${source} is not a Nimbledeck checkout (packages/theme not found)`)
  mkdirSync(dest, { recursive: true })
  const name = basename(dest).toLowerCase().replace(/[^a-z0-9._-]+/g, '-').replace(/^[-._]+/, '') || 'deck'
  const src = relative(dest, source).split('\\').join('/')
  const written = []
  for (const rel of files(TEMPLATE)) {
    const out = rel.split('/').map((p) => RENAMED[p] ?? p).join('/')
    const text = readFileSync(join(TEMPLATE, rel), 'utf8').replaceAll('{{NAME}}', name).replaceAll('{{SOURCE}}', src)
    mkdirSync(dirname(join(dest, out)), { recursive: true })
    writeFileSync(join(dest, out), text)
    written.push(out)
  }
  return written
}
