import type { Element, ElementContent, Properties, Root } from 'hast'
import type { MarkdownDocument, MarkdownNode } from './types'

const BOOLEAN_ATTRIBUTES = new Set([
  'checked',
  'disabled',
  'hidden',
  'open',
  'reversed',
  'multiple',
  'required',
  'selected',
])

const PROPERTY_ALIASES: Record<string, string> = {
  class: 'className',
  for: 'htmlFor',
  tabindex: 'tabIndex',
  colspan: 'colSpan',
  rowspan: 'rowSpan',
  readonly: 'readOnly',
  maxlength: 'maxLength',
  minlength: 'minLength',
  referrerpolicy: 'referrerPolicy',
  crossorigin: 'crossOrigin',
  srcset: 'srcSet',
  datetime: 'dateTime',
  'http-equiv': 'httpEquiv',
}

function attrsToProps(attrs: Record<string, string>): Properties {
  const properties: Properties = {}
  for (const key of Object.keys(attrs)) {
    const value = attrs[key] ?? ''
    const name = PROPERTY_ALIASES[key] ?? key
    if (BOOLEAN_ATTRIBUTES.has(key)) {
      properties[name] = value !== 'false'
      continue
    }
    if (key === 'class') {
      properties.className = value.split(/\s+/).filter(Boolean)
      continue
    }
    properties[name] = value
  }
  return properties
}

const BLOCK_TAGS = new Set([
  'p',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'ul',
  'ol',
  'li',
  'blockquote',
  'pre',
  'table',
  'thead',
  'tbody',
  'tfoot',
  'tr',
  'th',
  'td',
  'hr',
  'div',
  'section',
  'figure',
  'figcaption',
  'dl',
  'dt',
  'dd',
  'details',
  'summary',
])

function element(
  tagName: string,
  properties: Properties,
  children: ElementContent[],
): Element {
  return {
    type: 'element',
    tagName,
    properties,
    children: withBlockNewlines(children),
  }
}

function isBlock(node: ElementContent): boolean {
  return node.type === 'element' && BLOCK_TAGS.has(node.tagName)
}

/** Keep the newlines a normal HTML serializer emits between block siblings. */
function withBlockNewlines(children: ElementContent[]): ElementContent[] {
  const output: ElementContent[] = []
  for (const child of children) {
    const last = output[output.length - 1]
    const alreadySeparated =
      last?.type === 'text' && /\n\s*$/.test(last.value)
    if (output.length > 0 && isBlock(child) && !alreadySeparated) {
      output.push({ type: 'text', value: '\n' })
    }
    output.push(child)
  }
  return output
}

function codeBlock(code: string, language: string): Element {
  return element(
    'pre',
    {},
    [
      element(
        'code',
        language ? { className: [`language-${language}`] } : {},
        [{ type: 'text', value: code }],
      ),
    ],
  )
}

function nodeToHast(node: MarkdownNode): ElementContent | undefined {
  switch (node.kind) {
    case 'text':
      return { type: 'text', value: node.value }
    case 'element':
      return element(
        node.tag,
        attrsToProps(node.attrs),
        node.children
          .map(nodeToHast)
          .filter((child): child is ElementContent => Boolean(child)),
      )
    case 'code':
      return codeBlock(node.code, node.language)
    case 'math': {
      const rendered = (node.rendered ?? [])
        .map(nodeToHast)
        .filter((child): child is ElementContent => Boolean(child))
      return element(
        'span',
        {
          'data-vmd-part': 'math',
          'data-vmd-math': '',
          'data-tex': node.tex,
          'data-display': node.displayMode ? 'true' : 'false',
        },
        rendered.length > 0 ? rendered : [{ type: 'text', value: node.tex }],
      )
    }
    case 'mermaid':
      return element(
        'pre',
        { 'data-vmd-part': 'mermaid', 'data-vmd-mermaid': '' },
        [
          element(
            'code',
            { className: ['language-mermaid'] },
            [{ type: 'text', value: node.code }],
          ),
        ],
      )
    case 'custom':
      return element(
        node.tag,
        attrsToProps(node.attrs),
        node.children
          .map(nodeToHast)
          .filter((child): child is ElementContent => Boolean(child)),
      )
    case 'plugin': {
      const children = (node.children ?? [])
        .map(nodeToHast)
        .filter((child): child is ElementContent => Boolean(child))
      const properties: Properties = {
        'data-vmd-part': 'plugin',
        'data-plugin-type': node.type,
        'data-plugin-key': node.key,
      }
      if (children.length === 0) {
        // A plugin node may render entirely through a host component. Static
        // export cannot serialize component output, so emit an addressable
        // placeholder instead of dropping the node from the document.
        properties['data-plugin-unrendered'] = ''
      }
      return element('span', properties, children)
    }
    default:
      return undefined
  }
}

/**
 * Serialize the normalized document model back to hast for static export.
 * The model has already passed sanitization, filtering, URL policy, and plugin
 * document transforms, so this function performs no new trust decisions.
 */
export function modelToHast(document: MarkdownDocument): Root {
  return {
    type: 'root',
    children: withBlockNewlines(
      document.nodes
        .map(nodeToHast)
        .filter((child): child is ElementContent => Boolean(child)),
    ),
  }
}
