import { reactive } from 'vue'

// What the walls tell the slide that holds them: the preset or look a click applied last. <MotionWall> and <LookWall> write it,
// <WallDemo> reads it and plays the preset on the slide's own title, block and backdrop. One page shows one slide at a time,
// so one store is enough.
export const wall = reactive({
  motion: 'pop', bg: 'aurora', look: '',
  label: 'motion: pop',        // the last applied line, shown large near the title
  n: 0,                         // bumps on every applied motion: replay the slide's own elements
  k: 0,                         // bumps on every applied line: re-pops the label
  bgOn: false,                  // a backdrop is showing behind the slide
})
let timer = 0
const bump = (label: string) => { wall.label = label; wall.k++ }
export function applyMotion(id: string) { wall.motion = id; wall.n++; bump(`motion: ${id}`) }
export function applyBackground(id: string, ms = 5000) {
  wall.bg = id; wall.bgOn = true; bump(`background: ${id}`)
  clearTimeout(timer); timer = window.setTimeout(() => { wall.bgOn = false }, ms)
}
export function applyLook(id: string) { wall.look = id; bump(`ndVariant: ${id}`) }
export function resetWall() { clearTimeout(timer); Object.assign(wall, { motion: 'pop', bg: 'aurora', look: '', label: 'motion: pop', n: 0, k: 0, bgOn: false }) }

// A preset plays again when its attribute is removed, the style is computed, and the attribute is put back. The typewriter
// preset also needs the title's start and width, and every preset the title's length (the one measurement these components make).
export function replayPreset(el: HTMLElement, id: string) {
  el.removeAttribute('data-nd-motion'); void el.offsetWidth
  const title = el.querySelector('h1') as HTMLElement | null
  el.style.setProperty('--nd-ch', String(Math.max(4, (title?.textContent ?? '').trim().length || 12)))
  if (id === 'typewriter' && title) {
    const r = document.createRange(); r.selectNodeContents(title)
    const t = r.getBoundingClientRect(), b = title.getBoundingClientRect(), k = title.offsetWidth ? b.width / title.offsetWidth : 0
    if (k && t.width) { el.style.setProperty('--nd-tw-x', `${((t.left - b.left) / k).toFixed(1)}px`); el.style.setProperty('--nd-tw-w', `${(t.width / k + 8).toFixed(1)}px`) }
  }
  el.setAttribute('data-nd-motion', id)
}
