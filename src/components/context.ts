import { inject, type InjectionKey, type Slot, type VNodeChild } from 'vue'
import type {
  DiagnosticFormatter,
  MarkdownComponentValue,
  MarkdownDocument,
  MarkdownHighlighter,
  MarkdownLabels,
  MarkdownNode,
  MarkdownRegionComponents,
  MarkdownTheme,
  MathEngine,
  MermaidRenderer,
} from '../core/types'
import { DEFAULT_LABELS } from '../core/labels'

export interface LinkClickPayload {
  url: string
  target: string
  node: MarkdownNode
  event: MouseEvent
}

export interface CustomTagClickPayload {
  tag: string
  props: Record<string, unknown>
  node: MarkdownNode
  event: MouseEvent
}

export interface TaskChangePayload {
  checked: boolean
  node: MarkdownNode
}

export interface RenderContext {
  components: Record<string, MarkdownComponentValue>
  nodeComponents?: Record<string, MarkdownComponentValue>
  regions?: MarkdownRegionComponents
  document?: MarkdownDocument
  theme?: MarkdownTheme
  labels: MarkdownLabels
  linkTarget: string
  externalLinkTarget: string
  highlighter?: MarkdownHighlighter
  mathEngine?: MathEngine
  mermaidRenderer?: MermaidRenderer
  diagnosticsFormatter?: DiagnosticFormatter
  /** Host-authored region slots keyed by documented slot name. */
  slots?: Readonly<Record<string, Slot | undefined>>
  /** Render a host slot, falling back to the default region when empty. */
  renderHostSlot(
    name: string,
    props: Record<string, unknown>,
    fallback: () => VNodeChild,
  ): VNodeChild
  onLinkClick(payload: LinkClickPayload): void
  onCustomTagClick(payload: CustomTagClickPayload): void
  onTaskChange(payload: TaskChangePayload): void
  onRenderError?(diagnostic: import('../core/types').MarkdownDiagnostic): void
}

export const RENDER_CONTEXT: InjectionKey<RenderContext> = Symbol(
  'vue-markdown-suite:render-context',
)

const fallbackContext: RenderContext = {
  components: {},
  labels: DEFAULT_LABELS,
  linkTarget: '_self',
  externalLinkTarget: '_self',
  renderHostSlot(_name, _props, fallback) {
    return fallback()
  },
  onLinkClick() {},
  onCustomTagClick() {},
  onTaskChange() {},
}

export function useRenderContext(): RenderContext {
  return inject(RENDER_CONTEXT, fallbackContext)
}

/** True when a slot produced no meaningful output and the default should win. */
export function isEmptySlotContent(value: VNodeChild): boolean {
  if (value === null || value === undefined) return true
  if (typeof value === 'string') return value.trim() === ''
  if (Array.isArray(value)) {
    return value.length === 0 || value.every((child) => isEmptySlotContent(child))
  }
  return false
}
