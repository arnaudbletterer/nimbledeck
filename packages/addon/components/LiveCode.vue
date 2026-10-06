<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, reactive, ref, watch } from 'vue'
import { useSlideContext } from '@slidev/client'
import { EditorView, keymap } from '@codemirror/view'
import { EditorState, Prec } from '@codemirror/state'
import { basicSetup } from 'codemirror'
import { python } from '@codemirror/lang-python'
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language'
import { tags as t } from '@lezer/highlight'
import { useActive } from '../composables/useActive'
import { useNimbleConfig, cssVar } from '../composables/useConfig'
import { useRecording } from '../composables/useRecording'
import { sfx } from '../composables/useSound'
import { useLinked } from '../composables/useLinked'
import { RUN_LATENCY_MS, useLockstep } from '../composables/lockstep'

// Live code: edit Python on the slide and the result (printed output and matplotlib figures) updates as you type.
// The code runs in a local Python process started by `nimbledeck run` (config key `runner`), never in the browser.
// Write the starting code as a fenced block inside the component:
//   <LiveCode>
//
//   ```python
//   import matplotlib.pyplot as plt
//   plt.plot([1, 2, 3])
//   ```
//
//   </LiveCode>
// `auto` re-runs while you type (default); set `:auto="false"` for heavy code: run with the button or Cmd/Ctrl+Enter.
// Without the runner it plays the recording live-<id> made by `nimbledeck record` (id defaults to the slide number).
const props = withDefaults(defineProps<{ auto?: boolean; timeout?: number; frame?: boolean; id?: string; recording?: string; quiet?: boolean; highlight?: Record<string, string> | string[] }>(), { auto: true, timeout: 10, frame: false })
const { $scale, $page } = useSlideContext()
const { linked, linkAttrs } = useLinked(() => props.highlight)
const source = ref<HTMLElement>()
const editorHost = ref<HTMLElement>()
const result = ref<HTMLElement>()
const initial = ref('')
const state = ref<'idle' | 'running' | 'ok' | 'error' | 'offline'>('idle')
const ms = ref(0)
const stdout = ref(''), stderr = ref('')
const images = ref<string[]>([])
const stale = ref(false)   // the shown result is from older code than the editor holds
let view: EditorView | null = null, ws: WebSocket | null = null, debounce = 0, runId = 0, closed = true, reconnect = 0
// While `nimbledeck record` films this editor in lockstep (composables/lockstep.ts), a run holds the recorder's clock until the
// runner has answered, and the answer then appears RUN_LATENCY_MS of virtual time after the run began: the same instant in every
// re-recording, however long the runner really took.
const ls = useLockstep()
let holdRun: (() => void) | null = null, answer: { m: any; due: number } | null = null, launched = 0
const releaseRun = () => { holdRun?.(); holdRun = null }

const text = () => view?.state.doc.toString() ?? initial.value

async function connect() {
  if (closed) return
  const cfg = await useNimbleConfig()
  if (!cfg.runner || closed) { state.value = 'offline'; return }
  const sock = new WebSocket(`ws://127.0.0.1:${cfg.runner.port}/?t=${cfg.runner.token}`)
  ws = sock
  sock.onopen = () => { if (state.value === 'offline') state.value = 'idle'; run() }
  sock.onclose = () => { releaseRun(); if (ws !== sock) return; state.value = 'offline'; reconnect = window.setTimeout(connect, 2000) }
  sock.onerror = () => sock.close()
  sock.onmessage = (e) => {
    const m = JSON.parse(e.data)
    if (m.id !== runId) return                        // an answer to code that has since been edited
    if (m.type === 'status') { state.value = 'running'; return }
    if (m.type === 'result') {
      if (ls?.started) { answer = { m, due: launched + RUN_LATENCY_MS }; releaseRun(); return }   // shown by onTick, at its virtual time
      releaseRun(); show(m)
    }
  }
}
function show(m: any) {
  ms.value = m.ms; stdout.value = m.stdout; stderr.value = m.stderr
  if (m.ok || m.images.length) images.value = m.images   // keep the last good picture while the code is broken
  state.value = m.ok ? 'ok' : 'error'; stale.value = false
  if (!ls && !props.quiet && m.ok) sfx('tick', { volume: 0.3, pitch: 500, gap: 400 })   // a run finished
}
function onTick() {
  if (!ls || !answer || ls.t < answer.due) return
  const done = ls.hold(`${recId.value} (drawing the result)`), m = answer.m
  answer = null; show(m); nextTick(done)
}

function run() {
  if (!ws || ws.readyState !== 1) return
  runId++; state.value = 'running'
  const dpi = Math.min(300, Math.max(72, 96 * ($scale?.value ?? 1) * (window.devicePixelRatio || 1)))   // sharp at the real on-screen size
  const colors = [1, 2, 3, 4].map((i) => cssVar(`--nd-chart-${i}`, '#888'))
  ws.send(JSON.stringify({ type: 'run', id: runId, code: text(), dpi, timeout: props.timeout, theme: { ink: cssVar('--nd-ink'), line: cssVar('--nd-line'), colors } }))
  if (ls) { releaseRun(); answer = null; launched = ls.t; holdRun = ls.hold(`${recId.value} (run ${runId}: waiting for the runner)`) }
}
function schedule() { stale.value = true; clearTimeout(debounce); if (props.auto) debounce = window.setTimeout(run, 300) }
function reset() { view?.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: initial.value } }) }

