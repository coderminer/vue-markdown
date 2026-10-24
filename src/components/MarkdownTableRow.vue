<script setup lang="ts">
import type { MarkdownNode } from '../core/types'

defineProps<{ node: MarkdownNode; children?: MarkdownNode[] }>()
</script>

<template>
  <tr data-vmd-part="table-row" class="vmd-table-row"><slot /></tr>
</template>
