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

export function countSearchMatches(nodes: readonly MarkdownNode[]): number {
  let count = 0
  walkNodes(nodes, (node) => {
    if (node.kind === 'text' && node.segments) {
      count += node.segments.filter((segment) => segment.match).length
    }
  })
  return count
}
