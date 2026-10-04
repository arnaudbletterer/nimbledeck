<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from 'vue'
import { useActive } from '../composables/useActive'

// A soft pool of accent light that follows the pointer over its content, and drifts slowly by itself when the pointer is
// away: <Spotlight> ... </Spotlight>. One rAF while the slide is on screen, one compositor-only transform per frame.
const SIZE = 800
const root = ref<HTMLElement>()
const glow = ref<HTMLElement>()
const reduce = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches
const active = useActive()
let raf = 0, last = 0, t = 0
let w = 1280, h = 720                                   // the box in slide units (offset sizes ignore the slide's scale)
let x = 640, y = 360, tx = 640, ty = 360, lastMove = -1e9, level = 0

function measure() { const e = root.value; if (e && e.offsetWidth > 0 && e.offsetHeight > 0) { w = e.offsetWidth; h = e.offsetHeight } }
function move(e: PointerEvent) {
  const r = root.value?.getBoundingClientRect()
  if (!r || r.width <= 0 || r.height <= 0) return
  measure()
  tx = ((e.clientX - r.left) / r.width) * w; ty = ((e.clientY - r.top) / r.height) * h
  lastMove = performance.now()
}
function frame(now: number) {
  const dt = Math.min(0.05, last ? (now - last) / 1000 : 0); last = now; t += dt
  const near = now - lastMove < 2200
  if (!near) { tx = w * (0.5 + 0.32 * Math.sin(t * 0.37)); ty = h * (0.5 + 0.3 * Math.sin(t * 0.51 + 1.3)) }
  const f = 1 - Math.exp(-dt * (near ? 9 : 1.6))
  x += (tx - x) * f; y += (ty - y) * f
  level += ((near ? 1 : 0.7) - level) * (1 - Math.exp(-dt * 3))
  const g = glow.value
  if (g) { g.style.transform = `translate3d(${(x - SIZE / 2).toFixed(1)}px, ${(y - SIZE / 2).toFixed(1)}px, 0)`; g.style.opacity = level.toFixed(3) }
  raf = requestAnimationFrame(frame)
}
watch(active, (a) => {
  cancelAnimationFrame(raf); last = 0; lastMove = -1e9
  if (!a) return
  measure(); x = tx = w / 2; y = ty = h / 2
  if (reduce) { const g = glow.value; if (g) g.style.transform = `translate3d(${w / 2 - SIZE / 2}px, ${h / 2 - SIZE / 2}px, 0)`; return }
  raf = requestAnimationFrame(frame)
}, { immediate: true, flush: 'post' })
onBeforeUnmount(() => cancelAnimationFrame(raf))
</script>

<template>
  <div ref="root" class="nd-spotlight" data-kind="spotlight" @pointermove="move">
    <slot />
    <i ref="glow" class="nd-spot-glow" aria-hidden="true" />
  </div>
</template>
