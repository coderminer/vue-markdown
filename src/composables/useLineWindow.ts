import {
  computed,
  onMounted,
  ref,
  toValue,
  watch,
  type ComputedRef,
  type MaybeRefOrGetter,
  type Ref,
} from 'vue'
import type { MarkdownNode } from '../core/types'
import { splitHighlightLines } from '../highlight/shared'

export interface VisibleLine {
  index: number
  nodes: MarkdownNode[]
}

export interface UseLineWindowOptions {
  nodes: MaybeRefOrGetter<readonly MarkdownNode[]>
  source: MaybeRefOrGetter<string>
  maxLines?: MaybeRefOrGetter<number>
  virtual?: MaybeRefOrGetter<boolean>
  virtualThreshold?: MaybeRefOrGetter<number>
  lineHeight?: MaybeRefOrGetter<number>
}

export interface UseLineWindowReturn {
  highlightedLines: ComputedRef<MarkdownNode[][]>
  expanded: Ref<boolean>
  truncatable: ComputedRef<boolean>
  totalLines: ComputedRef<number>
  virtualActive: ComputedRef<boolean>
  startLine: ComputedRef<number>
  endLine: ComputedRef<number>
  visibleLines: ComputedRef<VisibleLine[]>
  lineHeight: ComputedRef<number>
  scrollRef: Ref<HTMLElement | undefined>
  onScroll: (event: Event) => void
  measure: () => void
  toggle: () => void
}

/**
 * Shared line windowing used by `CodeBlock` and `VueSyntaxHighlighter`.
 *
 * The composable owns only presentation state: split lines, truncation, and
 * the visible window. Highlighting itself stays in `useCodeHighlighter`.
 */
export function useLineWindow(
  options: UseLineWindowOptions,
): UseLineWindowReturn {
  const highlightedLines = computed<MarkdownNode[][]>(() =>
    splitHighlightLines(toValue(options.nodes)),
  )
  const lineCount = computed(() => highlightedLines.value.length)
  const expanded = ref(false)
  const scrollTop = ref(0)
  const viewportHeight = ref(0)
  const scrollRef = ref<HTMLElement>()
  const overscan = 4

  const maxLines = computed(() => Math.max(0, toValue(options.maxLines) ?? 0))
  const truncatable = computed(
    () => maxLines.value > 0 && lineCount.value > maxLines.value,
  )
  const limited = computed(() => truncatable.value && !expanded.value)
  const totalLines = computed(() =>
    limited.value
      ? Math.min(lineCount.value, maxLines.value)
      : lineCount.value,
  )

  const virtual = computed(() => toValue(options.virtual) ?? false)
  const virtualThreshold = computed(
    () => toValue(options.virtualThreshold) ?? 200,
  )
  const lineHeight = computed(() => toValue(options.lineHeight) ?? 20)
  const virtualActive = computed(
    () => virtual.value && totalLines.value >= virtualThreshold.value,
  )
  const startLine = computed(() =>
    virtualActive.value
      ? Math.max(
          0,
          Math.floor(scrollTop.value / lineHeight.value) - overscan,
        )
      : 0,
  )
  const endLine = computed(() =>
    virtualActive.value
      ? Math.min(
          totalLines.value,
          Math.ceil(
            (scrollTop.value + viewportHeight.value) / lineHeight.value,
          ) + overscan,
        )
      : totalLines.value,
  )

  const visibleLines = computed<VisibleLine[]>(() => {
    const output: VisibleLine[] = []
    for (let index = startLine.value; index < endLine.value; index += 1) {
      output.push({
        index,
        nodes: highlightedLines.value[index] ?? [],
      })
    }
    return output
  })

  function onScroll(event: Event): void {
    const target = event.target as HTMLElement
    scrollTop.value = target.scrollTop
    viewportHeight.value = target.clientHeight
  }

  function measure(): void {
    if (scrollRef.value) viewportHeight.value = scrollRef.value.clientHeight
  }

  function toggle(): void {
    expanded.value = !expanded.value
  }

  onMounted(measure)
  watch(
    () => toValue(options.source),
    () => {
      expanded.value = false
    },
  )

  return {
    highlightedLines,
    expanded,
    truncatable,
    totalLines,
    virtualActive,
    startLine,
    endLine,
    visibleLines,
    lineHeight,
    scrollRef,
    onScroll,
    measure,
    toggle,
  }
}
