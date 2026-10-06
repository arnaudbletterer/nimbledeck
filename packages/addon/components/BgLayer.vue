<script setup lang="ts">
import { bgShapes } from '../composables/bgShapes'
import Aurora from './Aurora.vue'
import Shader from './Shader.vue'

// The layer a background preset lays behind a slide (what slide-bottom.vue builds for `background:`), for the places that show
// one without owning the slide: the backdrops of <MotionWall> and the full-slide preview of <WallDemo>.
defineProps<{ id: string }>()
</script>

<template>
  <div class="nd-bgx" aria-hidden="true">
    <Aurora v-if="id === 'aurora'" :intensity="1" />
    <Shader v-else-if="id === 'shader'" :intensity="1.1" :lines="0.4" />
    <template v-else-if="id === 'stars'"><i v-for="(s, j) in bgShapes.stars" :key="j" class="nd-star" :style="{ width: s.size + 'px', height: s.size + 'px', boxShadow: s.shadow }" /></template>
    <template v-else-if="id === 'waves'"><svg v-for="(d, j) in bgShapes.waves" :key="j" class="nd-waves" viewBox="0 0 2560 720" preserveAspectRatio="none"><path :d="d" /></svg></template>
    <template v-else><i /><i /><i /></template>
  </div>
</template>
