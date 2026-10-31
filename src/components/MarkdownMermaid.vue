<script setup lang="ts">
import { computed } from 'vue'
import type { MarkdownNode } from '../core/types'
import { useRenderContext } from './context'
import MermaidBlock from './MermaidBlock.vue'

const props = defineProps<{
  node?: MarkdownNode
  code?: string
}>()

const context = useRenderContext()
const source = computed(() =>
  props.code ?? (props.node?.kind === 'mermaid' ? props.node.code : ''),
)
const region = computed(() => context.regions?.mermaidBlock)
</script>

<template>
  <component
    :is="region"
    v-if="region"
    :node="node"
    :source="source"
  />
  <MermaidBlock v-else :node="node" :source="source" />
</template>
