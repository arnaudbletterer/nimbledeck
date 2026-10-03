<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from 'vue'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { useActive } from '../composables/useActive'
import { cssVar } from '../composables/useConfig'

// WebGL scene (three.js): a torus knot you can drag to rotate, scroll to zoom.
// A template for "my own 3D scene": copy this file and replace the mesh.
const host = ref<HTMLDivElement>()
const fps = ref(0)
const renderer_name = ref('')
let raf = 0, dispose = () => {}

function start() {
  // Fixed logical size (the slide canvas is 1280 wide, minus 2x70 gutters). Never measure the element:
  // it is 0 wide while a neighbouring slide is mounted but hidden.
  const w = 1140, h = 460
  const renderer = new THREE.WebGLRenderer({ antialias: true })
  renderer.setSize(w, h); renderer.setPixelRatio(1)
  host.value!.appendChild(renderer.domElement)
  const gl = renderer.getContext()
  const dbg = gl.getExtension('WEBGL_debug_renderer_info')
  renderer_name.value = dbg ? String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL)) : 'webgl'
  const scene = new THREE.Scene(); scene.background = new THREE.Color(cssVar('--nd-bg', '#ffffff'))
  const cam = new THREE.PerspectiveCamera(50, w / h, 0.1, 100); cam.position.set(0, 0, 6)
  const mesh = new THREE.Mesh(new THREE.TorusKnotGeometry(1.4, 0.45, 600, 96), new THREE.MeshNormalMaterial())
  scene.add(mesh)
  const controls = new OrbitControls(cam, renderer.domElement); controls.enableDamping = true
  let frames = 0, last = performance.now(), acc = 0
  const loop = () => {
    const now = performance.now(); const dt = (now - last) / 1000; last = now
    mesh.rotation.y += dt * 0.5; controls.update(); renderer.render(scene, cam)
    frames++; acc += dt; if (acc >= 1) { fps.value = Math.round(frames / acc); frames = 0; acc = 0 }
    raf = requestAnimationFrame(loop)
  }
  loop()
  dispose = () => { renderer.dispose(); renderer.domElement.remove() }
}
function stop() { cancelAnimationFrame(raf); dispose(); dispose = () => {}; fps.value = 0 }
const active = useActive()
const mounted = ref(false)
onMounted(() => { mounted.value = true })
watch([active, mounted], ([a, m]) => { stop(); if (a && m) start() }, { immediate: true })
onUnmounted(stop)
</script>

<template>
  <div class="nd-scene" :data-fps="fps" data-kind="webgl">
    <div ref="host" class="nd-gl" />
    <div class="nd-ctl"><span>drag to rotate, scroll to zoom</span><span class="nd-fps">{{ fps }} fps · {{ renderer_name }}</span></div>
  </div>
</template>
