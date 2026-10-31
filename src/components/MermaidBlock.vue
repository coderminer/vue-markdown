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
  MarkdownTheme,
  MermaidAction,
  MermaidRenderResult,
  MermaidRenderer,
} from '../core/types'
import { createDiagnostic, errorMessage } from '../core/diagnostics'
import { resolveLabel } from '../core/labels'
import { isValidMermaidRenderer } from '../core/adapters'
import { isEmptySlotContent, useRenderContext } from './context'
import { renderNodes } from './render'
import { createMermaidRenderId, renderMermaid } from '../mermaid/runtime'
import Icon, { type IconName } from './Icon'
import { sanitizeMermaidNodes, sanitizeSvg } from '../mermaid/sanitize'

const props = withDefaults(
  defineProps<{
    node?: MarkdownNode
    source?: string
    renderer?: MermaidRenderer
    theme?: MarkdownTheme
    showErrors?: boolean
    enableZoom?: boolean
    allowFullscreen?: boolean
    compact?: boolean
    actions?: MermaidAction[]
  }>(),
  {
    node: undefined,
    source: undefined,
    renderer: undefined,
    theme: undefined,
    showErrors: false,
    enableZoom: true,
    allowFullscreen: true,
    compact: false,
    actions: () => [],
  },
)

const emit = defineEmits<{
  rendered: [result: MermaidRenderResult]
  error: [message: string]
  copy: [source: string]
  export: [format: 'png' | 'svg']
  fullscreen: [active: boolean]
  action: [key: string]
}>()

const context = useRenderContext()
const ownSlots = useSlots()
const source = computed(
  () => props.source ?? (props.node?.kind === 'mermaid' ? props.node.code : ''),
)
const resolvedTheme = computed<MarkdownTheme>(
  () => props.theme ?? context.theme ?? 'light',
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
        await active.render(source.value, { theme: resolvedTheme.value, id }),
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
      theme: resolvedTheme.value,
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
    const unavailable =
      next.error.indexOf('Mermaid is not available') !== -1
    context.onRenderError?.(
      createDiagnostic(
        unavailable ? 'mermaid-unavailable' : 'mermaid-error',
        next.error,
        { phase: 'render' },
      ),
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
  () => [source.value, renderer.value, resolvedTheme.value] as const,
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
  } catch (exception) {
    copied.value = false
    const message = `The source could not be copied to the clipboard: ${errorMessage(exception)}`
    emit('error', message)
    context.onRenderError?.(
      createDiagnostic('copy-error', message, {
        severity: 'warning',
        phase: 'render',
        plugin: 'mermaid',
      }),
    )
  }
}

