import { fromHtml } from 'hast-util-from-html'
import type { MarkdownNode } from '../core/types'
import { sanitizeHastNodes } from './sanitize'

/** Sanitize Mermaid SVG output into normalized nodes. */
export function sanitizeSvg(svg: string): MarkdownNode[] {
  return sanitizeHastNodes(fromHtml(svg, { fragment: true }).children)
}
