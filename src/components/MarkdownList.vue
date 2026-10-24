<script setup lang="ts">
import { computed } from 'vue'
import type { MarkdownNode } from '../core/types'

const props = defineProps<{ node: MarkdownNode; children?: MarkdownNode[] }>()

const tag = computed(() =>
  props.node.kind === 'element' && (props.node.tag === 'ol' || props.node.tag === 'ul')
    ? props.node.tag
    : 'ul',
)
</script>

<template>
  <component :is="tag" data-vmd-part="list" class="vmd-list"><slot /></component>
</template>
