// Serves the built site/ under its real base path, so a preview behaves like GitHub Pages.
// Usage: node website/preview.mjs [port]        (default 4173; run `npm run docs:build` first)
import { existsSync, readFileSync, statSync } from 'node:fs'
import { createServer } from 'node:http'
import { extname, join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { root, siteConfig } from './site.mjs'

const dir = resolve(root, 'site')
const { base } = siteConfig()
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.jpg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml', '.mp4': 'video/mp4', '.woff2': 'font/woff2', '.woff': 'font/woff', '.ttf': 'font/ttf', '.xml': 'application/xml', '.txt': 'text/plain' }
const send = (res, status, f) => { res.statusCode = status; res.setHeader('content-type', types[extname(f)] ?? 'application/octet-stream'); res.end(readFileSync(f)) }

// Also used by website/site-e2e.mjs, with port 0 for any free port.
export const serve = (port) => new Promise((ok) => { const server = createServer((req, res) => {
  const path = decodeURIComponent(new URL(req.url, 'http://x').pathname)
  if (!path.startsWith(base)) { res.statusCode = 302; res.setHeader('location', base); return res.end() }
  let f = join(dir, path.slice(base.length))
  if (existsSync(f) && statSync(f).isDirectory()) {
    if (!path.endsWith('/')) { res.statusCode = 301; res.setHeader('location', `${path}/`); return res.end() }   // as GitHub Pages does
    f = join(f, 'index.html')
  }
  if (f.startsWith(dir) && existsSync(f)) return send(res, 200, f)
  send(res, 404, join(dir, '404.html'))
}); server.listen(port, '127.0.0.1', () => ok(server)) })

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const server = await serve(Number(process.argv[2] ?? 4173))
  console.log(`http://127.0.0.1:${server.address().port}${base}`)
}
