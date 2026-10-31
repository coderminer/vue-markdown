<script setup lang="ts">
import {
  computed,
  defineComponent,
  h,
  onUnmounted,
  ref,
  useSlots,
  watch,
  type VNodeChild,
} from 'vue'
import type {
  CodeBlockAction,
  HighlightLine,
  MarkdownCodeNode,
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
import { useCodeBlockRegion } from './codeRegion'
import Icon from './Icon'

const props = withDefaults(
  defineProps<{
    node?: MarkdownCodeNode
    code?: string
    language?: string
    highlighter?: MarkdownHighlighter
    theme?: MarkdownTheme
    actions?: CodeBlockAction[]
    showActions?: boolean
    showDownload?: boolean
    title?: string
    fileName?: string
    lineNumbers?: boolean
    highlightLines?: HighlightLine[]
    maxLines?: number
    virtual?: boolean
    virtualThreshold?: number
    lineHeight?: number
    delay?: number
    /** Render this instance without resolving `regions.codeBlock`. */
    standalone?: boolean
    /** Alias for `standalone`; useful when wrapping a region replacement. */
    ignoreRegion?: boolean
  }>(),
  {
    code: undefined,
    language: undefined,
    highlighter: undefined,
    theme: undefined,
    actions: () => [],
    showActions: true,
    showDownload: false,
    title: undefined,
    fileName: undefined,
    lineNumbers: false,
    highlightLines: () => [],
    maxLines: 0,
    virtual: false,
    virtualThreshold: 200,
    lineHeight: 20,
    delay: 0,
    standalone: false,
    ignoreRegion: false,
  },
)

const emit = defineEmits<{
  copy: [source: string]
  download: [source: string]
  action: [key: string]
  error: [diagnostic: MarkdownDiagnostic]
}>()

const context = useRenderContext()
const config = useMarkdownConfig()
const ownSlots = useSlots()
const region = useCodeBlockRegion({
  standalone: () => props.standalone,
  ignoreRegion: () => props.ignoreRegion,
})
const source = computed(() => {
  if (props.code !== undefined) return props.code
  return props.node?.code ?? ''
})
const language = computed(() => {
  if (props.language !== undefined) return props.language
  return props.node?.language ?? ''
})
const label = computed(() => language.value || 'text')

function reportDiagnostic(diagnostic: MarkdownDiagnostic): void {
  context.onRenderError?.(diagnostic)
  emit('error', diagnostic)
}

const { result, active, resolvedTheme, getHighlighted } = useCodeHighlighter({
  source,
  language,
  highlighter: () =>
    props.highlighter ?? context.highlighter ?? config.value.highlighter,
  theme: () => props.theme,
  contextTheme: () => context.theme ?? config.value.theme,
  enabled: () => !region.value,
  onDiagnostic: reportDiagnostic,
})

const {
  highlightedLines,
  expanded,
  truncatable,
  virtualActive,
  startLine,
  endLine,
  totalLines,
  visibleLines,
  lineHeight,
  scrollRef,
  onScroll,
  toggle,
  isHighlightedLine,
} = useLineWindow({
  nodes: () => result.value.nodes,
  source,
  maxLines: () => props.maxLines,
  virtual: () => props.virtual,
  virtualThreshold: () => props.virtualThreshold,
  lineHeight: () => props.lineHeight,
  highlightLines: () => props.highlightLines,
})

const blockMode = computed(() => result.value.mode === 'block')

const lineMode = computed(
  () =>
    props.lineNumbers ||
    props.highlightLines.length > 0 ||
    props.maxLines > 0 ||
    props.virtual,
)

const copyState = ref<'idle' | 'copied' | 'failed'>('idle')
const copyFeedback = computed(() => {
  if (copyState.value === 'copied') return resolveLabel(context.labels.copied)
  if (copyState.value === 'failed') return resolveLabel(context.labels.copyFailed)
  return ''
})

let copiedTimer: ReturnType<typeof setTimeout> | undefined
let downloadUrl: string | undefined
onUnmounted(() => {
  if (copiedTimer) clearTimeout(copiedTimer)
  if (downloadUrl) URL.revokeObjectURL(downloadUrl)
})

async function copy(): Promise<void> {
  const value = source.value
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      await navigator.clipboard.writeText(value)
    } else if (typeof document !== 'undefined') {
      const area = document.createElement('textarea')
      area.value = value
      document.body.appendChild(area)
      area.select()
      const succeeded = document.execCommand('copy')
      area.remove()
      if (succeeded === false) throw new Error('The copy command was rejected.')
    } else {
      throw new Error('Clipboard access is not available.')
    }
    emit('copy', value)
    copyState.value = 'copied'
    if (copiedTimer) clearTimeout(copiedTimer)
    copiedTimer = setTimeout(() => {
      copyState.value = 'idle'
    }, 1500)
  } catch (error) {
    copyState.value = 'failed'
    reportDiagnostic(
      createDiagnostic(
        'copy-error',
        `The source could not be copied to the clipboard: ${errorMessage(error)}`,
        { severity: 'warning', phase: 'render' },
      ),
    )
    if (copiedTimer) clearTimeout(copiedTimer)
    copiedTimer = setTimeout(() => {
      copyState.value = 'idle'
    }, 1500)
  }
}

