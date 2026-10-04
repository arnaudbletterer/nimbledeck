// A file in the deck's public/ folder is written as "/loop.mp4" in Markdown. A deck built for a sub-path (slidev build
// --base /demos/showcase/) is not served from "/", so a root-relative address would ask the wrong server path and get a 404.
// This puts the base in front of such an address; anything else (a relative path, a full URL, a data: URI) is left alone.
export function asset(src, base = import.meta.env?.BASE_URL ?? '/') {
  if (!src || !src.startsWith('/') || src.startsWith('//')) return src
  const b = base.endsWith('/') ? base : base + '/'
  return src.startsWith(b) && b !== '/' ? src : b + src.slice(1)
}
