<template>
  <span v-motion class="nd-fly" :initial="{ x: -60, opacity: 0 }" :enter="{ x: 0, opacity: 1, transition: { duration: 600 } }"><slot /></span>
</template>
