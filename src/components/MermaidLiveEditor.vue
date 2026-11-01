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
  type VNodeChild,
} from 'vue'
import type {
  DiagnosticFormatter,
  MarkdownDiagnostic,
  MarkdownTheme,
  MermaidRenderResult,
  MermaidRenderer,
} from '../core/types'
import { createDiagnostic } from '../core/diagnostics'
import { resolveLabel } from '../core/labels'
import { isEmptySlotContent, useRenderContext } from './context'
import { lockPageScroll, unlockPageScroll } from './scroll-lock'
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
    rawDetails?: boolean
    autoFocus?: boolean
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
    rawDetails: false,
    autoFocus: false,
    initialRatio: 0.5,
    minRatio: 0.2,
  },
)

const emit = defineEmits<{
  'update:modelValue': [value: string]
  preview: [value: string]
  error: [diagnostic: MarkdownDiagnostic]
}>()

function asSource(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

const initialValue = asSource(props.modelValue)

const context = useRenderContext()
const ownSlots = useSlots()
const resolvedTheme = computed<MarkdownTheme>(
  () => props.theme ?? context.theme ?? 'light',
)
const value = ref(initialValue)
const previewSource = ref(initialValue)
const ratio = ref(props.initialRatio)
const status = ref<'idle' | 'pending' | 'ready' | 'error'>(
  initialValue.trim() ? 'pending' : 'idle',
)
const diagnostics = shallowRef<MarkdownDiagnostic[]>([])
const fullscreen = ref(false)
const root = ref<HTMLElement>()
const editorHost = ref<HTMLElement>()
let handle: MermaidEditorHandle | undefined
let previewTimer: ReturnType<typeof setTimeout> | undefined

const previewResult = shallowRef<MermaidRenderResult | null>(null)
const previewError = ref<string | undefined>()
const isEmptyPreview = computed(() => previewSource.value.trim() === '')
const hasFullscreenSlot = computed(() =>
  Boolean(ownSlots.fullscreen || context.slots?.fullscreen),
)

function renderSlot(
  name: string,
  slotProps: Record<string, unknown>,
  fallback: () => VNodeChild,
): VNodeChild {
  return context.renderHostSlot(name, slotProps, () => {
    const slot = ownSlots[name]
    if (!slot) return fallback()
    const output = slot(slotProps)
    return isEmptySlotContent(output) ? fallback() : output
  })
}

let scrollLocked = false
let nativeFullscreen = false
let active = true

function lockScroll(): void {
  if (scrollLocked) return
  scrollLocked = true
  lockPageScroll()
}

function unlockScroll(): void {
  if (!scrollLocked) return
  scrollLocked = false
  unlockPageScroll()
}

function setFullscreen(next: boolean): void {
  if (!active) return
  if (next) lockScroll()
  fullscreen.value = next
  if (next) {
    root.value?.focus?.()
    if (typeof document !== 'undefined') {
      document.addEventListener('keydown', onKeydown)
    }
  } else {
    if (typeof document !== 'undefined') {
      document.removeEventListener('keydown', onKeydown)
    }
    unlockScroll()
  }
}

async function toggleFullscreen(): Promise<void> {
  const element = root.value
  if (typeof document === 'undefined') return
  if (!fullscreen.value) {
    nativeFullscreen = false
    try {
      await element?.requestFullscreen?.()
      if (!active) return
      nativeFullscreen = Boolean(element) && document.fullscreenElement === element
    } catch {
      // CSS fallback.
    }
    if (!active) return
    setFullscreen(true)
  } else {
    try {
      if (element && document.fullscreenElement === element) {
        await document.exitFullscreen()
      }
    } catch {
      // Ignore.
    }
    if (!active) return
    nativeFullscreen = false
    setFullscreen(false)
  }
}

function onKeydown(event: KeyboardEvent): void {
  if (!fullscreen.value) return
  if (event.key === 'Escape') {
    setFullscreen(false)
    return
  }
  if (event.key !== 'Tab') return

  const focusables = Array.from(
    root.value?.querySelectorAll<HTMLElement>(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    ) ?? [],
  ).filter((element) => !element.closest('[aria-hidden="true"]'))
  if (focusables.length === 0) {
    event.preventDefault()
    root.value?.focus()
    return
  }
  const first = focusables[0]
  const last = focusables[focusables.length - 1]
  if (!first || !last) return
  if (event.shiftKey) {
    if (document.activeElement === first || document.activeElement === root.value) {
      event.preventDefault()
      last.focus()
    }
  } else if (document.activeElement === last) {
    event.preventDefault()
    first.focus()
  }
}

function onFullscreenChange(): void {
  if (!active) return
  const element = root.value
  if (element && document.fullscreenElement === element) {
    nativeFullscreen = true
    return
  }
  if (!nativeFullscreen) return
  nativeFullscreen = false
  setFullscreen(false)
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
  return createDiagnostic(
    'mermaid-error',
    line
      ? resolveLabel(context.labels.editorSyntaxError, { line })
      : resolveLabel(context.labels.editorParseError),
    {
      phase: 'render',
      details: message,
      source: line
        ? {
            start: { line, column: 1 },
            end: { line, column: 1 },
          }
        : undefined,
    },
  )
}

function onError(message: string): void {
  status.value = 'error'
  const diagnostic = diagnosticFromError(message)
  previewError.value = message
  diagnostics.value = [diagnostic]
  emit('error', diagnostic)
  if (props.autoFocus && diagnostic.source?.start?.line) {
    void nextTick(() => focusLine(diagnostic.source?.start.line))
  }
}

function onRendered(result: MermaidRenderResult): void {
  previewResult.value = result
  previewError.value = undefined
  status.value = 'ready'
  diagnostics.value = []
}

function updateValue(next: string): void {
  const source = asSource(next)
  value.value = source
  emit('update:modelValue', source)
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
    const source = asSource(next)
    if (source === value.value) return
    value.value = source
    handle?.setValue(source)
    schedulePreview(source)
  },
)

