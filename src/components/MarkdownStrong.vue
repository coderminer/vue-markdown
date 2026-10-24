<script setup lang="ts">
import type { MarkdownNode } from '../core/types'

defineProps<{ node: MarkdownNode; children?: MarkdownNode[] }>()
</script>

<template>
  <strong data-vmd-part="strong" class="vmd-strong"><slot /></strong>
</template>
