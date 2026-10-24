<script setup lang="ts">
import type { MarkdownNode } from '../core/types'

defineProps<{ node: MarkdownNode; children?: MarkdownNode[] }>()
</script>

<template>
  <em data-vmd-part="emphasis" class="vmd-emphasis"><slot /></em>
</template>
