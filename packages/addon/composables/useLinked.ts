import { computed, onBeforeUnmount, ref } from 'vue'
import { links, parseHighlight, termColor } from './links.mjs'

// For a visualization with a `highlight` prop: which term of a nearby <Equation> is pointed at, if this component answers to it.
// `linked` is { id, note } or null; `linkAttrs` goes on the component's root with v-bind (it sets data-linked and the term colour
// the stylesheet draws a ring and a note in, over a live component and over its recording alike).
export function useLinked(highlight: () => Record<string, string> | string[] | undefined) {
  const map = computed(() => parseHighlight(highlight()))
  const term = ref<string | null>(links.term())
  const off = links.onTerm((t: string | null) => { term.value = t })
  onBeforeUnmount(off)
  const linked = computed(() => (term.value !== null && term.value in map.value ? { id: term.value, note: map.value[term.value] } : null))
  const linkAttrs = computed(() => (linked.value ? { 'data-linked': linked.value.id, style: { '--nd-tc': termColor(linked.value.id) } } : {}))
  return { linked, linkAttrs }
}
