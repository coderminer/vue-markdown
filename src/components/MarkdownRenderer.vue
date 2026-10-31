<script setup lang="ts">
import {
  computed,
  getCurrentInstance,
  onUpdated,
  provide,
  ref,
  shallowReactive,
  toRaw,
  useSlots,
  watch,
  type Component,
  type VNode,
  type VNodeChild,
} from 'vue'
import type { PluggableList } from 'unified'
import type {
  AllowElement,
  DiagnosticFormatter,
  MarkdownConfig,
  MarkdownDiagnostic,
  MarkdownDocument,
  MarkdownDocumentOptions,
  MarkdownHighlighter,
  MarkdownLabels,
  MarkdownNode,
  MarkdownPipeline,
  MarkdownPreset,
  MarkdownSlugger,
  MarkdownTheme,
  MarkdownUrlTransform,
  MathEngine,
  MermaidRenderer,
  PluginInput,
  TocItem,
} from '../core/types'
import { DEFAULT_LABELS, resolveLabel } from '../core/labels'
import { mergeMarkdownConfig } from '../core/config'
import { resolvePreset } from '../core/preset'
import {
  isValidDiagnosticFormatter,
  isValidHighlighter,
  isValidMathEngine,
  isValidMermaidRenderer,
  isValidSlugger,
  isValidUrlTransform,
} from '../core/adapters'
import { createDiagnostic } from '../core/diagnostics'
import { useMarkdownDocument } from '../composables/useMarkdownDocument'
import { useActiveHeading } from '../composables/useActiveHeading'
import { useMarkdownConfig } from './config'
import MarkdownChildren from './MarkdownChildren'
import MarkdownContent from './MarkdownContent.vue'
import MarkdownEmpty from './MarkdownEmpty.vue'
import MarkdownError from './MarkdownError.vue'
import MarkdownLoading from './MarkdownLoading.vue'
import MarkdownRoot from './MarkdownRoot.vue'
import MarkdownToc from './MarkdownToc.vue'
import {
  RENDER_CONTEXT,
  isEmptySlotContent,
  type CustomTagClickPayload,
  type LinkClickPayload,
  type RenderContext,
} from './context'
import type {
  VueMarkdownNodeComponents,
  VueMarkdownRegionComponents,
  VueMarkdownTagComponents,
} from './types'

defineOptions({ name: 'MarkdownRenderer' })

const props = withDefaults(
  defineProps<{
    source?: string
    components?: VueMarkdownTagComponents
    regions?: VueMarkdownRegionComponents
    nodeComponents?: VueMarkdownNodeComponents
    labels?: Partial<MarkdownLabels>
    preset?: MarkdownPreset | MarkdownPreset[]
    plugins?: PluginInput[]
    disablePlugins?: string[]
    remarkPlugins?: PluggableList
    rehypePlugins?: PluggableList
    remarkRehypeOptions?: Record<string, unknown>
    pipeline?: MarkdownPipeline
    slugger?: MarkdownSlugger
    highlighter?: MarkdownHighlighter
    mathEngine?: MathEngine
    mermaidRenderer?: MermaidRenderer
    diagnosticsFormatter?: DiagnosticFormatter
    allowedElements?: string[]
    disallowedElements?: string[]
    unwrapDisallowed?: boolean
    allowElement?: AllowElement
    urlTransform?: MarkdownUrlTransform
    linkTarget?: string
    externalLinkTarget?: string
    baseUrl?: string
    idPrefix?: string
    syncHash?: boolean
    skipHtml?: boolean
    toc?: boolean
    showError?: boolean
    tokens?: Record<string, string>
    theme?: MarkdownTheme
    as?: string | Component
  }>(),
  {
    source: '',
    components: undefined,
    regions: undefined,
    nodeComponents: undefined,
    labels: undefined,
    preset: undefined,
    plugins: undefined,
    disablePlugins: () => [],
    remarkPlugins: () => [],
    rehypePlugins: () => [],
    remarkRehypeOptions: undefined,
    pipeline: undefined,
    slugger: undefined,
    highlighter: undefined,
    mathEngine: undefined,
    mermaidRenderer: undefined,
    diagnosticsFormatter: undefined,
    allowedElements: undefined,
    disallowedElements: undefined,
    unwrapDisallowed: false,
    allowElement: undefined,
    urlTransform: undefined,
    linkTarget: '_self',
    externalLinkTarget: '_self',
    baseUrl: undefined,
    idPrefix: '',
    syncHash: false,
    skipHtml: false,
    toc: false,
    showError: false,
    tokens: undefined,
    theme: undefined,
    as: 'div',
  },
)

