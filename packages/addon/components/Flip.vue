<script setup lang="ts">
import { ref, watch } from 'vue'
import { useActive } from '../composables/useActive'

// A card that flips on click to reveal its back: <Flip><template #front>Question</template><template #back>Answer</template></Flip>
const flipped = ref(false)
const active = useActive()
watch(active, (a) => { if (!a) flipped.value = false })
</script>

<template>
  <div class="nd-flip" :class="{ 'nd-flipped': flipped }" data-kind="flip" :data-state="flipped ? 'back' : 'front'" role="button" tabindex="0"
       @click.stop="flipped = !flipped" @keydown.enter.stop.prevent="flipped = !flipped" @keydown.space.stop.prevent="flipped = !flipped">
    <div class="nd-flip-inner">
      <div class="nd-flip-face nd-flip-front"><slot name="front" /></div>
      <div class="nd-flip-face nd-flip-back"><slot name="back" /></div>
    </div>
  </div>
</template>
