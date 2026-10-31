<script setup lang="ts">
import {
  computed,
  defineComponent,
  h,
  onMounted,
  watch,
  type VNodeChild,
} from 'vue'
import type { MarkdownNode } from '../core/types'
import { createDiagnostic } from '../core/diagnostics'
import { resolveLabel } from '../core/labels'
import { useRenderContext } from './context'
import { renderNodes } from './render'

const props = defineProps<{
  node?: MarkdownNode
  tex?: string
  displayMode?: boolean
  rendered?: MarkdownNode[]
  error?: string
}>()

const context = useRenderContext()
const source = computed(
  () => props.tex ?? (props.node?.kind === 'math' ? props.node.tex : ''),
)
const display = computed(
  () =>
    props.displayMode ??
    (props.node?.kind === 'math' ? props.node.displayMode : false),
)
const rendered = computed(
  () => props.rendered ?? (props.node?.kind === 'math' ? props.node.rendered : []),
)
const engine = computed(() => context.mathEngine)
const engineResult = computed(() => {
  if (!engine.value) return undefined
  try {
    return engine.value.render(source.value, { displayMode: display.value })
  } catch (error) {
    return {
      nodes: [{ kind: 'text' as const, key: 'math-error', value: source.value }],
      error: error instanceof Error ? error.message : String(error),
    }
  }
})
const nodes = computed(() => engineResult.value?.nodes ?? rendered.value ?? [])
const error = computed(() => props.error ?? engineResult.value?.error)
const label = computed(() => resolveLabel(context.labels.math, { tex: source.value }))

function reportError(): void {
  if (!error.value) return
  context.onRenderError?.(
    createDiagnostic('math-error', error.value, {
      phase: 'render',
    }),
  )
}

onMounted(reportError)
watch(error, reportError)

const MathContent = defineComponent({
  setup() {
    return () =>
      context.renderHostSlot(
        'math',
        {
          tex: source.value,
          displayMode: display.value,
          rendered: nodes.value,
          error: error.value,
        },
        () => renderNodes(nodes.value, context) as VNodeChild,
      )
  },
})

const ErrorContent = defineComponent({
  setup() {
    return () =>
      context.renderHostSlot(
        'math-error',
        {
          tex: source.value,
          error: error.value,
          retry: () => undefined,
        },
        () => h('span', { class: 'vmd-math-fallback' }, source.value),
      )
  },
})
</script>

<template>
  <span
    data-vmd-part="math"
    class="vmd-math"
    :data-display="display ? 'true' : 'false'"
    :data-error="error ? 'true' : undefined"
    :aria-label="label"
  >
    <span
      v-if="error"
      data-vmd-part="math-error"
      class="vmd-math-error"
      role="status"
    ><ErrorContent /></span>
    <MathContent v-else />
  </span>
</template>
