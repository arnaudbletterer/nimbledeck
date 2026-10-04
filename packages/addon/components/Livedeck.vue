<script setup lang="ts">
import { computed, ref } from 'vue'
import Typewriter from './Typewriter.vue'

// Markdown typed on the left, the slides it describes appearing on the right, one by one as each is finished:
//   <Livedeck> and a fenced md block with two to four slides (`---`, `layout: hero`, `---`, `# Title`, `#### subtitle`).
// It reads `layout` (hero, statement, closing; anything else is drawn as statement), `# Title` (**bold** is coloured with
// the accent) and `#### kicker`. The preview is a small renderer of its own, drawn from the --nd-* tokens, a sketch of what
// the theme layouts look like and not a screenshot of them. `speed` is ms per character, `delay` ms before typing, `size`
// the font size of the source. Leaving the slide resets it; reduced motion shows the finished deck at once.
withDefaults(defineProps<{ speed?: number; delay?: number; size?: number }>(), { speed: 24, delay: 700, size: 24 })

interface Slide { layout: string; kicker: string; title: string; end: number }
const text = ref('')
const typed = ref(0)

function parse(src: string): Slide[] {
  const lines = src.split('\n')
  const at: number[] = []
  let off = 0
  for (const l of lines) { at.push(off); off += l.length + 1 }
  const out: Slide[] = []
  let i = 0
  while (i < lines.length) {
    let layout = 'statement'
    if (lines[i].trim() === '---') {
      let j = i + 1
      while (j < lines.length && lines[j].trim() !== '---') j++
      for (let k = i + 1; k < j; k++) { const m = /^layout:\s*(\S+)/.exec(lines[k]); if (m) layout = m[1] }
      i = j + 1
    }
    const s: Slide = { layout, kicker: '', title: '', end: 0 }
    while (i < lines.length && !(lines[i].trim() === '---' && /^[\w-]+:/.test(lines[i + 1] ?? ''))) {
      const l = lines[i]
      if (l.trim()) s.end = at[i] + l.length
      if (l.startsWith('#### ')) s.kicker = l.slice(5)
      else if (l.startsWith('# ')) s.title = l.slice(2)
      i++
    }
    if (s.title || s.kicker) out.push(s)
  }
  return out
}
const slides = computed(() => parse(text.value))
const built = computed(() => slides.value.filter((s) => typed.value >= s.end).length)
const cur = computed(() => (built.value > 0 ? slides.value[built.value - 1] : null))
const kind = (l: string) => (l === 'hero' || l === 'closing' ? l : 'statement')
// "Ship it **Friday**." -> pieces, the bold ones coloured.
const pieces = (t: string) => t.split(/\*\*(.+?)\*\*/).map((p, i) => ({ p, hi: i % 2 === 1 }))
</script>

<template>
  <div class="nd-ld" :class="{ 'nd-ld-done': slides.length > 0 && built === slides.length }" data-kind="livedeck">
    <div class="nd-ld-src">
      <span class="nd-ld-tag">slides.md</span>
      <Typewriter lang="md" :speed="speed" :delay="delay" :size="size" @progress="(n: number) => (typed = n)" @source="(t: string) => (text = t)"><slot /></Typewriter>
    </div>
    <div class="nd-ld-view" role="img" :aria-label="`${built} of ${slides.length} slides built from the Markdown`">
      <div class="nd-ld-frame">
        <p v-if="!cur" class="nd-ld-wait">The first slide appears here</p>
        <Transition name="nd-ld-card">
          <div v-if="cur" :key="built" class="nd-ld-card" :class="`nd-ld-${kind(cur.layout)}`" aria-hidden="true">
            <div class="nd-ld-slide">
              <div class="nd-ld-in">
                <p v-if="cur.kicker" class="nd-ld-kicker">{{ cur.kicker }}</p>
                <p class="nd-ld-title"><template v-for="(c, i) in pieces(cur.title)" :key="i"><span :class="{ 'nd-ld-hi': c.hi }">{{ c.p }}</span></template></p>
              </div>
            </div>
          </div>
        </Transition>
      </div>
      <ol class="nd-ld-strip" aria-hidden="true">
        <li v-for="(s, i) in slides" :key="i" :class="{ 'nd-ld-on': i < built, 'nd-ld-now': i === built - 1 }"><b>{{ i + 1 }}</b> {{ s.layout }}</li>
      </ol>
    </div>
  </div>
</template>
