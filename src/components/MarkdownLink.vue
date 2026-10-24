<script setup lang="ts">
import { computed } from 'vue'
import type { MarkdownNode } from '../core/types'
import { isExternalUrl } from '../core/url'
import { useRenderContext } from './context'

const props = defineProps<{
  node: MarkdownNode
  children?: MarkdownNode[]
  href?: string
  target?: string
  rel?: string
  title?: string
}>()

const ctx = useRenderContext()

const effectiveTarget = computed(() => {
  if (
    props.href &&
    ctx.externalLinkTarget === '_blank' &&
    isExternalUrl(props.href)
  ) {
    return '_blank'
  }
  return props.target ?? ctx.linkTarget
})

const effectiveRel = computed(() => {
  if (props.rel) return props.rel
  return effectiveTarget.value === '_blank' ? 'noopener noreferrer' : undefined
})

function onClick(event: MouseEvent): void {
  ctx.onLinkClick({
    url: props.href ?? '',
    target: effectiveTarget.value,
    node: props.node,
    event,
  })
}
</script>

<template>
  <a
    data-vmd-part="link"
    class="vmd-link"
    :href="href"
    :target="effectiveTarget"
    :rel="effectiveRel"
    :title="title"
    @click="onClick"
  >
    <slot />
  </a>
</template>
