<script setup lang="ts">
import {
  computed,
  defineComponent,
  h,
  onMounted,
  watch,
  type VNodeChild,
} from 'vue'
import type { MarkdownNode, MathEngine } from '../core/types'
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
  mathEngine?: MathEngine
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
const engine = computed(() => props.mathEngine ?? context.mathEngine)
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
const unavailable = computed(
  () =>
    !engine.value &&
    (rendered.value === undefined || rendered.value.length === 0) &&
    source.value !== '',
)
const nodes = computed(() => {
  const renderedNodes = engineResult.value?.nodes ?? rendered.value ?? []
  if (renderedNodes.length > 0) return renderedNodes
  return unavailable.value
    ? [{ kind: 'text' as const, key: 'math-source', value: source.value }]
    : renderedNodes
})

function katexError(
  nodes: readonly MarkdownNode[] | undefined,
): string | undefined {
  if (!nodes) return undefined
  for (const node of nodes) {
    if (node.kind !== 'element') continue
    const classes = (node.attrs.class ?? '').split(/\s+/)
    if (classes.includes('katex-error')) {
      return node.attrs.title || 'Invalid TeX expression.'
    }
    const nested = katexError(node.children)
    if (nested) return nested
  }
  return undefined
}

// The default pipeline path renders KaTeX markup inside `rendered` rather than
// reporting an engine error, so surface its `katex-error` marker through the
// same diagnostic path as an injected engine failure. When an engine result
// exists its nodes replace `rendered`, so the pipeline markup no longer
// describes what is displayed.
const renderedError = computed(() =>
  engineResult.value ? undefined : katexError(rendered.value),
)
const error = computed(
  () => props.error ?? engineResult.value?.error ?? renderedError.value,
)
const label = computed(() => resolveLabel(context.labels.math, { tex: source.value }))

let reported = false
function reportError(): void {
  if (reported) return
  if (error.value) {
    reported = true
    context.onRenderError?.(
      createDiagnostic('math-error', error.value, {
        phase: 'render',
      }),
    )
    return
  }
  if (unavailable.value) {
    reported = true
    context.onRenderError?.(
      createDiagnostic(
        'math-engine-unavailable',
        'No math engine or pre-rendered math output is available. Provide `mathEngine`, `rendered`, or use `mathPlugin()`.',
        { severity: 'warning', phase: 'render' },
      ),
    )
  }
}

onMounted(reportError)
watch([error, unavailable], reportError)

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
