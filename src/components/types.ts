import type { Component, VNodeChild } from 'vue'
import type {
  MarkdownNode,
  MarkdownRegionComponents,
} from '../core/types'
import type { RenderContext } from './context'

export type VueMarkdownTagComponents = Record<
  string,
  Component | string | undefined
>

export interface MarkdownNodeRenderContext {
  node: MarkdownNode
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
