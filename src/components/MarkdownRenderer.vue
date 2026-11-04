<script setup lang="ts">
import {
  computed,
  getCurrentInstance,
  onUnmounted,
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
  MarkdownExternalLinkTarget,
  MarkdownHighlighter,
  MarkdownLabels,
  MarkdownPipeline,
  MarkdownPreset,
  MarkdownSlugger,
  MarkdownTheme,
  MarkdownUrlTransform,
  MathEngine,
  MermaidRenderer,
  PluginInput,
  SearchChangePayload,
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
import { filterTocByDepth } from '../core/normalize'
import { countSearchMatches } from '../core/search'
import { useMarkdownDocument } from '../composables/useMarkdownDocument'
import {
  findElementById,
  useActiveHeading,
} from '../composables/useActiveHeading'
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
  type RenderContext,
} from './context'
import type {
  MarkdownRendererEvents,
  VueMarkdownNodeComponents,
  VueMarkdownRegionComponents,
  VueMarkdownTagComponents,
} from './types'

defineOptions({ name: 'MarkdownRenderer' })

function isExternalLinkTarget(value: unknown): value is MarkdownExternalLinkTarget {
  return value === '_self' || value === '_blank'
}

function isTheme(value: unknown): value is MarkdownTheme {
  return value === 'light' || value === 'dark' || value === 'auto' || value === 'custom'
}

function isTocPlacement(
  value: unknown,
): value is 'top' | 'left' | 'right' | 'hidden' {
  return value === 'top' || value === 'left' || value === 'right' || value === 'hidden'
}

function booleanProp(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback
}

function stringProp(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback
}

function normalizeTocDepth(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0
    ? value
    : 0
}

function normalizeDebounce(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0
    ? value
    : 0
}

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
    /** Defer Mermaid first renders until the block approaches the viewport. */
    mermaidDeferRendering?: boolean
    diagnosticsFormatter?: DiagnosticFormatter
    allowedElements?: string[]
    disallowedElements?: string[]
    unwrapDisallowed?: boolean
    allowElement?: AllowElement
    urlTransform?: MarkdownUrlTransform
    linkTarget?: string
    /** Target for links outside the current base URL. Defaults to `_self`. */
    externalLinkTarget?: '_self' | '_blank'
    baseUrl?: string
    idPrefix?: string
    syncHash?: boolean
    toc?: boolean
    tocDepth?: number
    tocPlacement?: 'top' | 'left' | 'right' | 'hidden'
    search?: string
    searchCaseSensitive?: boolean
    /** Debounce in milliseconds before a new query is applied. Default `0`. */
    searchDebounce?: number
    showError?: boolean
    tokens?: Record<string, string>
    theme?: 'light' | 'dark' | 'auto' | 'custom'
    as?: string | Component
  }>(),
  {
    source: undefined,
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
    mermaidDeferRendering: undefined,
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
    toc: false,
    tocDepth: 0,
    tocPlacement: 'top',
    search: '',
    searchCaseSensitive: false,
    searchDebounce: 0,
    showError: true,
    tokens: undefined,
    theme: undefined,
    as: 'div',
  },
)

const emit = defineEmits<MarkdownRendererEvents>()

// Normalize scalar props once. Vue's runtime prop types are dev-only warnings;
// the renderer also reports a diagnostic and keeps a safe value when a host
// bypasses TypeScript.
const externalLinkTarget = computed<MarkdownExternalLinkTarget>(() =>
  isExternalLinkTarget(props.externalLinkTarget) ? props.externalLinkTarget : '_self',
)
const themeProp = computed<MarkdownTheme | undefined>(() =>
  isTheme(props.theme) ? props.theme : undefined,
)
const linkTarget = computed(() => stringProp(props.linkTarget, '_self') || '_self')
const baseUrl = computed(() => stringProp(props.baseUrl))
const idPrefix = computed(() => stringProp(props.idPrefix))
const syncHash = computed(() => booleanProp(props.syncHash, false))
const tocEnabled = computed(() => booleanProp(props.toc, false))
const tocDepth = computed(() => normalizeTocDepth(props.tocDepth))
const tocPlacement = computed(() =>
  isTocPlacement(props.tocPlacement) ? props.tocPlacement : 'top',
)
const searchCaseSensitive = computed(() =>
  booleanProp(props.searchCaseSensitive, false),
)
const searchDebounce = computed(() => normalizeDebounce(props.searchDebounce))
const showError = computed(() => booleanProp(props.showError, true))