const emit = defineEmits<{
  'update:source': [source: string]
  'toc-change': [toc: TocItem[]]
  'link-click': [payload: LinkClickPayload]
  'custom-tag-click': [payload: CustomTagClickPayload]
  'task-change': [payload: { checked: boolean; node: MarkdownNode }]
  'render-error': [diagnostic: MarkdownDiagnostic]
  ready: [document: MarkdownDocument]
}>()

const slots = useSlots()
const instance = getCurrentInstance()

function vnodeText(node: VNodeChild): string {
  if (typeof node === 'string' || typeof node === 'number') return String(node)
  if (!node || typeof node !== 'object') return ''
  const children = (node as VNode).children
  if (typeof children === 'string') return children
  if (Array.isArray(children)) return children.map(vnodeText).join('')
  return ''
}

/**
 * Read the default slot as raw Markdown. The raw slot function from the vnode
 * avoids Vue's "invoked outside render" warning that the normalized slot proxy
 * would emit. It backs the reactive slot text and the `source` prop always wins.
 */
function readSlotSource(): string {
  const children = instance?.vnode.children
  const raw =
    children && typeof children === 'object' && !Array.isArray(children)
      ? (children as Record<string, unknown>).default
      : undefined
  const slot = typeof raw === 'function' ? raw : slots.default
  const result = slot?.()
  const slotChildren = Array.isArray(result) ? result : [result]
  return slotChildren.map(vnodeText).join('')
}

const slotSource = ref(readSlotSource())

// Re-read the slot after each update so parent-driven slot text stays reactive.
// The equality guard prevents the parse watcher from looping.
onUpdated(() => {
  const next = readSlotSource()
  if (next !== slotSource.value) slotSource.value = next
})

const invalidSource = computed(
  () =>
    props.source !== undefined &&
    props.source !== null &&
    typeof (props.source as unknown) !== 'string',
)

const effectiveSource = computed(() =>
  invalidSource.value ? '' : props.source || slotSource.value,
)

const providerConfig = useMarkdownConfig()
const presetConfig = computed(() => resolvePreset(props.preset))

const localConfig = computed<MarkdownConfig>(() => ({
  theme: props.theme,
  tokens: props.tokens ? toRaw(props.tokens) : undefined,
  labels: props.labels ? toRaw(props.labels) : undefined,
  components: props.components ? toRaw(props.components) : undefined,
  regions: props.regions ? toRaw(props.regions) : undefined,
  nodeComponents: props.nodeComponents
    ? toRaw(props.nodeComponents)
    : undefined,
  plugins: props.plugins ? toRaw(props.plugins) : undefined,
  pipeline: props.pipeline,
  highlighter: props.highlighter,
  mathEngine: props.mathEngine,
  mermaidRenderer: props.mermaidRenderer,
  diagnosticsFormatter: props.diagnosticsFormatter,
  slugger: props.slugger,
  urlTransform: props.urlTransform,
}))

// Local props > nearest provider > preset. Plugin and built-in values are
// merged later, below these explicit layers.
const effectiveConfig = computed(() =>
  mergeMarkdownConfig(
    mergeMarkdownConfig(presetConfig.value, providerConfig.value),
    localConfig.value,
  ),
)

const validHighlighter = computed(() =>
  isValidHighlighter(effectiveConfig.value.highlighter)
    ? effectiveConfig.value.highlighter
    : undefined,
)
const validMathEngine = computed(() =>
  isValidMathEngine(effectiveConfig.value.mathEngine)
    ? effectiveConfig.value.mathEngine
    : undefined,
)
const validMermaidRenderer = computed(() =>
  isValidMermaidRenderer(effectiveConfig.value.mermaidRenderer)
    ? effectiveConfig.value.mermaidRenderer
    : undefined,
)
const validDiagnosticsFormatter = computed(() =>
  isValidDiagnosticFormatter(effectiveConfig.value.diagnosticsFormatter)
    ? effectiveConfig.value.diagnosticsFormatter
    : undefined,
)
const validSlugger = computed(() =>
  isValidSlugger(effectiveConfig.value.slugger)
    ? effectiveConfig.value.slugger
    : undefined,
)
const validUrlTransform = computed(() =>
  isValidUrlTransform(effectiveConfig.value.urlTransform)
    ? effectiveConfig.value.urlTransform
    : undefined,
)

