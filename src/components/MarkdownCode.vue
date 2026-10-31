<script setup lang="ts">
import type { MarkdownNode } from '../core/types'

withDefaults(
  defineProps<{
    node: MarkdownNode
    code?: string
    language?: string
  }>(),
  {
    code: '',
    language: '',
  },
)
</script>

<template>
  <pre data-vmd-part="code" class="vmd-code"><slot>
    <code class="vmd-code-element" :class="language ? `language-${language}` : undefined">{{ code }}</code>
  </slot></pre>
</template>
