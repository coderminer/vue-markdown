<script setup lang="ts">
import type { MarkdownNode } from '../core/types'

defineProps<{ node: MarkdownNode; children?: MarkdownNode[] }>()
</script>

<template>
  <table data-vmd-part="table" class="vmd-table"><slot /></table>
</template>
