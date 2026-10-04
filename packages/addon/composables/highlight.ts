// A small regex highlighter for the Typewriter: md, sh, py, json and html. It yields classes (k keyword, s string, c comment,
// n number, p punctuation, o command output, h heading), which the stylesheet maps to --nd-* tokens.
export interface Token { text: string; cls: string; start: number }

const STR = `"(?:[^"\\\\\\n]|\\\\.)*"|'(?:[^'\\\\\\n]|\\\\.)*'`
const NUM = `\\b\\d[\\d_.]*\\b`
const PY_KW = 'def|class|return|import|from|as|if|elif|else|for|while|in|not|and|or|is|None|True|False|with|try|except|finally|raise|lambda|yield|pass|break|continue|print|await|async'

const RULES: Record<string, [string, string][]> = {
  md: [['c', '<!--[\\s\\S]*?-->'], ['h', '^#{1,6} .*$'], ['k', '\\*\\*[^*\\n]+\\*\\*|__[^_\\n]+__'], ['s', '`[^`\\n]+`'], ['s', '\\[[^\\]\\n]*\\]\\([^)\\n]*\\)'], ['n', '^[ \\t]*(?:[-*+]|\\d+\\.)(?= )'], ['p', '^---$|^>']],
  sh: [['c', '#.*$'], ['s', STR], ['n', '(?<=\\s)--?[A-Za-z][\\w-]*'], ['k', '^\\$ \\S+|^\\S+'], ['p', '[|&;<>]+']],
  py: [['c', '#.*$'], ['s', `"""[\\s\\S]*?"""|${STR}`], ['k', `\\b(?:${PY_KW})\\b`], ['n', NUM], ['p', '[()\\[\\]{}:,.=+*/<>-]+']],
  json: [['k', `"(?:[^"\\\\\\n]|\\\\.)*"(?=\\s*:)`], ['s', STR], ['n', `${NUM}|\\b(?:true|false|null)\\b`], ['p', '[{}\\[\\]:,]+']],
  html: [['c', '<!--[\\s\\S]*?-->'], ['s', STR], ['k', '</?[A-Za-z][\\w-]*|/?>'], ['n', '\\b[\\w:-]+(?==)'], ['p', '=']],
}

const compiled = new Map<string, { re: RegExp; cls: string[] }>()
function rules(lang: string) {
  let r = compiled.get(lang)
  if (!r) {
    const set = RULES[lang]
    r = set ? { re: new RegExp(set.map(([, src]) => `(${src})`).join('|'), 'gm'), cls: set.map(([c]) => c) } : { re: /$^/g, cls: [] }
    compiled.set(lang, r)
  }
  return r
}

// Split one chunk of source into classed runs. Runs of the same class are merged.
function runs(src: string, lang: string, base = ''): { text: string; cls: string }[] {
  const { re, cls } = rules(lang)
  const out: { text: string; cls: string }[] = []
  const push = (text: string, c: string) => { if (!text) return; const l = out[out.length - 1]; if (l && l.cls === c) l.text += text; else out.push({ text, cls: c }) }
  re.lastIndex = 0
  let at = 0, m: RegExpExecArray | null
  while ((m = re.exec(src))) {
    if (!m[0]) { re.lastIndex++; continue }
    push(src.slice(at, m.index), base)
    push(m[0], cls[m.slice(1).findIndex((g) => g !== undefined)])
    at = m.index + m[0].length
  }
  push(src.slice(at), base)
  return out
}

/** Highlight `src`. For sh, a line starting with "$ " is a command and every other line is plain output. */
export function highlight(src: string, lang: string): Token[] {
  const out: Token[] = []
  let at = 0
  const add = (text: string, cls: string) => { if (!text) return; const l = out[out.length - 1]; if (l && l.cls === cls) l.text += text; else out.push({ text, cls, start: at }); at += text.length }
  if (lang === 'sh') {
    src.split('\n').forEach((line, i, all) => {
      const nl = i < all.length - 1 ? '\n' : ''
      if (line.startsWith('$ ')) { add('$ ', 'p'); for (const r of runs(line.slice(2), 'sh')) add(r.text, r.cls); add(nl, '') }
      else add(line + nl, 'o')
    })
  } else for (const r of runs(src, lang)) add(r.text, r.cls)
  return out
}
