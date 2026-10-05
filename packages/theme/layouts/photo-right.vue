<script setup lang="ts">
import { useNav } from '@slidev/client'
const { currentPage, total } = useNav()
const props = defineProps<{ image: string }>()
// An image of the deck's public/ folder ("/a.jpg") follows the base path of the build.
const base = import.meta.env.BASE_URL ?? '/'
const url = props.image.startsWith('/') && !props.image.startsWith('//') ? base.replace(/\/$/, '') + props.image : props.image
</script>

<template>
  <div class="slidev-layout photo-right nd-root nd-cols">
    <div><slot name="title" /></div>
    <div class="nd-col nd-col-l"><slot /></div>
    <div class="nd-photo" :style="{ backgroundImage: `url(${url})` }" />
    <span class="nd-foot">{{ $slidev.configs.title }}</span>
    <span class="nd-page">{{ currentPage }}/{{ total }}</span>
  </div>
</template>
