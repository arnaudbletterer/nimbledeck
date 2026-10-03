import { defineMermaidSetup } from '@slidev/types'

// Diagrams follow the active design variant: read the tokens when each diagram renders.
export default defineMermaidSetup(() => {
  const v = (name: string, fallback: string) => getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback
  return {
    theme: 'base',
    themeVariables: {
      primaryColor: v('--nd-surface', '#f3f4f6'),
      primaryBorderColor: v('--nd-ink', '#1f2328'),
      primaryTextColor: v('--nd-ink', '#1f2328'),
      lineColor: v('--nd-ink', '#1f2328'),
      fontFamily: v('--nd-font-body', 'sans-serif'),
    },
  }
})
