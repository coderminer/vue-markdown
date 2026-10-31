<script setup lang="ts">
import { computed } from 'vue'
import { resolveLabel } from '../core/labels'
import { useRenderContext } from './context'

const props = defineProps<{ node?: unknown; children?: unknown[] }>()
const context = useRenderContext()
const label = computed(() =>
  resolveLabel(context.labels.footnotes, { node: props.node }),
)
</script>

<template>
  <section
    data-vmd-part="footnotes"
    class="vmd-footnotes"
    role="doc-endnotes"
    :aria-label="label"
  ><slot /></section>
</template>
