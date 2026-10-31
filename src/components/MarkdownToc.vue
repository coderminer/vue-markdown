<script setup lang="ts">
import { computed } from 'vue'
import type { MarkdownComponentValue, TocItem } from '../core/types'
import MarkdownTocItem from './MarkdownTocItem.vue'

const props = withDefaults(
  defineProps<{
    items: TocItem[]
    activeId?: string
    label?: string
    tocItem?: MarkdownComponentValue
  }>(),
  {
    activeId: undefined,
    label: 'Table of contents',
    tocItem: undefined,
  },
)

defineEmits<{ navigate: [id: string] }>()

const itemComponent = computed(() => props.tocItem ?? MarkdownTocItem)
</script>

<template>
  <nav data-vmd-part="toc" class="vmd-toc" :aria-label="label">
    <ol data-vmd-part="toc-nav" class="vmd-toc-nav">
      <component
        :is="itemComponent"
        v-for="item in items"
        :key="item.id"
        :item="item"
        :active="item.id === activeId"
        @navigate="$emit('navigate', $event)"
      />
    </ol>
  </nav>
</template>
