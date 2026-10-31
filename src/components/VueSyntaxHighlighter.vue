<script setup lang="ts">
import { computed, defineComponent, h, useSlots, type VNodeChild } from 'vue'
import type {
  HighlightLine,
  MarkdownDiagnostic,
  MarkdownHighlighter,
  MarkdownTheme,
} from '../core/types'
import { createDiagnostic, errorMessage } from '../core/diagnostics'
import { resolveLabel } from '../core/labels'
import { useCodeHighlighter } from '../composables/useCodeHighlighter'
import { useLineWindow } from '../composables/useLineWindow'
import { renderNodes } from './render'
import { isEmptySlotContent, useRenderContext } from './context'
import { useMarkdownConfig } from './config'

const props = withDefaults(
  defineProps<{
    source: string
    language?: string
    theme?: MarkdownTheme
    highlighter?: MarkdownHighlighter
    lineNumbers?: boolean
    highlightLines?: HighlightLine[]
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
const config = useMarkdownConfig()
const ownSlots = useSlots()

function reportDiagnostic(diagnostic: MarkdownDiagnostic): void {
  context.onRenderError?.(diagnostic)
  emit('error', diagnostic)
}

const { result, active, resolvedTheme, getHighlighted } = useCodeHighlighter({
  source: () => props.source,
  language: () => props.language,
  highlighter: () =>
    props.highlighter ?? context.highlighter ?? config.value.highlighter,
  theme: () => props.theme,
  contextTheme: () => context.theme ?? config.value.theme,
  delay: () => props.delay,
  onDiagnostic: reportDiagnostic,
})

const {
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
  toggle,
  isHighlightedLine,
} = useLineWindow({
  nodes: () => result.value.nodes,
  source: () => props.source,
  maxLines: () => props.maxLines,
  virtual: () => props.virtual,
  virtualThreshold: () => props.virtualThreshold,
  lineHeight: () => props.lineHeight,
  highlightLines: () => props.highlightLines,
})

const blockMode = computed(() => result.value.mode === 'block')

async function copy(): Promise<void> {
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      await navigator.clipboard.writeText(props.source)
    } else if (typeof document !== 'undefined') {
      const area = document.createElement('textarea')
      area.value = props.source
      document.body.appendChild(area)
      area.select()
      const succeeded = document.execCommand('copy')
      area.remove()
      if (succeeded === false) throw new Error('The copy command was rejected.')
    } else {
      throw new Error('Clipboard access is not available.')
    }
    emit('copy', props.source)
  } catch (error) {
    reportDiagnostic(
      createDiagnostic(
        'copy-error',
        `The source could not be copied to the clipboard: ${errorMessage(error)}`,
        { severity: 'warning', phase: 'render' },
      ),
    )
  }
}

defineExpose({ copy, getHighlighted, highlighted: result })

const slotContext = computed(() => ({
  source: props.source,
  language: props.language,
  highlighted: result.value,
  nodes: result.value.nodes,
  lines: visibleLines.value,
  actions: { copy },
}))

const emptyContext = computed(() => ({
  source: props.source,
  language: props.language,
  label: resolveLabel(context.labels.empty),
  actions: { copy },
}))

const ActionsRegion = defineComponent({
  setup() {
    return () => {
      const own = ownSlots.actions
      if (own) {
        const output = own(slotContext.value)
        if (!isEmptySlotContent(output)) {
          return h(
            'span',
            {
              'data-vmd-part': 'highlighter-actions',
              class: 'vmd-highlighter-actions',
            },
            output,
          )
        }
      }
      const host = context.slots?.actions
      if (host) {
        const output = host(slotContext.value)
        if (!isEmptySlotContent(output)) {
          return h(
            'span',
            {
              'data-vmd-part': 'highlighter-actions',
              class: 'vmd-highlighter-actions',
            },
            output,
          )
        }
      }
      return null
    }
  },
})

const HeaderRegion = defineComponent({
  setup() {
    return () => {
      const own = ownSlots.header
      if (own) {
        const output = own(slotContext.value)
        if (!isEmptySlotContent(output)) {
          return h(
            'div',
            {
              'data-vmd-part': 'highlighter-header',
              class: 'vmd-highlighter-header',
            },
            output,
          )
        }
      }
      const host = context.slots?.header
      if (host) {
        const output = host(slotContext.value)
        if (!isEmptySlotContent(output)) {
          return h(
            'div',
            {
              'data-vmd-part': 'highlighter-header',
              class: 'vmd-highlighter-header',
            },
            output,
          )
        }
      }
      if (!ownSlots.actions && !context.slots?.actions) return null
      return h(
        'div',
        {
          'data-vmd-part': 'highlighter-header',
          class: 'vmd-highlighter-header',
        },
        [
          h(
            'span',
            { class: 'vmd-highlighter-label' },
            props.language || 'text',
          ),
          h(ActionsRegion),
        ],
      )
    }
  },
})

const FooterRegion = defineComponent({
  setup() {
    return () => {
      const own = ownSlots.footer
      if (own) {
        const output = own(slotContext.value)
        if (!isEmptySlotContent(output)) {
          return h(
            'div',
            {
              'data-vmd-part': 'highlighter-footer',
              class: 'vmd-highlighter-footer',
            },
            output,
          )
        }
      }
      const host = context.slots?.footer
      if (host) {
        const output = host(slotContext.value)
        if (!isEmptySlotContent(output)) {
          return h(
            'div',
            {
              'data-vmd-part': 'highlighter-footer',
              class: 'vmd-highlighter-footer',
            },
            output,
          )
        }
      }
      return null
    }
  },
})

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
          highlighted: result.value,
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
              highlighted: result.value,
              actions: { copy },
            })
            if (!isEmptySlotContent(output)) return output
          }
          if (props.source === '') {
            return context.renderHostSlot('empty', emptyContext.value, () => {
              const empty = ownSlots.empty
              if (empty) {
                const output = empty(emptyContext.value)
                if (!isEmptySlotContent(output)) return output
              }
              return h(
                'div',
                {
                  'data-vmd-part': 'highlighter-empty',
                  class: 'vmd-highlighter-empty',
                },
                resolveLabel(context.labels.empty),
              )
            })
          }
          if (blockMode.value) {
            return renderNodes(result.value.nodes, context)
          }
          const children: VNodeChild[] = []
          if (virtualActive.value && startLine.value > 0) {
            children.push(
              h('div', {
                'aria-hidden': 'true',
                style: { height: `${startLine.value * lineHeight.value}px` },
              }),
            )
          }
          for (const line of visibleLines.value) {
            const highlighted = isHighlightedLine(line.index)
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
                  h(
                    'code',
                    { class: 'vmd-highlighter-code' },
                    renderNodes(line.nodes, context),
                  ),
                ],
              ),
            )
          }
          if (virtualActive.value && endLine.value < totalLines.value) {
            children.push(
              h('div', {
                'aria-hidden': 'true',
                style: {
                  height: `${(totalLines.value - endLine.value) * lineHeight.value}px`,
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
                  'aria-expanded': expanded.value ? 'true' : 'false',
                  onClick: toggle,
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
    :data-highlighter="active?.id"
    :data-virtual="virtualActive ? 'true' : undefined"
    :style="
      virtualActive
        ? { maxHeight: `${lineHeight * 20}px`, overflow: 'auto' }
        : undefined
    "
    @scroll="onScroll"
  >
    <HeaderRegion />
    <div data-vmd-part="highlighter-body" class="vmd-highlighter-body">
      <Body />
    </div>
    <FooterRegion />
  </div>
</template>
