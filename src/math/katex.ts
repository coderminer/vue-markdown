import katex from 'katex'
import { htmlToMarkdownNodes } from '../core/hast-nodes'
import type { MathEngine, MathRenderOptions, MathRenderResult } from '../core/types'

const cache = new Map<string, MathRenderResult>()
const MAX_CACHE = 256

function renderOptions(options: MathRenderOptions): Record<string, unknown> {
  return {
    displayMode: Boolean(options.displayMode),
    throwOnError: false,
    trust: false,
    strict: 'warn',
    output: 'htmlAndMathml',
    ...options,
  }
}

/** Default KaTeX engine. Invalid TeX becomes readable error markup. */
export const katexEngine: MathEngine = {
  id: 'katex',
  render(tex, options) {
    const key = `${tex}\u001e${JSON.stringify(options)}`
    const cached = cache.get(key)
    if (cached) return cached

    const katexOptions = renderOptions(options)
    try {
      const html = katex.renderToString(tex, katexOptions)
      const result: MathRenderResult = {
        nodes: htmlToMarkdownNodes(html),
      }
      if (html.includes('katex-error')) {
        result.error = 'Invalid TeX expression.'
      }
      cache.set(key, result)
      if (cache.size > MAX_CACHE) {
        const oldest = cache.keys().next().value
        if (oldest !== undefined) cache.delete(oldest)
      }
      return result
    } catch (error) {
      const result: MathRenderResult = {
        nodes: [{ kind: 'text', key: 'math-error', value: tex }],
        error: error instanceof Error ? error.message : String(error),
      }
      cache.set(key, result)
      return result
    }
  },
}

export default katexEngine