const slots = useSlots()
const instance = getCurrentInstance()
const rootRef = ref<HTMLElement>()

function rootElement(): HTMLElement | undefined {
  const direct = rootRef.value
  if (direct && direct.nodeType === 1) return direct
  const element = instance?.proxy?.$el
  return element && element.nodeType === 1 ? (element as HTMLElement) : undefined
}

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

/**
 * Whether the host actually passed `source`. The prop has no default, so an
 * explicit empty string stays distinguishable from an absent prop: `source=""`
 * clears the document, while an absent prop still falls back to the default
 * slot.
 */
const providedSource = computed(() =>
  props.source !== undefined && props.source !== null
    ? props.source
    : undefined,
)

const effectiveSource = computed(() =>
  invalidSource.value
    ? ''
    : providedSource.value !== undefined
      ? providedSource.value
      : slotSource.value,
)

const searchQuery = computed(() =>
  typeof props.search === 'string' ? props.search.trim() : '',
)

// The applied query lags the raw prop when `searchDebounce` is set. The initial
// value is applied immediately so server rendering still contains matches.
const appliedSearch = ref(searchQuery.value)
let searchTimer: ReturnType<typeof setTimeout> | undefined

watch([searchQuery, searchDebounce], ([query, delay]) => {
  if (searchTimer !== undefined) {
    clearTimeout(searchTimer)
    searchTimer = undefined
  }
  if (query === appliedSearch.value) return
  if (delay <= 0 || typeof window === 'undefined') {
    appliedSearch.value = query
    return
  }
  searchTimer = setTimeout(() => {
    searchTimer = undefined
    appliedSearch.value = query
  }, delay)
})

onUnmounted(() => {
  if (searchTimer !== undefined) clearTimeout(searchTimer)
  searchTimer = undefined
})

const providerConfig = useMarkdownConfig()
const presetConfig = computed(() => resolvePreset(props.preset))

