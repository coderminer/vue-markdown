<script setup lang="ts">
import {
  computed,
  defineComponent,
  h,
  onMounted,
  onUnmounted,
  ref,
  shallowRef,
  useSlots,
  watch,
  type VNodeChild,
} from 'vue'
import type {
  HighlightResult,
  MarkdownDiagnostic,
  MarkdownHighlighter,
  MarkdownTheme,
} from '../core/types'
import { createDiagnostic, errorMessage } from '../core/diagnostics'
import { resolveLabel } from '../core/labels'
import {
  plaintextHighlight,
  runHighlighter,
  splitHighlightLines,
} from '../highlight/shared'
import { renderNodes } from './render'
import { isEmptySlotContent, useRenderContext } from './context'

const props = withDefaults(
  defineProps<{
    source: string
    language?: string
    theme?: MarkdownTheme
    highlighter?: MarkdownHighlighter
    lineNumbers?: boolean
    highlightLines?: number[]
    maxLines?: number
    virtual?: boolean
    virtualThreshold?: number
    lineHeight?: number
    delay?: number
  }>(),
  {
    language: '',
    theme: undefined,
    highlighter: undefined,
    lineNumbers: false,
    highlightLines: () => [],
    maxLines: 0,
    virtual: false,
    virtualThreshold: 200,
    lineHeight: 20,
    delay: 0,
  },
)

const emit = defineEmits<{
  copy: [source: string]
  error: [diagnostic: MarkdownDiagnostic]
}>()
const context = useRenderContext()
const ownSlots = useSlots()
const result = shallowRef<HighlightResult>(
  plaintextHighlight(props.source, props.language),
)
const scrollTop = ref(0)
const viewportHeight = ref(0)
const scrollRef = ref<HTMLElement>()
const resolvedTheme = computed<MarkdownTheme>(
  () => props.theme ?? context.theme ?? 'light',
)
const expanded = ref(false)
const overscan = 4
const copied = ref(false)
let timer: ReturnType<typeof setTimeout> | undefined
let copiedTimer: ReturnType<typeof setTimeout> | undefined
let defaultPromise: Promise<MarkdownHighlighter> | undefined

function defaultHighlighter(): Promise<MarkdownHighlighter> {
  if (!defaultPromise) {
    defaultPromise = import('../highlight/highlightjs').then(
      (module) => module.highlightjs,
    )
  }
  return defaultPromise
}

const reportedDiagnostics = new Set<string>()
function reportDiagnostic(diagnostic: MarkdownDiagnostic): void {
  const signature = `${diagnostic.code}\u001f${diagnostic.message}`
  if (reportedDiagnostics.has(signature)) return
  reportedDiagnostics.add(signature)
  context.onRenderError?.(diagnostic)
  emit('error', diagnostic)
}

const lines = computed(() => props.source.split('\n'))
const highlightedLines = computed(() => splitHighlightLines(result.value.nodes))
const truncatable = computed(
  () => props.maxLines > 0 && lines.value.length > props.maxLines,
)
const limited = computed(
  () => truncatable.value && !expanded.value,
)
const totalLines = computed(() =>
  limited.value
    ? Math.min(lines.value.length, props.maxLines)
    : lines.value.length,
)

const virtualActive = computed(
  () => props.virtual && totalLines.value >= props.virtualThreshold,
)
const startLine = computed(() =>
  virtualActive.value
    ? Math.max(
        0,
        Math.floor(scrollTop.value / props.lineHeight) - overscan,
      )
    : 0,
)
const endLine = computed(() =>
  virtualActive.value
    ? Math.min(
        totalLines.value,
        Math.ceil(
          (scrollTop.value + viewportHeight.value) / props.lineHeight,
        ) + overscan,
      )
    : totalLines.value,
)

const visibleLines = computed(() => {
  const output: Array<{ index: number; nodes: ReturnType<typeof splitHighlightLines>[number] }> = []
  for (let index = startLine.value; index < endLine.value; index += 1) {
    output.push({
      index,
      nodes: highlightedLines.value[index] ?? [],
    })
  }
  return output
})

function colorScheme(): 'light' | 'dark' {
  const theme = resolvedTheme.value
  if (theme === 'dark') return 'dark'
  if (theme === 'auto' && typeof window !== 'undefined') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light'
  }
  return 'light'
}

