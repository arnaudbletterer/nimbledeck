<script setup lang="ts">
import { computed, onBeforeUnmount, onUnmounted, ref, watch, nextTick } from 'vue'
import { useSlideContext } from '@slidev/client'
import { useActive } from '../composables/useActive'
import { links, formatValue, revealed } from '../composables/links.mjs'

// An equation written as LaTeX in the Markdown ($$ ... $$), made linkable. Put the $$ block inside the tag, with blank lines
// around it (docs/EQUATIONS.md):
//   <Equation label="Lorenz system" :params="{ sigma: 10 }" :reveal="['1', '2']">
//
//   $$ \dot x = \term{1}{\sigma}\,(y - x) $$
//
//   </Equation>
// \term{n}{...} marks a part (colour n of the chart tokens, name "n"). Pointing at a part, or a tour hover, sets the shared term:
// the parts that do not match recede, and a visualization with `highlight` answers (see composables/links.mjs).
// \val{name}{10} is a number that follows the parameter `name`, published by a slider of PyStream (`params`) or another
// component; `params` gives the starting values, `decimals` the places shown (a number, or one per name).
// `reveal` lists term ids: they appear one per click, in that order. The rest of the equation is always there.
// `label` is the reading for a screen reader (the LaTeX is hidden from it, because live numbers would be stale in it).
// Only the shared state and the classes of the equation change; the typesetting is done at build time and never moves.
const props = withDefaults(defineProps<{ label?: string; size?: number; align?: 'center' | 'left'; params?: Record<string, number>; decimals?: number | Record<string, number>; reveal?: string[] }>(), { align: 'center' })
const root = ref<HTMLElement>()
const active = useActive()
const { $clicksContext: clicks } = useSlideContext()

// One click per term of `reveal`, counted like the line highlight of a $$ block.
const info = props.reveal?.length ? clicks?.calculateSince('+1', props.reveal.length) : null
const token = Math.random().toString(36).slice(2)
if (info) clicks!.register(token, info)
onUnmounted(() => { if (info) clicks!.unregister(token) })
const shown = computed(() => (info ? revealed(props.reveal, Math.min(props.reveal!.length, clicks!.current - info.start + 1)) : null))

const termEls = () => [...(root.value?.querySelectorAll<HTMLElement>('[data-term]') ?? [])]
const places = (name: string) => (typeof props.decimals === 'number' ? props.decimals : props.decimals?.[name]) ?? 2

function paint() {
  const el = root.value
  if (!el) return
  const now = active.value ? links.term() : null
  let hit = false
  for (const t of termEls()) {
    const id = t.dataset.term!
    const box = (t.closest('.nd-tm') as HTMLElement | null) ?? t
    const on = now !== null && id === now
    hit ||= on
    box.classList.toggle('nd-on', on)
    box.classList.toggle('nd-hid', !!shown.value && !!props.reveal?.includes(id) && !shown.value.has(id))
  }
  if (hit) el.dataset.linked = now!
  else delete el.dataset.linked
}
function fill(name?: string) {
  for (const v of root.value?.querySelectorAll<HTMLElement>('[data-val]') ?? []) {
    const key = v.dataset.val!
    if (name && key !== name) continue
    const value = links.param(key)
    if (value === undefined) continue
    const span = document.createElement('span')
    span.className = 'mord'
    span.textContent = formatValue(value, places(key))
    v.replaceChildren(span)
  }
}

let offTerm = () => {}, offParam = () => {}
watch(active, async (a) => {
  offTerm(); offParam()
  if (!a) { if (links.term() !== null) links.setTerm(null); paint(); return }
  await nextTick()
  for (const [k, v] of Object.entries(props.params ?? {})) if (links.param(k) === undefined) links.setParam(k, v)
  offTerm = links.onTerm(paint)
  offParam = links.onParam(fill)
  fill(); paint()
}, { immediate: true, flush: 'post' })
watch(shown, paint, { flush: 'post' })
onBeforeUnmount(() => { offTerm(); offParam(); if (root.value?.dataset.linked && links.term() === root.value.dataset.linked) links.setTerm(null) })

const termOf = (e: Event) => (e.target as HTMLElement | null)?.closest?.('[data-term]') as HTMLElement | null
function over(e: PointerEvent) { if (active.value) links.setTerm(termOf(e)?.dataset.term ?? null) }
function out(e: PointerEvent) { if (active.value && !(e.relatedTarget as HTMLElement | null)?.closest?.('[data-term]')) links.setTerm(null) }
</script>

<template>
  <div ref="root" class="nd-eq" :class="{ 'nd-eq-left': align === 'left' }" data-kind="equation" role="math" :aria-label="label"
       :style="size ? { '--nd-eq-size': size + 'px' } : undefined" @pointerover="over" @pointerout="out">
    <div :aria-hidden="label ? 'true' : undefined"><slot /></div>
  </div>
</template>
