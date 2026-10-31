import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import type { Element, ElementContent, Root, RootContent } from 'hast'
import type { MarkdownPlugin } from '../core/types'

export interface MathPluginOptions {
  /** Enable `$...$` inline math (remark-math option). */
  singleDollarTextMath?: boolean
  /** Optional custom inline delimiters, e.g. `['\\(', '\\)']`. */
  inlineDelimiters?: [string, string]
  /** Optional custom display delimiters, e.g. `['\\[', '\\]']`. */
  displayDelimiters?: [string, string]
  /** Options passed to rehype-katex. */
  katex?: Record<string, unknown>
}

function classes(node: Element): string[] {
  const value: unknown = node.properties?.className
  if (Array.isArray(value)) return value.map(String)
  return typeof value === 'string' ? value.split(/\s+/) : []
}

function textContent(node: RootContent): string {
  if (node.type === 'text') return node.value
  if (node.type !== 'element') return ''
  return node.children.map(textContent).join('')
}

function isMathCode(node: Element): boolean {
  const names = classes(node)
  return names.includes('language-math') && names.some((name) => name.startsWith('math-'))
}

function annotation(
  display: boolean,
  tex: string,
  children: ElementContent[],
): Element {
  return {
    type: 'element',
    tagName: 'vmd-math',
    properties: {
      'data-vmd-math': '',
      'data-tex': tex,
      'data-display': display ? 'true' : 'false',
    },
    children,
  }
}

function annotate(nodes: ElementContent[]): ElementContent[] {
  return nodes.map((node) => {
    if (node.type !== 'element') return node

    if (node.tagName === 'code' && isMathCode(node)) {
      const display = classes(node).includes('math-display')
      const tex = textContent(node)
      return annotation(display, tex, [node])
    }

    if (node.tagName === 'pre') {
      const code = node.children.find(
        (child): child is Element =>
          child.type === 'element' && child.tagName === 'code' && isMathCode(child),
      )
      if (code) {
        return annotation(
          classes(code).includes('math-display'),
          textContent(code),
          [node],
        )
      }
    }

    if (node.children.length > 0) {
      return { ...node, children: annotate(node.children) }
    }
    return node
  })
}

function rehypeMathAnnotation() {
  return (tree: Root) => {
    tree.children = annotate(tree.children as ElementContent[])
  }
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function replaceDelimiters(
  source: string,
  options: MathPluginOptions,
): string {
  const inline = options.inlineDelimiters
  const display = options.displayDelimiters
  if (!inline && !display) return source

  return source
    .split(/(```[\s\S]*?```|`[^`]*`)/g)
    .map((part, index) => {
      if (index % 2 === 1) return part
      let value = part
      if (display) {
        value = value.replace(
          new RegExp(
            `${escapeRegExp(display[0])}([\\s\\S]*?)${escapeRegExp(display[1])}`,
            'g',
          ),
          (_match, body: string) => `\n$$\n${body}\n$$\n`,
        )
      }
      if (inline) {
        value = value.replace(
          new RegExp(
            `${escapeRegExp(inline[0])}([\\s\\S]*?)${escapeRegExp(inline[1])}`,
            'g',
          ),
          (_match, body: string) => `$${body}$`,
        )
      }
      return value
    })
    .join('')
}

/**
 * Official math plugin. Math is parsed with remark-math, annotated with its
 * TeX source, then rendered by rehype-katex. The annotation survives so custom
 * engines can re-render from the source.
 */
export function mathPlugin(options: MathPluginOptions = {}): MarkdownPlugin {
  return {
    name: 'math',
    remarkPlugins: [
      [
        remarkMath,
        { singleDollarTextMath: options.singleDollarTextMath ?? true },
      ],
    ],
    rehypePlugins: [rehypeMathAnnotation, [rehypeKatex, options.katex ?? {}]],
    transformSource: (source) => replaceDelimiters(source, options),
  }
}

export { rehypeMathAnnotation }
