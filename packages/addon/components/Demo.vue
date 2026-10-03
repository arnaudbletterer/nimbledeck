<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useSlideContext } from '@slidev/client'
import { useNimbleConfig } from '../composables/useConfig'

// <Demo name="compute" /> embeds a local marimo app. The port comes from nimbledeck.config.json,
// the optional poster from public/posters/<name>.png. If the process is down, an offline panel shows.
const props = withDefaults(defineProps<{ name: string; frame?: boolean }>(), { frame: false })
const { $renderContext } = useSlideContext()
const thumb = computed(() => $renderContext?.value === 'overview')   // a thumbnail must not probe or embed the demo
const port = ref<number | null>(null)
const src = computed(() => (port.value ? `http://127.0.0.1:${port.value}` : ''))
const poster = computed(() => `${import.meta.env.BASE_URL}posters/${props.name}.png`)
const posterOk = ref(true)
const up = ref(false)
let timer: ReturnType<typeof setInterval>

// A no-cors fetch resolves if something answers and rejects if the port is closed.
async function probe() {
  if (!src.value) { up.value = false; return }
  try { await fetch(src.value, { mode: 'no-cors', signal: AbortSignal.timeout(1500) }); up.value = true }
  catch { up.value = false }
}
onMounted(async () => {
  if (thumb.value) return
  port.value = (await useNimbleConfig()).demos[props.name]?.port ?? null
  probe(); timer = setInterval(probe, 3000)
})
onUnmounted(() => clearInterval(timer))
</script>

<template>
  <div class="nd-demo" :class="{ 'nd-framed': frame }" data-kind="demo" :data-state="up ? 'live' : 'offline'">
    <FrameGuard v-if="up"><iframe :src="src" allowtransparency="true" /></FrameGuard>
    <div v-else class="nd-down">
      <img v-if="posterOk" :src="poster" @error="posterOk = false">
      <p>Live demo offline. Start everything with <code>nimbledeck run</code></p>
    </div>
    <span class="nd-dot" :class="{ on: up }" :title="up ? 'live' : 'offline'" />
  </div>
</template>
