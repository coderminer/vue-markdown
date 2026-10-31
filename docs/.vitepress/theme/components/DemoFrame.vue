<script setup lang="ts">
withDefaults(
  defineProps<{
    title?: string
    note?: string
  }>(),
  {
    title: 'Live preview',
    note: '',
  },
)
</script>

<template>
  <figure class="vmd-demo-frame">
    <figcaption>
      <span class="vmd-demo-frame-title">{{ title }}</span>
      <span v-if="note" class="vmd-demo-frame-note">{{ note }}</span>
      <span class="vmd-demo-frame-badge">Live</span>
    </figcaption>
    <div class="vmd-demo-frame-body">
      <slot />
    </div>
  </figure>
</template>
