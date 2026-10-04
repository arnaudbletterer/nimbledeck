<script setup lang="ts">
import { ref } from 'vue'

// Before and after images with a draggable divider. Drag anywhere on it, or focus it and use the arrow keys.
const props = withDefaults(defineProps<{ before: string; after: string; start?: number }>(), { start: 50 })
const failed = ref(false)   // a remote image that cannot load (offline) gets a quiet note
const pos = ref(props.start)
const box = ref<HTMLElement>()
let dragging = false
function move(e: PointerEvent) {
  const r = box.value!.getBoundingClientRect()
  if (r.width > 0) pos.value = Math.min(100, Math.max(0, ((e.clientX - r.left) / r.width) * 100))
}
function down(e: PointerEvent) { dragging = true; (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); move(e) }
function up() { dragging = false }
function key(e: KeyboardEvent) {
  if (e.key === 'ArrowLeft') { pos.value = Math.max(0, pos.value - 5); e.preventDefault(); e.stopPropagation() }
  if (e.key === 'ArrowRight') { pos.value = Math.min(100, pos.value + 5); e.preventDefault(); e.stopPropagation() }
}
</script>

<template>
  <div ref="box" class="nd-compare" data-kind="compare" :data-pos="Math.round(pos)" tabindex="0" role="slider" :aria-valuenow="Math.round(pos)" aria-valuemin="0" aria-valuemax="100"
       @pointerdown.stop="down" @pointermove="dragging && move($event)" @pointerup="up" @keydown="key">
    <img class="nd-cmp-img" :src="after" alt="" @error="failed = /^https?:/.test(after)">
    <img class="nd-cmp-img nd-cmp-top" :src="before" alt="" :style="{ clipPath: `inset(0 ${100 - pos}% 0 0)` }">
    <div v-if="failed" class="nd-site-off"><p>These images are not available offline.</p><code>{{ after }}</code></div>
    <div class="nd-cmp-handle" :style="{ left: pos + '%' }"><span /></div>
  </div>
</template>
