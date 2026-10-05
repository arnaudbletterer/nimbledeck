import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useNav, useSlideContext } from '@slidev/client'

// How long a slide stays "active" after the page has moved on, so that what is on it keeps its look while the slide
// transition fades it out (text that vanished at once would make the transition look broken).
const LINGER_MS = 650

// True only while this component's slide is the one on screen. Slidev keeps neighbouring slides
// mounted for transitions, so live components (animations, sockets) must gate on this.
// The flag stays true for a moment after the slide is left, so the leaving slide is not stripped during its transition.
export function useActive() {
  const { currentPage } = useNav()
  const { $page } = useSlideContext()
  const current = computed(() => $page.value === currentPage.value)
  const held = ref(current.value)
  let timer = 0
  watch(current, (c) => {
    clearTimeout(timer)
    if (c) held.value = true
    else timer = window.setTimeout(() => { held.value = false }, LINGER_MS)
  })
  onBeforeUnmount(() => clearTimeout(timer))
  return computed(() => current.value || held.value)
}
