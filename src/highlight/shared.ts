import type {
  HighlightOptions,
  HighlightResult,
  MarkdownHighlighter,
  MarkdownNode,
} from '../core/types'
import {
  hastToMarkdownNodes,
  htmlToMarkdownNodes,
} from '../core/hast-nodes'

const MAX_CACHE = 256
const cache = new Map<string, HighlightResult>()

export function plaintextHighlight(
  code: string,
  language = '',
): HighlightResult {
  return {
    language,
    nodes: [{ kind: 'text', key: 'highlight-0', value: code }],
  }
}

/** Convert trusted engine HTML into normalized nodes. */
export function highlightedNodesFromHtml(html: string): MarkdownNode[] {
  return htmlToMarkdownNodes(html)
}

/** Convert an already-parsed hast subtree into normalized nodes. */
export function highlightedNodesFromHast(
  nodes: Parameters<typeof hastToMarkdownNodes>[0],
): MarkdownNode[] {
  return hastToMarkdownNodes(nodes)
}

export function cacheKey(
  highlighter: MarkdownHighlighter,
  code: string,
  language: string,
  options: HighlightOptions,
): string {
  return [
    highlighter.id,
    language,
    options.theme ?? '',
    options.colorScheme ?? '',
    JSON.stringify(options),
    code,
  ].join('\u001e')
}

export function clearHighlightCache(): void {
  cache.clear()
}

function isResult(value: unknown): value is HighlightResult {
  if (!value || typeof value !== 'object') return false
  const result = value as HighlightResult
  return typeof result.language === 'string' && Array.isArray(result.nodes)
}

/**
 * Run one adapter safely. Invalid adapters, thrown errors, and malformed
 * results fall back to plain text instead of breaking the document.
 */
export function runHighlighter(
  highlighter: MarkdownHighlighter | undefined,
  code: string,
  language: string,
  options: HighlightOptions = {},
): HighlightResult {
  if (!highlighter) return plaintextHighlight(code, language)
  const key = cacheKey(highlighter, code, language, options)
  const cached = cache.get(key)
  if (cached) return cached

  let result: HighlightResult
  try {
    const value = highlighter.highlight(code, language, options)
    result = isResult(value) ? value : plaintextHighlight(code, language)
  } catch {
    result = plaintextHighlight(code, language)
  }

  cache.set(key, result)
  if (cache.size > MAX_CACHE) {
    const oldest = cache.keys().next().value
    if (oldest !== undefined) cache.delete(oldest)
  }
  return result
}

/** Split highlighted nodes into lines while preserving element wrappers. */
export function splitHighlightLines(
  nodes: readonly MarkdownNode[],
): MarkdownNode[][] {
  let key = 0

  const nextKey = (): string => `line-${key++}`

  const splitNode = (node: MarkdownNode): MarkdownNode[][] => {
    if (node.kind === 'text') {
      return node.value.split('\n').map((part) =>
        part === '' ? [] : [{ kind: 'text', key: nextKey(), value: part }],
      )
    }
    if (!('children' in node) || !Array.isArray(node.children)) {
      return [[node]]
    }
    return splitNodes(node.children).map((children) => [
      { ...node, key: nextKey(), children } as MarkdownNode,
    ])
  }

  const splitNodes = (list: readonly MarkdownNode[]): MarkdownNode[][] => {
    const lines: MarkdownNode[][] = [[]]
    for (const node of list) {
      const nodeLines = splitNode(node)
      nodeLines.forEach((line, index) => {
        if (index > 0) lines.push([])
        lines[lines.length - 1]!.push(...line)
      })
    }
    return lines
  }

  return splitNodes(nodes)
}
