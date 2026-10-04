<script setup lang="ts">
import { useNav } from '@slidev/client'
const { currentPage, total } = useNav()
</script>

<template>
  <div class="slidev-layout numbers nd-root">
    <div class="nd-body"><slot /></div>
    <div class="nd-nums" :class="{ 'nd-n4': ['a', 'b', 'c', 'd'].every((k) => $slots[k]) }">
      <div v-for="k in ['a', 'b', 'c', 'd']" :key="k" v-show="$slots[k]" class="nd-num"><slot :name="k" /></div>
    </div>
    <span class="nd-foot">{{ $slidev.configs.title }}</span>
    <span class="nd-page">{{ currentPage }}/{{ total }}</span>
  </div>
</template>
