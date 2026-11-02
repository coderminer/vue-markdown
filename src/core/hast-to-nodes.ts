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
      // Engine output is trusted host code. Attributes are normalized and
      // inline styles are limited to the constrained subset; tags are not
      // filtered here.
      attrs: propertiesToAttrs(element.tagName, element.properties, {
        allowStyle: true,
      }),
      children: fromHast(element.children, key),
    })
  })
  return result
}

/**
 * Convert an already-parsed trusted hast subtree into normalized nodes.
 *
 * This module deliberately has no HTML parser import so adapters that already
 * produce hast (Shiki) do not pull one into their entry.
 */
export function hastToMarkdownNodes(
  nodes: readonly RootContent[],
): MarkdownNode[] {
  return fromHast(nodes)
}
