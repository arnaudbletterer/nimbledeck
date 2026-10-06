<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'
import { links, termColor } from '../composables/links.mjs'

// A label that appears over a visualization while a term of an <Equation> is pointed at: place it with <At>, on the peak, the axis
// or the curve the term stands for. It is a plain element of the page, so it shows over a live component and over its recording.
//   <At :x="600" :y="40"><Marker term="1">x, left to right</Marker></At>
// `term` is one id or a list; the marker takes the colour of the term. Nothing animates until a term matches.
const props = defineProps<{ term: string | number | (string | number)[] }>()
const ids = computed(() => [props.term].flat().map(String))
const now = ref<string | null>(links.term())
const off = links.onTerm((t: string | null) => { now.value = t })
onBeforeUnmount(off)
const on = computed(() => now.value !== null && ids.value.includes(now.value))
</script>

<template>
  <span class="nd-marker" :class="{ 'nd-marker-on': on }" data-kind="marker" :aria-hidden="on ? undefined : 'true'" :style="{ '--nd-tc': termColor(on ? now! : ids[0]) }"><slot /></span>
</template>