const parseOptions = computed<MarkdownDocumentOptions>(() => ({
  components: effectiveConfig.value.components
    ? toRaw(effectiveConfig.value.components)
    : undefined,
  plugins: effectiveConfig.value.plugins
    ? toRaw(effectiveConfig.value.plugins)
    : undefined,
  disablePlugins: props.disablePlugins,
  remarkPlugins: props.remarkPlugins,
  rehypePlugins: props.rehypePlugins,
  remarkRehypeOptions: props.remarkRehypeOptions,
  pipeline: effectiveConfig.value.pipeline,
  slugger: validSlugger.value,
  allowedElements: props.allowedElements,
  disallowedElements: props.disallowedElements,
  unwrapDisallowed: props.unwrapDisallowed,
  allowElement: props.allowElement,
  urlTransform: validUrlTransform.value,
  baseUrl: props.baseUrl,
  idPrefix: props.idPrefix,
  skipHtml: props.skipHtml,
}))

const {
  document: markdownDocument,
  toc: tocItems,
  status,
  diagnostics,
  refresh,
  resolvedComponents,
  resolvedNodeComponents,
  resolvedRegions,
  resolvedLabels,
  resolvedTokens,
} = useMarkdownDocument(effectiveSource, parseOptions)

const effectiveLabels = computed<MarkdownLabels>(() => ({
  ...DEFAULT_LABELS,
  ...resolvedLabels.value,
  ...(effectiveConfig.value.labels ?? {}),
}))

const configComponents = computed(() => effectiveConfig.value.components ?? {})
const configNodeComponents = computed(
  () => effectiveConfig.value.nodeComponents ?? {},
)
const configTokens = computed(() => effectiveConfig.value.tokens ?? {})
const configRegions = computed(() => effectiveConfig.value.regions ?? {})

const mergedComponents = computed(() => ({
  ...resolvedComponents.value,
  ...configComponents.value,
}))

// An exact tag component wins over a plugin-contributed `nodeComponents[tag]`.
// Removing the plugin key keeps the resolver's deterministic order intact.
const mergedNodeComponents = computed(() => {
  const local = configComponents.value
  const result = { ...resolvedNodeComponents.value }
  for (const key of Object.keys(local)) {
    if (local[key] !== undefined) delete result[key]
  }
  return { ...result, ...configNodeComponents.value }
})

const mergedTokens = computed(() => ({
  ...resolvedTokens.value,
  ...configTokens.value,
}))

const mergedRegions = computed(() => ({
  ...resolvedRegions.value,
  ...configRegions.value,
}))

const effectiveTheme = computed<MarkdownTheme>(() => effectiveConfig.value.theme ?? 'light')

const regionRoot = computed(() => mergedRegions.value.root ?? MarkdownRoot)
const regionContent = computed(
  () => mergedRegions.value.content ?? MarkdownContent,
)
const regionToc = computed(() => mergedRegions.value.toc ?? MarkdownToc)
const regionError = computed(() => mergedRegions.value.error ?? MarkdownError)
const regionEmpty = computed(() => mergedRegions.value.empty ?? MarkdownEmpty)
const regionLoading = computed(
  () => mergedRegions.value.loading ?? MarkdownLoading,
)

const tocLabel = computed(() => resolveLabel(effectiveLabels.value.toc))
const loadingLabel = computed(() => resolveLabel(effectiveLabels.value.loading))
const emptyLabel = computed(() => resolveLabel(effectiveLabels.value.empty))
const errorLabel = computed(() =>
  resolveLabel(effectiveLabels.value.error, { count: diagnostics.value.length }),
)

const renderContext = shallowReactive<RenderContext>({
  components: mergedComponents.value,
  nodeComponents: mergedNodeComponents.value,
  regions: mergedRegions.value,
  document: markdownDocument.value,
  theme: effectiveTheme.value,
  labels: effectiveLabels.value,
  linkTarget: props.linkTarget,
  externalLinkTarget: props.externalLinkTarget,
  highlighter: validHighlighter.value,
  mathEngine: validMathEngine.value,
  mermaidRenderer: validMermaidRenderer.value,
  diagnosticsFormatter: validDiagnosticsFormatter.value,
  slots,
  renderHostSlot(name, slotProps, fallback) {
    const slot = slots[name]
    if (!slot) return fallback()
    const result = slot(slotProps)
    return isEmptySlotContent(result) ? fallback() : result
  },
  onLinkClick(payload) {
    emit('link-click', payload)
  },
  onCustomTagClick(payload) {
    emit('custom-tag-click', payload)
  },
  onTaskChange(payload) {
    emit('task-change', payload)
  },
  onRenderError(diagnostic) {
    emit('render-error', diagnostic)
  },
})

