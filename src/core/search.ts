import type {
  MarkdownDocument,
  MarkdownNode,
  MarkdownTextNode,
  SearchOptions,
} from './types'
import { walkNodes } from './normalize'

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function segmentText(
  value: string,
  query: string,
  caseSensitive: boolean,
): MarkdownTextNode['segments'] {
  if (!query) return undefined
  const pattern = new RegExp(escapeRegExp(query), caseSensitive ? 'g' : 'gi')
  const segments: NonNullable<MarkdownTextNode['segments']> = []
  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = pattern.exec(value)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ value: value.slice(lastIndex, match.index) })
    }
    segments.push({ value: match[0], match: true })
    lastIndex = match.index + match[0].length
    if (match[0].length === 0) pattern.lastIndex += 1
  }

  if (lastIndex < value.length) {
    segments.push({ value: value.slice(lastIndex) })
  }

  return segments.length > 0 ? segments : undefined
}

/** Split text nodes into match/non-match segments without changing structure. */
export function segmentSearch(
  nodes: readonly MarkdownNode[],
  options: SearchOptions,
): void {
  const query = options.query?.trim() ?? ''
  if (!query) {
    walkNodes(nodes, (node) => {
      if (node.kind === 'text' && node.segments) delete node.segments
    })
    return
  }

  walkNodes(nodes, (node) => {
    if (node.kind !== 'text') return
    node.segments = segmentText(node.value, query, options.caseSensitive ?? false)
  })
}

export function searchDocument(
  document: MarkdownDocument,
  options: SearchOptions,
): MarkdownDocument {
  segmentSearch(document.nodes, options)
  return document
}

/**
 * Return a copy of `document` with search segments applied.
 *
 * The shared (cached) document is never mutated, so one base document can back
 * several search queries, including across renderer instances.
 */
export function withSearchSegments(
  document: MarkdownDocument,
  options: SearchOptions | undefined,
): MarkdownDocument {
  const query = options?.query?.trim() ?? ''
  if (!query) return document
  const caseSensitive = options?.caseSensitive ?? false

  const segmentNode = (node: MarkdownNode): MarkdownNode => {
    switch (node.kind) {
      case 'text': {
        const segments = segmentText(node.value, query, caseSensitive)
        if (segments !== undefined) return { ...node, segments }
        // An explicit query overrides segments contributed by a plugin (for
        // example `searchPlugin()`), so a node that no longer matches must not
        // keep its previous segments.
        if (!node.segments) return node
        const next = { ...node }
        delete next.segments
        return next
      }
      case 'element':
        return {
          ...node,
          children: node.children.map(segmentNode),
        }
      case 'custom':
        return {
          ...node,
          children: node.children.map(segmentNode),
        }
      case 'plugin':
        return node.children
          ? { ...node, children: node.children.map(segmentNode) }
          : node
      default:
        return node
    }
  }

  return {
    ...document,
    nodes: document.nodes.map(segmentNode),
  }
}

export function countSearchMatches(nodes: readonly MarkdownNode[]): number {
  let count = 0
  walkNodes(nodes, (node) => {
    if (node.kind === 'text' && node.segments) {
      count += node.segments.filter((segment) => segment.match).length
    }
  })
  return count
}
