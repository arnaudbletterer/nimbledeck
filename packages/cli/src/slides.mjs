// Split a Slidev markdown file into slides, honoring per-slide frontmatter and fenced code.
const YAML_LINE = /^[A-Za-z_][\w-]*:\s*.*$/

export function parseHeadmatter(text) {
  const m = text.match(/^---\n([\s\S]*?)\n---/)
  const out = {}
  if (m) for (const line of m[1].split('\n')) { const k = line.match(/^([\w-]+):\s*(.*)$/); if (k) out[k[1]] = k[2] }
  return out
}

export function splitSlides(text) {
  const lines = text.split('\n'), slides = []
  let i = 0, cur = null, fence = false
  const flush = () => { if (cur) slides.push(cur) }
  while (i < lines.length) {
    const ln = lines[i]
    if (/^\s*(```|~~~)/.test(ln)) fence = !fence
    if (ln.trim() === '---' && !fence) {
      let j = i + 1
      while (j < lines.length && (YAML_LINE.test(lines[j]) || !lines[j].trim())) j++
      if (j < lines.length && lines[j].trim() === '---' && j > i + 1) {
        const fm = {}
        for (const l of lines.slice(i + 1, j)) { const k = l.match(/^([\w-]+):\s*(.*)$/); if (k) fm[k[1]] = k[2] }
        flush(); cur = { line: i + 1, fm, body: [] }; i = j + 1; continue
      }
      flush(); cur = { line: i + 1, fm: {}, body: [] }; i++; continue
    }
    if (!cur) cur = { line: 1, fm: {}, body: [] }
    cur.body.push(ln); i++
  }
  flush()
  // A deck's first block is the headmatter: it belongs to slide 1.
  return slides.map((s) => ({ ...s, body: s.body.join('\n') }))
}
