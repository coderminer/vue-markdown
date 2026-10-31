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

const emit = defineEmits<{ navigate: [id: string] }>()

function navigate(id: string): void {
  emit('navigate', id)
}

const itemComponent = computed(() => props.tocItem ?? MarkdownTocItem)
</script>

<template>
  <nav data-vmd-part="toc" class="vmd-toc" :aria-label="label">
    <ol data-vmd-part="toc-nav" class="vmd-toc-nav">
      <template v-for="item in items" :key="item.id">
        <slot
          name="toc-item"
          :item="item"
          :active="item.id === activeId"
          :navigate="navigate"
        >
          <component
            :is="itemComponent"
            :item="item"
            :active="item.id === activeId"
            @navigate="navigate"
          />
        </slot>
      </template>
    </ol>
  </nav>
</template>
