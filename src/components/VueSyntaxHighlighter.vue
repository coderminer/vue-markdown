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
  MarkdownHighlighter,
  MarkdownTheme,
} from '../core/types'
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
    delay: 0,
  },
)

const emit = defineEmits<{ copy: [source: string] }>()
const context = useRenderContext()
const ownSlots = useSlots()
const result = shallowRef<HighlightResult>(
  plaintextHighlight(props.source, props.language),
)
const scrollTop = ref(0)
const viewportHeight = ref(0)
const scrollRef = ref<HTMLElement>()
const lineHeight = 20
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

const lines = computed(() => props.source.split('\n'))
const highlightedLines = computed(() => splitHighlightLines(result.value.nodes))
const totalLines = computed(() =>
  props.maxLines > 0
    ? Math.min(lines.value.length, props.maxLines)
    : lines.value.length,
)

const virtualActive = computed(
  () => props.virtual && totalLines.value >= props.virtualThreshold,
)
const startLine = computed(() =>
  virtualActive.value
    ? Math.max(0, Math.floor(scrollTop.value / lineHeight) - overscan)
    : 0,
)
const endLine = computed(() =>
  virtualActive.value
    ? Math.min(
        totalLines.value,
        Math.ceil((scrollTop.value + viewportHeight.value) / lineHeight) +
          overscan,
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

function refresh(): void {
  if (timer) clearTimeout(timer)
  const run = async (): Promise<void> => {
    let instance = props.highlighter ?? context.highlighter
    if (!instance) {
      try {
        instance = await defaultHighlighter()
      } catch {
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
    } catch {
      // Fall back to plain text below.
    }
    result.value = runHighlighter(instance, props.source, props.language, {
      theme: props.theme ?? context.theme,
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
  () => [props.source, props.language, props.theme, props.highlighter, context.theme] as const,
  () => refresh(),
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
                style: { height: `${startLine.value * lineHeight}px` },
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
                  height: `${(totalLines.value - endLine.value) * lineHeight}px`,
                },
              }),
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
