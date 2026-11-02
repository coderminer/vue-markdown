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
import type { MermaidBlockEvents } from './types'
import { createDiagnostic, errorMessage } from '../core/diagnostics'
import { resolveLabel } from '../core/labels'
import { isValidMermaidRenderer } from '../core/adapters'
import { isEmptySlotContent, useRenderContext } from './context'
import { renderNodes } from './render'
import { createMermaidRenderId, renderMermaid } from '../mermaid/runtime'
import Icon, { type IconName } from './Icon'
import { sanitizeMermaidNodes } from '../mermaid/sanitize'
import { sanitizeSvgAsync } from '../mermaid/sanitize-svg-lazy'

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

const emit = defineEmits<MermaidBlockEvents>()

const context = useRenderContext()
const ownSlots = useSlots()
const rawSource = computed(
  () => props.source ?? (props.node?.kind === 'mermaid' ? props.node.code : ''),
)
const sourceText = computed(() =>
  // Vue props are only type-checked in TypeScript. A host can still bind a
  // non-string (for example the un-awaited Promise from `renderMermaid`), so
  // normalize before any string operation reaches the renderer.
  typeof rawSource.value === 'string' ? rawSource.value : '',
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
const label = computed(() => resolveLabel(context.labels.mermaid, { source: sourceText.value }))

const INVALID_RENDERER_RESULT =
  'The Mermaid renderer returned an invalid result. Return an object such as `{ nodes }` or `{ svg }` from `render()`.'
const EMPTY_RENDERER_OUTPUT =
  'The Mermaid renderer returned no diagram nodes or SVG. Return `{ nodes }` or `{ svg }`, or remove the custom renderer to use the built-in runtime.'
const REJECTED_RENDERER_SVG =
  'The Mermaid renderer returned SVG that sanitization rejected completely. Return safe SVG markup or sanitized `nodes` instead.'
const EMPTY_RUNTIME_OUTPUT =
  'Mermaid produced no renderable diagram output. Check the diagram syntax and the installed `mermaid` version.'
const REJECTED_RUNTIME_SVG =
  'Mermaid produced SVG that sanitization rejected completely. Check the diagram syntax and the installed `mermaid` version.'
const NON_STRING_SOURCE =
  'Mermaid source must be a string. If you used `renderMermaid()`, await its result before passing it as the source.'
let renderToken = 0

async function prepareResult(
  raw: MermaidRenderResult | null | undefined,
): Promise<MermaidRenderResult> {
  if (!raw || typeof raw !== 'object') {
    return { nodes: [], error: INVALID_RENDERER_RESULT }
  }
  const svg = typeof raw.svg === 'string' && raw.svg ? raw.svg : undefined
  const nodes = Array.isArray(raw.nodes) ? sanitizeMermaidNodes(raw.nodes) : []
  if (nodes.length > 0) return { ...raw, svg, nodes }
  if (svg) {
    // A renderer may return SVG markup plus no nodes. Parse and sanitize it
    // before it can reach the renderer. The parser loads lazily so the base
    // renderer does not statically include it.
    const sanitized = await sanitizeSvgAsync(svg)
    if (sanitized.length > 0) return { ...raw, svg, nodes: sanitized }
    return {
      ...raw,
      svg,
      nodes: [],
      error: raw.error ?? REJECTED_RENDERER_SVG,
    }
  }
  return {
    ...raw,
    svg,
    nodes: [],
    error: raw.error ?? EMPTY_RENDERER_OUTPUT,
  }
}

async function render(): Promise<void> {
  // A render may be triggered through the exposed API after unmount. Do not
  // start new work, and let an in-flight render settle without writing state.
  if (!mounted) return
  const token = ++renderToken
  status.value = 'pending'
  error.value = ''
  // Every render starts from the default view. This covers retries, renderer
  // or theme changes, and source updates, not only the source watcher below.
  scale.value = 1
  const active = renderer.value
  const id = createMermaidRenderId()
  let next: MermaidRenderResult
  if (typeof rawSource.value !== 'string') {
    next = { nodes: [], error: NON_STRING_SOURCE }
  } else if (active && isValidMermaidRenderer(active)) {
    try {
      next = await prepareResult(
        await active.render(sourceText.value, { theme: resolvedTheme.value, id }),
      )
    } catch (exception) {
      next = {
        nodes: [],
        error: `The Mermaid renderer failed: ${errorMessage(exception)}`,
      }
    }
  } else {
    // The default runtime already returns sanitized nodes.
    const rendered = await renderMermaid(sourceText.value, {
      theme: resolvedTheme.value,
      id,
    })
    next =
      rendered.error || rendered.nodes.length > 0
        ? rendered
        : {
            ...rendered,
            error: rendered.svg ? REJECTED_RUNTIME_SVG : EMPTY_RUNTIME_OUTPUT,
          }
  }

  if (!mounted || token !== renderToken) return

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
  mounted = false
  // Invalidate any in-flight render so it cannot emit events or write state
  // after the component is gone.
  renderToken += 1
  if (copiedTimer) clearTimeout(copiedTimer)
  if (typeof document !== 'undefined') {
    document.removeEventListener('keydown', onKeydown)
  }
})
watch(
  () => [sourceText.value, renderer.value, resolvedTheme.value] as const,
  () => {
    if (mounted) void render()
  },
)
async function copy(): Promise<void> {
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      await navigator.clipboard.writeText(sourceText.value)
    }
    copied.value = true
    emit('copy', sourceText.value)
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
    if (!mounted) return
    fullscreen.value = true
    document.addEventListener('keydown', onKeydown)
    element?.focus?.()
  } else {
    try {
      if (document.fullscreenElement) await document.exitFullscreen()
    } catch {
      // Ignore browsers that already exited.
    }
    if (!mounted) return
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

function retryControl(): ReturnType<typeof h> {
  return h(
    'button',
    {
      type: 'button',
      class: 'vmd-mermaid-retry',
      'data-vmd-part': 'mermaid-retry',
      'data-action': 'retry',
      onClick: retry,
    },
    resolveLabel(context.labels.retry),
  )
}

async function retry(): Promise<void> {
  scale.value = 1
  await render()
}

function showPreview(): void {
  view.value = 'preview'
  // Returning from the source tab shows the initial diagram view rather than
  // the zoom level that happened to be active before the tab switch.
  scale.value = 1
}

function showSource(): void {
  view.value = 'source'
}

const actionHandlers = computed(() => ({
  copy,
  exportPng,
  downloadSvg,
  fullscreen: () => toggleFullscreen(),
  retry,
  zoomIn: () => zoom(0.25),
  zoomOut: () => zoom(-0.25),
  resetZoom,
}))

async function runAction(action: MermaidAction): Promise<void> {
  try {
    await action.run({
      source: sourceText.value,
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
  source: sourceText.value,
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
  source: sourceText.value,
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
          source: sourceText.value,
          svg: lastGood.value?.svg,
          status: status.value,
          error: error.value,
          actions: {
            copy,
            exportPng,
            fullscreen: () => toggleFullscreen(),
            retry,
          },
        },
        () => {
          const slot = ownSlots.mermaid
          if (slot) {
            const output = slot({
              source: sourceText.value,
              svg: lastGood.value?.svg,
              status: status.value,
              error: error.value,
              actions: {
                copy,
                exportPng,
                fullscreen: () => toggleFullscreen(),
                retry,
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
                  [error.value, retryControl()],
                )
              }
              // A failed first render should not leave an empty block. Keep the
              // detailed diagnostic behind `showErrors`, but always expose a
              // lightweight failure state, a retry action, and the source tab.
              return h(
                'div',
                {
                  'data-vmd-part': 'mermaid-fallback',
                  class: 'vmd-mermaid-fallback',
                  role: 'status',
                },
                [
                  h(
                    'span',
                    { class: 'vmd-mermaid-fallback-message' },
                    resolveLabel(context.labels.mermaidFallback),
                  ),
                  retryControl(),
                ],
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
          source: sourceText.value,
          error: error.value,
          retry,
          focusSource: showSource,
        },
        () => {
          const slot = ownSlots['mermaid-error']
          if (slot) {
            const output = slot({
              source: sourceText.value,
              error: error.value,
              retry,
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
            [error.value, retryControl()],
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
          iconButton('retry', resolveLabel(context.labels.retry), 'retry', retry),
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
    <div
      class="vmd-mermaid-surface"
      :data-vmd-part="fullscreen ? 'mermaid-fullscreen' : undefined"
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
      ><code>{{ sourceText }}</code></pre>
    </div>
  </div>
</template>
