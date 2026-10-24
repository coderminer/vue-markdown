<script setup lang="ts">
import {
  computed,
  getCurrentInstance,
  provide,
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
  MarkdownDiagnostic,
  MarkdownDocument,
  MarkdownDocumentOptions,
  MarkdownPipeline,
  MarkdownSlugger,
  MarkdownUrlTransform,
  PluginInput,
  TocItem,
} from '../core/types'
import { DEFAULT_LABELS } from '../core/labels'
import { createDiagnostic } from '../core/diagnostics'
import { useMarkdownDocument } from '../composables/useMarkdownDocument'
import { useActiveHeading } from '../composables/useActiveHeading'
import MarkdownChildren from './MarkdownChildren'
import MarkdownContent from './MarkdownContent.vue'
import MarkdownEmpty from './MarkdownEmpty.vue'
import MarkdownError from './MarkdownError.vue'
import MarkdownLoading from './MarkdownLoading.vue'
import MarkdownRoot from './MarkdownRoot.vue'
import MarkdownToc from './MarkdownToc.vue'
import {
  RENDER_CONTEXT,
  type CustomTagClickPayload,
  type LinkClickPayload,
  type RenderContext,
} from './context'
import type { VueMarkdownTagComponents } from './types'

defineOptions({ name: 'MarkdownRenderer' })

const props = withDefaults(
  defineProps<{
    source?: string
    components?: VueMarkdownTagComponents
    plugins?: PluginInput[]
    disablePlugins?: string[]
    remarkPlugins?: PluggableList
    rehypePlugins?: PluggableList
    remarkRehypeOptions?: Record<string, unknown>
    pipeline?: MarkdownPipeline
    slugger?: MarkdownSlugger
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
    as?: string | Component
  }>(),
  {
    source: '',
    components: () => ({}),
    plugins: undefined,
    disablePlugins: () => [],
    remarkPlugins: () => [],
    rehypePlugins: () => [],
    remarkRehypeOptions: undefined,
    pipeline: undefined,
    slugger: undefined,
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
    tokens: () => ({}),
    as: 'div',
  },
)

const emit = defineEmits<{
  'update:source': [source: string]
  'toc-change': [toc: TocItem[]]
  'link-click': [payload: LinkClickPayload]
  'custom-tag-click': [payload: CustomTagClickPayload]
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
 * Read the default slot once as raw Markdown. The raw slot function from the
 * vnode avoids Vue's "invoked outside render" warning that the normalized slot
 * proxy would emit; it is a static fallback for the `source` prop.
 */
function readSlotSource(): string {
  const children = instance?.vnode.children
  const raw =
    children && typeof children === 'object' && !Array.isArray(children)
      ? (children as Record<string, unknown>).default
      : undefined
  const slot = typeof raw === 'function' ? raw : slots.default
  return (slot?.() ?? []).map(vnodeText).join('')
}

const slotSource = readSlotSource()

const invalidSource = computed(
  () =>
    props.source !== undefined &&
    props.source !== null &&
    typeof (props.source as unknown) !== 'string',
)

const effectiveSource = computed(() =>
  invalidSource.value ? '' : props.source || slotSource,
)

const parseOptions = computed<MarkdownDocumentOptions>(() => ({
  components: toRaw(props.components),
  plugins: props.plugins ? toRaw(props.plugins) : undefined,
  disablePlugins: props.disablePlugins,
  remarkPlugins: props.remarkPlugins,
  rehypePlugins: props.rehypePlugins,
  remarkRehypeOptions: props.remarkRehypeOptions,
  pipeline: props.pipeline,
  slugger: props.slugger,
  allowedElements: props.allowedElements,
  disallowedElements: props.disallowedElements,
  unwrapDisallowed: props.unwrapDisallowed,
  allowElement: props.allowElement,
  urlTransform: props.urlTransform,
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

const labels = computed(() => ({ ...DEFAULT_LABELS, ...resolvedLabels.value }))

const mergedComponents = computed(() => ({
  ...resolvedComponents.value,
  ...toRaw(props.components),
}))

const mergedTokens = computed(() => ({
  ...resolvedTokens.value,
  ...toRaw(props.tokens),
}))

const regionRoot = computed(() => resolvedRegions.value.root ?? MarkdownRoot)
const regionContent = computed(() => resolvedRegions.value.content ?? MarkdownContent)
const regionToc = computed(() => resolvedRegions.value.toc ?? MarkdownToc)
const regionError = computed(() => resolvedRegions.value.error ?? MarkdownError)
const regionEmpty = computed(() => resolvedRegions.value.empty ?? MarkdownEmpty)
const regionLoading = computed(() => resolvedRegions.value.loading ?? MarkdownLoading)

const renderContext = shallowReactive<RenderContext>({
  components: mergedComponents.value,
  nodeComponents: resolvedNodeComponents.value,
  labels: labels.value,
  linkTarget: props.linkTarget,
  externalLinkTarget: props.externalLinkTarget,
  onLinkClick(payload) {
    emit('link-click', payload)
  },
  onCustomTagClick(payload) {
    emit('custom-tag-click', payload)
  },
})

watch(mergedComponents, (value) => {
  renderContext.components = value
})

watch(resolvedNodeComponents, (value) => {
  renderContext.nodeComponents = value
})

watch(labels, (value) => {
  renderContext.labels = value
})

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

defineExpose({
  scrollToHeading,
  getDocument: (): MarkdownDocument | undefined => markdownDocument.value,
  getToc: (): TocItem[] => tocItems.value,
  refresh,
  updateSource: (source: string): void => emit('update:source', source),
})
</script>

<template>
  <component :is="regionRoot" :as="as" :tokens="mergedTokens">
    <component
      :is="regionToc"
      v-if="toc && tocItems && tocItems.length > 0"
      :items="tocItems"
      :active-id="activeId"
      :label="labels.toc"
      @navigate="scrollToHeading"
    />
    <component
      :is="regionContent"
      v-if="markdownDocument && markdownDocument.nodes.length > 0"
      :nodes="markdownDocument.nodes"
    >
      <MarkdownChildren :nodes="markdownDocument.nodes" />
    </component>
    <component
      :is="regionLoading"
      v-else-if="status === 'pending'"
      :label="labels.loading"
    />
    <component
      :is="regionEmpty"
      v-else-if="status === 'ready'"
      :label="labels.empty"
    />
    <component
      :is="regionError"
      v-if="showError && status === 'error'"
      :diagnostics="diagnostics"
      :label="labels.error"
    />
  </component>
</template>
