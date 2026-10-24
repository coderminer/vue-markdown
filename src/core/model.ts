import type { MarkdownDocument, MarkdownNode } from './types'
import { collectCustomTags, extractToc } from './normalize'

export interface BuildDocumentOptions {
  nodes: MarkdownNode[]
  plugins: string[]
  pipeline: string
  frontmatter?: Record<string, unknown>
}

export function buildDocument(options: BuildDocumentOptions): MarkdownDocument {
  return {
    nodes: options.nodes,
    toc: extractToc(options.nodes),
    customTags: collectCustomTags(options.nodes),
    frontmatter: options.frontmatter,
    plugins: options.plugins,
    pipeline: options.pipeline,
  }
}

/** Recompute derived collections after a document transform. */
export function withDerivedDocument(
  document: MarkdownDocument,
): MarkdownDocument {
  return {
    ...document,
    toc: extractToc(document.nodes),
    customTags: collectCustomTags(document.nodes),
  }
}
