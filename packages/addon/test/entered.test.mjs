// useEntered: the flag a transition-based component binds a class to. It must start "off" on first paint (so the CSS has
// something to animate from), turn on two frames after the slide is entered, and drop at once when the slide is left.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { registerHooks } from 'node:module'
import { nextTick, ref } from 'vue'

registerHooks({
  resolve(spec, ctx, next) {
    try { return next(spec, ctx) } catch (e) { if (spec.startsWith('.') && !/\.\w+$/.test(spec)) return next(`${spec}.ts`, ctx); throw e }
  },
})
const { useEntered } = await import('../composables/useEntered.ts')

// A manual frame clock: nothing runs until `frame()` is called.
let queue = new Map(), id = 0
globalThis.requestAnimationFrame = (fn) => { queue.set(++id, fn); return id }
globalThis.cancelAnimationFrame = (n) => { queue.delete(n) }
const frame = () => { const run = [...queue.values()]; queue = new Map(); run.forEach((fn) => fn()) }
const pending = () => queue.size
// Vue warns that onBeforeUnmount has no component here; that is expected outside a component.
const warn = console.warn
console.warn = () => {}
process.on('exit', () => { console.warn = warn })

test('a slide that is active from the start is still off on first paint, then on after two frames', () => {
  const on = useEntered(ref(true))
  assert.equal(on.value, false, 'first paint is the "off" look')
  frame()
  assert.equal(on.value, false, 'one frame is not enough')
  frame()
  assert.equal(on.value, true)
})

test('an inactive slide stays off and schedules nothing', () => {
  const before = pending()
  const on = useEntered(ref(false))
  frame(); frame()
  assert.equal(on.value, false)
  assert.equal(pending(), before)
})

test('entering turns it on after two frames, leaving turns it off at once', async () => {
  const active = ref(false)
  const on = useEntered(active)
  active.value = true
  await nextTick()
  assert.equal(on.value, false)
  frame(); frame()
  assert.equal(on.value, true)
  active.value = false
  await nextTick()
  assert.equal(on.value, false, 'no frame needed to switch off')
})

test('leaving before the frames elapse cancels the pending turn-on', async () => {
  const active = ref(false)
  const on = useEntered(active)
  active.value = true
  await nextTick()
  frame()                       // one of two frames
  active.value = false
  await nextTick()
  frame(); frame(); frame()
  assert.equal(on.value, false, 'a slide that was left must not light up later')
  assert.equal(pending(), 0, 'and leaves no frame callback behind')
})

test('entering twice quickly runs a single turn-on, and re-entering replays from off', async () => {
  const active = ref(false)
  const on = useEntered(active)
  active.value = true; await nextTick()
  active.value = false; await nextTick()
  active.value = true; await nextTick()
  assert.equal(pending(), 1, 'the first request was cancelled, only one is pending')
  frame(); frame()
  assert.equal(on.value, true)
  active.value = false; await nextTick()
  active.value = true; await nextTick()
  assert.equal(on.value, false, 're-entry starts from the off look again')
  frame(); frame()
  assert.equal(on.value, true)
})
