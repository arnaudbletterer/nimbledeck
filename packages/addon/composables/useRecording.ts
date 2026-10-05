import { computed, onUnmounted, ref, watch, type Ref } from 'vue'
import { isVideoResponse, recordingBase, recordingCandidates } from './recording'

// The recording that stands in for a live component whose Python process cannot be reached. `offline` is the component's own
// "no process" state; the recording appears only once that has lasted a moment (so the few hundred milliseconds of connecting
// never flash a video) and goes as soon as the process is back.
const found = new Map<string, string>()   // base -> playable URL; a miss is not remembered, a recording may be made while the deck is open

async function lookup(base: string): Promise<string | null> {
  if (found.has(base)) return found.get(base)!
  const probe = document.createElement('video')
  for (const url of recordingCandidates(base, (m) => probe.canPlayType(m))) {
    try {
      const r = await fetch(url, { method: 'HEAD', signal: AbortSignal.timeout(3000) })
      if (isVideoResponse(r.status, r.headers.get('content-type'))) { found.set(base, url); return url }
    } catch { /* try the next one */ }
  }
  return null
}

export function useRecording(id: () => string, prop: () => string | undefined, offline: Ref<boolean>, active: Ref<boolean>) {
  const base = computed(() => recordingBase(prop(), id(), import.meta.env.BASE_URL))
  const src = ref<string | null>(null)
  const waited = ref(false)
  const looked = ref(false)   // the lookup for a recording has finished (found or not)
  const reduced = ref(false)
  let timer = 0
  watch(active, async (a) => {
    if (!a) { src.value = null; looked.value = false; return }
    reduced.value = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
    const b = base.value
    const url = await lookup(b)
    if (active.value && b === base.value) { src.value = url; looked.value = true }
  }, { immediate: true })
  watch([offline, active], ([off, a]) => {
    clearTimeout(timer); waited.value = false
    if (off && a) timer = window.setTimeout(() => { waited.value = true }, 700)
  }, { immediate: true })
  onUnmounted(() => clearTimeout(timer))
  const shown = computed(() => active.value && offline.value && waited.value && !!src.value)
  // True while a recording may still take the place of the offline notice: the notice must not flash before it.
  const pending = computed(() => active.value && offline.value && (!looked.value || (!!src.value && !waited.value)))
  return { shown, pending, src, poster: computed(() => `${base.value}.jpg`), reduced }
}
