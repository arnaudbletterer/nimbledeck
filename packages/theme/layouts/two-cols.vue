<script setup lang="ts">
import { useNav } from '@slidev/client'
const { currentPage, total } = useNav()
</script>

<template>
  <div class="slidev-layout two-cols nd-root nd-cols">
    <div><slot name="title" /></div>
    <div class="nd-col nd-col-l"><slot /></div>
    <div class="nd-col nd-col-r"><slot name="right" /></div>
    <span class="nd-foot">{{ $slidev.configs.title }}</span>
    <span class="nd-page">{{ currentPage }}/{{ total }}</span>
  </div>
</template>
