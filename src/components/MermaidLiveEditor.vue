<script setup lang="ts">
import {
  computed,
  defineComponent,
  h,
  nextTick,
  onMounted,
  onUnmounted,
  ref,
  shallowRef,
  useSlots,
  watch,
} from 'vue'
import type {
  DiagnosticFormatter,
  MarkdownDiagnostic,
  MarkdownTheme,
  MermaidRenderer,
} from '../core/types'
import { createDiagnostic } from '../core/diagnostics'
import { resolveLabel } from '../core/labels'
import { isEmptySlotContent, useRenderContext } from './context'
import MermaidBlock from './MermaidBlock.vue'
import { createMermaidEditor, type MermaidEditorHandle } from '../editor/codemirror'

const props = withDefaults(
  defineProps<{
    modelValue?: string
    debounce?: number
    theme?: 'light' | 'dark' | 'auto' | 'custom'
    renderer?: MermaidRenderer
    diagnosticsFormatter?: DiagnosticFormatter
    compact?: boolean
    initialRatio?: number
    minRatio?: number
  }>(),
  {
    modelValue: '',
    debounce: 300,
    theme: undefined,
    renderer: undefined,
    diagnosticsFormatter: undefined,
    compact: false,
    initialRatio: 0.5,
    minRatio: 0.2,
  },
)

const emit = defineEmits<{
  'update:modelValue': [value: string]
  preview: [value: string]
  error: [diagnostic: MarkdownDiagnostic]
}>()

const context = useRenderContext()
const ownSlots = useSlots()
const resolvedTheme = computed<MarkdownTheme>(
  () => props.theme ?? context.theme ?? 'light',
)
const value = ref(props.modelValue)
const previewSource = ref(props.modelValue)
const ratio = ref(props.initialRatio)
const status = ref<'idle' | 'pending' | 'ready' | 'error'>('idle')
const diagnostics = shallowRef<MarkdownDiagnostic[]>([])
const fullscreen = ref(false)
const root = ref<HTMLElement>()
const editorHost = ref<HTMLElement>()
let handle: MermaidEditorHandle | undefined
let previewTimer: ReturnType<typeof setTimeout> | undefined

const hasEditorSlot = computed(
  () => Boolean(ownSlots.editor || context.slots?.editor),
)

function setFullscreen(next: boolean): void {
  fullscreen.value = next
  if (next) {
    root.value?.focus?.()
    if (typeof document !== 'undefined') {
      document.addEventListener('keydown', onKeydown)
    }
  } else if (typeof document !== 'undefined') {
    document.removeEventListener('keydown', onKeydown)
  }
}

async function toggleFullscreen(): Promise<void> {
  const element = root.value
  if (typeof document === 'undefined') return
  if (!fullscreen.value) {
    try {
      await element?.requestFullscreen?.()
    } catch {
      // CSS fallback.
    }
    setFullscreen(true)
  } else {
    try {
      if (document.fullscreenElement) await document.exitFullscreen()
    } catch {
      // Ignore.
    }
    setFullscreen(false)
  }
}

function onKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape' && fullscreen.value) setFullscreen(false)
}

function diagnosticFromError(message: string): MarkdownDiagnostic {
  const formatter = props.diagnosticsFormatter ?? context.diagnosticsFormatter
  if (formatter) {
    try {
      return formatter.format(message, value.value)
    } catch {
      // Fall through to the default formatter.
    }
  }
  const match = /line\s+(\d+)/i.exec(message)
  const line = match?.[1] ? Number(match[1]) : undefined
  return createDiagnostic('mermaid-error', message, {
    phase: 'render',
    source: line
      ? {
          start: { line, column: 1 },
          end: { line, column: 1 },
        }
      : undefined,
  })
}

function onError(message: string): void {
  status.value = 'error'
  const diagnostic = diagnosticFromError(message)
  diagnostics.value = [diagnostic]
  emit('error', diagnostic)
}

function onRendered(): void {
  status.value = 'ready'
  diagnostics.value = []
}

function updateValue(next: string): void {
  value.value = next
  emit('update:modelValue', next)
}

function schedulePreview(next: string): void {
  if (previewTimer) clearTimeout(previewTimer)
  previewTimer = setTimeout(() => {
    previewSource.value = next
    emit('preview', next)
  }, Math.max(0, props.debounce))
}

watch(
  () => props.modelValue,
  (next) => {
    if (next === value.value) return
    value.value = next
    handle?.setValue(next)
    schedulePreview(next)
  },
)

watch(value, (next) => {
  schedulePreview(next)
})

function focusLine(line?: number): void {
  if (line) handle?.focusLine(line)
}

function onDividerKeydown(event: KeyboardEvent): void {
  if (event.key === 'ArrowLeft') {
    ratio.value = Math.max(props.minRatio, ratio.value - 0.05)
    event.preventDefault()
  } else if (event.key === 'ArrowRight') {
    ratio.value = Math.min(1 - props.minRatio, ratio.value + 0.05)
    event.preventDefault()
  } else if (event.key === 'Home') {
    ratio.value = props.initialRatio
    event.preventDefault()
  }
}

