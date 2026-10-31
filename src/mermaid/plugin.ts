import type {
  MarkdownDocument,
  MarkdownNode,
  MarkdownPlugin,
} from '../core/types'

export interface MermaidPluginOptions {
  /**
   * Fence languages that become Mermaid nodes. Defaults to `mermaid` and
   * `mmd`. Language matching is case-insensitive.
   */
  languages?: string | string[]
}

const DEFAULT_LANGUAGES = ['mermaid', 'mmd']

function normalizeLanguages(
  value: MermaidPluginOptions['languages'],
): Set<string> {
  const list = value === undefined
    ? DEFAULT_LANGUAGES
    : Array.isArray(value)
      ? value
      : [value]
  return new Set(
    list
      .map((language) => language.trim().toLowerCase())
      .filter(Boolean),
  )
}

function convert(
  nodes: readonly MarkdownNode[],
  languages: ReadonlySet<string>,
  counter: { index: number },
): MarkdownNode[] {
  return nodes.map((node) => {
    if (node.kind === 'code' && languages.has(node.language.toLowerCase())) {
      return {
        kind: 'mermaid',
        key: node.key,
        code: node.code,
        complete: true,
        index: counter.index++,
        source: node.source,
      }
    }
    if ('children' in node && Array.isArray(node.children)) {
      return {
        ...node,
        children: convert(node.children, languages, counter),
      } as MarkdownNode
    }
    return node
  })
}

/**
 * Turn Mermaid fenced code blocks into `mermaid` nodes so the renderer can use
 * `MermaidBlock` directly. The plugin is opt-in because the Mermaid runtime is
 * an optional peer dependency.
 */
export function mermaidPlugin(
  options: MermaidPluginOptions = {},
): MarkdownPlugin {
  const languages = normalizeLanguages(options.languages)

  return {
    name: 'mermaid',
    transformDocument(document: MarkdownDocument): MarkdownDocument {
      const counter = { index: 0 }
      return {
        ...document,
        nodes: convert(document.nodes, languages, counter),
      }
    },
  }
}
