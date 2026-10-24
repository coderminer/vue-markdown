<script setup lang="ts">
defineProps<{ nodes?: unknown[] }>()
</script>

<template>
  <div data-vmd-part="content" class="vmd-content"><slot /></div>
</template>
