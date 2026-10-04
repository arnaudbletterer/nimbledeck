<script setup lang="ts">
// A video as a plain element. Fills its box; `fit` is "cover" (crop) or "contain" (letterbox). No controls by default.
// `dim` (0 to 1) darkens it so text on top stays readable. `webm` names an alternative encoding (VP9) that a browser
// without H.264 plays instead, for example `<Clip src="/loop.mp4" webm="/loop.webm" />`. An address that starts with "/"
// is a file of the deck's public/ folder and follows the base path of the build.
import { computed, ref } from 'vue'
import { asset } from '../composables/asset.mjs'
const failed = ref(false)   // a remote video that cannot load (offline) gets a quiet note instead of a black box
const props = withDefaults(defineProps<{ src: string; webm?: string; fit?: 'cover' | 'contain'; controls?: boolean; loop?: boolean; muted?: boolean; autoplay?: boolean; dim?: number }>(),
  { fit: 'contain', controls: false, loop: true, muted: true, autoplay: true, dim: 0 })
const MIME: Record<string, string> = { mp4: 'video/mp4', m4v: 'video/mp4', webm: 'video/webm', mov: 'video/quicktime', ogv: 'video/ogg' }
const mime = (u: string) => MIME[u.split(/[?#]/)[0].split('.').pop()?.toLowerCase() ?? '']
const main = computed(() => asset(props.src))
const alt = computed(() => (props.webm ? asset(props.webm) : ''))
const gone = () => { failed.value = /^https?:/.test(props.src) }
</script>

<template>
  <div class="nd-media">
    <video v-show="!failed" :key="main" class="nd-clip" :style="{ objectFit: fit }" :autoplay="autoplay" :muted="muted" :loop="loop" :controls="controls" playsinline>
      <source :src="main" :type="mime(main)" @error="gone">
      <source v-if="alt" :src="alt" :type="mime(alt)" @error="gone">
    </video>
    <div v-if="failed" class="nd-site-off"><p>This video is not available offline.</p><code>{{ src }}</code></div>
    <div v-if="dim" class="nd-dim" :style="{ opacity: dim }" />
  </div>
</template>