const localConfig = computed<MarkdownConfig>(() => ({
  theme: themeProp.value,
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
  mermaidDeferRendering: props.mermaidDeferRendering,
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
  baseUrl: baseUrl.value,
  idPrefix: idPrefix.value,
  search: appliedSearch.value
    ? { query: appliedSearch.value, caseSensitive: searchCaseSensitive.value }
    : undefined,
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

const visibleToc = computed(() =>
  filterTocByDepth(tocItems.value, tocDepth.value),
)

// `markdownDocument` only changes after a run settles. Track which search state
// produced the current document so a pending or failed run cannot pair a new
// query with the previous document's match count.
const documentSearch = ref<{
  query: string
  caseSensitive: boolean
} | null>(null)

watch(
  markdownDocument,
  (value) => {
    documentSearch.value = value
      ? {
          query: appliedSearch.value,
          caseSensitive: searchCaseSensitive.value,
        }
      : null
  },
  { immediate: true },
)

const documentMatchesCurrentSearch = computed(
  () =>
    documentSearch.value !== null &&
    documentSearch.value.query === appliedSearch.value &&
    (!appliedSearch.value ||
      documentSearch.value.caseSensitive === searchCaseSensitive.value),
)

const searchState = computed<SearchChangePayload>(() => ({
  query: appliedSearch.value,
  caseSensitive: searchCaseSensitive.value,
  // An empty query has no matches by definition. Skip the document walk that
  // `countSearchMatches` would otherwise perform on every mount and clear.
  matches:
    documentMatchesCurrentSearch.value && appliedSearch.value
      ? countSearchMatches(markdownDocument.value?.nodes ?? [])
      : 0,
}))

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

const hasCustomToc = computed(() =>
  Boolean(slots.toc || mergedRegions.value.toc),
)
const showToc = computed(
  () =>
    tocEnabled.value &&
    visibleToc.value.length > 0 &&
    (tocPlacement.value !== 'hidden' || hasCustomToc.value),
)
const sideToc = computed(
  () =>
    showToc.value &&
    (tocPlacement.value === 'left' || tocPlacement.value === 'right'),
)

const effectiveTheme = computed<MarkdownTheme>(() =>
  isTheme(effectiveConfig.value.theme) ? effectiveConfig.value.theme : 'light',
)

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
  linkTarget: linkTarget.value,
  externalLinkTarget: externalLinkTarget.value,
  highlighter: validHighlighter.value,
  mathEngine: validMathEngine.value,
  mermaidRenderer: validMermaidRenderer.value,
  mermaidDeferRendering: effectiveConfig.value.mermaidDeferRendering,
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
  onMermaidRendered(result) {
    emit('mermaid-rendered', result)
  },
  onMathError(diagnostic) {
    emit('math-error', diagnostic)
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
  () => effectiveConfig.value.mermaidDeferRendering,
  (value) => {
    renderContext.mermaidDeferRendering = value
  },
)

watch(
  [linkTarget, externalLinkTarget] as const,
  ([nextLinkTarget, nextExternalLinkTarget]) => {
    renderContext.linkTarget = nextLinkTarget
    renderContext.externalLinkTarget = nextExternalLinkTarget
  },
)

provide(RENDER_CONTEXT, renderContext)

const activeId = useActiveHeading(
  computed(() => visibleToc.value.map((item) => item.id)),
  computed(() => showToc.value),
  { root: rootElement },
)

const contentSlotContext = computed(() => ({
  nodes: markdownDocument.value?.nodes ?? [],
  document: markdownDocument.value,
}))

const tocSlotContext = computed(() => ({
  items: visibleToc.value,
  activeId: activeId.value,
  label: tocLabel.value,
  tocDepth: tocDepth.value,
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
  toc: visibleToc.value,
  status: status.value,
  diagnostics: diagnostics.value,
  tokens: mergedTokens.value,
  theme: effectiveTheme.value,
  actions: {
    scrollToHeading,
    getDocument: () => markdownDocument.value,
    getToc: () => visibleToc.value,
    refresh,
  },
}))

function scrollToHeading(
  id: string,
  options?: ScrollIntoViewOptions,
): void {
  if (typeof document === 'undefined') return
  const root = rootElement()
  const element = findElementById(root ?? document, id)
  if (!element) return
  element.scrollIntoView(
    options ?? { behavior: 'smooth', block: 'start' },
  )
  if (syncHash.value && typeof history !== 'undefined') {
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

function sameToc(
  left: readonly TocItem[],
  right: readonly TocItem[],
): boolean {
  if (left.length !== right.length) return false
  for (let index = 0; index < left.length; index += 1) {
    const a = left[index]
    const b = right[index]
    if (
      !a ||
      !b ||
      a.id !== b.id ||
      a.text !== b.text ||
      a.level !== b.level
    ) {
      return false
    }
  }
  return true
}

let lastToc: readonly TocItem[] | undefined
watch(
  visibleToc,
  (value) => {
    // The immediate watcher runs before the first parse settles. Suppress that
    // transient empty TOC without recording it, so a first document that really
    // has no headings can still emit its settled empty TOC.
    if (lastToc === undefined && !markdownDocument.value && value.length === 0) {
      return
    }
    // Compare every `TocItem` field directly. A serialized signature can both
    // collide and depend on key order, while reference identity changes on
    // every parse even when the visible TOC is unchanged.
    if (lastToc && sameToc(lastToc, value)) return
    // Snapshot the fields so a consumer mutating the emitted array or a later
    // in-place document update cannot corrupt the change tracking.
    lastToc = value.map((item) => ({
      id: item.id,
      text: item.text,
      level: item.level,
    }))
    emit('toc-change', value)
  },
  { immediate: true },
)

let lastSearchSignature: string | undefined
watch(
  searchState,
  (value) => {
    // Do not report a query until the rendered document actually belongs to it.
    // Pending runs keep the previous document, and failed runs keep it by
    // design; either would otherwise pair a new query with stale matches.
    if (!documentMatchesCurrentSearch.value) return
    const signature = `${value.query}\u001f${value.caseSensitive ? '1' : '0'}\u001f${value.matches}`
    const previous = lastSearchSignature
    lastSearchSignature = signature
    if (previous === signature) return
    // Suppress the mount-time event for an empty query regardless of case
    // sensitivity. A later toggle is a real state change and still emits.
    if (previous === undefined && !value.query) return
    emit('search-change', value)
  },
  { immediate: true },
)

const reportedDiagnostics = new Set<string>()
watch(
  diagnostics,
  (value) => {
    // Keep the dedupe set bounded by the diagnostics that are still active.
    // A failure that disappears and later returns is a new failure and is
    // reported again; an unchanged diagnostic is not reported in a loop.
    const active = new Set<string>()
    for (const diagnostic of value) {
      const signature = [
        diagnostic.code,
        diagnostic.message,
        diagnostic.plugin ?? '',
        diagnostic.phase ?? '',
      ].join('\u001f')
      active.add(signature)
      if (reportedDiagnostics.has(signature)) continue
      emit('render-error', diagnostic)
    }
    reportedDiagnostics.clear()
    for (const signature of active) reportedDiagnostics.add(signature)
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

const reportedProps = new Set<string>()
function reportInvalidProp(code: string, message: string): void {
  if (reportedProps.has(code)) return
  reportedProps.add(code)
  emit(
    'render-error',
    createDiagnostic(code, message, {
      severity: 'warning',
      phase: 'render',
    }),
  )
}

watch(
  () =>
    [
      props.externalLinkTarget,
      props.tocPlacement,
      props.theme,
      props.toc,
      props.tocDepth,
      props.search,
      props.searchCaseSensitive,
      props.searchDebounce,
      props.linkTarget,
      props.baseUrl,
      props.idPrefix,
      props.syncHash,
      props.showError,
    ] as const,
  ([
    externalLinkTarget,
    tocPlacement,
    theme,
    toc,
    tocDepth,
    search,
    searchCaseSensitive,
    searchDebounce,
    linkTarget,
    baseUrl,
    idPrefix,
    syncHash,
    showError,
  ]) => {
    if (!isExternalLinkTarget(externalLinkTarget)) {
      reportInvalidProp(
        'prop-external-link-target',
        `The \`externalLinkTarget\` prop must be \`_self\` or \`_blank\`; received ${JSON.stringify(externalLinkTarget)}. Using \`_self\`.`,
      )
    }
    if (!isTocPlacement(tocPlacement)) {
      reportInvalidProp(
        'prop-toc-placement',
        `The \`tocPlacement\` prop must be \`top\`, \`left\`, \`right\`, or \`hidden\`; received ${JSON.stringify(tocPlacement)}. Using \`top\`.`,
      )
    }
    if (theme !== undefined && !isTheme(theme)) {
      reportInvalidProp(
        'prop-theme',
        `The \`theme\` prop must be \`light\`, \`dark\`, \`auto\`, or \`custom\`; received ${JSON.stringify(theme)}. The prop is ignored.`,
      )
    }
    if (typeof toc !== 'boolean') {
      reportInvalidProp(
        'prop-toc',
        `The \`toc\` prop must be a boolean; received ${JSON.stringify(toc)}. Using \`false\`.`,
      )
    }
    if (
      typeof tocDepth !== 'number' ||
      !Number.isFinite(tocDepth) ||
      tocDepth < 0
    ) {
      reportInvalidProp(
        'prop-toc-depth',
        `The \`tocDepth\` prop must be a non-negative finite number; received ${JSON.stringify(tocDepth)}. Using \`0\`.`,
      )
    }
    if (typeof search !== 'string') {
      reportInvalidProp(
        'prop-search',
        `The \`search\` prop must be a string; received ${JSON.stringify(search)}. Ignoring the query.`,
      )
    }
    if (typeof searchCaseSensitive !== 'boolean') {
      reportInvalidProp(
        'prop-search-case-sensitive',
        `The \`searchCaseSensitive\` prop must be a boolean; received ${JSON.stringify(searchCaseSensitive)}. Using \`false\`.`,
      )
    }
    if (
      typeof searchDebounce !== 'number' ||
      !Number.isFinite(searchDebounce) ||
      searchDebounce < 0
    ) {
      reportInvalidProp(
        'prop-search-debounce',
        `The \`searchDebounce\` prop must be a non-negative finite number; received ${JSON.stringify(searchDebounce)}. Using \`0\`.`,
      )
    }
    if (typeof linkTarget !== 'string' || !linkTarget) {
      reportInvalidProp(
        'prop-link-target',
        `The \`linkTarget\` prop must be a non-empty string; received ${JSON.stringify(linkTarget)}. Using \`_self\`.`,
      )
    }
    // `baseUrl` is optional. Absence is represented by `undefined` (or `null`
    // from JavaScript hosts) and is not an invalid value.
    if (
      baseUrl !== undefined &&
      baseUrl !== null &&
      typeof baseUrl !== 'string'
    ) {
      reportInvalidProp(
        'prop-base-url',
        `The \`baseUrl\` prop must be a string; received ${JSON.stringify(baseUrl)}. Ignoring it.`,
      )
    }
    if (typeof idPrefix !== 'string') {
      reportInvalidProp(
        'prop-id-prefix',
        `The \`idPrefix\` prop must be a string; received ${JSON.stringify(idPrefix)}. Using an empty prefix.`,
      )
    }
    if (typeof syncHash !== 'boolean') {
      reportInvalidProp(
        'prop-sync-hash',
        `The \`syncHash\` prop must be a boolean; received ${JSON.stringify(syncHash)}. Using \`false\`.`,
      )
    }
    if (typeof showError !== 'boolean') {
      reportInvalidProp(
        'prop-show-error',
        `The \`showError\` prop must be a boolean; received ${JSON.stringify(showError)}. Using \`true\`.`,
      )
    }
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
          'The `mermaidRenderer` adapter must expose an `id` and a `render` function; using the default Mermaid runtime.',
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
  getToc: (): TocItem[] => visibleToc.value,
  refresh,
  updateSource: (source: string): void => emit('update:source', source),
})
</script>

<template>
  <slot v-if="$slots.root" name="root" v-bind="rootSlotContext" />
  <component
    :is="regionRoot"
    v-else
    ref="rootRef"
    :as="as"
    :tokens="mergedTokens"
    :theme="effectiveTheme"
    :data-vmd-toc-placement="tocPlacement"
    :data-vmd-toc-layout="sideToc ? 'side' : 'stacked'"
  >
    <div
      v-if="showToc"
      data-vmd-part="toc-column"
      class="vmd-toc-column"
    >
      <slot v-if="$slots.toc" name="toc" v-bind="tocSlotContext" />
      <component
        :is="regionToc"
        v-else
        :items="visibleToc"
        :active-id="activeId"
        :label="tocLabel"
        :toc-item="mergedRegions.tocItem"
        :toc-depth="tocDepth"
        @navigate="scrollToHeading"
      >
        <template v-if="$slots['toc-item']" #toc-item="itemContext">
          <slot name="toc-item" v-bind="itemContext" />
        </template>
      </component>
    </div>

    <div data-vmd-part="body" class="vmd-body">
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
    </div>
  </component>
</template>
