import Fuse from 'fuse.js'
import { ref } from 'vue'

export const paletteOpen = ref(false)
export const helpOpen = ref(false)

export interface Entry { no: number; title: string; text: string; note: string; route: any }
export interface Hit { entry: Entry; score: number; ranges: [number, number][] }

// Slide Markdown to searchable words: drop the frontmatter, component tags and attributes, and Markdown punctuation.
export function plain(src: string): string {
  return (src || '')
    .replace(/^---\n[\s\S]*?\n---\n?/, '')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/```[a-z]*\n?/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/[#*`|>_~\[\]\(\)]/g, ' ')
    .replace(/^\s*[-+]\s+/gm, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function entriesFrom(slides: any[]): Entry[] {
  return slides.map((route, i) => {
    const m = route.meta?.slide ?? {}
    // `content` holds the slide's Markdown in `nimbledeck run`; a static build blanks it, so only the title and notes remain.
    return { no: m.no ?? i + 1, title: m.title ?? '', text: plain(m.content ?? ''), note: plain(m.note ?? ''), route }
  })
}

export function makeSearch(entries: Entry[]) {
  const fuse = new Fuse(entries, {
    keys: [{ name: 'title', weight: 3 }, { name: 'text', weight: 1 }, { name: 'note', weight: 0.6 }],
    threshold: 0.34, ignoreLocation: true, includeMatches: true, includeScore: true, minMatchCharLength: 2,
  })
  // Every word of the query must match somewhere in the slide, in any order: "cut off title" finds a slide with those words.
  return (query: string): Hit[] => {
    const q = query.trim()
    if (!q) return entries.map((entry) => ({ entry, score: 0, ranges: [] }))
    if (/^\d+$/.test(q)) return entries.filter((e) => String(e.no).startsWith(q)).map((entry) => ({ entry, score: 0, ranges: [] }))
    let acc: Map<number, Hit> | null = null
    for (const token of q.split(/\s+/)) {
      const found = new Map<number, Hit>()
      for (const r of fuse.search(token)) {
        const ranges = (r.matches ?? []).filter((m) => m.key === 'text').flatMap((m) => m.indices.map((x) => [x[0], x[1]] as [number, number]))
        found.set(r.item.no, { entry: r.item, score: r.score ?? 0, ranges })
      }
      acc = acc === null ? found : new Map([...acc].filter(([no]) => found.has(no)).map(([no, h]) => [no, { entry: h.entry, score: h.score + found.get(no)!.score, ranges: [...h.ranges, ...found.get(no)!.ranges] }]))
    }
    return [...(acc ?? new Map()).values()].sort((a, b) => a.score - b.score || a.entry.no - b.entry.no)
  }
}

// A short excerpt of the slide text around the best match, as segments to highlight.
export function snippet(h: Hit, width = 90): { text: string; hit: boolean }[] {
  const t = h.entry.text
  if (!t) return []
  const best = [...h.ranges].sort((a, b) => b[1] - b[0] - (a[1] - a[0]))[0]
  const start = Math.max(0, (best ? best[0] : 0) - 24), end = Math.min(t.length, start + width)
  const inside = h.ranges.filter(([a, b]) => a >= start && b < end).sort((a, b) => a[0] - b[0])
  const out: { text: string; hit: boolean }[] = []
  let at = start
  for (const [a, b] of inside) { if (a < at) continue; if (a > at) out.push({ text: t.slice(at, a), hit: false }); out.push({ text: t.slice(a, b + 1), hit: true }); at = b + 1 }
  if (at < end) out.push({ text: t.slice(at, end), hit: false })
  if (start > 0) out.unshift({ text: '… ', hit: false })
  if (end < t.length) out.push({ text: ' …', hit: false })
  return out
}

export const isEditable = (el: EventTarget | null) => {
  const e = el as HTMLElement | null
  return !!e && (e.tagName === 'INPUT' || e.tagName === 'TEXTAREA' || e.tagName === 'SELECT' || e.isContentEditable)
}
