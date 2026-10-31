<script setup lang="ts">
import { computed } from 'vue'
import type { MarkdownNode } from '../core/types'
import { useRenderContext } from './context'

const props = defineProps<{
  node?: MarkdownNode
  code?: string
  language?: string
}>()

const context = useRenderContext()
const region = computed(() => context.regions?.codeBlock)
const source = computed(() => {
  if (props.code !== undefined) return props.code
  return props.node?.kind === 'code' ? props.node.code : ''
})
const language = computed(() => {
  if (props.language !== undefined) return props.language
  return props.node?.kind === 'code' ? props.node.language : ''
})
</script>

<template>
  <component
    :is="region"
    v-if="region"
    :node="node"
    :code="source"
    :language="language"
  ><slot /></component>
  <pre v-else data-vmd-part="code" class="vmd-code"><slot>
    <code class="vmd-code-element" :class="language ? `language-${language}` : undefined">{{ source }}</code>
  </slot></pre>
</template>
