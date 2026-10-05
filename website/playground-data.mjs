// What the playground needs to run offline, packed into one object (written to playground/data.json by build.mjs, and
// read by playground-e2e.mjs): the real layouts, the sample deck, the theme CSS, and the two registries of the theme
// (presets.json: motions and backgrounds; looks.json). A registry that does not exist yet is null and the playground
// falls back to what it knows (see FALLBACK in docs/playground/playground.js).
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { root } from './site.mjs'

const read = (...p) => readFileSync(resolve(root, ...p), 'utf8')
const registry = (name) => (existsSync(resolve(root, 'packages/theme', name)) ? JSON.parse(read('packages/theme', name)) : null)

export function playgroundData() {
  const layoutDir = resolve(root, 'packages/theme/layouts')
  const layouts = Object.fromEntries(readdirSync(layoutDir).sort().map((f) => [f.replace(/\.vue$/, ''), read('packages/theme/layouts', f)]))
  layouts['my-layout'] = read('website/presets/my-layout.vue')
  const tokens = read('packages/addon/styles/index.css').match(/:where\(:root\) \{[^}]*\}/)[0]
  // index.css first, then any other stylesheet of the theme (a preset library may live in a file of its own).
  const sheets = ['index.css', ...readdirSync(resolve(root, 'packages/theme/styles')).filter((f) => f.endsWith('.css') && f !== 'index.css').sort()]
  // The motion and background presets live in the addon's stylesheets (imported by its index.css), once they exist.
  const addon = ['motion.css', 'backgrounds.css'].filter((f) => existsSync(resolve(root, 'packages/addon/styles', f))).map((f) => read('packages/addon/styles', f))
  return {
    layouts, slides: read('website/presets/slides.md'),
    css: [tokens, ...addon, ...sheets.map((f) => read('packages/theme/styles', f))].join('\n'),
    presets: registry('presets.json'), looks: registry('looks.json'),
  }
}
