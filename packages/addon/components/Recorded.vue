<script setup lang="ts">
// The recording of a live run, shown by LiveCode, PyStream and Demo in place of their offline panel (docs/RECORDING.md).
// Fills the box of the component that uses it (the box has the size and shape of the recorded one, in CSS pixels; the video
// has twice the pixels, so it is sharp on a 2x screen). Muted, looping, inline; with prefers-reduced-motion only the poster shows.
// It has no timers or sockets of its own. Its parent mounts it only while its slide is on screen, so preload="auto" never
// fetches the clips of the other slides.
defineProps<{ src: string; poster: string; reduced: boolean }>()
</script>

<template>
  <div class="nd-rec" data-kind="recording">
    <img v-if="reduced" class="nd-rec-media" :src="poster" alt="Recording of a live run (still image)">
    <video v-else class="nd-rec-media" :src="src" :poster="poster" aria-label="Recording of a live run" autoplay muted loop playsinline preload="auto" disablepictureinpicture disableremoteplayback />
    <p class="nd-rec-note"><span class="nd-rec-pill">Recording of a live run</span><span class="nd-rec-hint">Run it locally to make it live</span></p>
  </div>
</template>
