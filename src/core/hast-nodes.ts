import { fromHtml } from 'hast-util-from-html'
import type { MarkdownNode } from './types'
import { hastToMarkdownNodes } from './hast-to-nodes'

/** Convert trusted engine HTML into normalized nodes. */
export function htmlToMarkdownNodes(html: string): MarkdownNode[] {
  return hastToMarkdownNodes(fromHtml(html, { fragment: true }).children)
}