watch(mergedComponents, (value) => {
  renderContext.components = value
})

watch(mergedNodeComponents, (value) => {
  renderContext.nodeComponents = value
})

watch(mergedRegions, (value) => {
  renderContext.regions = value
})

watch(markdownDocument, (value) => {
  renderContext.document = value
})

watch(effectiveTheme, (value) => {
  renderContext.theme = value
})

watch(effectiveLabels, (value) => {
  renderContext.labels = value
})

watch(
  [
    validHighlighter,
    validMathEngine,
    validMermaidRenderer,
    validDiagnosticsFormatter,
  ] as const,
  ([nextHighlighter, nextMath, nextMermaid, nextFormatter]) => {
    renderContext.highlighter = nextHighlighter
    renderContext.mathEngine = nextMath
    renderContext.mermaidRenderer = nextMermaid
    renderContext.diagnosticsFormatter = nextFormatter
  },
)

watch(
  () => [props.linkTarget, props.externalLinkTarget] as const,
  ([linkTarget, externalLinkTarget]) => {
    renderContext.linkTarget = linkTarget
    renderContext.externalLinkTarget = externalLinkTarget
  },
)

provide(RENDER_CONTEXT, renderContext)

const activeId = useActiveHeading(
  computed(() => tocItems.value.map((item) => item.id)),
  computed(() => props.toc),
)

const contentSlotContext = computed(() => ({
  nodes: markdownDocument.value?.nodes ?? [],
  document: markdownDocument.value,
}))

const tocSlotContext = computed(() => ({
  items: tocItems.value,
  activeId: activeId.value,
  label: tocLabel.value,
  navigate: scrollToHeading,
}))

const errorSlotContext = computed(() => ({
  diagnostics: diagnostics.value,
  label: errorLabel.value,
  retry: refresh,
}))

const emptySlotContext = computed(() => ({ label: emptyLabel.value }))
const loadingSlotContext = computed(() => ({ label: loadingLabel.value }))

const rootSlotContext = computed(() => ({
  document: markdownDocument.value,
  toc: tocItems.value,
  status: status.value,
  diagnostics: diagnostics.value,
  tokens: mergedTokens.value,
  theme: effectiveTheme.value,
  actions: {
    scrollToHeading,
    getDocument: () => markdownDocument.value,
    getToc: () => tocItems.value,
    refresh,
  },
}))

function scrollToHeading(
  id: string,
  options?: ScrollIntoViewOptions,
): void {
  if (typeof document === 'undefined') return
  const element = document.getElementById(id)
  if (!element) return
  element.scrollIntoView(
    options ?? { behavior: 'smooth', block: 'start' },
  )
  if (props.syncHash && typeof history !== 'undefined') {
    history.replaceState(null, '', `#${id}`)
  }
}

let readyEmitted = false
watch(
  markdownDocument,
  (value) => {
    if (!value || readyEmitted) return
    readyEmitted = true
    emit('ready', value)
  },
  { immediate: true },
)

let lastTocSignature = ''
watch(
  tocItems,
  (value) => {
    const signature = JSON.stringify(value)
    if (signature === lastTocSignature) return
    lastTocSignature = signature
    emit('toc-change', value)
  },
  { immediate: true },
)

const reportedDiagnostics = new Set<string>()
watch(
  diagnostics,
  (value) => {
    for (const diagnostic of value) {
      const signature = `${diagnostic.code}\u001f${diagnostic.message}`
      if (reportedDiagnostics.has(signature)) continue
      reportedDiagnostics.add(signature)
      emit('render-error', diagnostic)
    }
  },
  { immediate: true },
)

watch(
  invalidSource,
  (value) => {
    if (!value) return
    emit(
      'render-error',
      createDiagnostic(
        'source-type',
        'The `source` prop must be a string; rendering an empty document.',
        { phase: 'render' },
      ),
    )
  },
  { immediate: true },
)

