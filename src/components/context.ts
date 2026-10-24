import { inject, type InjectionKey } from 'vue'
import type {
  MarkdownComponentValue,
  MarkdownLabels,
  MarkdownNode,
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

export interface RenderContext {
  components: Record<string, MarkdownComponentValue>
  nodeComponents?: Record<string, MarkdownComponentValue>
  labels: MarkdownLabels
  linkTarget: string
  externalLinkTarget: string
  onLinkClick(payload: LinkClickPayload): void
  onCustomTagClick(payload: CustomTagClickPayload): void
}

export const RENDER_CONTEXT: InjectionKey<RenderContext> = Symbol(
  'vue-markdown-suite:render-context',
)

const fallbackContext: RenderContext = {
  components: {},
  labels: DEFAULT_LABELS,
  linkTarget: '_self',
  externalLinkTarget: '_self',
  onLinkClick() {},
  onCustomTagClick() {},
}

export function useRenderContext(): RenderContext {
  return inject(RENDER_CONTEXT, fallbackContext)
}
