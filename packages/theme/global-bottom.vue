<script setup lang="ts">
import { useNav } from '@slidev/client'
const { currentPage, total } = useNav()
</script>

<!-- A hairline along the bottom edge that fills as the deck advances. Shown by the studio looks only (see the theme CSS). -->
<template>
  <div class="nd-progress" aria-hidden="true"><i :style="{ transform: `scaleX(${total ? currentPage / total : 0})` }" /></div>
</template>
