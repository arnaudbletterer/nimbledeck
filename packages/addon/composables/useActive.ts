import { computed } from 'vue'
import { useNav, useSlideContext } from '@slidev/client'

// True only while this component's slide is the one on screen. Slidev keeps neighbouring slides
// mounted for transitions, so live components (animations, sockets) must gate on this.
export function useActive() {
  const { currentPage } = useNav()
  const { $page } = useSlideContext()
  return computed(() => $page.value === currentPage.value)
}
