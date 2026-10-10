// Lockstep recording: the recorder drives time instead of watching it. One tick is 1/fps second of virtual time, then one
// lossless frame. The result is exactly `fps` frames a second whatever the speed of the machine. See docs/RECORDING.md.
//
// Three sources of time are brought under the recorder's control:
//   - CDP `Emulation.setVirtualTimePolicy`: setTimeout, setInterval, performance.now and Date.now follow the budget the
//     recorder hands out (1/fps second per tick);
//   - an in-page shim (PAGE_SHIM, installed before the deck loads): requestAnimationFrame only runs once per tick, and the
//     CSS animations, transitions and Web Animations are paused and set to the virtual time. Chrome's own animation clock
//     follows real frames, not virtual time (measured), so these two cannot be left to the browser;
//   - a barrier, `window.__ndLockstep`: a component that waits for something real (a frame from a Python process, the answer
//     of the runner) calls `hold()`, and the recorder takes no frame until every hold is released.

export const DEFAULT_FPS = 60
export const MIN_FPS = 24, MAX_FPS = 120

export const tickMs = (fps = DEFAULT_FPS) => 1000 / fps
// Ticks that cover `ms` of virtual time (a wait of 100 ms at 60 fps is 6 ticks).
export const ticksFor = (ms, fps = DEFAULT_FPS) => Math.max(0, Math.round((ms * fps) / 1000))
// The exact start of tick n (1-based) in virtual milliseconds since the recording began.
export const tickTime = (n, fps = DEFAULT_FPS) => (n * 1000) / fps

// Which clock records a component, and why a clip is not lockstepped. { lockstep, reason }.
export function chooseClock({ realtime = false, kind, cfgRealtime = false }) {
  if (realtime) return { lockstep: false, reason: 'asked for with --realtime' }
  if (cfgRealtime) return { lockstep: false, reason: 'the config of this clip says "realtime": true' }
  if (kind === 'demo') return { lockstep: false, reason: 'a marimo demo runs in its own process (a cross-origin frame), where the recorder cannot hold time. Its output changes in steps: the clip waits for each step to settle and holds frames' }
  if (kind === 'live') return { lockstep: false, reason: 'live code waits for a Python runner that answers in real time, and lockstep does not cover it yet: the clip is filmed as it plays and holds frames' }
  return { lockstep: true, reason: null }
}

export function withTimeout(promise, ms, what) {
  let timer
  const limit = new Promise((_, fail) => { timer = setTimeout(() => fail(new Error(`${what} (no answer after ${Math.round(ms / 1000)} s)`)), ms) })
  return Promise.race([promise, limit]).finally(() => clearTimeout(timer))
}

