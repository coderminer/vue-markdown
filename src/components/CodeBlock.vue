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
  CodeBlockAction,
  HighlightResult,
  MarkdownDiagnostic,
  MarkdownHighlighter,
  MarkdownNode,
  MarkdownTheme,
} from '../core/types'
import { createDiagnostic, errorMessage } from '../core/diagnostics'
import { resolveLabel } from '../core/labels'
import { plaintextHighlight, runHighlighter } from '../highlight/shared'
import { renderNodes } from './render'
import { isEmptySlotContent, useRenderContext } from './context'

const props = withDefaults(
  defineProps<{
    node?: MarkdownNode
    code?: string
    language?: string
    highlighter?: MarkdownHighlighter
    theme?: MarkdownTheme
    actions?: CodeBlockAction[]
    showActions?: boolean
  }>(),
  {
    code: undefined,
    language: undefined,
    highlighter: undefined,
    theme: undefined,
    actions: () => [],
    showActions: true,
  },
)

const emit = defineEmits<{
  copy: [source: string]
  download: [source: string]
  action: [key: string]
  error: [diagnostic: MarkdownDiagnostic]
}>()

const context = useRenderContext()
const ownSlots = useSlots()
const region = computed(() => context.regions?.codeBlock)
const resolvedTheme = computed<MarkdownTheme>(
  () => props.theme ?? context.theme ?? 'light',
)
const source = computed(() => {
  if (props.code !== undefined) return props.code
  return props.node?.kind === 'code' ? props.node.code : ''
})
const language = computed(() => {
  if (props.language !== undefined) return props.language
  return props.node?.kind === 'code' ? props.node.language : ''
})
const label = computed(() => language.value || 'text')
const copied = ref(false)
const result = shallowRef<HighlightResult>(
  plaintextHighlight(source.value, language.value),
)
const active = shallowRef<MarkdownHighlighter | undefined>(
  props.highlighter ?? context.highlighter,
)

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

function colorScheme(): 'light' | 'dark' {
  if (resolvedTheme.value === 'dark') return 'dark'
  if (resolvedTheme.value === 'auto' && typeof window !== 'undefined') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light'
  }
  return 'light'
}

async function refresh(): Promise<void> {
  // A region replacement owns the rendered output, so do not load or run the
  // default highlighter for it.
  if (region.value) return
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
      if (import.meta.env.DEV) console.error('highlight.js failed to load', error)
      instance = undefined
    }
  }
  if (!instance || typeof instance.highlight !== 'function') {
    result.value = plaintextHighlight(source.value, language.value)
    return
  }
  active.value = instance
  try {
    await instance.load?.()
    if (language.value) await instance.loadLanguage?.(language.value)
  } catch (error) {
    // Adapter readiness failures fall back to plain text, but the host should
    // be able to tell a missing peer or language grammar from a parsing error.
    reportDiagnostic(
      createDiagnostic(
        'highlighter-load',
        `The highlighter could not prepare this language: ${errorMessage(error)}`,
        { severity: 'warning', phase: 'render' },
      ),
    )
  }
  result.value = runHighlighter(instance, source.value, language.value, {
    theme: resolvedTheme.value,
    colorScheme: colorScheme(),
  })
}

onMounted(() => {
  if (!region.value) void refresh()
})
onUnmounted(() => {
  if (copiedTimer) clearTimeout(copiedTimer)
})

let copiedTimer: ReturnType<typeof setTimeout> | undefined
let downloadUrl: string | undefined
onUnmounted(() => {
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
      document.execCommand('copy')
      area.remove()
    }
    emit('copy', value)
    copied.value = true
    if (copiedTimer) clearTimeout(copiedTimer)
    copiedTimer = setTimeout(() => {
      copied.value = false
    }, 1500)
  } catch {
    copied.value = false
  }
}

async function download(): Promise<void> {
  const value = source.value
  if (typeof document === 'undefined' || typeof URL === 'undefined') return
  const blob = new Blob([value], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  downloadUrl = url
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `code.${language.value || 'txt'}`
  anchor.click()
  // Revoking synchronously can cancel the download in some browsers.
  setTimeout(() => {
    URL.revokeObjectURL(url)
    if (downloadUrl === url) downloadUrl = undefined
  }, 1000)
  emit('download', value)
}

const actionHandlers = computed(() => ({
  copy,
  download,
}))

const Content = defineComponent({
  setup() {
    return () =>
      context.renderHostSlot(
        'code',
        {
          node: props.node,
          source: source.value,
          language: language.value,
          actions: actionHandlers.value,
        },
        () => {
          const slot = ownSlots.code
          if (slot) {
            const output = slot({
              node: props.node,
              source: source.value,
              language: language.value,
              actions: actionHandlers.value,
            })
            if (!isEmptySlotContent(output)) return output
          }
          return renderNodes(result.value.nodes, context) as VNodeChild
        },
      )
  },
})

const ActionsContent = defineComponent({
  setup() {
    return () =>
      context.renderHostSlot(
        'code-actions',
        {
          source: source.value,
          language: language.value,
          actions: actionHandlers.value,
        },
        () => {
          const slot = ownSlots['code-actions']
          if (slot) {
            const output = slot({
              source: source.value,
              language: language.value,
              actions: actionHandlers.value,
            })
            if (!isEmptySlotContent(output)) return output
          }
          if (!props.showActions && props.actions.length === 0) return null
          const children: VNodeChild[] = []
          if (props.showActions) {
            children.push(
              h(
                'button',
                {
                  type: 'button',
                  class: 'vmd-code-action',
                  'data-vmd-part': 'code-action',
                  'data-action': 'copy',
                  onClick: copy,
                },
                copied.value
                  ? resolveLabel(context.labels.copied)
                  : resolveLabel(context.labels.copy),
              ),
              h(
                'button',
                {
                  type: 'button',
                  class: 'vmd-code-action',
                  'data-vmd-part': 'code-action',
                  'data-action': 'download',
                  onClick: download,
                },
                resolveLabel(context.labels.download),
              ),
            )
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
                    await action.run({
                      code: source.value,
                      language: language.value,
                      copy,
                      download,
                    })
                    emit('action', action.key)
                  },
                },
                resolveLabel(action.label),
              ),
            )
          }
          return children
        },
      )
  },
})

watch(
  () => [source.value, language.value, resolvedTheme.value] as const,
  () => void refresh(),
)
watch(
  () => props.highlighter ?? context.highlighter,
  () => void refresh(),
)
watch(region, (value) => {
  if (!value) void refresh()
})

function getHighlighted(): HighlightResult {
  return result.value
}

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
  >
    <div data-vmd-part="code-header" class="vmd-code-header">
      <span data-vmd-part="code-lang" class="vmd-code-lang">{{ label }}</span>
      <span data-vmd-part="code-toolbar" class="vmd-code-toolbar">
        <ActionsContent />
      </span>
    </div>
    <pre data-vmd-part="code-body" class="vmd-code-body"><code
      class="vmd-code-element"
      :class="language ? `language-${language}` : undefined"
    ><Content /></code></pre>
  </div>
</template>
