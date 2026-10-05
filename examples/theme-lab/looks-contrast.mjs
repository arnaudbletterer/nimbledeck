// Prints the contrast of every look as a Markdown table (the one in docs/THEMING.md): node looks-contrast.mjs
// Ratios are WCAG contrast of the colours in packages/theme/styles/index.css. Text pairs need 4.5, high-contrast needs 7, chart marks need 3.
import { readFileSync } from 'node:fs'
import { contrast, lookTokens, PAIRS } from '../../packages/theme/looks-lib.mjs'

const css = readFileSync(new URL('../../packages/theme/styles/index.css', import.meta.url), 'utf8')
const looks = JSON.parse(readFileSync(new URL('../../packages/theme/looks.json', import.meta.url), 'utf8'))
const pick = (names) => PAIRS.filter(([n]) => names.includes(n))
const cols = [
  ['Body', ['ink on page']], ['Muted', ['muted on page']], ['Accent', ['accent on page']], ['On surface', ['ink on surface', 'muted on surface']],
  ['Cover', ['cover text on cover']], ['Answers', ['ink on right answer', 'ink on wrong answer', 'right answer mark', 'wrong answer mark']],
  ['Charts', ['chart 1 on page', 'chart 2 on page', 'chart 3 on page', 'chart 4 on page']],
]
const rows = []
for (const l of looks) {
  const t = lookTokens(css, l.id)
  const cells = cols.map(([, names]) => {
    const rs = pick(names).map(([, fg, bg]) => contrast(t[fg], t[bg]))
    return Math.min(...rs).toFixed(1)
  })
  rows.push(`| \`${l.id}\` | ${cells.join(' | ')} |`)
}
console.log(`| Look | ${cols.map(([c]) => c).join(' | ')} |\n|---|${cols.map(() => '---:|').join('')}\n${rows.join('\n')}`)
console.log('\nEach cell is the lowest ratio of its group: Body is ink on the page, Muted is muted text on the page, On surface is ink and muted on the card colour, Answers covers the quiz tints, Charts is the weakest of the four chart colours on the page.')
