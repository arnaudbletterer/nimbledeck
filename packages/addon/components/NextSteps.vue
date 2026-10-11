<script setup lang="ts">
import { computed } from 'vue'
import { useActive } from '../composables/useActive'

// The call to action of a closing slide: large link cards read from `window.__ND_SITE__` (the hosted site injects it):
// docs, playground, the science deck when there is one, GitHub, and "Replay the tour". Without it (the dev server, any
// other build) only the GitHub card shows, pointing at `github` (default: the project's repository).
// `skip` names cards to leave out (docs, playground, science, github, replay). Replay asks the site bar to go back to the first slide and play the tour, through the `nd-tour-replay` event.
const props = withDefaults(defineProps<{ github?: string; skip?: string[] }>(), { github: 'https://github.com/arnaudbletterer/nimbledeck' })
type Site = { docs?: string; playground?: string; science?: string; github?: string }
const site = (typeof window !== 'undefined' ? (window as unknown as { __ND_SITE__?: Site }).__ND_SITE__ : undefined)
const active = useActive()
interface Card { key: string; title: string; promise: string; href?: string; external?: boolean }
const cards = computed<Card[]>(() => {
  const list: Card[] = []
  if (site?.docs) list.push({ key: 'docs', title: 'Read the docs', promise: 'Every layout, component and rule, with examples.', href: site.docs })
  if (site?.playground) list.push({ key: 'playground', title: 'Open the playground', promise: 'Edit a layout and watch it change.', href: site.playground })
  if (site?.science) list.push({ key: 'science', title: 'See the science deck', promise: 'Live Python and equations in a real talk.', href: site.science })
  list.push({ key: 'github', title: 'Star it on GitHub', promise: 'Read the source, clone it, make a deck.', href: site?.github ?? props.github, external: true })
  if (site) list.push({ key: 'replay', title: 'Replay the tour', promise: 'Watch it play itself again, with sound.' })
  return list.filter((c) => !props.skip?.includes(c.key))   // `skip`: card keys to leave out (a deck does not link to itself)
})
const replay = () => window.dispatchEvent(new CustomEvent('nd-tour-replay'))
</script>

<template>
  <nav class="nd-next" :class="{ 'nd-next-on': active }" aria-label="Next steps" data-kind="nextsteps" @click.stop @keydown.stop @keyup.stop>
    <template v-for="(c, i) in cards" :key="c.key">
      <a v-if="c.href" class="nd-next-card" :class="`nd-next-${c.key}`" :style="{ '--i': i }" :href="c.href" :target="c.external ? '_blank' : undefined" :rel="c.external ? 'noopener' : undefined">
        <strong>{{ c.title }}</strong><span>{{ c.promise }}</span><i class="nd-next-arrow" aria-hidden="true">&#8594;</i>
      </a>
      <button v-else class="nd-next-card nd-next-replay" type="button" :style="{ '--i': i }" @click="replay">
        <strong>{{ c.title }}</strong><span>{{ c.promise }}</span><i class="nd-next-arrow" aria-hidden="true">&#8635;</i>
      </button>
    </template>
  </nav>
</template>
