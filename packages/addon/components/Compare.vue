<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { asset } from '../composables/asset.mjs'
import { useActive } from '../composables/useActive'

// Before and after images with a draggable divider. Drag anywhere on it, or focus it and use the arrow keys.
// `beforeLabel` and `afterLabel` put a small caption in the top corners. `sweep` glides the divider in from the right
// when the slide appears (a hint that it moves), and stops at the first touch; reduced motion skips it.
// Both images should share one layout (same margins, same lines) so that the divider reads as a restyle.
const props = withDefaults(defineProps<{ before: string; after: string; start?: number; beforeLabel?: string; afterLabel?: string; sweep?: boolean; label?: string }>(), { start: 50, label: 'Before and after' })
const beforeUrl = computed(() => asset(props.before)), afterUrl = computed(() => asset(props.after))   // "/a.jpg" follows the base path
const failed = ref(false)   // a remote image that cannot load (offline) gets a quiet note
const pos = ref(props.start)
const box = ref<HTMLElement>()
const grabbed = ref(false)
let dragging = false
let raf = 0, timer = 0
const reduce = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches
const active = useActive()

function stopSweep() { cancelAnimationFrame(raf); clearTimeout(timer) }
function move(e: PointerEvent) {
  const r = box.value!.getBoundingClientRect()
  if (r.width > 0) pos.value = Math.min(100, Math.max(0, ((e.clientX - r.left) / r.width) * 100))
}
function down(e: PointerEvent) { stopSweep(); dragging = true; grabbed.value = true; try { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId) } catch { /* a pointer the browser does not track, such as a scripted tour's */ }
  move(e) }
function up() { dragging = false; grabbed.value = false }
function key(e: KeyboardEvent) {
  if (e.key === 'ArrowLeft') { stopSweep(); pos.value = Math.max(0, pos.value - 5); e.preventDefault(); e.stopPropagation() }
  if (e.key === 'ArrowRight') { stopSweep(); pos.value = Math.min(100, pos.value + 5); e.preventDefault(); e.stopPropagation() }
}

// The sweep: from 96 % to `start` in 1.5 s with an ease in and out, after a short beat so the slide has settled.
function runSweep() {
  const from = 96, to = props.start, dur = 1500
  pos.value = from
  timer = window.setTimeout(() => {
    const t0 = performance.now()
    const step = (now: number) => {
      const p = Math.min(1, (now - t0) / dur), e = p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2
      pos.value = from + (to - from) * e
      if (p < 1) raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
  }, 700)
}
watch(active, (a) => {
  stopSweep(); pos.value = props.start
  if (a && props.sweep && !reduce) runSweep()
}, { immediate: true })
onBeforeUnmount(stopSweep)
</script>

<template>
  <div ref="box" class="nd-compare" :class="{ 'nd-grabbed': grabbed }" data-kind="compare" :data-pos="Math.round(pos)" tabindex="0" role="slider" :aria-label="label" :aria-valuenow="Math.round(pos)" aria-valuemin="0" aria-valuemax="100"
       @pointerdown.stop="down" @pointermove="dragging && move($event)" @pointerup="up" @keydown="key">
    <img class="nd-cmp-img" :src="afterUrl" alt="" @error="failed = /^https?:/.test(after)">
    <img class="nd-cmp-img nd-cmp-top" :src="beforeUrl" alt="" :style="{ clipPath: `inset(0 ${100 - pos}% 0 0)` }">
    <span v-if="beforeLabel" class="nd-cmp-tag nd-cmp-tag-l" aria-hidden="true">{{ beforeLabel }}</span>
    <span v-if="afterLabel" class="nd-cmp-tag nd-cmp-tag-r" aria-hidden="true">{{ afterLabel }}</span>
    <div v-if="failed" class="nd-site-off"><p>These images are not available offline.</p><code>{{ after }}</code></div>
    <div class="nd-cmp-handle" :style="{ left: pos + '%' }"><span /></div>
  </div>
</template>
