<script setup lang="ts">
withDefaults(defineProps<{ label?: string }>(), { label: 'Loading…' })
</script>

<template>
  <div
    data-vmd-part="loading"
    class="vmd-loading"
    role="status"
    aria-live="polite"
  >
    {{ label }}
  </div>
</template>
