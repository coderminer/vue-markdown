import type { MarkdownNode } from '../core/types'
import { sanitizeHastNodes } from './sanitize'

/**
 * Sanitize SVG markup without pulling the HTML parser into the initial graph.
 *
 * The renderer and the default Mermaid runtime only need this after a diagram
 * has actually rendered, so the parser can stay in a lazy chunk. The
 * synchronous `sanitizeSvg` export lives in the `mermaid/sanitize-svg` entry
 * for hosts that need it during their own render pass.
 */
export async function sanitizeSvgAsync(svg: string): Promise<MarkdownNode[]> {
  const { fromHtml } = await import('hast-util-from-html')
  return sanitizeHastNodes(fromHtml(svg, { fragment: true }).children)
}
