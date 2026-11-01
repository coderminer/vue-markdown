import rehypeRaw from 'rehype-raw'
import type { HtmlSchemaExtension, MarkdownPlugin } from '../core/types'

export interface HtmlPluginOptions {
  /**
   * Add-only extension for the built-in raw HTML sanitizer. Property names use
   * hast casing, for example `srcSet` and `dateTime`.
   */
  schema?: HtmlSchemaExtension
}

/**
 * Enable sanitized raw HTML in the official pipeline.
 *
 * The plugin contributes `rehype-raw`; the official pipeline runs it before the
 * built-in sanitizer and ignores manual `rehype-raw` entries. Importing this
 * entry is the only supported way to render raw HTML.
 */
export function htmlPlugin(options: HtmlPluginOptions = {}): MarkdownPlugin {
  return {
    name: 'html',
    html: true,
    htmlSchema: options.schema,
    rehypePlugins: [[rehypeRaw, {}]],
  }
}

export type { HtmlSchemaExtension }