// Syntax colours from the tokens, so the code keeps its contrast in every look (the editor's own palette is made for white pages).
const look = HighlightStyle.define([
  { tag: [t.keyword, t.controlKeyword, t.operatorKeyword, t.definitionKeyword, t.moduleKeyword], color: 'var(--nd-accent)', fontWeight: '600' },
  { tag: [t.number, t.bool, t.null], color: 'var(--nd-accent-2)' },
  { tag: [t.string, t.special(t.string)], color: 'color-mix(in srgb, var(--nd-accent) 55%, var(--nd-ink))' },
  { tag: [t.comment, t.lineComment], color: 'var(--nd-muted)', fontStyle: 'italic' },
  { tag: [t.function(t.variableName), t.function(t.propertyName), t.className], color: 'color-mix(in srgb, var(--nd-accent-2) 55%, var(--nd-ink))' },
])

function mount() {
  // The starting code is the text of the fenced block rendered inside the component.
  initial.value = (source.value?.querySelector('pre')?.textContent ?? source.value?.textContent ?? '').replace(/\n$/, '')
  const theme = EditorView.theme({
    '&': { height: '100%', color: 'var(--nd-ink)', backgroundColor: 'var(--nd-surface)', fontSize: '17px' },
    '.cm-scroller': { fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace', lineHeight: '1.45' },
    '.cm-gutters': { backgroundColor: 'transparent', color: 'var(--nd-muted)', border: 'none' },
    '.cm-activeLine, .cm-activeLineGutter': { backgroundColor: 'color-mix(in srgb, var(--nd-ink) 6%, transparent)' },
    '&.cm-focused': { outline: '2px solid var(--nd-accent-2)' },
    '.cm-cursor': { borderLeftColor: 'var(--nd-ink)' },
  })
  view = new EditorView({
    parent: editorHost.value!,
    state: EditorState.create({
      doc: initial.value,
      extensions: [
        basicSetup, python(), theme, syntaxHighlighting(look),
        // Highest precedence: basicSetup's default keymap binds Mod-Enter to insertBlankLine and would win otherwise.
        Prec.highest(keymap.of([
          { key: 'Escape', run: (v) => { v.contentDOM.blur(); return true } },                     // give the keyboard back to the deck
          { key: 'Mod-Enter', run: () => { clearTimeout(debounce); run(); return true } },
        ])),
        EditorView.updateListener.of((u) => { if (u.docChanged) schedule() }),
      ],
    }),
  })
}
function start() { closed = false; if (ls) window.addEventListener('nd-tick', onTick); if (!view) mount(); connect() }
function stop() { closed = true; releaseRun(); window.removeEventListener('nd-tick', onTick); clearTimeout(debounce); clearTimeout(reconnect); const w = ws; ws = null; w?.close() }

const active = useActive()
const recId = computed(() => `live-${props.id ?? $page.value}`)
const rec = reactive(useRecording(() => recId.value, () => props.recording, computed(() => state.value === 'offline'), active))
const mounted = ref(false)
onMounted(() => { mounted.value = true })
watch([active, mounted], ([a, m]) => { if (m && a) start(); else if (m) { stop(); state.value = 'idle' } }, { immediate: true })
onUnmounted(() => { stop(); view?.destroy() })
</script>

<template>
  <div class="nd-live" :class="{ 'nd-framed': frame }" data-kind="livecode" :data-rec-id="recId" :data-state="state" @click.stop @keydown.stop @keyup.stop v-bind="linkAttrs">
    <span v-if="linked?.note" class="nd-linkchip">{{ linked.note }}</span>
    <div ref="source" class="nd-live-source"><slot /></div>
    <div class="nd-live-code" :inert="rec.shown || undefined">
      <div ref="editorHost" class="nd-live-editor" />
      <div class="nd-live-bar">
        <button @click="reset">Reset</button>
        <button @click="clearTimeout(debounce); run()">Run</button>
        <span class="nd-live-hint">Esc leaves the editor · Cmd/Ctrl+Enter runs</span>
      </div>
    </div>
    <div ref="result" class="nd-live-out" :class="{ 'nd-stale': stale }" :inert="rec.shown || undefined">
      <div v-if="state === 'offline' && !rec.shown && !rec.pending" class="nd-live-msg">The Python runner is not running. Start everything with <code>nimbledeck run</code>.</div>
      <img v-for="(src, i) in images" :key="i" class="nd-live-img" :src="`data:image/png;base64,${src}`" alt="">
      <pre v-if="stdout" class="nd-live-stdout">{{ stdout }}</pre>
      <pre v-if="stderr" class="nd-live-stderr">{{ stderr }}</pre>
      <span class="nd-live-status" :class="`nd-st-${state}`">{{ state === 'running' ? 'running…' : state === 'ok' ? `ok · ${ms} ms` : state === 'error' ? `error · ${ms} ms` : '' }}</span>
    </div>
    <Recorded v-if="rec.shown" :src="rec.src!" :poster="rec.poster" :reduced="rec.reduced" />
  </div>
</template>
