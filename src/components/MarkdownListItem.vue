<script setup lang="ts">
import type { MarkdownNode } from '../core/types'

defineProps<{ node: MarkdownNode; children?: MarkdownNode[] }>()
</script>

<template>
  <li data-vmd-part="list-item" class="vmd-list-item"><slot /></li>
</template>
