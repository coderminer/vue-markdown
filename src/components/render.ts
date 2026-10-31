import { h, type Component, type VNodeChild } from 'vue'
import type {
  MarkdownCodeNode,
  MarkdownComponentValue,
  MarkdownCustomTagNode,
  MarkdownElementNode,
  MarkdownNode,
  MarkdownTextNode,
} from '../core/types'
import type { RenderContext } from './context'
import MarkdownBlockquote from './MarkdownBlockquote.vue'
import MarkdownBreak from './MarkdownBreak.vue'
import MarkdownCode from './MarkdownCode.vue'
import MarkdownCustomTag from './MarkdownCustomTag.vue'
import MarkdownEmphasis from './MarkdownEmphasis.vue'
import MarkdownHeading from './MarkdownHeading.vue'
import MarkdownHorizontalRule from './MarkdownHorizontalRule.vue'
import MarkdownImage from './MarkdownImage.vue'
import MarkdownInlineCode from './MarkdownInlineCode.vue'
import MarkdownLink from './MarkdownLink.vue'
import MarkdownList from './MarkdownList.vue'
import MarkdownListItem from './MarkdownListItem.vue'
import MarkdownParagraph from './MarkdownParagraph.vue'
import MarkdownStrikethrough from './MarkdownStrikethrough.vue'
import MarkdownStrong from './MarkdownStrong.vue'
import MarkdownTable from './MarkdownTable.vue'
import MarkdownTableCell from './MarkdownTableCell.vue'
import MarkdownTableRow from './MarkdownTableRow.vue'
import MarkdownTableSection from './MarkdownTableSection.vue'

const BUILTINS: Record<string, Component> = {
  p: MarkdownParagraph,
  h1: MarkdownHeading,
  h2: MarkdownHeading,
  h3: MarkdownHeading,
  h4: MarkdownHeading,
  h5: MarkdownHeading,
  h6: MarkdownHeading,
  em: MarkdownEmphasis,
  strong: MarkdownStrong,
  del: MarkdownStrikethrough,
  a: MarkdownLink,
  img: MarkdownImage,
  ul: MarkdownList,
  ol: MarkdownList,
  li: MarkdownListItem,
  blockquote: MarkdownBlockquote,
  hr: MarkdownHorizontalRule,
  table: MarkdownTable,
  thead: MarkdownTableSection,
  tbody: MarkdownTableSection,
  tfoot: MarkdownTableSection,
  tr: MarkdownTableRow,
  th: MarkdownTableCell,
  td: MarkdownTableCell,
  code: MarkdownInlineCode,
  br: MarkdownBreak,
}

/** Element tags that map to a semantic node kind. */
export const TAG_TO_KIND: Record<string, string> = {
  p: 'paragraph',
  h1: 'heading',
  h2: 'heading',
  h3: 'heading',
  h4: 'heading',
  h5: 'heading',
  h6: 'heading',
  em: 'emphasis',
  strong: 'strong',
  del: 'strikethrough',
  a: 'link',
  img: 'image',
  ul: 'list',
  ol: 'list',
  li: 'listItem',
  blockquote: 'blockquote',
  hr: 'horizontalRule',
  table: 'table',
  thead: 'tableSection',
  tbody: 'tableSection',
  tfoot: 'tableSection',
  tr: 'tableRow',
  th: 'tableCell',
  td: 'tableCell',
  code: 'inlineCode',
  br: 'break',
  input: 'taskItem',
}

const SEMANTIC_BUILTINS: Record<string, Component> = {
  code: MarkdownCode,
  custom: MarkdownCustomTag,
}

function isComponentValue(
  value: MarkdownComponentValue | undefined,
): value is Component | string {
  return typeof value === 'string' || typeof value === 'object'
}

function isNodeRenderer(
  value: MarkdownComponentValue | undefined,
): value is (...args: never[]) => unknown {
  return typeof value === 'function'
}

function kindOf(node: MarkdownNode): string {
  if (node.kind !== 'element') return node.kind
  return TAG_TO_KIND[node.tag] ?? node.tag
}

function rendererKeys(node: MarkdownNode): string[] {
  if (node.kind === 'element') {
    const kind = kindOf(node)
    return kind === node.tag ? [node.tag] : [node.tag, kind]
  }
  if (node.kind === 'custom') return [node.tag, 'custom']
  if (node.kind === 'plugin') return [node.type, 'plugin']
  return [node.kind]
}

