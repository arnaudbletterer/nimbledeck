import { onBeforeUnmount, ref, watch, type Ref } from 'vue'

// True from two frames after `active` turns on, false as soon as it turns off. A class bound to it starts from its "off" look
// on first paint, so a CSS transition has something to run from (a slide opened directly is active before it is painted).
export function useEntered(active: Ref<boolean>) {
  const on = ref(false)
  let raf = 0
  watch(active, (a) => {
    cancelAnimationFrame(raf)
    if (!a) { on.value = false; return }
    raf = requestAnimationFrame(() => { raf = requestAnimationFrame(() => { on.value = true }) })
  }, { immediate: true })
  onBeforeUnmount(() => cancelAnimationFrame(raf))
  return on
}
