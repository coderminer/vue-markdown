import type {
  MarkdownDocument,
  MarkdownNode,
  MarkdownPlugin,
} from '../core/types'

export interface MermaidPluginOptions {
  /**
   * Fence languages that become Mermaid nodes. Defaults to `mermaid` and
   * `mmd`. Language matching is case-insensitive.
   *
   * This is the only option the plugin reads. Configure the Mermaid renderer
   * and theme on `MarkdownRenderer` through `mermaidRenderer` and `theme`.
   */
  languages?: string | string[]
}

const DEFAULT_LANGUAGES = ['mermaid', 'mmd']

/**
 * FNV-1a over the diagram source. Mermaid nodes are keyed by content instead of
 * document position so that editing an unrelated block, or inserting one above
 * a diagram, does not change the key of every later diagram. Without this Vue
 * unmounts and re-renders every following diagram on each edit.
 */
function sourceHash(value: string): string {
  let hash = 0x811c9dc5
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 0x01000193)
  }
  return (hash >>> 0).toString(36)
}

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
  seen: Map<string, number>,
): MarkdownNode[] {
  return nodes.map((node) => {
    if (node.kind === 'code' && languages.has(node.language.toLowerCase())) {
      const hash = sourceHash(node.code)
      // Identical diagrams still need distinct keys within one sibling list, so
      // the n-th occurrence of the same source gets a suffix. Editing one of
      // two identical diagrams therefore moves the suffix of the other and
      // re-renders it once, which is the accepted cost of stable keys for the
      // common case.
      const occurrence = (seen.get(hash) ?? 0) + 1
      seen.set(hash, occurrence)
      return {
        kind: 'mermaid',
        key: `mermaid:${hash}:${occurrence}`,
        code: node.code,
        complete: true,
        index: counter.index++,
        source: node.source,
      }
    }
    if ('children' in node && Array.isArray(node.children)) {
      return {
        ...node,
        children: convert(node.children, languages, counter, seen),
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
  if (!options || typeof options !== 'object' || Array.isArray(options)) {
    throw new TypeError(
      '`mermaidPlugin` expects an options object such as `{ languages: ["mermaid"] }`. It does not accept renderer or theme arguments; configure those on `MarkdownRenderer`.',
    )
  }
  const languages = normalizeLanguages(options.languages)

  return {
    name: 'mermaid',
    transformDocument(document: MarkdownDocument): MarkdownDocument {
      const counter = { index: 0 }
      return {
        ...document,
        nodes: convert(document.nodes, languages, counter, new Map<string, number>()),
      }
    },
  }
}