function resolveNodeRenderer(
  node: MarkdownNode,
  ctx: RenderContext,
): ((...args: never[]) => unknown) | undefined {
  for (const key of rendererKeys(node)) {
    const value = ctx.nodeComponents?.[key]
    if (isNodeRenderer(value)) return value
  }
  return undefined
}

function resolveNodeComponent(
  node: MarkdownNode,
  ctx: RenderContext,
): Component | string | undefined {
  // Inline code is an element tag, while fenced code is the semantic `code`
  // node. `nodeComponents.code` therefore applies to fenced code only; inline
  // code follows `nodeComponents.inlineCode` and `components.code`.
  if (node.kind === 'element' && node.tag === 'code') {
    const inline = ctx.nodeComponents?.inlineCode
    if (isComponentValue(inline)) return inline
    const tag = ctx.components.code
    if (typeof tag === 'function' || isComponentValue(tag)) {
      return tag as Component | string
    }
    return undefined
  }

  const kind = kindOf(node)
  for (const key of rendererKeys(node)) {
    const nodeValue = ctx.nodeComponents?.[key]
    if (isComponentValue(nodeValue)) return nodeValue
    const tagValue = ctx.components[key]
    if (typeof tagValue === 'function' || isComponentValue(tagValue)) {
      return tagValue as Component | string
    }
    if (key !== kind && ctx.nodeComponents?.[kind]) {
      const kindValue = ctx.nodeComponents[kind]
      if (isComponentValue(kindValue)) return kindValue
    }
  }
  return undefined
}

function renderText(node: MarkdownTextNode, ctx: RenderContext): VNodeChild {
  if (!node.segments || node.segments.length === 0) return node.value
  const matchComponent = ctx.components.mark
  return node.segments.map((segment, index) => {
    if (!segment.match) return segment.value
    if (typeof matchComponent === 'string') {
      return h(
        matchComponent,
        {
          class: 'vmd-search-match',
          'data-vmd-part': 'search-match',
          key: index,
        },
        segment.value,
      )
    }
    if (typeof matchComponent === 'object' || typeof matchComponent === 'function') {
      return h(
        matchComponent as Component,
        {
          class: 'vmd-search-match',
          'data-vmd-part': 'search-match',
          key: index,
        },
        { default: () => segment.value },
      )
    }
    return h(
      'mark',
      { class: 'vmd-search-match', 'data-vmd-part': 'search-match', key: index },
      segment.value,
    )
  })
}

export function resolveTagComponent(
  tag: string,
  ctx: RenderContext,
): Component | string | undefined {
  const nodeComponent = ctx.nodeComponents?.[tag]
  if (isComponentValue(nodeComponent)) return nodeComponent

  const tagComponent = ctx.components[tag]
  if (
    typeof tagComponent === 'function' ||
    isComponentValue(tagComponent)
  ) {
    return tagComponent as Component | string
  }

  return BUILTINS[tag]
}

export function resolveKindComponent(
  kind: string,
  ctx: RenderContext,
): Component | string | undefined {
  const value = ctx.nodeComponents?.[kind]
  return isComponentValue(value) ? value : undefined
}

interface NodeRendererContext {
  node: MarkdownNode
  key: string
  children: () => VNodeChild
  defaultRender: () => VNodeChild
  context: RenderContext
}

type NodeRenderer = (context: NodeRendererContext) => VNodeChild

function childrenRenderer(
  node: MarkdownElementNode | MarkdownCustomTagNode,
  ctx: RenderContext,
): () => VNodeChild[] {
  return () => renderNodes(node.children, ctx)
}

function renderComponent(
  component: Component | string,
  node: MarkdownNode,
  ctx: RenderContext,
  attrs: Record<string, string>,
  extraProps: Record<string, unknown> = {},
  children?: () => VNodeChild[],
): VNodeChild {
  const props = {
    ...attrs,
    ...extraProps,
    key: node.key,
  }
  const slot = children ?? (() => [])
  if (typeof component === 'string') return h(component, props, slot)
  return h(
    component,
    {
      ...props,
      node,
    },
    { default: slot },
  )
}

