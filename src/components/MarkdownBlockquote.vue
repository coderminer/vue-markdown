<script setup lang="ts">
import type { MarkdownNode } from '../core/types'

defineProps<{ node: MarkdownNode; children?: MarkdownNode[] }>()
</script>

<template>
  <blockquote data-vmd-part="blockquote" class="vmd-blockquote"><slot /></blockquote>
</template>
