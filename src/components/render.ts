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

function isComponentValue(
  value: MarkdownComponentValue | undefined,
): value is Component | string {
  return (
    typeof value === 'string' ||
    typeof value === 'object' ||
    typeof value === 'function'
  )
}

export function resolveTagComponent(
  tag: string,
  ctx: RenderContext,
): Component | string | undefined {
  const nodeComponent = ctx.nodeComponents?.[tag]
  if (isComponentValue(nodeComponent)) return nodeComponent

  const tagComponent = ctx.components[tag]
  if (isComponentValue(tagComponent)) return tagComponent

  return BUILTINS[tag]
}

export function resolveKindComponent(
  kind: string,
  ctx: RenderContext,
): Component | string | undefined {
  const value = ctx.nodeComponents?.[kind]
  return isComponentValue(value) ? value : undefined
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
        matchComponent,
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

function renderCodeElement(node: MarkdownCodeNode, ctx: RenderContext): VNodeChild {
  // react-markdown parity: `components.code` handles both inline and fenced
  // code. Fenced code receives a `className` instead of a separate `inline`
  // flag, so the same override works for both shapes. The semantic
  // `nodeComponents.code` override additionally receives the source and
  // language for richer host renderers.
  const semantic = resolveKindComponent('code', ctx)
  const component =
    semantic ??
    (isComponentValue(ctx.components.code) ? ctx.components.code : 'code')
  const className = node.language ? `language-${node.language}` : undefined
  const key = `${node.key}-code`

  if (typeof component === 'string') {
    return h(component, { class: className, key }, node.code)
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
  const component = isComponentValue(ctx.components.pre)
    ? ctx.components.pre
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
  const component = resolveKindComponent(node.tag, ctx) ?? MarkdownCustomTag

  return renderComponent(
    component,
    node,
    ctx,
    node.attrs,
    { tag: node.tag, customProps: node.props },
    childrenRenderer(node, ctx),
  )
}

export function renderNode(node: MarkdownNode, ctx: RenderContext): VNodeChild {
  switch (node.kind) {
    case 'text':
      return renderText(node, ctx)
    case 'element': {
      const component = resolveTagComponent(node.tag, ctx)
      if (!component) {
        return h(node.tag, { ...node.attrs, key: node.key }, childrenRenderer(node, ctx))
      }
      return renderComponent(
        component,
        node,
        ctx,
        node.attrs,
        {},
        childrenRenderer(node, ctx),
      )
    }
    case 'code':
      return renderCode(node, ctx)
    case 'custom':
      return renderCustom(node, ctx)
    case 'math':
      return renderComponent(
        resolveKindComponent('math', ctx) ?? 'span',
        node,
        ctx,
        {},
        { tex: node.tex, displayMode: node.displayMode },
      )
    case 'mermaid':
      return renderComponent(
        resolveKindComponent('mermaid', ctx) ?? 'pre',
        node,
        ctx,
        {},
        { code: node.code },
      )
    case 'plugin':
      return renderComponent(
        resolveKindComponent(node.type, ctx) ?? 'div',
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

export function renderNodes(
  nodes: readonly MarkdownNode[],
  ctx: RenderContext,
): VNodeChild[] {
  return nodes.map((node) => renderNode(node, ctx))
}
