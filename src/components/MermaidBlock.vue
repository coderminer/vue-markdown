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
} from 'vue'
import type {
  MarkdownNode,
  MermaidRenderResult,
  MermaidRenderer,
} from '../core/types'
import { createDiagnostic } from '../core/diagnostics'
import { resolveLabel } from '../core/labels'
import { isValidMermaidRenderer } from '../core/adapters'
import { isEmptySlotContent, useRenderContext } from './context'
import { renderNodes } from './render'
import { createMermaidRenderId, renderMermaid } from '../mermaid/runtime'
import { sanitizeMermaidNodes, sanitizeSvg } from '../mermaid/sanitize'

const props = withDefaults(
  defineProps<{
    node?: MarkdownNode
    source?: string
    renderer?: MermaidRenderer
    showErrors?: boolean
    enableZoom?: boolean
    allowFullscreen?: boolean
  }>(),
  {
    node: undefined,
    source: undefined,
    renderer: undefined,
    showErrors: false,
    enableZoom: true,
    allowFullscreen: true,
  },
)

const emit = defineEmits<{
  rendered: [result: MermaidRenderResult]
  error: [message: string]
  copy: [source: string]
  export: [format: 'png' | 'svg']
  fullscreen: [active: boolean]
}>()

const context = useRenderContext()
const ownSlots = useSlots()
const source = computed(
  () => props.source ?? (props.node?.kind === 'mermaid' ? props.node.code : ''),
)
const status = ref<'idle' | 'pending' | 'ready' | 'error'>('idle')
const result = shallowRef<MermaidRenderResult>()
const lastGood = shallowRef<MermaidRenderResult>()
const error = ref('')
const view = ref<'preview' | 'source'>('preview')
const scale = ref(1)
const fullscreen = ref(false)
const root = ref<HTMLElement>()
const copied = ref(false)
let mounted = false
let copiedTimer: ReturnType<typeof setTimeout> | undefined

const renderer = computed(() =>
  props.renderer && isValidMermaidRenderer(props.renderer)
    ? props.renderer
    : context.mermaidRenderer,
)
const rendererId = computed(() =>
  renderer.value && isValidMermaidRenderer(renderer.value)
    ? renderer.value.id
    : 'mermaid',
)
const label = computed(() => resolveLabel(context.labels.mermaid, { source: source.value }))

const INVALID_RENDERER_OUTPUT = 'Renderer returned no usable diagram output.'
let renderToken = 0

function prepareResult(
  raw: MermaidRenderResult | null | undefined,
): MermaidRenderResult {
  if (!raw || typeof raw !== 'object') {
    return { nodes: [], error: INVALID_RENDERER_OUTPUT }
  }
  const svg = typeof raw.svg === 'string' && raw.svg ? raw.svg : undefined
  const nodes = Array.isArray(raw.nodes) ? sanitizeMermaidNodes(raw.nodes) : []
  if (nodes.length > 0) return { ...raw, svg, nodes }
  if (svg) {
    // A renderer may return SVG markup plus no nodes. Parse and sanitize it
    // before it can reach the renderer.
    const sanitized = sanitizeSvg(svg)
    if (sanitized.length > 0) return { ...raw, svg, nodes: sanitized }
  }
  return {
    ...raw,
    svg,
    nodes: [],
    error: raw.error ?? INVALID_RENDERER_OUTPUT,
  }
}

async function render(): Promise<void> {
  const token = ++renderToken
  status.value = 'pending'
  error.value = ''
  const active = renderer.value
  const id = createMermaidRenderId()
  let next: MermaidRenderResult
  if (active && isValidMermaidRenderer(active)) {
    try {
      next = prepareResult(
        await active.render(source.value, { theme: context.theme, id }),
      )
    } catch (exception) {
      next = {
        nodes: [],
        error: exception instanceof Error ? exception.message : String(exception),
      }
    }
  } else {
    // The default runtime already returns sanitized nodes.
    const rendered = await renderMermaid(source.value, {
      theme: context.theme,
      id,
    })
    next =
      rendered.error || rendered.nodes.length > 0
        ? rendered
        : { ...rendered, error: INVALID_RENDERER_OUTPUT }
  }

  if (token !== renderToken) return

  result.value = next
  if (next.error) {
    status.value = 'error'
    error.value = next.error
    emit('error', next.error)
    context.onRenderError?.(
      createDiagnostic('mermaid-error', next.error, { phase: 'render' }),
    )
  } else {
    status.value = 'ready'
    lastGood.value = next
    emit('rendered', next)
  }
}