let dragCleanup: (() => void) | undefined
function startDrag(event: MouseEvent): void {
  if (typeof document === 'undefined') return
  const rect = root.value?.getBoundingClientRect()
  if (!rect) return
  const move = (moveEvent: MouseEvent): void => {
    const next = (moveEvent.clientX - rect.left) / rect.width
    ratio.value = Math.min(1 - props.minRatio, Math.max(props.minRatio, next))
  }
  const up = (): void => {
    document.removeEventListener('mousemove', move)
    document.removeEventListener('mouseup', up)
    dragCleanup = undefined
  }
  document.addEventListener('mousemove', move)
  document.addEventListener('mouseup', up)
  dragCleanup = up
  event.preventDefault()
}

onMounted(async () => {
  if (hasEditorSlot.value) {
    return
  }
  await nextTick()
  if (!editorHost.value) return
  try {
    handle = await createMermaidEditor(editorHost.value, {
      value: value.value,
      theme: resolvedTheme.value,
      onChange: updateValue,
    })
  } catch (error) {
    if (import.meta.env.DEV) console.error('Mermaid editor failed', error)
    handle = undefined
  }
})

onUnmounted(() => {
  if (previewTimer) clearTimeout(previewTimer)
  dragCleanup?.()
  handle?.destroy()
  if (typeof document !== 'undefined') {
    document.removeEventListener('keydown', onKeydown)
  }
})

function focus(): void {
  handle?.focus()
}

/** Apply the current editor value to the preview without waiting for debounce. */
function refreshPreview(): void {
  if (previewTimer) clearTimeout(previewTimer)
  previewSource.value = value.value
  emit('preview', value.value)
}

defineExpose({
  focus,
  refreshPreview,
  toggleFullscreen,
  getDiagnostics: (): MarkdownDiagnostic[] => diagnostics.value,
})

const EditorSlot = defineComponent({
  setup() {
    return () =>
      context.renderHostSlot(
        'editor',
        {
          value: value.value,
          update: updateValue,
          diagnostics: diagnostics.value,
          status: status.value,
          actions: {
            focus: () => handle?.focus(),
            reset: () => {
              updateValue('')
              handle?.setValue('')
            },
            fullscreen: toggleFullscreen,
          },
        },
        () => {
          const slot = ownSlots.editor
          if (slot) {
            const output = slot({
              value: value.value,
              update: updateValue,
              diagnostics: diagnostics.value,
              status: status.value,
              actions: {
                focus: () => handle?.focus(),
                reset: () => updateValue(''),
                fullscreen: toggleFullscreen,
              },
            })
            if (!isEmptySlotContent(output)) return output
          }
          return h('div', {
            ref: editorHost,
            class: 'vmd-editor-host',
            'data-vmd-part': 'editor-pane',
          })
        },
      )
  },
})

const DiagnosticsContent = defineComponent({
  setup() {
    return () =>
      context.renderHostSlot(
        'editor-diagnostics',
        {
          diagnostics: diagnostics.value,
          focusLine,
        },
        () => {
          const slot = ownSlots['editor-diagnostics']
          if (slot) {
            const output = slot({
              diagnostics: diagnostics.value,
              focusLine,
            })
            if (!isEmptySlotContent(output)) return output
          }
          if (diagnostics.value.length === 0) return null
          return h(
            'ul',
            { class: 'vmd-editor-diagnostic-list', role: 'status' },
            diagnostics.value.map((diagnostic) =>
              h('li', { key: diagnostic.message }, [
                h('span', diagnostic.message),
                diagnostic.source?.start?.line
                  ? h(
                      'button',
                      {
                        type: 'button',
                        onClick: () => focusLine(diagnostic.source?.start.line),
                      },
                      `Line ${diagnostic.source.start.line}`,
                    )
                  : null,
              ]),
            ),
          )
        },
      )
  },
})
</script>

<template>
  <div
    ref="root"
    data-vmd-part="editor"
    class="vmd-editor"
    :data-vmd-theme="resolvedTheme"
    :data-fullscreen="fullscreen ? 'true' : undefined"
    :data-compact="compact ? 'true' : undefined"
    tabindex="-1"
  >
    <div data-vmd-part="editor-toolbar" class="vmd-editor-toolbar">
      <span class="vmd-editor-title">Mermaid</span>
      <button type="button" @click="toggleFullscreen">
        {{ fullscreen ? resolveLabel(context.labels.exitFullscreen) : resolveLabel(context.labels.fullscreen) }}
      </button>
      <button type="button" @click="ratio = initialRatio">
        {{ resolveLabel(context.labels.reset) }}
      </button>
    </div>

    <div class="vmd-editor-body">
      <div
        data-vmd-part="editor-pane"
        class="vmd-editor-pane"
        :style="{ flexBasis: `${ratio * 100}%` }"
      >
        <EditorSlot />
      </div>
      <div
        data-vmd-part="editor-divider"
        class="vmd-editor-divider"
        role="separator"
        aria-orientation="vertical"
        tabindex="0"
        :aria-valuenow="Math.round(ratio * 100)"
        aria-valuemin="20"
        aria-valuemax="80"
        @mousedown="startDrag"
        @keydown="onDividerKeydown"
      />
      <div data-vmd-part="editor-preview" class="vmd-editor-preview">
        <MermaidBlock
          :source="previewSource"
          :renderer="renderer"
          :theme="resolvedTheme"
          :show-errors="true"
          :compact="compact"
          @error="onError"
          @rendered="onRendered"
        />
      </div>
    </div>

    <div data-vmd-part="editor-diagnostics" class="vmd-editor-diagnostics">
      <DiagnosticsContent />
    </div>
  </div>
</template>
