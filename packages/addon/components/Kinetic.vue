<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useActive } from '../composables/useActive'

// Kinetic typography: <Kinetic text="Slides that move." mode="words" from="up" :stagger="70" size="xl" accent="move" />
// Plays when its slide becomes active and again on every re-entry. `mode` splits into words, letters or lines (lines
// split on "|" in `text`). `hold` keeps it hidden until a v-click reveals it, or until `trigger` is above 0; any later
// change of `trigger` replays it. `delay` (ms) waits before the first unit moves, so a subtitle can follow its headline;
// `tone="muted"` uses the muted ink. Reduced motion shows the final text at once.
const props = withDefaults(defineProps<{
  text: string
  mode?: 'words' | 'letters' | 'lines'
  from?: 'up' | 'down' | 'left' | 'right' | 'blur' | 'scale' | 'mask'
  stagger?: number
  size?: 'xl' | 'l' | 'm' | 's'
  tone?: 'auto' | 'light' | 'dark' | 'muted'
  accent?: string
  hold?: boolean
  trigger?: number
  delay?: number
}>(), { mode: 'words', from: 'up', size: 'xl', tone: 'auto', trigger: 0, delay: 0 })

const reduce = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches
const root = ref<HTMLElement>()
const active = useActive()
const shown = ref(false)        // a v-click on the element made it visible
const playing = ref(false)
const run = ref(0)              // a new key remounts the units, which restarts their CSS animations

const st = computed(() => props.stagger ?? (props.mode === 'letters' ? 28 : props.mode === 'lines' ? 150 : 70))
const accents = computed(() => new Set((props.accent ?? '').split(',').map((w) => norm(w)).filter(Boolean)))
function norm(w: string) { return w.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '') }

interface Word { w: string; accent: boolean; letters: string[] }
const lines = computed(() => (props.mode === 'lines' ? props.text.split('|') : [props.text.replace(/\|/g, ' ')]).map((l) => l.trim()))
const words = computed<Word[][]>(() => lines.value.map((l) => l.split(/\s+/).filter(Boolean).map((w) => ({ w, accent: accents.value.has(norm(w)), letters: [...w] }))))

// Unit index, so each unit starts `i * stagger` after the first.
const index = computed(() => {
  let i = 0
  return words.value.map((line) => props.mode === 'lines' ? [i++] : line.map((wd) => {
    const start = i
    i += props.mode === 'letters' ? wd.letters.length : 1
    return start
  }))
})

const released = computed(() => !props.hold || shown.value || props.trigger > 0)
const go = computed(() => active.value && released.value)

function start() { playing.value = false; run.value++; nextTick(() => { playing.value = true }) }
watch(go, (g) => { if (g) start(); else playing.value = false }, { immediate: true })
watch(() => props.trigger, (t, o) => { if (go.value && t !== o && t > 0) start() })

// v-click on the element toggles Slidev's hidden class on our root.
let mo: MutationObserver | undefined
const syncClick = () => { shown.value = !!root.value && !root.value.classList.contains('slidev-vclick-hidden') }
onMounted(() => {
  if (!root.value) return
  syncClick()
  mo = new MutationObserver(syncClick)
  mo.observe(root.value, { attributes: true, attributeFilter: ['class'] })
})
onBeforeUnmount(() => mo?.disconnect())
</script>

<template>
  <div ref="root" class="nd-kinetic" :class="[`nd-k-${size}`, `nd-k-tone-${tone}`, `nd-k-from-${from}`, `nd-k-mode-${mode}`, { 'nd-k-play': playing && !reduce, 'nd-k-final': reduce }]"
       :style="{ '--nd-k-st': st + 'ms', '--nd-k-delay': delay + 'ms' }" :aria-label="text.replace(/\|/g, ' ')" data-kind="kinetic">
    <div :key="run" class="nd-k-in" aria-hidden="true">
      <template v-for="(line, li) in words" :key="li">
        <span v-if="mode === 'lines'" class="nd-k-line"><span class="nd-k-mask"><span class="nd-k-u" :style="{ '--i': index[li][0] }">{{ lines[li] }}</span></span></span>
        <template v-else>
          <template v-for="(wd, wi) in line" :key="wi">
            <span v-if="mode === 'words'" class="nd-k-word" :class="{ 'nd-k-accent': wd.accent }"><span class="nd-k-mask"><span class="nd-k-u" :style="{ '--i': index[li][wi] }">{{ wd.w }}</span></span></span>
            <span v-else class="nd-k-word nd-k-letters" :class="{ 'nd-k-accent': wd.accent }"><span v-for="(ch, ci) in wd.letters" :key="ci" class="nd-k-mask"><span class="nd-k-u" :style="{ '--i': index[li][wi] + ci }">{{ ch }}</span></span></span>
            {{ ' ' }}
          </template>
        </template>
      </template>
    </div>
  </div>
</template>
