<script setup lang="ts">
import type { MarkdownNode } from '../core/types'

defineProps<{ node: MarkdownNode; children?: MarkdownNode[] }>()
</script>

<template>
  <p data-vmd-part="paragraph" class="vmd-paragraph"><slot /></p>
</template>
