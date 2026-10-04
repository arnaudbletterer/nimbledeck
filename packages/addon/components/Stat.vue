<script setup lang="ts">
import { computed } from 'vue'
import { useActive } from '../composables/useActive'
import { useEntered } from '../composables/useEntered'
import CountUp from './CountUp.vue'

// A big number that counts up, with a label that fades up once the count has landed:
// <Stat value="60" suffix=" fps" label="smooth on a laptop" :decimals="0" />. The number is right-aligned in a box as wide
// as its final value, so the suffix and the label never move while it counts.
const props = withDefaults(defineProps<{ value: number | string; suffix?: string; prefix?: string; label?: string; decimals?: number; duration?: number }>(), { decimals: 0, duration: 1400, suffix: '', prefix: '' })
const to = computed(() => Number(props.value))
const final = computed(() => to.value.toFixed(props.decimals))
const on = useEntered(useActive())
</script>

<template>
  <div class="nd-stat" :class="{ 'nd-on': on }" :style="{ '--nd-stat-wait': Math.round(duration * 0.8) + 'ms' }" data-kind="stat" :aria-label="`${prefix}${final}${suffix} ${label ?? ''}`">
    <div class="nd-stat-num" aria-hidden="true">
      <span v-if="prefix" class="nd-stat-fix">{{ prefix }}</span>
      <span class="nd-stat-val"><span class="nd-stat-ghost">{{ final }}</span><CountUp class="nd-stat-live" :to="to" :decimals="decimals" :duration="duration" /></span>
      <span v-if="suffix" class="nd-stat-fix">{{ suffix }}</span>
    </div>
    <div v-if="label" class="nd-stat-label" aria-hidden="true">{{ label }}</div>
  </div>
</template>
