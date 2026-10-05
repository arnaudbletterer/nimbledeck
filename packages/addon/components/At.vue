<script setup lang="ts">
import { computed } from 'vue'
import { useActive } from '../composables/useActive'
import { useEntered } from '../composables/useEntered'

// Places any element (text, video, a live component) at x, y with size w, h inside a <Stage>, with stacking order z.
// Works with Slidev's click builds: <At v-click ...>. `bg` paints a backdrop (any CSS colour or a --nd-* token).
// `frame` adds a hairline border, rounded corners (`radius`, 16 px by default; a `radius` alone rounds and clips) and a soft shadow; `pad` adds padding (a number, or a CSS value such as "0 28px"), `middle` centres the content vertically.
// `enter` (up, down, left, right, scale or fade) makes it arrive when its slide appears, `delay` ms later: give a row of
// elements 0, 90, 180... for a stagger. Reduced motion shows everything at once.
const props = withDefaults(defineProps<{ x?: number; y?: number; w?: number; h?: number; z?: number; opacity?: number; bg?: string
  frame?: boolean; radius?: number; pad?: number | string; middle?: boolean; enter?: 'up' | 'down' | 'left' | 'right' | 'scale' | 'fade'; delay?: number }>(), { x: 0, y: 0, z: 0, delay: 0 })
const round = computed(() => props.radius ?? (props.frame ? 16 : undefined))
const reduce = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches
const on = useEntered(useActive())
const cls = computed(() => [props.frame && 'nd-at-frame', props.middle && 'nd-at-middle', props.enter && !reduce && `nd-at-enter nd-at-from-${props.enter}`, props.enter && !reduce && on.value && 'nd-at-in'])
</script>

<template>
  <div class="nd-at" :class="cls" :style="{ left: x + 'px', top: y + 'px', width: w != null ? w + 'px' : undefined, height: h != null ? h + 'px' : undefined, zIndex: z, opacity, background: bg,
    ...(round != null ? { borderRadius: round + 'px', overflow: 'hidden' } : {}), ...(pad != null ? { padding: typeof pad === 'number' ? pad + 'px' : pad, boxSizing: 'border-box' } : {}), ...(enter ? { '--nd-at-delay': delay + 'ms' } : {}) }"><slot /></div>
</template>