onMounted(() => {
  mounted = true
  void render()
})
onUnmounted(() => {
  if (copiedTimer) clearTimeout(copiedTimer)
  if (typeof document !== 'undefined') {
    document.removeEventListener('keydown', onKeydown)
  }
})
watch(
  () => [source.value, renderer.value, context.theme] as const,
  () => {
    if (mounted) void render()
  },
)

async function copy(): Promise<void> {
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      await navigator.clipboard.writeText(source.value)
    }
    copied.value = true
    emit('copy', source.value)
    if (copiedTimer) clearTimeout(copiedTimer)
    copiedTimer = setTimeout(() => {
      copied.value = false
    }, 1500)
  } catch {
    copied.value = false
  }
}

function download(blob: Blob, name: string): void {
  if (typeof document === 'undefined' || typeof URL === 'undefined') return
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = name
  anchor.click()
  URL.revokeObjectURL(url)
}

async function exportPng(): Promise<void> {
  const svg = lastGood.value?.svg
  if (!svg || typeof document === 'undefined' || typeof Image === 'undefined') {
    return
  }
  try {
    const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }))
    const image = new Image()
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve()
      image.onerror = () => reject(new Error('Mermaid SVG could not be decoded.'))
      image.src = url
    })
    const canvas = document.createElement('canvas')
    canvas.width = image.width || 800
    canvas.height = image.height || 600
    canvas.getContext('2d')?.drawImage(image, 0, 0)
    URL.revokeObjectURL(url)
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/png'),
    )
    if (blob) {
      download(blob, 'diagram.png')
      emit('export', 'png')
    }
  } catch {
    // PNG export is best-effort; the source remains available.
  }
}

function downloadSvg(): void {
  const svg = lastGood.value?.svg
  if (!svg) return
  download(new Blob([svg], { type: 'image/svg+xml' }), 'diagram.svg')
  emit('export', 'svg')
}

function onKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape' && fullscreen.value) {
    void toggleFullscreen(false)
  }
}

async function toggleFullscreen(next = !fullscreen.value): Promise<void> {
  if (!props.allowFullscreen) return
  const element = root.value
  if (typeof document === 'undefined') return
  if (next) {
    try {
      await element?.requestFullscreen?.()
    } catch {
      // CSS fallback below.
    }
    fullscreen.value = true
    document.addEventListener('keydown', onKeydown)
    element?.focus?.()
  } else {
    try {
      if (document.fullscreenElement) await document.exitFullscreen()
    } catch {
      // Ignore browsers that already exited.
    }
    fullscreen.value = false
    document.removeEventListener('keydown', onKeydown)
  }
  emit('fullscreen', fullscreen.value)
}

function zoom(delta: number): void {
  scale.value = Math.min(4, Math.max(0.25, Number((scale.value + delta).toFixed(2))))
}

function resetZoom(): void {
  scale.value = 1
}

const PreviewContent = defineComponent({
  setup() {
    return () =>
      context.renderHostSlot(
        'mermaid',
        {
          source: source.value,
          svg: lastGood.value?.svg,
          status: status.value,
          error: error.value,
          actions: {
            copy,
            exportPng,
            fullscreen: () => toggleFullscreen(),
            retry: render,
          },
        },
        () => {
          const slot = ownSlots.mermaid
          if (slot) {
            const output = slot({
              source: source.value,
              svg: lastGood.value?.svg,
              status: status.value,
              error: error.value,
              actions: {
                copy,
                exportPng,
                fullscreen: () => toggleFullscreen(),
                retry: render,
              },
            })
            if (!isEmptySlotContent(output)) return output
          }
          if (!lastGood.value) {
            if (status.value === 'error') {
              return props.showErrors
                ? h(
                    'div',
                    {
                      'data-vmd-part': 'mermaid-error',
                      class: 'vmd-mermaid-error',
                      role: 'status',
                    },
                    error.value,
                  )
                : null
            }
            return h(
              'div',
              {
                'data-vmd-part': 'mermaid-pending',
                class: 'vmd-mermaid-pending',
                role: 'status',
              },
              'Rendering diagram…',
            )
          }
          return h(
            'div',
            {
              class: 'vmd-mermaid-diagram',
              style: { transform: `scale(${scale.value})` },
            },
            renderNodes(lastGood.value.nodes, context),
          )
        },
      )
  },
})

