<script setup lang="ts">
import { computed, type CSSProperties, type Component } from 'vue'
import type { MarkdownTheme } from '../core/types'

const props = withDefaults(
  defineProps<{
    as?: string | Component
    tokens?: Record<string, string>
    theme?: MarkdownTheme
  }>(),
  {
    as: 'div',
    tokens: () => ({}),
    theme: 'light',
  },
)

const style = computed(() => props.tokens as CSSProperties)
</script>

<template>
  <component
    :is="as"
    data-vmd-part="root"
    class="vmd-root"
    :data-vmd-theme="theme"
    :style="style"
  >
    <slot />
  </component>
</template>