async function download(): Promise<void> {
  const value = source.value
  if (typeof document === 'undefined' || typeof URL === 'undefined') return
  try {
    const blob = new Blob([value], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    downloadUrl = url
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = props.fileName || `code.${language.value || 'txt'}`
    anchor.click()
    // Revoking synchronously can cancel the download in some browsers.
    setTimeout(() => {
      URL.revokeObjectURL(url)
      if (downloadUrl === url) downloadUrl = undefined
    }, 1000)
    emit('download', value)
  } catch (error) {
    reportDiagnostic(
      createDiagnostic(
        'download-error',
        `The source could not be downloaded: ${errorMessage(error)}`,
        { severity: 'warning', phase: 'render' },
      ),
    )
  }
}

const actionHandlers = computed(() => ({
  copy,
  download,
}))

const codeSlotContext = computed(() => ({
  node: props.node,
  source: source.value,
  language: language.value,
  highlighted: result.value,
  nodes: result.value.nodes,
  lines: highlightedLines.value,
  visibleLines: visibleLines.value,
  actions: actionHandlers.value,
}))

const actionSlotContext = computed(() => ({
  source: source.value,
  language: language.value,
  fileName: props.fileName,
  title: props.title,
  highlighted: result.value,
  nodes: result.value.nodes,
  actions: actionHandlers.value,
}))

const headerSlotContext = computed(() => ({
  ...actionSlotContext.value,
  label: label.value,
}))

function renderLines(): VNodeChild[] {
  const children: VNodeChild[] = []
  if (virtualActive.value && startLine.value > 0) {
    children.push(
      h('div', {
        key: 'spacer-top',
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
          key: `line-${line.index}`,
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
            {
              class: [
                'vmd-highlighter-code',
                language.value ? `language-${language.value}` : undefined,
              ],
            },
            renderNodes(line.nodes, context),
          ),
        ],
      ),
    )
  }
  if (virtualActive.value && endLine.value < totalLines.value) {
    children.push(
      h('div', {
        key: 'spacer-bottom',
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
}

const Content = defineComponent({
  setup() {
    return () =>
      context.renderHostSlot('code', codeSlotContext.value, () => {
        const slot = ownSlots.code
        if (slot) {
          const output = slot(codeSlotContext.value)
          if (!isEmptySlotContent(output)) return output
        }
        if (blockMode.value) return renderNodes(result.value.nodes, context)
        if (lineMode.value) return renderLines()
        return renderNodes(result.value.nodes, context) as VNodeChild
      })
  },
})

const ActionsContent = defineComponent({
  setup() {
    return () =>
      context.renderHostSlot('toolbar', actionSlotContext.value, () => {
        const toolbar = ownSlots.toolbar
        if (toolbar) {
          const output = toolbar(actionSlotContext.value)
          if (!isEmptySlotContent(output)) return output
        }
        return context.renderHostSlot(
          'code-actions',
          actionSlotContext.value,
          () => {
            const slot = ownSlots['code-actions']
            if (slot) {
              const output = slot(actionSlotContext.value)
              if (!isEmptySlotContent(output)) return output
            }
            if (!props.showActions && props.actions.length === 0) return null
            const children: VNodeChild[] = []
            if (props.showActions) {
              const copyLabel =
                copyState.value === 'copied'
                  ? resolveLabel(context.labels.copied)
                  : copyState.value === 'failed'
                    ? resolveLabel(context.labels.copyFailed)
                    : resolveLabel(context.labels.copy)
              children.push(
                h(
                  'button',
                  {
                    type: 'button',
                    class: 'vmd-code-action',
                    'data-vmd-part': 'code-action',
                    'data-action': 'copy',
                    'data-icon': 'true',
                    'data-state': copyState.value,
                    'aria-label': copyLabel,
                    title: copyLabel,
                    onClick: copy,
                  },
                  [
                    h(Icon, {
                      name: copyState.value === 'copied' ? 'check' : 'copy',
                    }),
                    h(
                      'span',
                      { class: 'vmd-visually-hidden' },
                      copyLabel,
                    ),
                  ],
                ),
              )
              if (props.showDownload) {
                const downloadLabel = resolveLabel(context.labels.download)
                children.push(
                  h(
                    'button',
                    {
                      type: 'button',
                      class: 'vmd-code-action',
                      'data-vmd-part': 'code-action',
                      'data-action': 'download',
                      'data-icon': 'true',
                      'aria-label': downloadLabel,
                      title: downloadLabel,
                      onClick: download,
                    },
                    [
                      h(Icon, { name: 'download' }),
                      h(
                        'span',
                        { class: 'vmd-visually-hidden' },
                        downloadLabel,
                      ),
                    ],
                  ),
                )
              }
            }
            for (const action of props.actions) {
              children.push(
                h(
                  'button',
                  {
                    type: 'button',
                    class: 'vmd-code-action',
                    'data-vmd-part': 'code-action',
                    'data-action': action.key,
                    onClick: async () => {
                      try {
                        await action.run({
                          code: source.value,
                          language: language.value,
                          copy,
                          download,
                        })
                        emit('action', action.key)
                      } catch (error) {
                        reportDiagnostic(
                          createDiagnostic(
                            'action-error',
                            `The "${action.key}" action failed: ${errorMessage(error)}`,
                            { severity: 'warning', phase: 'render' },
                          ),
                        )
                      }
                    },
                  },
                  resolveLabel(action.label),
                ),
              )
            }
            children.push(
              h(
                'span',
                {
                  class: 'vmd-code-feedback',
                  'data-vmd-part': 'code-feedback',
                  'data-state': copyState.value,
                  role: 'status',
                  'aria-live': 'polite',
                },
                copyFeedback.value,
              ),
            )
            return children
          },
        )
      })
  },
})

const HeaderContent = defineComponent({
  setup() {
    return () =>
      context.renderHostSlot('header', headerSlotContext.value, () => {
        const slot = ownSlots.header
        if (slot) {
          const output = slot(headerSlotContext.value)
          if (!isEmptySlotContent(output)) return output
        }
        return [
          h(
            'span',
            { class: 'vmd-code-heading', 'data-vmd-part': 'code-heading' },
            [
              h(Icon, { name: 'source' }),
              props.title
                ? h(
                    'span',
                    { class: 'vmd-code-title', 'data-vmd-part': 'code-title' },
                    props.title,
                  )
                : null,
              props.fileName
                ? h(
                    'span',
                    {
                      class: 'vmd-code-file-name',
                      'data-vmd-part': 'code-file-name',
                    },
                    props.fileName,
                  )
                : null,
              h(
                'span',
                { class: 'vmd-code-lang', 'data-vmd-part': 'code-lang' },
                label.value,
              ),
            ],
          ),
          h(
            'span',
            { class: 'vmd-code-toolbar', 'data-vmd-part': 'code-toolbar' },
            [h(ActionsContent)],
          ),
        ]
      })
  },
})

watch(
  () => [source.value, language.value] as const,
  () => {
    copyState.value = 'idle'
  },
)

defineExpose({ copy, download, getHighlighted, highlighted: result })
</script>

<template>
  <component
    :is="region"
    v-if="region"
    :node="node"
    :code="source"
    :language="language"
    :theme="resolvedTheme"
    :highlighter="active"
    :actions="actions"
    :show-actions="showActions"
    :show-download="showDownload"
    :title="title"
    :file-name="fileName"
    :line-numbers="lineNumbers"
    :highlight-lines="highlightLines"
    :max-lines="maxLines"
    :virtual="virtual"
    :virtual-threshold="virtualThreshold"
    :line-height="lineHeight"
    :delay="delay"
    :highlighted="result"
    :action-handlers="actionHandlers"
    :copy="copy"
    :download="download"
  >
    <slot />
  </component>
  <div
    v-else
    data-vmd-part="code"
    class="vmd-code vmd-code-block"
    :data-vmd-theme="resolvedTheme"
    :data-language="label"
    :data-highlighter="active?.id"
    :data-virtual="virtualActive ? 'true' : undefined"
  >
    <div data-vmd-part="code-header" class="vmd-code-header">
      <HeaderContent />
    </div>
    <div
      v-if="blockMode"
      data-vmd-part="code-body"
      class="vmd-code-body vmd-code-block-body"
    >
      <Content />
    </div>
    <div
      v-else-if="lineMode"
      ref="scrollRef"
      data-vmd-part="code-body"
      class="vmd-code-body vmd-code-lines"
      :data-virtual="virtualActive ? 'true' : undefined"
      :style="
        virtualActive
          ? { maxHeight: `${lineHeight * 20}px`, overflow: 'auto' }
          : undefined
      "
      @scroll="onScroll"
    >
      <Content />
    </div>
    <pre
      v-else
      data-vmd-part="code-body"
      class="vmd-code-body"
    ><code
      class="vmd-code-element"
      :class="language ? `language-${language}` : undefined"
    ><Content /></code></pre>
  </div>
</template>
