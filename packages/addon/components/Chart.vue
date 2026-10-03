<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from 'vue'
import { useSlideContext } from '@slidev/client'
import { Chart, registerables, type ChartConfiguration } from 'chart.js'
import { useActive } from '../composables/useActive'
import { cssVar } from '../composables/useConfig'

Chart.register(...registerables)

// A chart as a plain element, coloured by the --nd-chart-1..4 tokens. It is created when its slide appears, so its
// entry animation plays on stage. Pass `data` as numbers (one series) or number[][] (several, with `names`).
//   <Chart type="bar" :labels="['Q1','Q2']" :data="[3, 5]" />
//   <Chart type="doughnut" :labels="['A','B']" :data="[70, 30]" center="3,2K" />
const props = withDefaults(defineProps<{
  type?: 'bar' | 'line' | 'pie' | 'doughnut'
  labels: string[]
  data: number[] | number[][]
  names?: string[]
  horizontal?: boolean
  stacked?: boolean
  legend?: boolean
  values?: boolean
  center?: string
  frame?: boolean
}>(), { type: 'bar', horizontal: false, stacked: false, values: false, frame: false })

const { $scale } = useSlideContext()
const cv = ref<HTMLCanvasElement>()
const mounted = ref(false)
const ready = ref(false)
let chart: Chart | null = null

const series = () => (Array.isArray(props.data[0]) ? (props.data as number[][]) : [props.data as number[]])
const palette = () => [1, 2, 3, 4].map((i) => cssVar(`--nd-chart-${i}`, ['#1f2328', '#9ca3af', '#e5e7eb', '#e8cdba'][i - 1]))

// Draws each value on its bar, point or slice.
const valuePlugin = {
  id: 'ndValues',
  afterDatasetsDraw(c: Chart) {
    if (!props.values) return
    const ctx = c.ctx
    ctx.save(); ctx.font = `600 18px ${cssVar('--nd-font-body', 'sans-serif')}`; ctx.fillStyle = cssVar('--nd-ink'); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    c.data.datasets.forEach((ds, di) => c.getDatasetMeta(di).data.forEach((el: any, i) => {
      const v = ds.data[i] as number
      const pos = el.tooltipPosition ? el.tooltipPosition(true) : { x: el.x, y: el.y }
      const onSlice = props.type === 'pie' || props.type === 'doughnut'
      ctx.fillStyle = onSlice ? cssVar('--nd-bg', '#fff') : cssVar('--nd-ink')
      if (props.horizontal && !onSlice) { ctx.textAlign = 'left'; ctx.fillText(String(v), el.x + 10, el.y) }
      else ctx.fillText(String(v), pos.x, onSlice ? pos.y : pos.y - 14)
      ctx.textAlign = 'center'
    }))
    ctx.restore()
  },
}

function build() {
  if (!cv.value) return
  const colors = palette(), ink = cssVar('--nd-ink'), line = cssVar('--nd-line'), font = cssVar('--nd-font-body', 'sans-serif')
  const round = props.type === 'pie' || props.type === 'doughnut'
  const datasets = series().map((d, i) => ({
    label: props.names?.[i] ?? '',
    data: d,
    backgroundColor: round ? props.labels.map((_, k) => colors[k % colors.length]) : colors[i % colors.length],
    borderColor: round ? cssVar('--nd-bg', '#fff') : colors[i % colors.length],
    borderWidth: round ? 2 : props.type === 'line' ? 3 : 0,
    tension: 0.3,
  }))
  const cfg: ChartConfiguration = {
    type: props.type,
    data: { labels: props.labels, datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      devicePixelRatio: (window.devicePixelRatio || 1) * ($scale?.value ?? 1),   // sharp at the real on-screen resolution
      animation: { duration: 700 },
      indexAxis: props.horizontal ? 'y' : 'x',
      cutout: props.type === 'doughnut' ? '62%' : undefined,
      plugins: { legend: { display: props.legend ?? (round || series().length > 1), labels: { color: ink, font: { family: font, size: 16 } } }, tooltip: { enabled: true } },
      scales: round ? {} : {
        x: { stacked: props.stacked, grid: { color: line }, ticks: { color: ink, font: { family: font, size: 16 } } },
        y: { stacked: props.stacked, grid: { color: line }, ticks: { color: ink, font: { family: font, size: 16 } }, beginAtZero: true },
      },
    },
    plugins: [valuePlugin],
  }
  chart = new Chart(cv.value, cfg)
  ready.value = true
}
function stop() { chart?.destroy(); chart = null; ready.value = false }

const active = useActive()
onMounted(() => { mounted.value = true })
watch([active, mounted], ([a, m]) => { stop(); if (a && m) build() }, { immediate: true })
watch(() => [props.labels, props.data, props.type], () => { if (chart) { stop(); build() } }, { deep: true })
onUnmounted(stop)
</script>

<template>
  <div class="nd-chart" :class="{ 'nd-framed': frame }" data-kind="chart" :data-state="ready ? 'ready' : 'idle'">
    <canvas ref="cv" />
    <div v-if="center" class="nd-chart-center">{{ center }}</div>
  </div>
</template>