// Runs in the page, before the deck's own scripts (page.addInitScript). Until the first tick every function is the browser's
// own, so the deck loads and settles normally. Self-contained: it is sent to the page as text.
function installShim() {
  if (window.__ndLockstep) return
  const L = { on: true, started: false, busy: 0, n: 0, t: 0, holders: new Map(), waiters: [] }
  window.__ndLockstep = L
  const realRaf = window.requestAnimationFrame.bind(window), realCaf = window.cancelAnimationFrame.bind(window)
  const queue = new Map()
  const BASE = 1e9   // ids of the callbacks queued by the shim; the browser's own ids stay below
  let next = BASE

  window.requestAnimationFrame = (cb) => { if (!L.started) return realRaf(cb); queue.set(++next, cb); return next }
  window.cancelAnimationFrame = (id) => { if (id > BASE) queue.delete(id); else realCaf(id) }

  // The barrier: hold() until something real has happened, then call what it returned.
  let ids = 0
  const wake = () => { for (const w of L.waiters.splice(0)) w() }
  L.hold = (who = 'a component') => {
    const id = ++ids; L.holders.set(id, who); L.busy++
    let done = false
    return () => { if (done) return; done = true; L.holders.delete(id); L.busy--; if (!L.busy) wake() }
  }
  // Resolves when nothing is held, after the promise callbacks (Vue's nextTick) and one more task have run.
  L.idle = () => new Promise((resolve) => {
    const check = () => {
      if (L.busy) { L.waiters.push(check); return }
      // A task that virtual time does not hold back (MessageChannel and postMessage hang while it is paused; BroadcastChannel does not).
      const name = `nd-idle-${Math.random()}`, a = new BroadcastChannel(name), b = new BroadcastChannel(name)
      b.onmessage = () => { a.close(); b.close(); if (L.busy) L.waiters.push(check); else resolve() }
      a.postMessage(0)
    }
    check()
  })
  L.who = () => [...L.holders.values()]

  // CSS animations, transitions and Web Animations: paused, and set to the virtual time at every tick. The ones that exist when
  // the recording starts go on from where they are; the ones born later start at 0 when first seen.
  const seen = new WeakMap()
  const sync = (t) => {
    for (const a of document.getAnimations()) {
      if (a.timeline !== document.timeline) continue
      let s = seen.get(a)
      if (!s) {
        s = L.n <= 1 ? { t0: t - L.dt, c0: Number(a.currentTime) || 0 } : { t0: t, c0: 0 }
        s.skip = a.playState === 'finished' || a.playState === 'paused'
        seen.set(a, s)
        if (!s.skip) a.pause()
      }
      if (s.skip) continue
      const cur = s.c0 + (t - s.t0) * (a.playbackRate || 1)
      const end = a.effect?.getComputedTiming?.().endTime
      if (Number.isFinite(end) && cur >= end) { s.skip = true; try { a.finish() } catch { /* already over */ } } else a.currentTime = cur
    }
  }

  L.start = (fps) => {
    L.started = true; L.dt = 1000 / fps
    // The callbacks the browser already holds run once, and register again with the shim.
    return new Promise((r) => realRaf(() => realRaf(() => r())))
  }
  L.step = (n, t) => {
    L.n = n; L.t = t
    sync(t)
    const callbacks = [...queue.values()]
    queue.clear()
    const now = performance.now()
    for (const cb of callbacks) { try { cb(now) } catch (e) { reportError(e) } }
    sync(t)
    window.dispatchEvent(new CustomEvent('nd-tick', { detail: { n, t } }))
    return L.idle()
  }
}

export const PAGE_SHIM = `(${installShim.toString()})()`

// The clock of a page: pause virtual time, then one `tick()` per frame (it ends by calling `capture`). `cdp` is a CDP session of the page, `page` the Playwright page.
export class LockstepClock {
  constructor({ page, cdp, fps = DEFAULT_FPS, stepTimeout = 60000 }) {
    this.page = page; this.cdp = cdp; this.fps = fps; this.stepTimeout = stepTimeout
    this.n = 0
    this.expired = null
    this.capture = null   // async (n) => void, called after every tick: takes the frame
    cdp.on('Emulation.virtualTimeBudgetExpired', () => this.expired?.())
  }

  // Takes over the animation sources, then pauses the page's virtual time where it is (performance.now carries on from the same
  // value). In this order: once time is paused the browser stops producing frames by itself, and the callbacks it already holds
  // need two real ones to move to the shim.
  async start() {
    await withTimeout(this.page.evaluate((fps) => window.__ndLockstep.start(fps), this.fps), 10000, 'the page did not start lockstep (is the shim installed?)')
    await this.cdp.send('Emulation.setVirtualTimePolicy', { policy: 'pause' })
  }

  async advance() {
    const done = new Promise((r) => { this.expired = r })
    await this.cdp.send('Emulation.setVirtualTimePolicy', { policy: 'advance', budget: tickMs(this.fps), maxVirtualTimeTaskStarvationCount: 1000 })
    await withTimeout(done, this.stepTimeout, 'virtual time did not advance')
  }

  // One frame of time: the timers of the next 1/fps second run, the animations move, then it waits until nothing real is pending, then the frame is taken.
  async tick() {
    const n = ++this.n
    await this.advance()
    const wait = this.page.evaluate(([i, t]) => window.__ndLockstep.step(i, t), [n, tickTime(n, this.fps)])
    try { await withTimeout(wait, this.stepTimeout, 'a component never answered') } catch (e) {
      const who = await this.page.evaluate(() => window.__ndLockstep.who()).catch(() => [])
      throw new Error(`tick ${n}: ${e.message}${who.length ? `; still waiting for: ${who.join(', ')}` : ''}`)
    }
    await this.capture?.(n)
    return n
  }

  // `ms` of virtual time, as ticks (each one is a frame).
  async sleep(ms) {
    for (let i = ticksFor(ms, this.fps); i > 0; i--) await this.tick()
  }
}
