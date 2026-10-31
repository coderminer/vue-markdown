<script setup lang="ts">
import { computed } from 'vue'
import type { MarkdownCodeNode } from '../core/types'
import { useCodeBlockRegion } from './codeRegion'

const props = withDefaults(
  defineProps<{
    node?: MarkdownCodeNode
    code?: string
    language?: string
    standalone?: boolean
    ignoreRegion?: boolean
  }>(),
  {
    node: undefined,
    code: undefined,
    language: undefined,
    standalone: false,
    ignoreRegion: false,
  },
)

const region = useCodeBlockRegion({
  standalone: () => props.standalone,
  ignoreRegion: () => props.ignoreRegion,
})
const source = computed(() => {
  if (props.code !== undefined) return props.code
  return props.node?.code ?? ''
})
const language = computed(() => {
  if (props.language !== undefined) return props.language
  return props.node?.language ?? ''
})
</script>

<template>
  <component
    :is="region"
    v-if="region"
    :node="node"
    :code="source"
    :language="language"
  >
    <slot />
  </component>
  <pre v-else data-vmd-part="code" class="vmd-code"><slot>
    <code class="vmd-code-element" :class="language ? `language-${language}` : undefined">{{ source }}</code>
  </slot></pre>
</template>
