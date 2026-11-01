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
import CodeBlock from './CodeBlock.vue'
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
import MarkdownMath from './MarkdownMath.vue'
import MarkdownMermaid from './MarkdownMermaid.vue'
import MarkdownListItem from './MarkdownListItem.vue'
import MarkdownFootnoteReference from './MarkdownFootnoteReference.vue'
import MarkdownFootnotes from './MarkdownFootnotes.vue'
import MarkdownParagraph from './MarkdownParagraph.vue'
import MarkdownStrikethrough from './MarkdownStrikethrough.vue'
import MarkdownTaskItem from './MarkdownTaskItem.vue'
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

function semanticBuiltin(kind: string): Component | undefined {
  if (kind === 'code') return MarkdownCode
  if (kind === 'custom') return MarkdownCustomTag
  if (kind === 'math') return MarkdownMath
  if (kind === 'mermaid') return MarkdownMermaid
  return undefined
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

function classList(node: MarkdownElementNode): string[] {
  return (node.attrs.class ?? '').split(/\s+/).filter(Boolean)
}

function directTaskInput(
  node: MarkdownElementNode,
): MarkdownElementNode | undefined {
  return node.children.find(
    (child): child is MarkdownElementNode =>
      child.kind === 'element' &&
      child.tag === 'input' &&
      child.attrs.type === 'checkbox',
  )
}

function specialNodeKey(node: MarkdownNode): string | undefined {
  if (node.kind !== 'element') return undefined
  if (node.tag === 'li' && directTaskInput(node)) return 'taskItem'
  if (
    node.tag === 'sup' &&
    (classList(node).includes('footnote-ref') ||
      node.attrs['data-footnote-ref'] !== undefined ||
      node.children.some(
        (child) =>
          child.kind === 'element' &&
          child.tag === 'a' &&
          (classList(child).includes('footnote-ref') ||
            child.attrs['data-footnote-ref'] !== undefined),
      ))
  ) {
    return 'footnoteReference'
  }
  if (
    node.tag === 'section' &&
    (classList(node).includes('footnotes') ||
      node.attrs['data-footnotes'] !== undefined)
  ) {
    return 'footnotes'
  }
  return undefined
}

function hasNodeId(nodes: readonly MarkdownNode[], id: string): boolean {
  for (const node of nodes) {
    if (node.kind === 'element' && node.attrs.id === id) return true
    if ('children' in node && Array.isArray(node.children)) {
      if (hasNodeId(node.children, id)) return true
    }
  }
  return false
}

function footnoteTarget(node: MarkdownNode): string | undefined {
  if (node.kind !== 'element') return undefined
  for (const child of node.children) {
    if (child.kind === 'element' && child.tag === 'a' && child.attrs.href?.startsWith('#')) {
      return child.attrs.href.slice(1)
    }
  }
  return undefined
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

  const special = specialNodeKey(node)
  if (special) {
    const specialValue = ctx.nodeComponents?.[special]
    if (isComponentValue(specialValue)) return specialValue
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
  kind: MarkdownNode['kind']
  tag?: string
  attrs: Record<string, string>
  key: string
  children: () => VNodeChild
  defaultRender: () => VNodeChild
  context: RenderContext
}

type NodeRenderer = (context: NodeRendererContext) => VNodeChild

function rendererShape(node: MarkdownNode): Pick<
  NodeRendererContext,
  'kind' | 'tag' | 'attrs'
> {
  if (node.kind === 'element' || node.kind === 'custom') {
    return { kind: node.kind, tag: node.tag, attrs: node.attrs }
  }
  return { kind: node.kind, attrs: {} }
}

function childrenRenderer(
  node: MarkdownElementNode | MarkdownCustomTagNode,
  ctx: RenderContext,
): () => VNodeChild[] {
  return () => renderNodes(node.children, ctx)
}

const childrenPropCache = new WeakMap<object, boolean>()

/**
 * `children` is a DOM property on elements, so forwarding it to a string tag or
 * to a component that does not declare it makes Vue warn or leak the node array
 * into an attribute. Only components that opt in with a `children` prop receive
 * the raw child nodes; everything else reads the rendered default slot.
 */
function declaresChildrenProp(component: Component): boolean {
  const cached = childrenPropCache.get(component as object)
  if (cached !== undefined) return cached
  const declared = (component as { props?: unknown }).props
  const result = Array.isArray(declared)
    ? declared.indexOf('children') !== -1
    : declared !== null &&
      typeof declared === 'object' &&
      Object.prototype.hasOwnProperty.call(declared, 'children')
  childrenPropCache.set(component as object, result)
  return result
}

function renderComponent(
  component: Component | string,
  node: MarkdownNode,
  ctx: RenderContext,
  attrs: Record<string, string>,
  extraProps: Record<string, unknown> = {},
  children?: () => VNodeChild[],
): VNodeChild {
  const props: Record<string, unknown> = {
    ...attrs,
    ...extraProps,
    key: node.key,
  }
  if (
    'children' in props &&
    (typeof component === 'string' || !declaresChildrenProp(component))
  ) {
    delete props.children
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
      ...rendererShape(node),
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
  if (typeof tagComponent === 'function' || isComponentValue(tagComponent)) {
    return renderComponent(
      tagComponent as Component | string,
      node,
      ctx,
      {},
      {},
      () => [renderCodeElement(node, ctx)],
    )
  }

  // Host code-element overrides keep the legacy `pre` wrapper and inner
  // resolution path. The default path uses the richer CodeBlock.
  if (
    isComponentValue(ctx.components.code) ||
    isComponentValue(ctx.nodeComponents?.code) ||
    isNodeRenderer(ctx.nodeComponents?.code)
  ) {
    return renderComponent(
      MarkdownCode,
      node,
      ctx,
      {},
      {},
      () => [renderCodeElement(node, ctx)],
    )
  }

  return h(CodeBlock, { node, key: node.key })
}

function renderTaskItem(
  node: MarkdownElementNode,
  ctx: RenderContext,
): VNodeChild {
  const input = directTaskInput(node)
  const checked =
    input?.attrs.checked !== undefined && input.attrs.checked !== 'false'
  const children = node.children.filter((child) => child !== input)

  return h(
    MarkdownTaskItem,
    {
      node,
      key: node.key,
      checked,
      children: node.children,
    },
    { default: () => renderNodes(children, ctx) },
  )
}

function renderFootnotes(
  node: MarkdownElementNode,
  ctx: RenderContext,
): VNodeChild {
  return h(
    MarkdownFootnotes,
    { node, key: node.key },
    { default: () => renderNodes(node.children, ctx) },
  )
}

function renderFootnoteReference(
  node: MarkdownElementNode,
  ctx: RenderContext,
): VNodeChild {
  const target = footnoteTarget(node)
  const missing =
    target !== undefined && ctx.document !== undefined
      ? !hasNodeId(ctx.document.nodes, target)
      : false

  return h(
    MarkdownFootnoteReference,
    { node, key: node.key, missing },
    { default: () => renderNodes(node.children, ctx) },
  )
}

function renderSpecialElement(
  node: MarkdownElementNode,
  ctx: RenderContext,
  key: string,
): VNodeChild | undefined {
  if (key === 'taskItem') return renderTaskItem(node, ctx)
  if (key === 'footnotes') return renderFootnotes(node, ctx)
  if (key === 'footnoteReference') return renderFootnoteReference(node, ctx)
  return undefined
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
      const component = resolveNodeComponent(node, ctx)
      if (!component) {
        const special = specialNodeKey(node)
        const rendered = special
          ? renderSpecialElement(node, ctx, special)
          : undefined
        if (rendered !== undefined) return rendered
      }
      const resolved = component ?? BUILTINS[node.tag]
      if (!resolved) {
        const attrs = { ...node.attrs }
        // A string tag cannot receive a `children` prop; keep it out of the DOM
        // attribute set even if a custom pipeline or schema added one.
        delete attrs.children
        return h(
          node.tag,
          { ...attrs, key: node.key },
          childrenRenderer(node, ctx),
        )
      }
      return renderComponent(
        resolved,
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
        resolveNodeComponent(node, ctx) ?? semanticBuiltin('math') ?? 'span',
        node,
        ctx,
        {},
        {
          tex: node.tex,
          displayMode: node.displayMode,
          rendered: node.rendered,
        },
      )
    case 'mermaid':
      return renderComponent(
        resolveNodeComponent(node, ctx) ?? semanticBuiltin('mermaid') ?? 'pre',
        node,
        ctx,
        {},
        { code: node.code },
      )
    case 'plugin':
      return renderComponent(
        resolveNodeComponent(node, ctx) ??
          semanticBuiltin(node.type) ??
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
        ...rendererShape(node),
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
