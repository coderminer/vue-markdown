<script setup lang="ts">
import { ref } from 'vue'
import type { MarkdownNode } from '../core/types'

const props = defineProps<{
  node: MarkdownNode
  children?: MarkdownNode[]
  src?: string
  alt?: string
  title?: string
  width?: string | number
  height?: string | number
  loading?: 'lazy' | 'eager'
  decoding?: 'async' | 'sync' | 'auto'
}>()

const failed = ref(false)

function onError(): void {
  failed.value = true
}
</script>

<template>
  <img
    v-if="!failed"
    data-vmd-part="image"
    class="vmd-image"
    :src="src"
    :alt="alt ?? ''"
    :title="title"
    :width="width"
    :height="height"
    :loading="loading ?? 'lazy'"
    :decoding="decoding ?? 'async'"
    @error="onError"
  />
  <span v-else data-vmd-part="image" class="vmd-image vmd-image-fallback">
    {{ alt || props.src }}
  </span>
</template>
