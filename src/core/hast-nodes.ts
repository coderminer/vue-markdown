import { fromHtml } from 'hast-util-from-html'
import type { Element, RootContent } from 'hast'
import type { MarkdownNode } from './types'
import { propertiesToAttrs } from './security'

function fromHast(nodes: readonly RootContent[], path = ''): MarkdownNode[] {
  const result: MarkdownNode[] = []
  nodes.forEach((node, index) => {
    const key = path ? `${path}.${index}` : String(index)
    if (node.type === 'text') {
      if (node.value !== '') {
        result.push({ kind: 'text', key, value: node.value })
      }
      return
    }
    if (node.type !== 'element') return
    const element = node as Element
    result.push({
      kind: 'element',
      key,
      tag: element.tagName,
      attrs: propertiesToAttrs(element.tagName, element.properties),
      children: fromHast(element.children, key),
    })
  })
  return result
}

/** Convert an already-parsed trusted hast subtree into normalized nodes. */
export function hastToMarkdownNodes(
  nodes: readonly RootContent[],
): MarkdownNode[] {
  return fromHast(nodes)
}

/** Convert trusted engine HTML into normalized nodes. */
export function htmlToMarkdownNodes(html: string): MarkdownNode[] {
  return fromHast(fromHtml(html, { fragment: true }).children)
}
