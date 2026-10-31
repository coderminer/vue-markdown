import type { Component, VNodeChild } from 'vue'
import type {
  MarkdownDocument,
  MarkdownNode,
  MarkdownRegionComponents,
  TocItem,
} from '../core/types'
import type { RenderContext } from './context'

export type VueMarkdownTagComponents = Record<
  string,
  Component | string | undefined
>

export interface MarkdownNodeRenderContext {
  node: MarkdownNode
  kind: MarkdownNode['kind']
  /** The element/custom tag, or `undefined` for semantic nodes. */
  tag?: string
  /** A safe, always-present attribute map for element/custom nodes. */
  attrs: Record<string, string>
  key: string
  children: () => VNodeChild
  defaultRender: () => VNodeChild
  context: RenderContext
}

export type MarkdownNodeRenderer = (
  context: MarkdownNodeRenderContext,
) => VNodeChild

export type VueMarkdownNodeComponents = Record<
  string,
  Component | string | MarkdownNodeRenderer | undefined
>

export type VueMarkdownRegionComponents = {
  [K in keyof MarkdownRegionComponents]?: Component | string | undefined
}

/** Exposed instance API of `MarkdownRenderer`. */
export interface MarkdownRendererInstance {
  scrollToHeading(
    id: string,
    options?: ScrollIntoViewOptions,
  ): void
  getDocument(): MarkdownDocument | undefined
  getToc(): TocItem[]
  refresh(): Promise<void>
  updateSource(source: string): void
}
