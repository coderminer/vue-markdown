<script setup lang="ts">
import { computed } from 'vue'
import type { MarkdownNode } from '../core/types'

const props = defineProps<{ node: MarkdownNode; children?: MarkdownNode[] }>()

const tag = computed(() => {
  if (props.node.kind !== 'element') return 'tbody'
  return ['thead', 'tbody', 'tfoot'].includes(props.node.tag)
    ? props.node.tag
    : 'tbody'
})
</script>

<template>
  <component
    :is="tag"
    data-vmd-part="table-section"
    class="vmd-table-section"
  >
    <slot />
  </component>
</template>