function refresh(): void {
  if (timer) clearTimeout(timer)
  const run = async (): Promise<void> => {
    let instance = props.highlighter ?? context.highlighter
    if (!instance) {
      try {
        instance = await defaultHighlighter()
      } catch (error) {
        reportDiagnostic(
          createDiagnostic(
            'highlighter-unavailable',
            'The default highlight.js adapter could not be loaded. Install the optional `highlight.js` peer dependency to enable syntax highlighting.',
            { severity: 'warning', phase: 'render' },
          ),
        )
        if (import.meta.env.DEV) {
          console.error('highlight.js failed to load', error)
        }
        instance = undefined
      }
    }
    if (!instance || typeof instance.highlight !== 'function') {
      result.value = plaintextHighlight(props.source, props.language)
      return
    }
    try {
      await instance.load?.()
      if (props.language) await instance.loadLanguage?.(props.language)
    } catch (error) {
      reportDiagnostic(
        createDiagnostic(
          'highlighter-load',
          `The highlighter could not prepare this language: ${errorMessage(error)}`,
          { severity: 'warning', phase: 'render' },
        ),
      )
    }
    result.value = runHighlighter(instance, props.source, props.language, {
      theme: resolvedTheme.value,
      colorScheme: colorScheme(),
    })
  }
  if (props.delay > 0) timer = setTimeout(() => void run(), props.delay)
  else void run()
}

function onScroll(event: Event): void {
  const target = event.target as HTMLElement
  scrollTop.value = target.scrollTop
  viewportHeight.value = target.clientHeight
}

function measure(): void {
  if (scrollRef.value) viewportHeight.value = scrollRef.value.clientHeight
}

onMounted(() => {
  measure()
  refresh()
})
onUnmounted(() => {
  if (timer) clearTimeout(timer)
  if (copiedTimer) clearTimeout(copiedTimer)
})
watch(
  () => [props.source, props.language, props.highlighter, resolvedTheme.value] as const,
  ([source], previous) => {
    if (!previous || source !== previous[0]) expanded.value = false
    refresh()
  },
)

async function copy(): Promise<void> {
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      await navigator.clipboard.writeText(props.source)
    }
    emit('copy', props.source)
    copied.value = true
    if (copiedTimer) clearTimeout(copiedTimer)
    copiedTimer = setTimeout(() => {
      copied.value = false
    }, 1500)
  } catch {
    copied.value = false
  }
}

defineExpose({ copy, highlighted: result })

const Body = defineComponent({
  setup() {
    return () =>
      context.renderHostSlot(
        'highlighter',
        {
          source: props.source,
          language: props.language,
          nodes: result.value.nodes,
          lines: visibleLines.value,
          actions: { copy },
        },
        () => {
          const slot = ownSlots.highlighter
          if (slot) {
            const output = slot({
              source: props.source,
              language: props.language,
              nodes: result.value.nodes,
              lines: visibleLines.value,
              actions: { copy },
            })
            if (!isEmptySlotContent(output)) return output
          }
          if (props.source === '') {
            return h(
              'div',
              {
                'data-vmd-part': 'highlighter-empty',
                class: 'vmd-highlighter-empty',
              },
              resolveLabel(context.labels.empty),
            )
          }
          const children: VNodeChild[] = []
          if (virtualActive.value && startLine.value > 0) {
            children.push(
              h('div', {
                'aria-hidden': 'true',
                style: { height: `${startLine.value * props.lineHeight}px` },
              }),
            )
          }
          for (const line of visibleLines.value) {
            const highlighted = props.highlightLines.includes(line.index + 1)
            children.push(
              h(
                'div',
                {
                  class: 'vmd-highlighter-line',
                  'data-vmd-part': 'highlighter-line',
                  'data-line': String(line.index + 1),
                  'data-highlighted': highlighted ? 'true' : undefined,
                },
                [
                  props.lineNumbers
                    ? h(
                        'span',
                        {
                          class: 'vmd-highlighter-gutter',
                          'data-vmd-part': 'highlighter-gutter',
                          'aria-hidden': 'true',
                        },
                        String(line.index + 1),
                      )
                    : null,
                  h('code', { class: 'vmd-highlighter-code' }, renderNodes(line.nodes, context)),
                ],
              ),
            )
          }
          if (virtualActive.value && endLine.value < totalLines.value) {
            children.push(
              h('div', {
                'aria-hidden': 'true',
                style: {
                  height: `${(totalLines.value - endLine.value) * props.lineHeight}px`,
                },
              }),
            )
          }
          if (truncatable.value) {
            children.push(
              h(
                'button',
                {
                  type: 'button',
                  class: 'vmd-highlighter-toggle',
                  'data-vmd-part': 'highlighter-toggle',
                  onClick: () => {
                    expanded.value = !expanded.value
                  },
                },
                expanded.value
                  ? resolveLabel(context.labels.showLess)
                  : resolveLabel(context.labels.showAll),
              ),
            )
          }
          return children
        },
      )
  },
})
</script>

<template>
  <div
    ref="scrollRef"
    data-vmd-part="highlighter"
    class="vmd-highlighter"
    :data-vmd-theme="resolvedTheme"
    :data-language="language || 'text'"
    :data-virtual="virtualActive ? 'true' : undefined"
    :style="virtualActive ? { maxHeight: `${lineHeight * 20}px`, overflow: 'auto' } : undefined"
    @scroll="onScroll"
  >
    <div data-vmd-part="highlighter-body" class="vmd-highlighter-body">
      <Body />
    </div>
  </div>
</template>
