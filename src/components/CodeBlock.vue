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
  MarkdownHighlighter,
  MarkdownNode,
} from '../core/types'
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
    actions?: CodeBlockAction[]
    showActions?: boolean
  }>(),
  {
    code: undefined,
    language: undefined,
    highlighter: undefined,
    actions: () => [],
    showActions: true,
  },
)

const emit = defineEmits<{
  copy: [source: string]
  download: [source: string]
  action: [key: string]
}>()

const context = useRenderContext()
const ownSlots = useSlots()
const region = computed(() => context.regions?.codeBlock)
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

function colorScheme(): 'light' | 'dark' {
  if (context.theme === 'dark') return 'dark'
  if (context.theme === 'auto' && typeof window !== 'undefined') {
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
    } catch {
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
  } catch {
    // Adapter readiness failures fall back to plain text.
  }
  result.value = runHighlighter(instance, source.value, language.value, {
    theme: context.theme,
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
  downloadUrl = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = downloadUrl
  anchor.download = `code.${language.value || 'txt'}`
  anchor.click()
  URL.revokeObjectURL(downloadUrl)
  downloadUrl = undefined
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
          if (!props.showActions) return null
          const children: VNodeChild[] = [
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
          ]
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
  () => [source.value, language.value, context.theme] as const,
  () => void refresh(),
)
watch(
  () => props.highlighter ?? context.highlighter,
  () => void refresh(),
)
watch(region, (value) => {
  if (!value) void refresh()
})

defineExpose({ copy, download, highlighted: result })
</script>

<template>
  <component
    :is="region"
    v-if="region"
    :node="node"
    :code="source"
    :language="language"
  >
    <slot />
  </component>
  <div
    v-else
    data-vmd-part="code"
    class="vmd-code vmd-code-block"
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