const ErrorContent = defineComponent({
  setup() {
    return () =>
      context.renderHostSlot(
        'mermaid-error',
        {
          source: source.value,
          error: error.value,
          retry: render,
          focusSource: () => {
            view.value = 'source'
          },
        },
        () => {
          const slot = ownSlots['mermaid-error']
          if (slot) {
            const output = slot({
              source: source.value,
              error: error.value,
              retry: render,
              focusSource: () => {
                view.value = 'source'
              },
            })
            if (!isEmptySlotContent(output)) return output
          }
          return h(
            'div',
            {
              'data-vmd-part': 'mermaid-error',
              class: 'vmd-mermaid-error',
              role: 'status',
            },
            error.value,
          )
        },
      )
  },
})

defineExpose({ render, copy, exportPng, downloadSvg, toggleFullscreen })
</script>

<template>
  <div
    ref="root"
    data-vmd-part="mermaid"
    class="vmd-mermaid"
    :data-status="status"
    :data-renderer="rendererId"
    :data-fullscreen="fullscreen ? 'true' : undefined"
    :data-view="view"
    role="figure"
    :aria-label="label"
    tabindex="-1"
  >
    <div data-vmd-part="mermaid-header" class="vmd-mermaid-header">
      <span class="vmd-mermaid-label">{{ label }}</span>
      <div data-vmd-part="mermaid-tabs" class="vmd-mermaid-tabs" role="tablist">
        <button
          type="button"
          role="tab"
          :aria-selected="view === 'preview'"
          :data-active="view === 'preview' ? 'true' : undefined"
          @click="view = 'preview'"
        >{{ resolveLabel(context.labels.preview) }}</button>
        <button
          type="button"
          role="tab"
          :aria-selected="view === 'source'"
          :data-active="view === 'source' ? 'true' : undefined"
          @click="view = 'source'"
        >{{ resolveLabel(context.labels.source) }}</button>
      </div>
      <div data-vmd-part="mermaid-actions" class="vmd-mermaid-actions">
        <button
          v-if="enableZoom"
          type="button"
          :aria-label="resolveLabel(context.labels.zoomIn)"
          @click="zoom(0.25)"
        >+</button>
        <button
          v-if="enableZoom"
          type="button"
          :aria-label="resolveLabel(context.labels.zoomOut)"
          @click="zoom(-0.25)"
        >−</button>
        <button
          v-if="enableZoom"
          type="button"
          :aria-label="resolveLabel(context.labels.reset)"
          @click="resetZoom"
        >1:1</button>
        <button type="button" @click="copy">
          {{ copied ? resolveLabel(context.labels.copied) : resolveLabel(context.labels.copy) }}
        </button>
        <button type="button" @click="exportPng">
          {{ resolveLabel(context.labels.exportPng) }}
        </button>
        <button type="button" @click="downloadSvg">SVG</button>
        <button
          v-if="allowFullscreen"
          type="button"
          @click="toggleFullscreen()"
        >{{ fullscreen ? resolveLabel(context.labels.exitFullscreen) : resolveLabel(context.labels.fullscreen) }}</button>
        <button type="button" @click="render">
          {{ resolveLabel(context.labels.retry) }}
        </button>
      </div>
    </div>

    <div
      v-if="view === 'preview'"
      data-vmd-part="mermaid-preview"
      class="vmd-mermaid-preview"
    >
      <div
        v-if="lastGood && status === 'error' && showErrors"
        class="vmd-mermaid-error-banner"
      ><ErrorContent /></div>
      <PreviewContent />
    </div>
    <pre
      v-else
      data-vmd-part="mermaid-source"
      class="vmd-mermaid-source"
    ><code>{{ source }}</code></pre>
  </div>
</template>
