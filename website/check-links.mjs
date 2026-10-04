// Crawls the built site (site/ by default) and checks every internal link and asset of every HTML page:
//   - it must resolve to a file of the site (a folder means its index.html), and a #fragment must name an id of that page;
//   - it must stay under the site's base path (/nimbledeck/): an address that escapes it is a bug on a project page;
//   - scripts, stylesheets, images, frames, preloads and icons must be local (the site makes no external request).
//   Links of <a> to other hosts are allowed, they are not fetched. Slidev routes ("#/3") are not fragments.
// Usage: node website/check-links.mjs [dir] [--check]     (--check: exit 1 on any problem, as the site build does)
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join, posix, relative, resolve, sep } from 'node:path'
import { root, siteConfig } from './site.mjs'

const dir = resolve(process.argv.slice(2).find((a) => !a.startsWith('--')) ?? join(root, 'site'))
const { base, origin } = siteConfig()
const problems = []
const fail = (page, what, why) => problems.push(`${page}: ${what} (${why})`)

const walk = (d) => readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(join(d, e.name)) : [join(d, e.name)]))
const files = walk(dir)
// Site paths use "/", whatever the OS says.
const urlOf = (f) => base + relative(dir, f).split(sep).join('/')
const cache = new Map()
const idsOf = (f) => cache.get(f) ?? cache.set(f, new Set([...readFileSync(f, 'utf8').matchAll(/\b(?:id|name)=["']([^"']+)["']/g)].map((m) => m[1]))).get(f)

// Where a site path lands on disk, or null.
function target(pathname) {
  if (!pathname.startsWith(base)) return null
  const rel = decodeURIComponent(pathname.slice(base.length))
  for (const c of [rel, posix.join(rel, 'index.html')]) {
    const f = resolve(dir, c)
    if (f.startsWith(dir) && existsSync(f) && statSync(f).isFile()) return f
  }
  return null
}

const ATTRS = /<(a|link|script|img|source|video|audio|iframe|use)\b([^>]*)>/gi
const refs = (html) => {
  const out = []
  for (const m of html.matchAll(ATTRS)) {
    const tag = m[1].toLowerCase(), attrs = m[2]
    const get = (n) => attrs.match(new RegExp(`\\b${n}=["']([^"']*)["']`, 'i'))?.[1]
    const rel = (get('rel') ?? '').toLowerCase()
    if (tag === 'a') { const h = get('href'); if (h != null) out.push({ url: h, asset: false }) }
    else if (tag === 'link') { const h = get('href'); if (h && /(stylesheet|icon|preload|modulepreload|prefetch|manifest)/.test(rel)) out.push({ url: h, asset: true }) }
    else { const u = get('src') ?? get('href') ?? get('xlink:href'); if (u) out.push({ url: u, asset: true }); const ss = get('srcset'); if (ss) for (const p of ss.split(',')) out.push({ url: p.trim().split(/\s+/)[0], asset: true }) }
  }
  // Social cards and the redirect stubs point at addresses too.
  for (const m of html.matchAll(/<meta[^>]+(?:property|name)=["'](?:og:image|og:url|twitter:image)["'][^>]*content=["']([^"']+)["']/gi)) out.push({ url: m[1], asset: false, meta: true })
  for (const m of html.matchAll(/<link[^>]+rel=["']canonical["'][^>]*href=["']([^"']+)["']/gi)) out.push({ url: m[1], asset: false, meta: true })
  for (const m of html.matchAll(/http-equiv=["']refresh["'][^>]*content=["']\d+;\s*url=([^"']+)["']/gi)) out.push({ url: m[1], asset: false })
  return out
}

let pages = 0, checked = 0
for (const file of files.filter((f) => f.endsWith('.html'))) {
  pages++
  const page = urlOf(file)
  const html = readFileSync(file, 'utf8')
  const stub = html.includes('http-equiv="refresh"')
  for (const { url, asset, meta } of refs(html)) {
    if (/^(mailto:|tel:|data:|javascript:|blob:)/i.test(url) || url === '' || url.startsWith('#/')) continue
    let u
    try { u = new URL(url.replace(/&amp;/g, '&'), origin + page) } catch { fail(page, url, 'not a valid address'); continue }
    // The canonical and social addresses are absolute on the public origin: check them against the files.
    if (u.origin !== origin) { if (asset) fail(page, url, 'external asset: the site must work with no connection'); continue }
    checked++
    if (!u.pathname.startsWith(base)) { fail(page, url, `escapes ${base}`); continue }
    const f = target(u.pathname)
    if (!f) { fail(page, url, 'not found'); continue }
    if (u.hash && !meta && !file.endsWith('404.html') && f.endsWith('.html') && !idsOf(f).has(decodeURIComponent(u.hash.slice(1)))) fail(page, url, 'no such anchor')
  }
  if (!stub && !/<title>[^<]+<\/title>/.test(html) && !file.endsWith('404.html')) fail(page, 'no <title>', 'every page needs one')
}
for (const must of ['index.html', 'docs/index.html', 'playground/index.html', 'robots.txt', 'sitemap.xml', '404.html', 'social.jpg'])
  if (!existsSync(join(dir, must))) fail('site', must, 'missing')

console.log(`link check: ${pages} pages, ${checked} internal links and assets, ${problems.length} problems`)
for (const p of problems.slice(0, 60)) console.log(`  ${p}`)
if (problems.length > 60) console.log(`  ... and ${problems.length - 60} more`)
if (problems.length && process.argv.includes('--check')) process.exit(1)
