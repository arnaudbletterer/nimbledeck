<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useNav, useSlideContext } from '@slidev/client'
import { useActive } from '../composables/useActive'

// A look switcher: the same slide in every look of the theme, live. <Looks /> shows a row of chips; when its slide
// appears it steps through the looks by itself (plain, paper, night, studio light, studio), each change a soft cross-fade
// (View Transitions where the browser has them, a plain swap elsewhere). Click a chip or press 1 to 5 to pick one, which
// stops the tour. Leaving the slide puts the deck's own look back. `looks` lists the ndVariant names, `interval` is ms per
// look, `delay` ms before the tour starts, `auto="false"` turns the tour off. Reduced motion keeps the deck's look.
const props = withDefaults(defineProps<{ looks?: string[]; interval?: number; delay?: number; auto?: boolean }>(), {
  looks: () => ['plain', 'paper', 'night', 'studio-light', 'studio'], interval: 1600, delay: 1500, auto: true,
})
const NAMES: Record<string, string> = { plain: 'Plain', paper: 'Paper', night: 'Night', studio: 'Studio', 'studio-light': 'Studio light' }
const DARK = new Set(['night', 'studio'])           // the looks the theme pairs with Slidev's dark code theme (see setup/main.ts)
const reduce = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches
const active = useActive()
const { currentPage } = useNav()
const { $page } = useSlideContext()
const here = computed(() => $page.value === currentPage.value)    // the slide itself, with no linger: the next slide must not inherit our look
const root = typeof document !== 'undefined' ? document.documentElement : undefined
const shown = ref(root?.dataset.ndVariant ?? '')
let timer = 0

// The deck's own look is remembered once, on the root element, so that two Looks components never mistake a look of the tour for it.
function base() { if (root && !root.dataset.ndDeckVariant) root.dataset.ndDeckVariant = root.dataset.ndVariant ?? 'plain'; return root?.dataset.ndDeckVariant ?? 'plain' }
function apply(v: string) {
  if (!root) return
  base()
  root.dataset.ndVariant = v
  root.classList.toggle('dark', DARK.has(v))
  shown.value = v
}
function swap(v: string, soft = true) {
  if (v === shown.value) return
  const d = document as Document & { startViewTransition?: (cb: () => void) => unknown }
  if (soft && !reduce && d.startViewTransition) d.startViewTransition(() => apply(v)); else apply(v)
}
function stop() { clearTimeout(timer); timer = 0 }
function tour(i: number) {
  if (i >= props.looks.length) return
  swap(props.looks[i])
  timer = window.setTimeout(() => tour(i + 1), props.interval)
}
function choose(i: number) { stop(); swap(props.looks[i]) }
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
  if (Number.isInteger(i) && i >= 0 && i < props.looks.length) { choose(i); e.preventDefault() }
}
onMounted(() => window.addEventListener('keydown', onKey))
onBeforeUnmount(() => { window.removeEventListener('keydown', onKey); stop(); if (here.value) restore() })
</script>

<template>
  <div class="nd-looks" data-kind="looks" role="radiogroup" aria-label="Look">
    <button v-for="(l, i) in looks" :key="l" type="button" role="radio" class="nd-look" :class="{ 'nd-look-on': shown === l }" :aria-checked="shown === l" @click.stop="choose(i)" @keydown.enter.stop @keydown.space.stop>
      <kbd>{{ i + 1 }}</kbd>{{ NAMES[l] ?? l }}
    </button>
    <span class="nd-sr" role="status" aria-live="polite">{{ NAMES[shown] ?? shown }}</span>
  </div>
</template>
