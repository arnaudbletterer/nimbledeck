import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join, resolve } from 'node:path'

const BUILTIN = ['default', 'cover', 'center', 'end', 'full', 'iframe', 'iframe-left', 'iframe-right', 'image', 'image-left', 'image-right', 'intro', 'none', 'quote', 'section', 'statement', 'fact', 'two-cols', 'two-cols-header']

const vueNames = (dir) => (existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith('.vue')).map((f) => f.slice(0, -4)) : [])
const list = (v) => String(v || '').replace(/[[\]'" ]/g, '').split(',').filter(Boolean)

// Slidev resolves `theme: foo` to the package `slidev-theme-foo` (or `foo` itself), addons likewise.
function resolvePackage(req, root, name, prefix) {
  if (name.startsWith('.')) return resolve(root, name)
  const candidates = name.startsWith('@') || name.startsWith(prefix) ? [name] : [prefix + name, name]
  for (const c of candidates) {
    try { return dirname(req.resolve(`${c}/package.json`)) } catch { /* try next */ }
  }
  return null
}

// Every layout name usable by a deck: its own layouts/, its theme's, its addons' (including the addons the
// theme declares in its defaults), and Slidev's built-ins.
export function knownLayouts(root, head) {
  const names = new Set([...BUILTIN, ...vueNames(join(root, 'layouts'))])
  const req = createRequire(join(root, 'noop.js'))
  const dirs = []
  const theme = head.theme && head.theme !== 'none' ? resolvePackage(req, root, head.theme, 'slidev-theme-') : null
  if (theme) {
    dirs.push(theme)
    try {
      const pkg = JSON.parse(readFileSync(join(theme, 'package.json'), 'utf8'))
      for (const a of pkg.slidev?.defaults?.addons || []) dirs.push(resolvePackage(createRequire(join(theme, 'noop.js')), theme, a, 'slidev-addon-'))
    } catch { /* theme without package.json: skip */ }
  }
  for (const a of list(head.addons)) dirs.push(resolvePackage(req, root, a, 'slidev-addon-'))
  for (const d of dirs.filter(Boolean)) vueNames(join(d, 'layouts')).forEach((n) => names.add(n))
  return names
}
