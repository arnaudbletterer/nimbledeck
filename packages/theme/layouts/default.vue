<script setup lang="ts">
import { useNav } from '@slidev/client'
const { currentPage, total } = useNav()
</script>

<template>
  <div class="slidev-layout default nd-root ">
    <div class="nd-body"><slot /></div>
    <span v-if="$slots.caption" class="nd-caption nd-body-cap"><slot name="caption" /></span>
    <span class="nd-foot">{{ $slidev.configs.title }}</span>
    <span class="nd-page">{{ currentPage }}/{{ total }}</span>
  </div>
</template>
