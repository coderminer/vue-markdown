<script setup lang="ts">
withDefaults(defineProps<{ value?: string }>(), { value: '' })
</script>

<template>
  <span data-vmd-part="html" class="vmd-html">{{ value }}</span>
</template>
