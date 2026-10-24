<script setup lang="ts">
import type { MarkdownNode } from '../core/types'

defineProps<{ node: MarkdownNode; children?: MarkdownNode[] }>()
</script>

<template>
  <del data-vmd-part="strikethrough" class="vmd-strikethrough"><slot /></del>
</template>