function download(blob: Blob, name: string): void {
  if (typeof document === 'undefined' || typeof URL === 'undefined') return
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = name
  anchor.click()
  // Revoking synchronously can cancel the download in some browsers.
  setTimeout(() => URL.revokeObjectURL(url), 1000)
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

function showPreview(): void {
  view.value = 'preview'
}

function showSource(): void {
  view.value = 'source'
}

const actionHandlers = computed(() => ({
  copy,
  exportPng,
  downloadSvg,
  fullscreen: () => toggleFullscreen(),
  retry: render,
  zoomIn: () => zoom(0.25),
  zoomOut: () => zoom(-0.25),
  resetZoom,
}))

async function runAction(action: MermaidAction): Promise<void> {
  try {
    await action.run({
      source: source.value,
      ...actionHandlers.value,
    })
    emit('action', action.key)
  } catch (exception) {
    const message = `The "${action.key}" action failed: ${errorMessage(exception)}`
    emit('error', message)
    context.onRenderError?.(
      createDiagnostic('action-error', message, {
        severity: 'warning',
        phase: 'render',
        plugin: 'mermaid',
      }),
    )
  }
}

const headerContext = computed(() => ({
  source: source.value,
  label: label.value,
  view: view.value,
  status: status.value,
  copied: copied.value,
  fullscreen: fullscreen.value,
  compact: props.compact,
  actions: actionHandlers.value,
  showPreview,
  showSource,
}))

const tabsContext = computed(() => ({
  view: view.value,
  status: status.value,
  actions: {
    preview: showPreview,
    source: showSource,
  },
}))

const actionsSlotContext = computed(() => ({
  source: source.value,
  status: status.value,
  copied: copied.value,
  fullscreen: fullscreen.value,
  enableZoom: props.enableZoom,
  allowFullscreen: props.allowFullscreen,
  compact: props.compact,
  actions: actionHandlers.value,
}))

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
              if (props.showErrors) {
                return h(
                  'div',
                  {
                    'data-vmd-part': 'mermaid-error',
                    class: 'vmd-mermaid-error',
                    role: 'status',
                  },
                  error.value,
                )
              }
              // A failed first render should not leave an empty block. Keep the
              // detailed diagnostic behind `showErrors`, but always expose a
              // lightweight failure state and the source tab.
              return h(
                'div',
                {
                  'data-vmd-part': 'mermaid-fallback',
                  class: 'vmd-mermaid-fallback',
                  role: 'status',
                },
                resolveLabel(context.labels.mermaidFallback),
              )
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
          focusSource: showSource,
        },
        () => {
          const slot = ownSlots['mermaid-error']
          if (slot) {
            const output = slot({
              source: source.value,
              error: error.value,
              retry: render,
              focusSource: showSource,
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

const TabsContent = defineComponent({
  setup() {
    return () =>
      context.renderHostSlot('tabs', tabsContext.value, () => {
        const slot = ownSlots.tabs
        if (slot) {
          const output = slot(tabsContext.value)
          if (!isEmptySlotContent(output)) return output
        }
        return h(
          'div',
          {
            'data-vmd-part': 'mermaid-tabs',
            class: 'vmd-mermaid-tabs',
            role: 'tablist',
          },
          [
            h(
              'button',
              {
                type: 'button',
                role: 'tab',
                'data-action': 'preview',
                'aria-selected': view.value === 'preview' ? 'true' : 'false',
                'data-active': view.value === 'preview' ? 'true' : undefined,
                onClick: showPreview,
              },
              [
                h(Icon, { name: 'preview' }),
                resolveLabel(context.labels.preview),
              ],
            ),
            h(
              'button',
              {
                type: 'button',
                role: 'tab',
                'data-action': 'source',
                'aria-selected': view.value === 'source' ? 'true' : 'false',
                'data-active': view.value === 'source' ? 'true' : undefined,
                onClick: showSource,
              },
              [
                h(Icon, { name: 'source' }),
                resolveLabel(context.labels.source),
              ],
            ),
          ],
        )
      })
  },
})

const ActionsContent = defineComponent({
  setup() {
    return () =>
      context.renderHostSlot('actions', actionsSlotContext.value, () => {
        const slot = ownSlots.actions
        if (slot) {
          const output = slot(actionsSlotContext.value)
          if (!isEmptySlotContent(output)) return output
        }
        if (props.compact) return null

        const copyLabel = copied.value
          ? resolveLabel(context.labels.copied)
          : resolveLabel(context.labels.copy)
        const iconButton = (
          action: string,
          label: string,
          icon: IconName,
          onClick: () => void | Promise<void>,
        ) =>
          h(
            'button',
            {
              type: 'button',
              class: 'vmd-mermaid-action',
              'data-vmd-part': 'mermaid-action',
              'data-action': action,
              'data-icon': 'true',
              'aria-label': label,
              title: label,
              onClick,
            },
            [
              h(Icon, { name: icon }),
              h('span', { class: 'vmd-visually-hidden' }, label),
            ],
          )

        const children = []
        if (props.enableZoom) {
          children.push(
            iconButton(
              'zoom-in',
              resolveLabel(context.labels.zoomIn),
              'zoom-in',
              () => zoom(0.25),
            ),
            iconButton(
              'zoom-out',
              resolveLabel(context.labels.zoomOut),
              'zoom-out',
              () => zoom(-0.25),
            ),
            iconButton(
              'reset-zoom',
              resolveLabel(context.labels.reset),
              'reset',
              resetZoom,
            ),
          )
        }
        children.push(
          iconButton('copy', copyLabel, copied.value ? 'check' : 'copy', copy),
          iconButton(
            'export-png',
            resolveLabel(context.labels.exportPng),
            'image',
            exportPng,
          ),
          iconButton(
            'download-svg',
            `${resolveLabel(context.labels.download)} SVG`,
            'download',
            downloadSvg,
          ),
        )
        if (props.allowFullscreen) {
          children.push(
            iconButton(
              'fullscreen',
              fullscreen.value
                ? resolveLabel(context.labels.exitFullscreen)
                : resolveLabel(context.labels.fullscreen),
              fullscreen.value ? 'exit-fullscreen' : 'fullscreen',
              () => toggleFullscreen(),
            ),
          )
        }
        children.push(
          iconButton('retry', resolveLabel(context.labels.retry), 'retry', render),
        )

        for (const action of props.actions) {
          const actionLabel = resolveLabel(action.label)
          children.push(
            h(
              'button',
              {
                type: 'button',
                class: 'vmd-mermaid-action',
                'data-vmd-part': 'mermaid-action',
                'data-action': action.key,
                onClick: () => void runAction(action),
              },
              actionLabel,
            ),
          )
        }
        return h(
          'div',
          {
            'data-vmd-part': 'mermaid-actions',
            class: 'vmd-mermaid-actions',
          },
          children,
        )
      })
  },
})

const HeaderContent = defineComponent({
  setup() {
    return () =>
      context.renderHostSlot('header', headerContext.value, () => {
        const slot = ownSlots.header
        if (slot) {
          const output = slot(headerContext.value)
          if (!isEmptySlotContent(output)) return output
        }
        return [
          h('span', { class: 'vmd-mermaid-label' }, [
            h(Icon, { name: 'diagram' }),
            label.value,
          ]),
          h(TabsContent),
          h(ActionsContent),
        ]
      })
  },
})

defineExpose({ render, copy, exportPng, downloadSvg, toggleFullscreen })
</script>

<template>
  <div
    ref="root"
    data-vmd-part="mermaid"
    class="vmd-mermaid"
    :data-vmd-theme="resolvedTheme"
    :data-status="status"
    :data-renderer="rendererId"
    :data-fullscreen="fullscreen ? 'true' : undefined"
    :data-compact="compact ? 'true' : undefined"
    :data-view="view"
    role="figure"
    :aria-label="label"
    tabindex="-1"
  >
    <div data-vmd-part="mermaid-header" class="vmd-mermaid-header">
      <HeaderContent />
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
