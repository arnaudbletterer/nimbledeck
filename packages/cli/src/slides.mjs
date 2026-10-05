// Split a Slidev markdown file into slides, honoring per-slide frontmatter and fenced code.
// Each slide has `line` (1-based line of its opening `---`, or 1 for a first slide without one), `fmEnd` (1-based line of the
// `---` that closes its frontmatter, 0 when it has none), `fm` (the frontmatter keys) and `body` (the text after it).
const YAML_LINE = /^[A-Za-z_][\w-]*:\s*.*$/
// A list or nested value under a key (the tour script): indented, or a dash at the margin.
const YAML_MORE = /^(\s+\S.*|-\s.*)$/

// Decks written on Windows use CRLF: normalise so every pattern below can rely on "\n".
export const normalize = (text) => text.replace(/\r\n?/g, '\n')

export function parseHeadmatter(text) {
  text = normalize(text)
  const m = text.match(/^---\n([\s\S]*?)\n---/)
  const out = {}
  if (m) for (const line of m[1].split('\n')) { const k = line.match(/^([\w-]+):\s*(.*)$/); if (k) out[k[1]] = k[2] }
  return out
}

export function splitSlides(text) {
  const lines = normalize(text).split('\n'), slides = []
  let i = 0, cur = null, fence = false
  const flush = () => { if (cur) slides.push(cur) }
  while (i < lines.length) {
    const ln = lines[i]
    if (/^\s*(```|~~~)/.test(ln)) fence = !fence
    if (ln.trim() === '---' && !fence) {
      let j = i + 1
      let keyed = false
      while (j < lines.length && (YAML_LINE.test(lines[j]) || !lines[j].trim() || (keyed && YAML_MORE.test(lines[j])))) { if (YAML_LINE.test(lines[j])) keyed = true; j++ }
      if (j < lines.length && lines[j].trim() === '---' && j > i + 1) {
        const fm = {}
        for (const l of lines.slice(i + 1, j)) { const k = l.match(/^([\w-]+):\s*(.*)$/); if (k) fm[k[1]] = k[2] }
        flush(); cur = { line: i + 1, fmEnd: j + 1, fm, fmLines: lines.slice(i + 1, j), body: [] }; i = j + 1; continue
      }
      flush(); cur = { line: i + 1, fmEnd: 0, fm: {}, body: [] }; i++; continue
    }
    if (!cur) cur = { line: 1, fmEnd: 0, fm: {}, body: [] }
    cur.body.push(ln); i++
  }
  flush()
  // A deck's first block is the headmatter: it belongs to slide 1.
  return slides.map((s) => ({ ...s, body: s.body.join('\n') }))
}
