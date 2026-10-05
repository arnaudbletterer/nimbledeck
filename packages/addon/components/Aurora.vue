<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from 'vue'
import { useActive } from '../composables/useActive'
import { useCrisp } from '../composables/useCrisp'
import { useEntered } from '../composables/useEntered'
import { fromHsl, hueShift, luma, mix, rgbOf, rgba, toHsl, type RGB } from '../composables/color'

// An animated gradient mesh that fills its box: soft blobs of the accent colours drifting on slow orbits. Use it inside
// <Stage full> with <At>. `intensity` scales the glow, `speed` the drift, `hue` turns the colours (degrees), `cx` and `cy` move the centre of the drift (0 to 1, 0.5 by default) so neighbouring slides do not repeat one picture. It renders at half resolution (the blobs are
// blurry by nature, so nothing is lost) and sleeps while its slide is not on screen.
const props = withDefaults(defineProps<{ intensity?: number; speed?: number; hue?: number; cx?: number; cy?: number }>(), { intensity: 1, speed: 1, hue: 0, cx: 0.5, cy: 0.5 })
const LW = 1280, LH = 720, SCALE = 0.5
const reduce = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches
const root = ref<HTMLElement>()
const cv = ref<HTMLCanvasElement>()
const { k } = useCrisp(root, { w: LW, h: LH })

// One soft sprite per colour, drawn many times: a radial falloff that is smooth enough not to band.
function sprite(c: RGB): HTMLCanvasElement {
  const s = document.createElement('canvas'); s.width = s.height = 256
  const g = s.getContext('2d')!, r = g.createRadialGradient(128, 128, 0, 128, 128, 128)
  for (const [at, a] of [[0, 1], [0.15, 0.82], [0.35, 0.5], [0.6, 0.2], [0.82, 0.05], [1, 0]]) r.addColorStop(at, rgba(c, a))
  g.fillStyle = r; g.fillRect(0, 0, 256, 256)
  return s
}

interface Blob { img: HTMLCanvasElement; fx: number; fy: number; px: number; py: number; ph: number; r: number; a: number }
let blobs: Blob[] = [], bg = '', dark = true
function build() {
  const shift = (c: RGB): RGB => (props.hue ? hueShift(c, props.hue) : c)
  const a1 = shift(rgbOf('--nd-accent', 'black', root.value)), bgc = rgbOf('--nd-bg', 'black', root.value)
  let a2 = shift(rgbOf('--nd-accent-2', 'black', root.value))
  if (toHsl(a2)[1] < 0.18) a2 = hueShift(a1, -48)                  // a grey second accent would only dull the mesh
  const a3 = hueShift(a1, 52), a4 = mix(a1, a2, 0.5)
  dark = luma(bgc) < 0.5
  bg = rgba(bgc)
  const lift = (c: RGB): RGB => { const [h, s, l] = toHsl(c); return dark ? fromHsl([h, Math.max(s, 0.55), Math.min(Math.max(l, 0.36), 0.5)]) : fromHsl([h, Math.max(s, 0.6), Math.max(l, 0.62)]) }
  const cols = [a1, a2, a3, a4, a1].map(lift)
  // fx, fy: orbit speeds; px, py: orbit radii; ph: phase; r: radius as a share of the width.
  const spec = [[0.21, 0.17, 0.34, 0.26, 0, 0.5, 1], [0.15, 0.23, 0.36, 0.30, 2.1, 0.46, 0.9], [0.27, 0.13, 0.30, 0.34, 4.0, 0.42, 0.85], [0.11, 0.19, 0.38, 0.22, 5.3, 0.4, 0.8], [0.19, 0.29, 0.26, 0.2, 1.2, 0.28, 0.9]]
  blobs = spec.map((s, i) => ({ img: sprite(cols[i]), fx: s[0], fy: s[1], px: s[2], py: s[3], ph: s[4], r: s[5], a: s[6] }))
}

let raf = 0, last = 0, t = 0
function draw() {
  const c = cv.value; if (!c || !blobs.length) return
  const pw = Math.max(2, Math.round(LW * k.value * SCALE)), ph = Math.max(2, Math.round(LH * k.value * SCALE))
  if (c.width !== pw || c.height !== ph) { c.width = pw; c.height = ph }
  const g = c.getContext('2d')!
  g.setTransform(pw, 0, 0, ph, 0, 0)                                // unit square: the mesh follows whatever box it fills
  g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1
  g.fillStyle = bg; g.fillRect(0, 0, 1, 1)
  g.globalCompositeOperation = dark ? 'lighter' : 'source-over'
  const gain = (dark ? 0.36 : 0.5) * props.intensity
  for (const b of blobs) {
    const x = props.cx + b.px * Math.sin(t * b.fx + b.ph), y = props.cy + b.py * Math.cos(t * b.fy + b.ph * 1.3)
    const rx = b.r * (1 + 0.08 * Math.sin(t * 0.33 + b.ph)), ry = rx * (LW / LH)
    g.globalAlpha = Math.min(1, gain * b.a)
    g.drawImage(b.img, x - rx, y - ry, rx * 2, ry * 2)
  }
}
function loop(now: number) {
  t += Math.min(0.05, last ? (now - last) / 1000 : 0) * props.speed; last = now
  draw()
  raf = requestAnimationFrame(loop)
}
const active = useActive()
const on = useEntered(active)
watch(active, (a) => {
  cancelAnimationFrame(raf); last = 0
  if (!a) return
  build()
  if (reduce) { t = 8; draw(); return }
  raf = requestAnimationFrame(loop)
}, { immediate: true, flush: 'post' })
onBeforeUnmount(() => cancelAnimationFrame(raf))
</script>

<template>
  <div ref="root" class="nd-aurora" :class="{ 'nd-on': on }" data-kind="aurora"><canvas ref="cv" width="640" height="360" /></div>
</template>
