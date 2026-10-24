<script setup lang="ts">
import { computed } from 'vue'
import type { CSSProperties } from 'vue'
import type { MarkdownNode } from '../core/types'

const props = defineProps<{
  node: MarkdownNode
  children?: MarkdownNode[]
  align?: string
  scope?: string
}>()

const tag = computed(() =>
  props.node.kind === 'element' && props.node.tag === 'th' ? 'th' : 'td',
)

const style = computed<CSSProperties | undefined>(() =>
  props.align ? { textAlign: props.align as CSSProperties['textAlign'] } : undefined,
)

const effectiveScope = computed(() =>
  props.scope ?? (tag.value === 'th' ? 'col' : undefined),
)
</script>

<template>
  <component
    :is="tag"
    data-vmd-part="table-cell"
    :class="['vmd-table-cell', tag === 'th' ? 'vmd-table-header' : 'vmd-table-data']"
    :style="style"
    :scope="effectiveScope"
  >
    <slot />
  </component>
</template>
