<script setup lang="ts">
import { computed } from 'vue'
import type { MarkdownNode } from '../core/types'
import { resolveLabel } from '../core/labels'
import { useRenderContext } from './context'

const props = defineProps<{ node: MarkdownNode; children?: MarkdownNode[] }>()

const ctx = useRenderContext()

const tag = computed(() =>
  props.node.kind === 'element' && /^h[1-6]$/.test(props.node.tag)
    ? props.node.tag
    : 'h1',
)

const level = computed(() => Number(tag.value.slice(1)))

const id = computed(() =>
  props.node.kind === 'element' ? props.node.attrs.id : undefined,
)

const anchorLabel = computed(() =>
  resolveLabel(ctx.labels.headingAnchor, { id: id.value }),
)
</script>

<template>
  <component
    :is="tag"
    :id="id"
    data-vmd-part="heading"
    :class="['vmd-heading', `vmd-heading-${level}`]"
  >
    <slot />
    <a
      v-if="id"
      data-vmd-part="heading-anchor"
      class="vmd-heading-anchor"
      :href="`#${id}`"
      :aria-label="anchorLabel"
    >
      <span aria-hidden="true">#</span>
    </a>
  </component>
</template>
