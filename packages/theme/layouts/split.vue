<template>
  <div class="slidev-layout split nd-split nd-big">
    <div class="nd-bg"><slot name="bg" /></div>
    <div class="nd-split-l"><slot /></div>
    <div class="nd-split-r"><slot name="right" /></div>
  </div>
</template>
