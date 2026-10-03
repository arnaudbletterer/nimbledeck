<script setup lang="ts">
// Places any element (text, video, a live component) at x, y with size w, h inside a <Stage>, with stacking order z.
// Works with Slidev's click builds: <At v-click ...>. `bg` paints a backdrop (any CSS colour or a --nd-* token).
withDefaults(defineProps<{ x?: number; y?: number; w?: number; h?: number; z?: number; opacity?: number; bg?: string }>(), { x: 0, y: 0, z: 0 })
</script>

<template>
  <div class="nd-at" :style="{ left: x + 'px', top: y + 'px', width: w != null ? w + 'px' : undefined, height: h != null ? h + 'px' : undefined, zIndex: z, opacity, background: bg }"><slot /></div>
</template>
