<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from 'vue'
import { useActive } from '../composables/useActive'

// Slot content that tilts in 3D toward the pointer (8 degrees at most) with a soft sheen that follows it:
// <Tilt> ... </Tilt>. The loop runs only while the pointer is over it or the card is settling back. Off for reduced motion.
const MAX = 8
const root = ref<HTMLElement>()
const card = ref<HTMLElement>()
const reduce = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches
const active = useActive()
let raf = 0, last = 0
let rx = 0, ry = 0, tx = 0, ty = 0, mx = 50, my = 50, tmx = 50, tmy = 50, lift = 0, tl = 0

function paint() {
  const c = card.value; if (!c) return
  c.style.transform = `perspective(1100px) rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg) scale(${(1 + lift * 0.02).toFixed(4)})`
  c.style.setProperty('--nd-mx', mx.toFixed(1) + '%'); c.style.setProperty('--nd-my', my.toFixed(1) + '%'); c.style.setProperty('--nd-lift', lift.toFixed(3))
}
function frame(now: number) {
  const dt = Math.min(0.05, last ? (now - last) / 1000 : 0); last = now
  const f = 1 - Math.exp(-dt * 9)
  rx += (tx - rx) * f; ry += (ty - ry) * f; mx += (tmx - mx) * f; my += (tmy - my) * f; lift += (tl - lift) * f
  paint()
  if (tl === 0 && Math.abs(rx) + Math.abs(ry) + lift < 0.01) { rx = ry = lift = 0; paint(); raf = 0; return }
  raf = requestAnimationFrame(frame)
}
const wake = () => { if (!raf) { last = 0; raf = requestAnimationFrame(frame) } }
function move(e: PointerEvent) {
  if (reduce || !active.value) return
  const r = root.value?.getBoundingClientRect()
  if (!r || r.width <= 0 || r.height <= 0) return
  const px = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)), py = Math.min(1, Math.max(0, (e.clientY - r.top) / r.height))
  ty = (px - 0.5) * 2 * MAX; tx = -(py - 0.5) * 2 * MAX; tmx = px * 100; tmy = py * 100; tl = 1
  wake()
}
function leave() { tx = ty = 0; tl = 0; wake() }
watch(active, (a) => { if (!a) { cancelAnimationFrame(raf); raf = 0; rx = ry = tx = ty = lift = tl = 0; paint() } })
onBeforeUnmount(() => cancelAnimationFrame(raf))
</script>

<template>
  <div ref="root" class="nd-tilt" data-kind="tilt" @pointermove="move" @pointerleave="leave">
    <div ref="card" class="nd-tilt-card"><slot /><i class="nd-tilt-sheen" aria-hidden="true" /></div>
  </div>
</template>
