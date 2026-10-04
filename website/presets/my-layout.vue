<template>
  <div class="slidev-layout my-layout nd-root">
    <div class="ml-rail" />
    <div class="nd-body"><slot /></div>
    <span class="nd-foot">{{ $slidev.configs.title }}</span>
    <span class="nd-page">{{ currentPage }}/{{ total }}</span>
  </div>
</template>

<style>
/* In a real theme this goes in styles/index.css (shared CSS is global), not in the layout. */
.my-layout .ml-rail {
  position: absolute; inset: 0 auto 0 0; width: 18px; background: var(--nd-accent);
  transform-origin: top; animation: ml-grow .6s ease-out both;
}
.my-layout .nd-body > * { animation: ml-up .5s ease-out both; }
.my-layout .nd-body > :nth-child(2) { animation-delay: .12s; }
.my-layout .nd-body > :nth-child(3) { animation-delay: .24s; }
.my-layout .nd-body > :nth-child(4) { animation-delay: .36s; }
@keyframes ml-grow { from { transform: scaleY(0); } }
@keyframes ml-up { from { opacity: 0; transform: translateY(16px); } }
@media (prefers-reduced-motion: reduce) { .my-layout * { animation: none !important; } }
</style>
