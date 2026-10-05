<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useNav, useSlideContext } from '@slidev/client'
import { useActive } from '../composables/useActive'

// A look switcher: the same slide in several looks of the theme, live. <Looks /> shows a row of chips; when its slide
// appears it steps through a curated tour (plain, paper, night, studio light, studio, editorial, swiss, neon), each change
// a soft cross-fade (View Transitions where the browser has them, a plain swap elsewhere). Click a chip or press 1 to 9 to
// pick one, which stops the tour. Leaving the slide puts the deck's own look back. `looks` lists any ndVariant ids (or is
// "all" for every look of the theme, which makes a tall row: give it room), `interval` is ms per look, `delay` ms before
// the tour starts, `auto="false"` turns the tour off. Reduced motion keeps the deck's look.
const TOUR = ['plain', 'paper', 'night', 'studio-light', 'studio', 'editorial', 'swiss', 'neon']
const props = withDefaults(defineProps<{ looks?: string[] | string; interval?: number; delay?: number; auto?: boolean }>(), {
  looks: () => TOUR, interval: 1600, delay: 1500, auto: true,
})
// The theme lists its looks on the root element (setup/main.ts); a theme without the list has no "all".
const list = computed<string[]>(() => {
  if (props.looks !== 'all') return Array.isArray(props.looks) ? props.looks : String(props.looks).split(',').map((s) => s.trim()).filter(Boolean)
  const ids = (typeof document !== 'undefined' && document.documentElement.dataset.ndLooks) || ''
  return ids ? ids.split(',') : TOUR
})
const name = (id: string) => { const w = id.replace(/-/g, ' '); return w.charAt(0).toUpperCase() + w.slice(1) }
const reduce = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches
const active = useActive()
const { currentPage } = useNav()
const { $page } = useSlideContext()
const here = computed(() => $page.value === currentPage.value)    // the slide itself, with no linger: the next slide must not inherit our look
const root = typeof document !== 'undefined' ? document.documentElement : undefined
// Whether a look is dark is declared by the look itself (`--nd-scheme: dark` in the theme stylesheet); a theme without the
// token keeps the two classic dark names.
const isDark = () => { const s = root ? getComputedStyle(root).getPropertyValue('--nd-scheme').trim() : ''; return s ? s === 'dark' : ['night', 'studio'].includes(root?.dataset.ndVariant ?? '') }
const shown = ref(root?.dataset.ndVariant ?? '')
let timer = 0

// The deck's own look is remembered once, on the root element, so that two Looks components never mistake a look of the tour for it.
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
    for (const p of [t.ready, t.finished, t.updateCallbackDone]) p.catch(() => {})
  } else apply(v)
}
function stop() { clearTimeout(timer); timer = 0 }
function tour(i: number) {
  if (i >= list.value.length) return
  swap(list.value[i])
  timer = window.setTimeout(() => tour(i + 1), props.interval)
}
function choose(i: number) { stop(); swap(list.value[i]) }
function restore() { stop(); if (root?.dataset.ndDeckVariant) apply(root.dataset.ndDeckVariant) }

watch(here, (h) => { if (!h) restore() })
watch(active, (a) => {
  stop()
  if (!a || !here.value) return
  base(); shown.value = root?.dataset.ndVariant ?? shown.value
  if (props.auto && !reduce) timer = window.setTimeout(() => tour(0), props.delay)
}, { immediate: true })

const onKey = (e: KeyboardEvent) => {
  if (!here.value || e.metaKey || e.ctrlKey || e.altKey) return
  const t = e.target as HTMLElement | null
  if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return
  const i = Number(e.key) - 1
  if (Number.isInteger(i) && i >= 0 && i < Math.min(9, list.value.length)) { choose(i); e.preventDefault() }
}
onMounted(() => window.addEventListener('keydown', onKey))
onBeforeUnmount(() => { window.removeEventListener('keydown', onKey); stop(); if (here.value) restore() })
</script>

<template>
  <div class="nd-looks" :class="{ 'nd-looks-dense': list.length > 6 }" data-kind="looks" role="radiogroup" aria-label="Look">
    <button v-for="(l, i) in list" :key="l" type="button" role="radio" class="nd-look" :class="{ 'nd-look-on': shown === l }" :aria-checked="shown === l" @click.stop="choose(i)" @keydown.enter.stop @keydown.space.stop>
      <kbd v-if="i < 9">{{ i + 1 }}</kbd>{{ name(l) }}
    </button>
    <span class="nd-sr" role="status" aria-live="polite">{{ name(shown) }}</span>
  </div>
</template>
