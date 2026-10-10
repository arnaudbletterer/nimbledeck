// The component side of lockstep recording (`nimbledeck record`, docs/RECORDING.md). Outside a recording `window.__ndLockstep`
// does not exist and every function here returns null: the components behave exactly as they always did.
//
// During a recording the recorder installs `window.__ndLockstep` before the deck loads and drives time itself: one `nd-tick`
// event per 1/60 s of virtual time (detail: { n, t }, t in virtual milliseconds), then one screenshot. A component that has to
// wait for something real (a frame from its Python process, the answer of the runner) takes a hold; the recorder takes no
// screenshot until every hold is released. Holds must always be released, or the recorder stops with a clear error that names
// the component.

export interface Lockstep {
  readonly on: true
  /** True once the first tick has come (before that the deck is loading in real time). */
  readonly started: boolean
  /** The current tick, 1-based, and its virtual time in ms since the recording began. */
  readonly n: number
  readonly t: number
  /** Holds the next screenshot until the returned function is called. `who` names the holder in error messages. */
  hold(who?: string): () => void
}

declare global { interface Window { __ndLockstep?: Lockstep } }

export const useLockstep = (): Lockstep | null => (typeof window === 'undefined' ? null : window.__ndLockstep ?? null)
