<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from 'vue'
import { useActive } from '../composables/useActive'
import { useCrisp } from '../composables/useCrisp'
import { useEntered } from '../composables/useEntered'
import { fromHsl, hueShift, luma, mix, rgbOf, toHsl, type RGB } from '../composables/color'

// A WebGL fragment shader that fills its box: slow folds of colour (domain-warped noise) in the accent colours, with fine
// contour lines like a map of light. Use it inside <Stage full> with <At :w="1280" :h="720">, like <Aurora>, when a slide
// deserves more depth than a soft glow. `intensity` scales the brightness, `speed` the flow, `hue` turns the colours
// (degrees), `lines` (0 to 1) the contour lines. It draws at half resolution, sleeps while its slide is not on screen, shows
// one still frame for reduced motion, and leaves a flat background behind it where WebGL is not available.
const props = withDefaults(defineProps<{ intensity?: number; speed?: number; hue?: number; lines?: number }>(), { intensity: 1, speed: 1, hue: 0, lines: 0.35 })
const LW = 1280, LH = 720, SCALE = 0.5
const reduce = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches
const root = ref<HTMLElement>()
const cv = ref<HTMLCanvasElement>()
const { k } = useCrisp(root, { w: LW, h: LH })

const VERT = 'attribute vec2 p; void main() { gl_Position = vec4(p, 0.0, 1.0); }'
const FRAG = `precision highp float;
uniform vec2 uRes; uniform float uT; uniform vec3 uBg, uA, uB, uC; uniform float uI, uL, uDark;
float hash(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
}
float fbm(vec2 p) { float v = 0.0, a = 0.5; for (int i = 0; i < 4; i++) { v += a * noise(p); p = p * 2.03 + vec2(1.7, 9.2); a *= 0.5; } return v; }
void main() {
  vec2 uv = gl_FragCoord.xy / uRes;
  vec2 p = (uv - 0.5) * vec2(uRes.x / uRes.y, 1.0) * 1.8;
  float t = uT * 0.07;
  vec2 q = vec2(fbm(p + vec2(0.0, t)), fbm(p + vec2(5.2, 1.3) - t));
  vec2 r = vec2(fbm(p + 3.5 * q + vec2(1.7, 9.2) + 0.6 * t), fbm(p + 3.5 * q + vec2(8.3, 2.8) - 0.5 * t));
  float f = fbm(p + 3.5 * r);
  float body = smoothstep(0.25, 0.85, f);
  vec3 glow = mix(uA, uB, clamp(length(q) * 0.9, 0.0, 1.0));
  glow = mix(glow, uC, smoothstep(0.45, 1.0, r.x) * 0.7);
  float lit = body * (0.35 + 0.65 * smoothstep(0.1, 0.9, 1.0 - length(uv - vec2(0.62, 0.55)) * 0.9));
  float lines = 1.0 - smoothstep(0.0, 0.07, abs(fract(f * 9.0) - 0.5) - 0.43);
  vec3 col = uBg + glow * lit * uI * 0.9 * mix(0.8, 1.0, uDark);
  col += glow * lines * uL * 0.22 * body * uI;
  if (uDark < 0.5) col = mix(uBg, glow, clamp(lit * uI * 0.85 + lines * uL * 0.12 * body, 0.0, 0.9));
  float vig = 1.0 - 0.5 * pow(length((uv - 0.5) * vec2(1.1, 1.0)), 2.0);
  col = mix(uBg, col, clamp(vig, 0.0, 1.0));
  col += (hash(gl_FragCoord.xy + uT) - 0.5) * 0.012;
  gl_FragColor = vec4(col, 1.0);
}`

let gl: WebGLRenderingContext | null = null
let prog: WebGLProgram | null = null
let loc: Record<string, WebGLUniformLocation | null> = {}
let cols = { bg: [0, 0, 0] as RGB, a: [0, 0, 0] as RGB, b: [0, 0, 0] as RGB, c: [0, 0, 0] as RGB, dark: true }
const supported = ref(true)

