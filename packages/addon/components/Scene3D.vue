<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from 'vue'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { useActive } from '../composables/useActive'
import { useCrisp } from '../composables/useCrisp'

// WebGL scene (three.js): a torus knot you can drag to rotate, scroll to zoom.
// A template for "my own 3D scene": copy this file and replace the mesh.
const props = withDefaults(defineProps<{ controls?: boolean; hud?: boolean; frame?: boolean; ratio?: number }>(), { controls: false, hud: false, frame: false, ratio: 2.2 })
const host = ref<HTMLDivElement>()
const root = ref<HTMLElement>()
const { k } = useCrisp(root, { w: Math.round(460 * props.ratio), h: 460 })
let applyRes = () => {}
const fps = ref(0)
const renderer_name = ref('')
let raf = 0, dispose = () => {}
let ready: { reset: () => void; frame: (dt: number) => void } | null = null

// The renderer is built once, at idle, while the slide is only a mounted neighbour (a WebGL context and the shader
// compile cost about 100 ms, which would land in the slide transition). Only the render loop follows `active`.
function build() {
  // Fixed logical size (the slide canvas is 1280 wide, minus 2x70 gutters). Never measure the element:
  // it is 0 wide while a neighbouring slide is mounted but hidden.
  const w = Math.round(460 * props.ratio), h = 460
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
  // Render at the real on-screen resolution (slide units x slide scale x device pixel ratio) so edges stay sharp.
  applyRes = () => { renderer.setPixelRatio(k.value); renderer.setSize(w, h, false) }
  applyRes(); renderer.setClearColor(0x000000, 0)
  host.value!.appendChild(renderer.domElement)
  const gl = renderer.getContext()
  const dbg = gl.getExtension('WEBGL_debug_renderer_info')
  renderer_name.value = dbg ? String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL)) : 'webgl'
  const scene = new THREE.Scene()  // no background: the scene is transparent and sits on whatever is behind it
  const cam = new THREE.PerspectiveCamera(50, w / h, 0.1, 100); cam.position.set(0, 0, 6)
  const geo = new THREE.TorusKnotGeometry(1.4, 0.45, 600, 96), mat = new THREE.MeshNormalMaterial()
  const mesh = new THREE.Mesh(geo, mat)
  scene.add(mesh)
  const controls = new OrbitControls(cam, renderer.domElement); controls.enableDamping = true
  const render = () => { controls.update(); renderer.render(scene, cam) }
  let frames = 0, acc = 0
  const frame = (dt: number) => {
    mesh.rotation.y += dt * 0.5; render()
    frames++; acc += dt; if (acc >= 1) { fps.value = Math.round(frames / acc); frames = 0; acc = 0 }
  }
  const reset = () => { mesh.rotation.set(0, 0, 0); controls.reset() }   // a new entry starts from the same pose as before
  render()                                                // compiles the shaders and uploads the geometry now
  ready = { reset, frame }
  dispose = () => {
    controls.dispose(); geo.dispose(); mat.dispose(); renderer.dispose()
    renderer.forceContextLoss()                           // dispose() alone leaves the context alive until the GC runs
    renderer.domElement.remove()
  }
}
function loop() {
  const now = performance.now(); const dt = (now - last) / 1000; last = now
  ready!.frame(dt)
  raf = requestAnimationFrame(loop)
}
let last = 0
function run() { stopLoop(); if (!ready) build(); ready!.reset(); last = performance.now(); raf = requestAnimationFrame(loop) }
function stopLoop() { cancelAnimationFrame(raf); raf = 0; fps.value = 0 }
let tm = 0, ricId = 0
function cancelWarm() { window.clearTimeout(tm); (window as any).cancelIdleCallback?.(ricId) }
function warm() {
  const ric = (window as any).requestIdleCallback as undefined | ((cb: () => void, o?: { timeout: number }) => number)
  const go = () => { if (!ready && mounted.value && !active.value) build() }
  // Wait out the transition that mounted this slide, then build when the browser is idle.
  tm = window.setTimeout(() => { ric ? (ricId = ric(go, { timeout: 2000 })) : go() }, 1200)
}
const active = useActive()
watch(k, () => applyRes())
const mounted = ref(false)
onMounted(() => { mounted.value = true; if (active.value) run(); else warm() })
watch(active, (a) => { if (!mounted.value) return; if (a) { cancelWarm(); run() } else stopLoop() })
onUnmounted(() => {
  // Destroying a WebGL context takes up to 250 ms in software GL: do it after the slide transition, not during it.
  stopLoop(); cancelWarm()
  const d = dispose; dispose = () => {}; ready = null; applyRes = () => {}
  window.setTimeout(d, 1200)
})
</script>

<template>
  <div ref="root" class="nd-scene" :class="{ 'nd-framed': frame }" :style="{ '--nd-ratio': ratio }" :data-fps="fps" data-kind="webgl">
    <div ref="host" class="nd-gl" />
    <span v-if="hud" class="nd-hud" :title="renderer_name">{{ fps }} fps</span>
    <div v-if="controls" class="nd-ctl"><span>drag to rotate, scroll to zoom</span></div>
  </div>
</template>
