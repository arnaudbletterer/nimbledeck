// The one place that knows where the site lives. zensical.toml holds the address of the documentation
// (https://<user>.github.io/<repository>/docs/); everything else (the deck at the root, the links, the sitemap) derives from it.
// Env DEMO_BASE overrides only the path, to serve a build somewhere else for a test.
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

export const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')

export function siteConfig() {
  const docsUrl = readFileSync(resolve(root, 'zensical.toml'), 'utf8').match(/^site_url\s*=\s*"([^"]+)"/m)?.[1]
  if (!docsUrl?.endsWith('/docs/')) throw new Error('zensical.toml: site_url must be the documentation address and end with /docs/')
  const origin = new URL(docsUrl).origin
  const base = process.env.DEMO_BASE ?? new URL(docsUrl).pathname.replace(/docs\/$/, '')
  return { origin, base, url: origin + base, github: 'https://github.com/arnaudbletterer/nimbledeck' }
}