function shader(type: number, src: string) {
  const s = gl!.createShader(type)!
  gl!.shaderSource(s, src); gl!.compileShader(s)
  if (gl!.getShaderParameter(s, gl!.COMPILE_STATUS)) return s
  console.warn('[nimbledeck] Shader did not compile:', gl!.getShaderInfoLog(s))
  return null
}
function setup() {
  const c = cv.value; if (!c) return
  gl = c.getContext('webgl', { antialias: false, alpha: false, powerPreference: 'low-power' }) as WebGLRenderingContext | null
  if (!gl) { supported.value = false; return }
  const vs = shader(gl.VERTEX_SHADER, VERT), fs = shader(gl.FRAGMENT_SHADER, FRAG)
  if (!vs || !fs) { supported.value = false; gl = null; return }
  prog = gl.createProgram()!
  gl.attachShader(prog, vs); gl.attachShader(prog, fs); gl.linkProgram(prog)
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) { supported.value = false; gl = null; return }
  gl.useProgram(prog)
  const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf)
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)   // one oversized triangle
  const p = gl.getAttribLocation(prog, 'p'); gl.enableVertexAttribArray(p); gl.vertexAttribPointer(p, 2, gl.FLOAT, false, 0, 0)
  loc = Object.fromEntries(['uRes', 'uT', 'uBg', 'uA', 'uB', 'uC', 'uI', 'uL', 'uDark'].map((n) => [n, gl!.getUniformLocation(prog!, n)]))
}
function palette() {
  const a1 = rgbOf('--nd-accent'), bgc = rgbOf('--nd-bg')
  let a2 = rgbOf('--nd-accent-2')
  if (toHsl(a2)[1] < 0.18) a2 = hueShift(a1, -48)
  const shift = (c: RGB) => (props.hue ? hueShift(c, props.hue) : c)
  const dark = luma(bgc) < 0.5
  const lift = (c: RGB): RGB => { const [h, s, l] = toHsl(c); return dark ? fromHsl([h, Math.max(s, 0.6), Math.min(Math.max(l, 0.42), 0.55)]) : fromHsl([h, Math.max(s, 0.6), Math.max(l, 0.6)]) }
  const A = lift(shift(a1)), B = lift(shift(a2))
  cols = { bg: bgc, a: A, b: B, c: mix(A, B, 0.5), dark }
}
const rgb = (c: RGB) => c.map((v) => v / 255) as [number, number, number]

let raf = 0, last = 0, t = 0, frames = 0
function draw() {
  const c = cv.value; if (!c) return
  if (!gl && supported.value) setup()
  if (!gl || !prog) return
  const pw = Math.max(2, Math.round(LW * k.value * SCALE)), ph = Math.max(2, Math.round(LH * k.value * SCALE))
  if (c.width !== pw || c.height !== ph) { c.width = pw; c.height = ph }
  gl.viewport(0, 0, pw, ph)
  gl.uniform2f(loc.uRes, pw, ph); gl.uniform1f(loc.uT, t)
  gl.uniform3fv(loc.uBg, rgb(cols.bg)); gl.uniform3fv(loc.uA, rgb(cols.a)); gl.uniform3fv(loc.uB, rgb(cols.b)); gl.uniform3fv(loc.uC, rgb(cols.c))
  gl.uniform1f(loc.uI, props.intensity); gl.uniform1f(loc.uL, props.lines); gl.uniform1f(loc.uDark, cols.dark ? 1 : 0)
  gl.drawArrays(gl.TRIANGLES, 0, 3)
  c.dataset.frame = String(++frames)                 // a counter the browser tests read
}
function loop(now: number) {
  t += Math.min(0.05, last ? (now - last) / 1000 : 0) * props.speed; last = now
  draw()
  raf = requestAnimationFrame(loop)
}
const lost = (e: Event) => { e.preventDefault(); cancelAnimationFrame(raf); gl = null; prog = null }
const restored = () => { setup(); if (active.value && !reduce) raf = requestAnimationFrame(loop) }
const active = useActive()
const on = useEntered(active)
watch(active, (a) => {
  cancelAnimationFrame(raf); last = 0
  if (!a) return
  palette()
  if (reduce) { t = 14; draw(); raf = requestAnimationFrame(() => { draw(); raf = 0 }); return }   // one still frame (a second draw once the canvas has its size)
  raf = requestAnimationFrame(loop)
}, { immediate: true, flush: 'post' })
onBeforeUnmount(() => { cancelAnimationFrame(raf); gl?.getExtension('WEBGL_lose_context')?.loseContext(); gl = null })
</script>

<template>
  <div ref="root" class="nd-shader" :class="{ 'nd-on': on, 'nd-flat': !supported }" data-kind="shader"><canvas ref="cv" width="640" height="360" @webglcontextlost="lost" @webglcontextrestored="restored" /></div>
</template>
