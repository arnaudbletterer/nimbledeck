<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from 'vue'
import { useSlideContext } from '@slidev/client'
import { EditorView, keymap } from '@codemirror/view'
import { EditorState } from '@codemirror/state'
import { basicSetup } from 'codemirror'
import { python } from '@codemirror/lang-python'
import { useActive } from '../composables/useActive'
import { useNimbleConfig, cssVar } from '../composables/useConfig'

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
// `auto` re-runs while you type (default); set `:auto="false"` for heavy code: run with the button or Ctrl+Enter.
const props = withDefaults(defineProps<{ auto?: boolean; timeout?: number; frame?: boolean }>(), { auto: true, timeout: 10, frame: false })
const { $scale } = useSlideContext()
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

const text = () => view?.state.doc.toString() ?? initial.value

async function connect() {
  if (closed) return
  const cfg = await useNimbleConfig()
  if (!cfg.runner || closed) { state.value = 'offline'; return }
  const sock = new WebSocket(`ws://127.0.0.1:${cfg.runner.port}/?t=${cfg.runner.token}`)
  ws = sock
  sock.onopen = () => { if (state.value === 'offline') state.value = 'idle'; run() }
  sock.onclose = () => { if (ws !== sock) return; state.value = 'offline'; reconnect = window.setTimeout(connect, 2000) }
  sock.onerror = () => sock.close()
  sock.onmessage = (e) => {
    const m = JSON.parse(e.data)
    if (m.id !== runId) return                        // an answer to code that has since been edited
    if (m.type === 'status') { state.value = 'running'; return }
    if (m.type === 'result') {
      ms.value = m.ms; stdout.value = m.stdout; stderr.value = m.stderr
      if (m.ok || m.images.length) images.value = m.images   // keep the last good picture while the code is broken
      state.value = m.ok ? 'ok' : 'error'; stale.value = false
    }
  }
}

function run() {
  if (!ws || ws.readyState !== 1) return
  runId++; state.value = 'running'
  const dpi = Math.min(300, Math.max(72, 96 * ($scale?.value ?? 1) * (window.devicePixelRatio || 1)))   // sharp at the real on-screen size
  const colors = [1, 2, 3, 4].map((i) => cssVar(`--nd-chart-${i}`, '#888'))
  ws.send(JSON.stringify({ type: 'run', id: runId, code: text(), dpi, timeout: props.timeout, theme: { ink: cssVar('--nd-ink'), line: cssVar('--nd-line'), colors } }))
}
function schedule() { stale.value = true; clearTimeout(debounce); if (props.auto) debounce = window.setTimeout(run, 600) }
function reset() { view?.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: initial.value } }) }

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
        basicSetup, python(), theme,
        keymap.of([
          { key: 'Escape', run: (v) => { v.contentDOM.blur(); return true } },                     // give the keyboard back to the deck
          { key: 'Mod-Enter', run: () => { clearTimeout(debounce); run(); return true } },
        ]),
        EditorView.updateListener.of((u) => { if (u.docChanged) schedule() }),
      ],
    }),
  })
}
function start() { closed = false; if (!view) mount(); connect() }
function stop() { closed = true; clearTimeout(debounce); clearTimeout(reconnect); const w = ws; ws = null; w?.close() }

const active = useActive()
const mounted = ref(false)
onMounted(() => { mounted.value = true })
watch([active, mounted], ([a, m]) => { if (m && a) start(); else if (m) { stop(); state.value = 'idle' } }, { immediate: true })
onUnmounted(() => { stop(); view?.destroy() })
</script>

<template>
  <div class="nd-live" :class="{ 'nd-framed': frame }" data-kind="livecode" :data-state="state" @click.stop @keydown.stop @keyup.stop>
    <div ref="source" class="nd-live-source"><slot /></div>
    <div class="nd-live-code">
      <div ref="editorHost" class="nd-live-editor" />
      <div class="nd-live-bar">
        <button @click="reset">Reset</button>
        <button @click="clearTimeout(debounce); run()">Run</button>
        <span class="nd-live-hint">Esc leaves the editor · Ctrl+Enter runs</span>
      </div>
    </div>
    <div ref="result" class="nd-live-out" :class="{ 'nd-stale': stale }">
      <div v-if="state === 'offline'" class="nd-live-msg">The Python runner is not running. Start everything with <code>nimbledeck run</code>.</div>
      <img v-for="(src, i) in images" :key="i" class="nd-live-img" :src="`data:image/png;base64,${src}`" alt="">
      <pre v-if="stdout" class="nd-live-stdout">{{ stdout }}</pre>
      <pre v-if="stderr" class="nd-live-stderr">{{ stderr }}</pre>
      <span class="nd-live-status" :class="`nd-st-${state}`">{{ state === 'running' ? 'running…' : state === 'ok' ? `ok · ${ms} ms` : state === 'error' ? `error · ${ms} ms` : '' }}</span>
    </div>
  </div>
</template>
