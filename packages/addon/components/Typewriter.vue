<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useActive } from '../composables/useActive'
import { highlight } from '../composables/highlight'

// Types its content character by character with a blinking caret: <Typewriter lang="md" :speed="38"> and a fenced
// block (or plain text) as the slot. `lang` is md, sh, py, json or html. With lang="sh" a line starting with "$ " is
// typed and every other line appears at once as output. `keep` leaves the text on screen when it is done (false fades
// it out after a moment). The root gets the class `nd-done` when the typing has finished, so a deck can chain on it.
// `size` is the font size: a number in slide pixels (default 22) or any CSS length. `text` is an alternative to the slot (used by <Terminal>). Leaving the slide stops it and resets it.
const props = withDefaults(defineProps<{ speed?: number; delay?: number; lang?: string; caret?: boolean; keep?: boolean; text?: string; size?: number | string }>(), { speed: 38, delay: 400, lang: 'md', caret: true, keep: true })
const emit = defineEmits<{ (e: 'done', v: boolean): void }>()

const reduce = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches
const active = useActive()
const srcEl = ref<HTMLElement>()
const slotted = ref('')
const source = computed(() => props.text ?? slotted.value)
const tokens = computed(() => highlight(source.value, props.lang))

// The slot is rendered hidden and read as text, so a Shiki-highlighted fence and plain words both work.
function readSlot() {
  const el = srcEl.value
  if (!el) return
  const pre = el.querySelectorAll('pre')
  const blocks = pre.length ? [...pre].map((p) => { const ls = p.querySelectorAll('.line'); return ls.length ? [...ls].map((l) => l.textContent).join('\n') : p.textContent }) : [...el.children].map((c) => c.textContent)
  slotted.value = (blocks.length ? blocks.join('\n') : el.textContent ?? '').replace(/^\s*\n/, '').trimEnd()
}
onMounted(readSlot)

const jitter = (i: number) => { const s = Math.sin(i * 12.9898) * 43758.5453; return s - Math.floor(s) }

// Per-character reveal times in ms. Typed lines get a small deterministic jitter and longer pauses after punctuation and
// line ends; output lines (sh) arrive whole, a short beat after the command that produced them.
const plan = computed(() => {
  const src = source.value, sh = props.lang === 'sh', times: number[] = []
  let t = 0, prevTyped = false
  const lines = src.split('\n')
  lines.forEach((line, li) => {
    const typed = !sh || line.startsWith('$ ')
    if (li > 0) t += typed ? (prevTyped ? 170 : 380) : (prevTyped ? 300 : 70)
    let ind = true
    for (let i = 0; i < line.length; i++) {
      const c = line[i]
      if (typed) {
        if (sh && i < 2) { times.push(t); continue }              // the "$ " prompt is part of the line, not typed
        if (ind && c === ' ') { times.push(t); continue }          // indentation appears at once
        ind = false
        t += props.speed * (0.7 + 0.6 * jitter(times.length)) + (/[,.;:!?]/.test(c) ? props.speed * 1.6 : 0)
      }
      times.push(t)
    }
    if (li < lines.length - 1) times.push(t)                       // the newline
    prevTyped = typed
  })
  return { times, end: t }
})

const n = ref(0)
const done = ref(false)
const fading = ref(false)
let raf = 0, t0 = 0, doneAt = 0
function stop() { cancelAnimationFrame(raf); raf = 0 }
function reset() { stop(); n.value = 0; done.value = false; fading.value = false }
function finish() { n.value = plan.value.times.length; done.value = true; stop() }
function tick(now: number) {
  const el = now - t0 - props.delay, ts = plan.value.times
  let c = n.value
  while (c < ts.length && ts[c] <= el) c++
  if (c !== n.value) n.value = c
  if (c >= ts.length) {
    if (!done.value) { done.value = true; doneAt = now }
    if (props.keep || now - doneAt > 1800) { if (!props.keep) fading.value = true; stop(); return }
  }
  raf = requestAnimationFrame(tick)
}
function begin() {
  reset()
  if (!source.value) return
  if (reduce) { finish(); return }
  t0 = performance.now()
  raf = requestAnimationFrame(tick)
}
watch([active, source], ([a]) => { if (a) begin(); else reset() }, { immediate: true })
watch(done, (d) => emit('done', d))
onBeforeUnmount(stop)

const fontSize = computed(() => (props.size == null ? undefined : typeof props.size === 'number' ? props.size + 'px' : props.size))
const shown = computed(() => tokens.value.filter((t) => t.start < n.value).map((t) => ({ ...t, text: t.text.slice(0, n.value - t.start) })))
</script>

<template>
  <div class="nd-typewriter" :class="{ 'nd-done': done, 'nd-tw-typing': !done && n > 0, 'nd-tw-gone': fading }" :data-lang="lang" :style="fontSize ? { '--nd-tw-size': fontSize } : undefined" data-kind="typewriter">
    <div ref="srcEl" class="nd-tw-src"><slot /></div>
    <pre class="nd-tw-ghost" aria-hidden="true">{{ source }}</pre>
    <pre class="nd-tw-live" :aria-label="source"><span v-for="(t, i) in shown" :key="i" :class="t.cls ? `nd-t-${t.cls}` : undefined">{{ t.text }}</span><i v-if="caret" class="nd-tw-caret" /></pre>
  </div>
</template>