const reportedBehavior = new Set<string>()
watch(
  effectiveConfig,
  (value) => {
    const issues: MarkdownDiagnostic[] = []
    if (value.highlighter && !isValidHighlighter(value.highlighter)) {
      issues.push(
        createDiagnostic(
          'highlighter-invalid',
          'The `highlighter` adapter must expose an `id` and a `highlight` function; using plain text.',
          { phase: 'render' },
        ),
      )
    }
    if (value.mathEngine && !isValidMathEngine(value.mathEngine)) {
      issues.push(
        createDiagnostic(
          'math-engine-invalid',
          'The `mathEngine` adapter must expose an `id` and a `render` function; using readable TeX.',
          { phase: 'render' },
        ),
      )
    }
    if (value.mermaidRenderer && !isValidMermaidRenderer(value.mermaidRenderer)) {
      issues.push(
        createDiagnostic(
          'mermaid-renderer-invalid',
          'The `mermaidRenderer` adapter must expose an `id` and a `render` function; using the source placeholder.',
          { phase: 'render' },
        ),
      )
    }
    if (
      value.diagnosticsFormatter &&
      !isValidDiagnosticFormatter(value.diagnosticsFormatter)
    ) {
      issues.push(
        createDiagnostic(
          'diagnostic-formatter-invalid',
          'The `diagnosticsFormatter` must expose a `format` function; using the default formatter.',
          { phase: 'render' },
        ),
      )
    }
    if (value.slugger && !isValidSlugger(value.slugger)) {
      issues.push(
        createDiagnostic(
          'slugger-invalid',
          'The `slugger` must expose a `slug` function; using the default slugger.',
          { phase: 'render' },
        ),
      )
    }
    if (value.urlTransform && !isValidUrlTransform(value.urlTransform)) {
      issues.push(
        createDiagnostic(
          'url-transform-invalid',
          'The `urlTransform` must be a function; using the default URL policy.',
          { phase: 'render' },
        ),
      )
    }

    for (const issue of issues) {
      const signature = `${issue.code}\u001f${issue.message}`
      if (reportedBehavior.has(signature)) continue
      reportedBehavior.add(signature)
      emit('render-error', issue)
    }
  },
  { immediate: true },
)

defineExpose({
  scrollToHeading,
  getDocument: (): MarkdownDocument | undefined => markdownDocument.value,
  getToc: (): TocItem[] => tocItems.value,
  refresh,
  updateSource: (source: string): void => emit('update:source', source),
})
</script>

<template>
  <slot v-if="$slots.root" name="root" v-bind="rootSlotContext" />
  <component
    :is="regionRoot"
    v-else
    :as="as"
    :tokens="mergedTokens"
    :theme="effectiveTheme"
  >
    <template v-if="toc && tocItems && tocItems.length > 0">
      <slot v-if="$slots.toc" name="toc" v-bind="tocSlotContext" />
      <component
        :is="regionToc"
        v-else
        :items="tocItems"
        :active-id="activeId"
        :label="tocLabel"
        :toc-item="mergedRegions.tocItem"
        @navigate="scrollToHeading"
      >
        <template v-if="$slots['toc-item']" #toc-item="itemContext">
          <slot name="toc-item" v-bind="itemContext" />
        </template>
      </component>
    </template>

    <slot
      v-if="$slots.content && markdownDocument && markdownDocument.nodes.length > 0"
      name="content"
      v-bind="contentSlotContext"
    />
    <component
      :is="regionContent"
      v-else-if="markdownDocument && markdownDocument.nodes.length > 0"
      :nodes="markdownDocument.nodes"
    >
      <MarkdownChildren :nodes="markdownDocument.nodes" />
    </component>

    <slot
      v-else-if="$slots.loading && status === 'pending'"
      name="loading"
      v-bind="loadingSlotContext"
    />
    <component
      :is="regionLoading"
      v-else-if="status === 'pending'"
      :label="loadingLabel"
    />

    <slot
      v-else-if="$slots.empty && status === 'ready'"
      name="empty"
      v-bind="emptySlotContext"
    />
    <component
      :is="regionEmpty"
      v-else-if="status === 'ready'"
      :label="emptyLabel"
    />

    <slot
      v-if="showError && status === 'error' && $slots.error"
      name="error"
      v-bind="errorSlotContext"
    />
    <component
      :is="regionError"
      v-else-if="showError && status === 'error'"
      :diagnostics="diagnostics"
      :label="errorLabel"
    />
  </component>
</template>
