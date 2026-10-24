<script setup lang="ts">
import { computed } from 'vue'
import type { MarkdownNode } from '../core/types'

const props = defineProps<{ node: MarkdownNode; children?: MarkdownNode[] }>()

const tag = computed(() =>
  props.node.kind === 'element' && /^h[1-6]$/.test(props.node.tag)
    ? props.node.tag
    : 'h1',
)

const level = computed(() => Number(tag.value.slice(1)))
</script>

<template>
  <component
    :is="tag"
    data-vmd-part="heading"
    :class="['vmd-heading', `vmd-heading-${level}`]"
  >
    <slot />
  </component>
</template>
