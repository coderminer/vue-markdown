<script setup lang="ts">
import type { TocItem } from '../core/types'
import MarkdownTocItem from './MarkdownTocItem.vue'

withDefaults(
  defineProps<{
    items: TocItem[]
    activeId?: string
    label?: string
  }>(),
  {
    activeId: undefined,
    label: 'Table of contents',
  },
)

defineEmits<{ navigate: [id: string] }>()
</script>

<template>
  <nav data-vmd-part="toc" class="vmd-toc" :aria-label="label">
    <ol data-vmd-part="toc-nav" class="vmd-toc-nav">
      <MarkdownTocItem
        v-for="item in items"
        :key="item.id"
        :item="item"
        :active="item.id === activeId"
        @navigate="$emit('navigate', $event)"
      />
    </ol>
  </nav>
</template>
