<script setup lang="ts">
import { useNav } from '@slidev/client'
const { currentPage, total } = useNav()
</script>

<template>
  <div class="slidev-layout stage nd-pane">
    <div class="nd-pane-in"><slot /></div>
    <span class="nd-caption"><slot name="caption" /></span>
    <span class="nd-pill">{{ currentPage }} / {{ total }}</span>
  </div>
</template>