function renderCodeElement(
  node: MarkdownCodeNode,
  ctx: RenderContext,
  skipRenderer = false,
): VNodeChild {
  // react-markdown parity: `components.code` handles both inline and fenced
  // code. Fenced code receives a `className` instead of a separate `inline`
  // flag, so the same override works for both shapes. The semantic
  // `nodeComponents.code` override additionally receives the source and
  // language for richer host renderers.
  const semantic = ctx.nodeComponents?.code
  const className = node.language ? `language-${node.language}` : undefined
  const key = `${node.key}-code`

  if (!skipRenderer && isNodeRenderer(semantic)) {
    const renderer = semantic as unknown as NodeRenderer
    return renderer({
      node,
      key,
      children: () => [node.code],
      defaultRender: () => renderCodeElement(node, ctx, true),
      context: ctx,
    })
  }

  const component =
    (isComponentValue(semantic) ? semantic : undefined) ??
    (isComponentValue(ctx.components.code) ? ctx.components.code : undefined) ??
    'code'

  if (typeof component === 'string') {
    return h(
      component,
      {
        class: className ? ['vmd-code-element', className] : 'vmd-code-element',
        key,
      },
      node.code,
    )
  }

  return h(
    component,
    {
      node,
      className,
      key,
      ...(semantic ? { code: node.code, language: node.language } : {}),
    },
    { default: () => [node.code] },
  )
}

function renderCode(node: MarkdownCodeNode, ctx: RenderContext): VNodeChild {
  // `components.pre` wraps the code element; it does not replace it.
  const tagComponent = ctx.components.pre
  const component =
    typeof tagComponent === 'function' || isComponentValue(tagComponent)
      ? (tagComponent as Component | string)
      : MarkdownCode

  return renderComponent(
    component,
    node,
    ctx,
    {},
    {},
    () => [renderCodeElement(node, ctx)],
  )
}

function renderCustom(node: MarkdownCustomTagNode, ctx: RenderContext): VNodeChild {
  // The semantic override wins; otherwise MarkdownCustomTag resolves the host
  // tag component so click payloads and normalized props stay wired.
  const semantic =
    resolveKindComponent(node.tag, ctx) ?? resolveKindComponent('custom', ctx)
  const component = semantic ?? MarkdownCustomTag

  return renderComponent(
    component,
    node,
    ctx,
    node.attrs,
    { tag: node.tag, customProps: node.props },
    childrenRenderer(node, ctx),
  )
}

function renderNodeDefault(node: MarkdownNode, ctx: RenderContext): VNodeChild {
  switch (node.kind) {
    case 'text':
      return renderText(node, ctx)
    case 'element': {
      const component =
        resolveNodeComponent(node, ctx) ?? BUILTINS[node.tag]
      if (!component) {
        return h(
          node.tag,
          { ...node.attrs, key: node.key },
          childrenRenderer(node, ctx),
        )
      }
      return renderComponent(
        component,
        node,
        ctx,
        node.attrs,
        { children: node.children },
        childrenRenderer(node, ctx),
      )
    }
    case 'code':
      return renderCode(node, ctx)
    case 'custom':
      return renderCustom(node, ctx)
    case 'math':
      return renderComponent(
        resolveNodeComponent(node, ctx) ?? SEMANTIC_BUILTINS.math ?? 'span',
        node,
        ctx,
        {},
        { tex: node.tex, displayMode: node.displayMode },
      )
    case 'mermaid':
      return renderComponent(
        resolveNodeComponent(node, ctx) ?? SEMANTIC_BUILTINS.mermaid ?? 'pre',
        node,
        ctx,
        {},
        { code: node.code },
      )
    case 'plugin':
      return renderComponent(
        resolveNodeComponent(node, ctx) ??
          SEMANTIC_BUILTINS[node.type] ??
          'div',
        node,
        ctx,
        {},
        { payload: node.payload },
        node.children ? () => renderNodes(node.children!, ctx) : () => [],
      )
    default:
      return null
  }
}

export function renderNode(node: MarkdownNode, ctx: RenderContext): VNodeChild {
  if (node.kind === 'text') return renderText(node, ctx)

  // A function value in `nodeComponents` is the advanced renderer escape hatch.
  // Fenced code keeps `nodeComponents.code` as the inner code override, so the
  // whole code node is never replaced by that renderer.
  if (node.kind !== 'code') {
    const renderer = resolveNodeRenderer(node, ctx)
    if (renderer) {
      const call = renderer as unknown as NodeRenderer
      const childSource =
        node.kind === 'element' || node.kind === 'custom'
          ? childrenRenderer(node, ctx)
          : undefined
      return call({
        node,
        key: node.key,
        children: () => (childSource ? childSource() : []),
        defaultRender: () => renderNodeDefault(node, ctx),
        context: ctx,
      })
    }
  }

  return renderNodeDefault(node, ctx)
}

export function renderNodes(
  nodes: readonly MarkdownNode[],
  ctx: RenderContext,
): VNodeChild[] {
  return nodes.map((node) => renderNode(node, ctx))
}
