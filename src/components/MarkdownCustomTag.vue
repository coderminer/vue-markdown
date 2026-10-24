<script setup lang="ts">
import { computed } from 'vue'
import type { MarkdownCustomTagNode } from '../core/types'
import { useRenderContext } from './context'

const props = defineProps<{
  node: MarkdownCustomTagNode
  children?: unknown[]
  tag?: string
  customProps?: Record<string, unknown>
}>()

const ctx = useRenderContext()

const tag = computed(() => props.tag ?? props.node.tag)
const host = computed(() => ctx.components[tag.value])
const target = computed(() => {
  const value = host.value
  if (typeof value === 'string') return value
  if (typeof value === 'object' || typeof value === 'function') return value
  return 'span'
})

function onClick(event: MouseEvent): void {
  ctx.onCustomTagClick({
    tag: tag.value,
    props: { ...props.node.attrs, ...props.node.props },
    node: props.node,
    event,
  })
}
const bindings = computed(() => ({
  ...props.node.attrs,
  ...props.node.props,
}))
</script>

<template>
  <component
    :is="target"
    v-bind="bindings"
    data-vmd-part="custom-tag"
    class="vmd-custom-tag"
    @click="onClick"
  >
    <slot />
  </component>
</template>