watch(value, (next) => {
  schedulePreview(next)
})

watch(previewSource, (next) => {
  if (next.trim()) {
    status.value = 'pending'
    previewError.value = undefined
    diagnostics.value = []
    return
  }
  previewResult.value = null
  previewError.value = undefined
  diagnostics.value = []
  status.value = 'idle'
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
  if (typeof document !== 'undefined') {
    document.addEventListener('fullscreenchange', onFullscreenChange)
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
  active = false
  if (previewTimer) clearTimeout(previewTimer)
  dragCleanup?.()
  handle?.destroy()
  if (typeof document !== 'undefined') {
    document.removeEventListener('keydown', onKeydown)
    document.removeEventListener('fullscreenchange', onFullscreenChange)
  }
  unlockScroll()
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

const FullscreenSlot = defineComponent({
  setup() {
    return () => {
      const label = resolveLabel(
        fullscreen.value
          ? context.labels.exitFullscreen
          : context.labels.fullscreen,
      )
      return renderSlot(
        'fullscreen',
        {
          fullscreen: fullscreen.value,
          label,
          toggle: toggleFullscreen,
        },
        () =>
          h(
            'button',
            {
              type: 'button',
              'aria-pressed': fullscreen.value ? 'true' : 'false',
              onClick: toggleFullscreen,
            },
            label,
          ),
      )
    }
  },
})

const ToolbarSlot = defineComponent({
  setup() {
    function defaultToolbar(): VNodeChild[] {
      return [
        h(
          'span',
          { class: 'vmd-editor-title' },
          resolveLabel(context.labels.editor),
        ),
        h(FullscreenSlot),
        h(
          'button',
          {
            type: 'button',
            onClick: () => {
              ratio.value = props.initialRatio
            },
          },
          resolveLabel(context.labels.editorReset),
        ),
      ]
    }

    return () => {
      const slotProps = {
        ratio: ratio.value,
        fullscreen: fullscreen.value,
        compact: props.compact,
        actions: {
          toggleFullscreen,
          resetRatio: () => {
            ratio.value = props.initialRatio
          },
          setRatio: (next: number) => {
            ratio.value = Math.min(
              1 - props.minRatio,
              Math.max(props.minRatio, next),
            )
          },
        },
      }
      const slot = context.slots?.toolbar ?? ownSlots.toolbar
      if (!slot) return defaultToolbar()
      const output = slot(slotProps)
      if (isEmptySlotContent(output)) return defaultToolbar()
      return hasFullscreenSlot.value ? [output, h(FullscreenSlot)] : output
    }
  },
})

const EditorSlot = defineComponent({
  setup() {
    return () =>
      renderSlot(
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
        () =>
          h('div', {
            ref: editorHost,
            class: 'vmd-editor-host',
            'data-vmd-part': 'editor-pane',
          }),
      )
  },
})

const PreviewSlot = defineComponent({
  setup() {
    function emptyPreview(): VNodeChild {
      return renderSlot(
        'empty',
        {
          source: previewSource.value,
          actions: {
            focus: () => handle?.focus(),
            refresh: refreshPreview,
          },
        },
        () =>
          h(
            'p',
            {
              class: 'vmd-editor-empty',
              'data-vmd-part': 'editor-empty',
            },
            resolveLabel(context.labels.editorEmpty),
          ),
      )
    }

    return () => {
      const slotProps = {
        source: previewSource.value,
        status: status.value,
        error: previewError.value,
        nodes: previewResult.value?.nodes ?? [],
        actions: {
          refresh: refreshPreview,
          fullscreen: toggleFullscreen,
          focus: () => handle?.focus(),
        },
      }
      const slot = context.slots?.preview ?? ownSlots.preview
      const output = slot ? slot(slotProps) : undefined
      const hasSlotOutput = slot ? !isEmptySlotContent(output) : false
      const renderer = isEmptyPreview.value
        ? null
        : h(MermaidBlock, {
            source: previewSource.value,
            renderer: props.renderer,
            theme: resolvedTheme.value,
            showErrors: true,
            compact: props.compact,
            style: hasSlotOutput ? { display: 'none' } : undefined,
            'aria-hidden': hasSlotOutput ? 'true' : undefined,
            onError,
            onRendered,
          })
      const content = hasSlotOutput
        ? output
        : isEmptyPreview.value
          ? emptyPreview()
          : null
      return [renderer, content]
    }
  },
})

const DiagnosticsContent = defineComponent({
  setup() {
    return () =>
      renderSlot(
        'editor-diagnostics',
        {
          diagnostics: diagnostics.value,
          focusLine,
        },
        () => {
          if (diagnostics.value.length === 0) return null
          return h(
            'ul',
            { class: 'vmd-editor-diagnostic-list', role: 'status' },
            diagnostics.value.map((diagnostic) => {
              const line = diagnostic.source?.start?.line
              return h('li', { key: diagnostic.message }, [
                h('span', diagnostic.message),
                props.rawDetails && diagnostic.details
                  ? h(
                      'pre',
                      { class: 'vmd-editor-diagnostic-details' },
                      diagnostic.details,
                    )
                  : null,
                line
                  ? h(
                      'button',
                      {
                        type: 'button',
                        onClick: () => focusLine(line),
                      },
                      resolveLabel(context.labels.editorLine, { line }),
                    )
                  : null,
              ])
            }),
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
    :aria-label="resolveLabel(context.labels.editor)"
    role="group"
    tabindex="-1"
  >
    <div
      class="vmd-editor-surface"
      :data-vmd-part="fullscreen ? 'editor-fullscreen' : undefined"
    >
      <div data-vmd-part="editor-toolbar" class="vmd-editor-toolbar">
        <ToolbarSlot />
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
          :aria-label="resolveLabel(context.labels.editorSplitter)"
          :aria-valuenow="Math.round(ratio * 100)"
          :aria-valuemin="Math.round(minRatio * 100)"
          :aria-valuemax="Math.round((1 - minRatio) * 100)"
          @mousedown="startDrag"
          @keydown="onDividerKeydown"
        />
        <div
          data-vmd-part="editor-preview"
          class="vmd-editor-preview"
          role="region"
          :aria-label="resolveLabel(context.labels.preview)"
        >
          <PreviewSlot />
        </div>
      </div>

      <div
        data-vmd-part="editor-diagnostics"
        class="vmd-editor-diagnostics"
        :data-compact="compact ? 'true' : undefined"
        role="group"
        :aria-label="resolveLabel(context.labels.editorDiagnostics)"
      >
        <DiagnosticsContent />
      </div>
    </div>
  </div>
</template>
