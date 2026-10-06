import { ref } from 'vue'

// Switching the whole deck to another look, softly. The deck's own look is remembered once on the root element
// (`data-nd-deck-variant`), so <Looks> and <LookWall> never mistake a look they showed for it, and either can put it back.
// A browser with View Transitions cross-fades the change; elsewhere (and with reduced motion) it is a plain swap.
const root = typeof document !== 'undefined' ? document.documentElement : undefined
const reduce = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches

// Whether a look is dark is declared by the look itself (`--nd-scheme: dark`); a theme without the token keeps the two classic dark names.
const isDark = () => { const s = root ? getComputedStyle(root).getPropertyValue('--nd-scheme').trim() : ''; return s ? s === 'dark' : ['night', 'studio'].includes(root?.dataset.ndVariant ?? '') }

/** Every look id of the theme (`data-nd-looks` on <html>), or the given fallback. */
export function lookIds(fallback: string[] = []): string[] {
  const ids = (typeof document !== 'undefined' && document.documentElement.dataset.ndLooks) || ''
  return ids ? ids.split(',') : fallback
}
export const lookLabel = (id: string) => { const w = id.replace(/-/g, ' '); return w.charAt(0).toUpperCase() + w.slice(1) }

export function useLookSwitch() {
  const shown = ref(root?.dataset.ndVariant ?? '')
  // True while a cross-fade runs. The browser then routes the pointer to the transition, so a component under the pointer
  // sees a pointerleave that is not the viewer leaving: it must ignore it while this is set.
  const busy = ref(false)
  function base() { if (root && !root.dataset.ndDeckVariant) root.dataset.ndDeckVariant = root.dataset.ndVariant ?? 'plain'; return root?.dataset.ndDeckVariant ?? 'plain' }
  function apply(v: string) {
    if (!root) return
    base()
    root.dataset.ndVariant = v
    root.classList.toggle('dark', isDark())
    shown.value = v
  }
  function swap(v: string, soft = true) {
    if (v === shown.value) return
    const d = document as Document & { startViewTransition?: (cb: () => void) => { ready: Promise<unknown>; finished: Promise<unknown>; updateCallbackDone: Promise<unknown> } }
    if (soft && !reduce && d.startViewTransition) {
      // A newer transition skips the one in progress, which rejects its promises with an AbortError: expected, not an error.
      const t = d.startViewTransition(() => apply(v))
      busy.value = true
      t.finished.then(() => { busy.value = false }, () => { busy.value = false })
      for (const p of [t.ready, t.finished, t.updateCallbackDone]) p.catch(() => {})
    } else apply(v)
  }
  /** Put the deck's own look back. */
  function restore(soft = false) { if (root?.dataset.ndDeckVariant) swap(root.dataset.ndDeckVariant, soft) }
  function sync() { base(); shown.value = root?.dataset.ndVariant ?? shown.value }
  return { shown, busy, swap, restore, sync, deck: base }
}
