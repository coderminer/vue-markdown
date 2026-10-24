<script setup lang="ts">
withDefaults(defineProps<{ label?: string }>(), { label: 'No content' })
</script>

<template>
  <div data-vmd-part="empty" class="vmd-empty" role="status">{{ label }}</div>
</template>
