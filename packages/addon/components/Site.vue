<script setup lang="ts">
import { ref, computed, watch, onUnmounted } from 'vue'
import { useSlideContext } from '@slidev/client'
import { useActive } from '../composables/useActive'

const props = withDefaults(defineProps<{ url: string; frame?: boolean; caption?: boolean }>(), { frame: false, caption: false })
const { $renderContext } = useSlideContext()
const thumb = computed(() => $renderContext?.value === 'overview')   // a thumbnail must not load the website
const active = useActive()   // nor must a neighbouring slide: the site loads only while its slide is on screen

// A website needs the internet. When the browser is offline, or the page does not answer within LIMIT_MS, a calm panel
// replaces the frame (never a blank or endless one). It retries on its own when the connection returns, and on request.
const LIMIT_MS = 8000
const state = ref<'loading' | 'live' | 'offline'>('loading')
const attempt = ref(0)
let timer: ReturnType<typeof setTimeout>, poll: ReturnType<typeof setInterval>, token = 0

// A no-cors fetch resolves if the host answers and rejects when it cannot be reached, so a refused or unresolvable
// address fails at once; one that hangs is cut by the timeout.
async function start() {
  const mine = ++token
  clearTimeout(timer)
  attempt.value++
  if (!navigator.onLine) { state.value = 'offline'; return }
  state.value = 'loading'
  timer = setTimeout(() => { if (mine === token && state.value === 'loading') state.value = 'offline' }, LIMIT_MS)
  try { await fetch(props.url, { mode: 'no-cors', signal: AbortSignal.timeout(LIMIT_MS) }) }
  catch { if (mine === token) { clearTimeout(timer); state.value = 'offline' } }
}
function loaded() { if (state.value === 'loading') { clearTimeout(timer); state.value = 'live' } }
const back = () => { if (state.value === 'offline') start() }
function stop() { token++; clearTimeout(timer); clearInterval(poll); window.removeEventListener('online', back) }

watch(active, (a) => {
  stop()
  if (thumb.value || !a) return
  window.addEventListener('online', back)
  poll = setInterval(() => { if (state.value === 'offline' && navigator.onLine) start() }, 5000)
  start()
}, { immediate: true })
onUnmounted(stop)
const framed = computed(() => state.value !== 'offline')
</script>

<template>
  <div class="nd-site" :class="{ 'nd-framed': frame }" data-kind="site" :data-state="active && !thumb ? state : 'idle'">
    <div v-if="thumb || !active" class="nd-thumb-note">{{ url }}</div>
    <div v-else-if="!framed" class="nd-site-off">
      <p>This page needs the internet, and there is no connection right now.</p>
      <code>{{ url }}</code>
      <button @click.stop="start">Retry</button>
    </div>
    <FrameGuard v-else :key="attempt"><iframe :src="url" referrerpolicy="no-referrer" @load="loaded" /></FrameGuard>
    <div v-if="caption" class="nd-cap">Embedded site: {{ url }} <a :href="url" target="_blank">open in browser</a></div>
  </div>
</template>
