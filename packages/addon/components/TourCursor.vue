<script setup lang="ts">
import { cursor } from '../composables/tourEngine'

// The virtual cursor of a scripted tour (see docs/TOUR.md). It shows only while a tour plays a slide script, ignores the
// pointer, and is hidden from assistive technology: it is a picture of a click, the click itself is real.
</script>

<template>
  <!-- In the body, not in the slide layer: Slidev scales that layer, and the cursor moves in screen coordinates. -->
  <Teleport to="body">
  <Transition name="nd-cur">
    <div v-if="cursor.shown" class="nd-cursor" :class="{ 'nd-cur-down': cursor.down, 'nd-cur-glide': cursor.gliding }" :style="{ transform: `translate3d(${cursor.x}px, ${cursor.y}px, 0)` }" aria-hidden="true" data-kind="tour-cursor">
      <span class="nd-cur-halo" />
      <span :key="cursor.ripple" class="nd-cur-ripple" :class="{ 'nd-cur-ripple-on': cursor.ripple > 0 }" />
      <svg class="nd-cur-arrow" viewBox="0 0 32 40" width="1em" height="1.25em">
        <path d="M4 3 L4 31 L11 24.5 L16.2 36.5 L21.2 34.3 L16 22.6 L26 22 Z" />
      </svg>
      <span v-if="cursor.caption" :key="cursor.caption" class="nd-cur-caption">{{ cursor.caption }}</span>
    </div>
  </Transition>
  </Teleport>
</template>
