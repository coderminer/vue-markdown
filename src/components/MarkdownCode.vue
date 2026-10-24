<script setup lang="ts">
import type { MarkdownNode } from '../core/types'

defineProps<{
  node: MarkdownNode
  children?: MarkdownNode[]
  code?: string
  language?: string
}>()
</script>

<template>
  <pre data-vmd-part="code" class="vmd-code"><code
    :class="language ? `language-${language}` : undefined"
  >{{ code }}</code></pre>
</template>
