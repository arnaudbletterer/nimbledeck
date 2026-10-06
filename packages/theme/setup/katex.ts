import { defineKatexSetup } from '@slidev/types'

// Equations are LaTeX in the Markdown ($...$ and $$...$$, docs/EQUATIONS.md). KaTeX renders them at build time with its own
// fonts, served from the deck's files, so a deck needs no network and no setup of its own.
//
// Two macros let an author colour and link the parts of an equation without any CSS:
//   \term{1}{\sigma(y-x)}    colours the part with chart colour 1 to 4 (5 and 6 are the accent colours) and names it "1"
//   \val{sigma}{10}          a number that <Equation> keeps in step with a slider named "sigma"; 10 is what shows without one
// Both use \htmlClass and \htmlData, the only two commands KaTeX is allowed to trust (they cannot run script or set a style).
const TRUSTED = new Set(['\\htmlClass', '\\htmlData'])

export default defineKatexSetup(() => ({
  throwOnError: false,
  trust: (context: { command: string }) => TRUSTED.has(context.command),
  macros: {
    '\\term': '\\htmlClass{nd-tm nd-t#1}{\\htmlData{term=#1}{#2}}',
    '\\val': '\\htmlClass{nd-val}{\\htmlData{val=#1}{#2}}',
    '\\d': '\\mathrm{d}',
  },
}))
