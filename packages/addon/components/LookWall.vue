<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useNav, useSlideContext } from '@slidev/client'
import { useActive } from '../composables/useActive'
import { useEntered } from '../composables/useEntered'
import { lookIds, lookLabel, useLookSwitch } from '../composables/lookSwitch'

// Every look of the theme at once: a grid of small cards, each a mock slide (title, a bullet, a callout, chips) that
// takes its colours from its own look, because the look tokens are defined on any element that carries `data-nd-variant`.
// The cards cascade in when the slide appears; a ring then tours them by itself. Hover a card to see the whole slide in
// that look, click it to keep that look. Leaving the slide puts the deck's own look back. `looks` lists ids (default: all
// of the theme), `cols` is the column count (default: the one that fills a wide slide, 5 for 20 cards), `tour` is the ms the
// ring stays on a card (0 turns it off), `delay` the ms before the tour starts. Cheap on purpose: the cards are plain CSS,
// only the ring's pointer is script. Reduced motion shows the grid at once, with no ring tour.
const props = withDefaults(defineProps<{ looks?: string[] | string; cols?: number; tour?: number; delay?: number }>(), { tour: 1300, delay: 1400 })
const GAP = 14
const reduce = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches
const list = computed<string[]>(() => {
  if (Array.isArray(props.looks)) return props.looks
  if (props.looks && props.looks !== 'all') return String(props.looks).split(',').map((s) => s.trim()).filter(Boolean)
  return lookIds(['plain', 'paper', 'night', 'studio', 'studio-light', 'editorial', 'swiss', 'neon'])
})
const cols = computed(() => props.cols ?? Math.max(1, Math.round(Math.sqrt(list.value.length * 1.2))))
const active = useActive()
const on = useEntered(active)
const { currentPage } = useNav()
const { $page } = useSlideContext()
const here = computed(() => $page.value === currentPage.value)
const { shown, busy, swap, restore, sync } = useLookSwitch()
const hot = ref(0)                 // the card the ring is on
const pinned = ref('')             // the look a click chose
const wall = ref<HTMLElement>()
let timer = 0, hover = 0, paused = false, real = false   // `real`: the last pointer was a viewer's, not the tour's

// The ring visits the cards in jumps (a stride that reaches every card once), so the eye is pulled across the whole wall.
const stride = computed(() => { const n = list.value.length; const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a); return [7, 5, 3, 1].find((s) => gcd(s, n) === 1) ?? 1 })
function step() { hot.value = (hot.value + stride.value) % Math.max(1, list.value.length) }
function stop() { clearInterval(timer); timer = 0; clearTimeout(hover) }
function start() { stop(); if (!reduce && props.tour > 0) timer = window.setInterval(() => { if (!paused) step() }, props.tour) }

watch(active, (a) => {
  stop()
  if (!a || !here.value) return
  sync(); pinned.value = ''; hot.value = 0
  if (!reduce && props.tour > 0) timer = window.setTimeout(start, props.delay)
}, { immediate: true })
watch(here, (h) => { if (!h) { stop(); pinned.value = ''; restore() } })

function preview(i: number, e?: Event) { real = !!e?.isTrusted; paused = true; hot.value = i; clearTimeout(hover); hover = window.setTimeout(() => swap(list.value[i]), 90) }
function choose(i: number, e?: MouseEvent) {
  if (e?.detail) (e.currentTarget as HTMLElement | null)?.blur()          // a mouse click must not keep the arrow keys from turning the page
  clearTimeout(hover); pinned.value = list.value[i]; hot.value = i; swap(list.value[i])
}
// A pointerleave during a cross-fade is the browser handing the pointer to the transition, not the viewer leaving.
function leave() {
  if (busy.value) return
  paused = false; clearTimeout(hover)
  hover = window.setTimeout(() => { if (!busy.value) pinned.value ? swap(pinned.value) : restore(true) }, 120)
}
// If the viewer left while the cross-fade ran, that leave was ignored: catch up once it is over.
watch(busy, (b) => { if (!b && real && wall.value && !wall.value.matches(':hover')) leave() })
onBeforeUnmount(() => { stop(); if (here.value) restore() })

const ring = computed(() => ({ '--c': hot.value % cols.value, '--r': Math.floor(hot.value / cols.value) }))
</script>

<template>
  <div ref="wall" class="nd-lw" :class="{ 'nd-lw-on': on || reduce, 'nd-lw-tour': !reduce && props.tour > 0 }" data-kind="lookwall" role="group" aria-label="Looks"
    :style="{ '--cols': cols, '--gap': GAP + 'px' }" @pointerleave="leave">
    <button v-for="(id, i) in list" :key="id" type="button" class="nd-lw-card" :class="{ 'nd-lw-hot': hot === i, 'nd-lw-now': shown === id }"
      :data-nd-variant="id" :style="{ '--i': i }" :aria-pressed="shown === id" :aria-label="lookLabel(id)"
      @pointerover="preview(i, $event)" @click.stop="choose(i, $event)" @keydown.enter.stop @keydown.space.stop @focus="paused = true" @blur="paused = false">
      <span class="nd-lw-bar" />
      <span class="nd-lw-in">
        <span class="nd-lw-title">{{ lookLabel(id) }}</span>
        <span class="nd-lw-sub">Same words, new look</span>
        <span class="nd-lw-li"><i />One idea per slide</span>
        <span class="nd-lw-quote">A callout</span>
        <span class="nd-lw-chips"><b>Aa</b><u /><u /></span>
      </span>
      <span v-if="shown === id" class="nd-lw-dot" />
    </button>
    <span class="nd-lw-ring" :style="ring" :data-nd-variant="list[hot]" aria-hidden="true" />
    <span class="nd-sr" role="status" aria-live="polite">{{ lookLabel(shown) }}</span>
  </div>
</template>
