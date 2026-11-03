import type { Component, VNodeChild } from 'vue'
import type {
  MarkdownDiagnostic,
  MarkdownDocument,
  MarkdownNode,
  MarkdownRegionComponents,
  MermaidRenderResult,
  SearchChangePayload,
  TocItem,
} from '../core/types'
import type {
  CustomTagClickPayload,
  LinkClickPayload,
  RenderContext,
  TaskChangePayload,
} from './context'

/**
 * Typed event map for `MarkdownRenderer`. Payloads are library-owned values:
 * document models, diagnostics, primitives, or plain records. They never
 * contain Vue components, VNodes, DOM nodes, or processor objects. Interaction
 * events also carry the originating DOM `MouseEvent` so listeners can cancel
 * the default behavior. Use the map with `defineEmits` in host wrappers when a
 * single typed contract is preferable to learning each event shape separately.
 */
export interface MarkdownRendererEvents {
  'update:source': [source: string]
  'toc-change': [toc: TocItem[]]
  'link-click': [payload: LinkClickPayload]
  'custom-tag-click': [payload: CustomTagClickPayload]
  'task-change': [payload: TaskChangePayload]
  'search-change': [payload: SearchChangePayload]
  'math-error': [diagnostic: MarkdownDiagnostic]
  'mermaid-rendered': [result: MermaidRenderResult]
  'render-error': [diagnostic: MarkdownDiagnostic]
  ready: [document: MarkdownDocument]
}

/**
 * Typed event map for `MermaidBlock` and `MarkdownMermaid`. Primitive payloads
 * are used for lightweight UI notifications; `rendered` carries the structured
 * render result so a listener can read the sanitized nodes and SVG.
 */
export interface MermaidBlockEvents {
  rendered: [result: MermaidRenderResult]
  error: [message: string]
  copy: [source: string]
  export: [format: 'png' | 'svg']
  fullscreen: [active: boolean]
  action: [key: string]
}

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
