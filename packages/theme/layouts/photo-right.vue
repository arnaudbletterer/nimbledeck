<script setup lang="ts">
import { useNav } from '@slidev/client'
const { currentPage, total } = useNav()
defineProps<{ image: string }>()
</script>

<template>
  <div class="slidev-layout photo-right nd-root nd-cols">
    <div><slot name="title" /></div>
    <div class="nd-col nd-col-l"><slot /></div>
    <div class="nd-photo" :style="{ backgroundImage: `url(${image})` }" />
    <span class="nd-foot">{{ $slidev.configs.title }}</span>
    <span class="nd-page">{{ currentPage }}/{{ total }}</span>
  </div>
</template>
