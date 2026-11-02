import type { MarkdownNode } from '../core/types'
import { hastToMarkdownNodes } from '../core/hast-to-nodes'

/**
 * Convert an already-parsed hast subtree into normalized nodes. This path has
 * no HTML parser dependency, which keeps hast-first adapters such as Shiki
 * parser-free.
 */
export function highlightedNodesFromHast(
  nodes: Parameters<typeof hastToMarkdownNodes>[0],
): MarkdownNode[] {
  return hastToMarkdownNodes(nodes)
}
