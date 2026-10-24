<script setup lang="ts">
import { computed, type CSSProperties, type Component } from 'vue'

const props = withDefaults(
  defineProps<{
    as?: string | Component
    tokens?: Record<string, string>
  }>(),
  {
    as: 'div',
    tokens: () => ({}),
  },
)

const style = computed(() => props.tokens as CSSProperties)
</script>

<template>
  <component :is="as" data-vmd-part="root" class="vmd-root" :style="style">
    <slot />
  </component>
</template>
