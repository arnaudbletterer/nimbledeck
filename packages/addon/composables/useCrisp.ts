import { computed, onMounted, onUnmounted, ref, type Ref } from 'vue'
import { useSlideContext } from '@slidev/client'

// Pixels a canvas may hold: keeps even a full-frame canvas on a 4K screen fast.
const MAX_PIXELS = 4096 * 2304

// How many physical pixels to render per logical unit so a canvas is sharp where it is shown:
//   (displayed size in slide units) x (slide scale on screen) x (device pixel ratio).
// The element is measured in slide units (unaffected by the slide's CSS scale). A hidden slide measures 0, so the last
// good measurement (or the logical size) is kept instead of ever producing a 0 pixel canvas.
export function useCrisp(el: Ref<HTMLElement | undefined>, logical: { w: number; h: number }) {
  const { $scale } = useSlideContext()
  const dpr = ref(window.devicePixelRatio || 1)
  const box = ref({ w: logical.w, h: logical.h })
  let ro: ResizeObserver | undefined
  const measure = () => {
    const e = el.value
    if (e && e.clientWidth > 0 && e.clientHeight > 0) box.value = { w: e.clientWidth, h: e.clientHeight }
  }
  const onResize = () => { dpr.value = window.devicePixelRatio || 1 }
  onMounted(() => {
    measure()
    if (el.value && 'ResizeObserver' in window) { ro = new ResizeObserver(measure); ro.observe(el.value) }
    window.addEventListener('resize', onResize)
  })
  onUnmounted(() => { ro?.disconnect(); window.removeEventListener('resize', onResize) })

  /** physical pixels per logical unit */
  const k = computed(() => {
    const fit = Math.min(box.value.w / logical.w, box.value.h / logical.h)       // object-fit: contain
    const want = fit * ($scale?.value ?? 1) * dpr.value
    const cap = Math.sqrt(MAX_PIXELS / (logical.w * logical.h))
    return Math.max(0.5, Math.min(want, cap))
  })
  return { k }
}
