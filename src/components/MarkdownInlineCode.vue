<script setup lang="ts">
import type { MarkdownNode } from '../core/types'

defineProps<{ node: MarkdownNode; children?: MarkdownNode[] }>()
</script>

<template>
  <code data-vmd-part="inline-code" class="vmd-inline-code"><slot /></code>
</template>
