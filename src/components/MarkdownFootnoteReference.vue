<script setup lang="ts">
import { computed } from 'vue'
import type { MarkdownNode } from '../core/types'
import { resolveLabel } from '../core/labels'
import { useRenderContext } from './context'

const props = defineProps<{
  node: MarkdownNode
  children?: MarkdownNode[]
  missing?: boolean
}>()

const context = useRenderContext()
const label = computed(() =>
  resolveLabel(context.labels.footnoteReference, { node: props.node }),
)
const state = computed(() => (props.missing ? 'missing' : 'ready'))
</script>

<template>
  <sup
    data-vmd-part="footnote-reference"
    class="vmd-footnote-reference"
    :data-state="state"
    :aria-label="label"
  ><slot /></sup>
</template>
