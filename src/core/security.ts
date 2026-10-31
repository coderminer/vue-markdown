import type { Properties } from 'hast'
import { defaultUrlTransform } from './url'

/** Tags that may appear in the normalized model. */
export const ALLOWED_TAGS = new Set([
  'p',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'em',
  'strong',
  'del',
  'a',
  'img',
  'ul',
  'ol',
  'li',
  'blockquote',
  'hr',
  'table',
  'thead',
  'tbody',
  'tfoot',
  'tr',
  'th',
  'td',
  'caption',
  'colgroup',
  'col',
  'pre',
  'code',
  'br',
  'input',
  'section',
  'div',
  'span',
  'sup',
  'sub',
  'kbd',
  'mark',
  'abbr',
  'details',
  'summary',
  'dl',
  'dt',
  'dd',
  'figure',
  'figcaption',
  'time',
])

/** Tags whose content must never reach the model. */
export const DANGEROUS_TAGS = new Set([
  'script',
  'style',
  'iframe',
  'object',
  'embed',
  'link',
  'meta',
  'base',
  'form',
  'textarea',
  'select',
  'option',
  'template',
  'noscript',
  'svg',
  'math',
])

const URL_ATTRIBUTES = new Set([
  'href',
  'src',
  'cite',
  'poster',
  'action',
  'formaction',
  'data',
  'srcset',
  'xlink:href',
])

export { URL_ATTRIBUTES }

const GLOBAL_ATTRIBUTES = new Set([
  'id',
  'class',
  'title',
  'lang',
  'dir',
  'role',
  'tabindex',
  'hidden',
  'align',
])

const TAG_ATTRIBUTES: Record<string, readonly string[]> = {
  a: ['href', 'target', 'rel', 'download', 'hreflang', 'type', 'name'],
  img: [
    'src',
    'alt',
    'width',
    'height',
    'loading',
    'decoding',
    'srcset',
    'sizes',
    'referrerpolicy',
    'crossorigin',
  ],
  ol: ['start', 'reversed', 'type'],
  ul: ['type'],
  li: ['value'],
  input: ['type', 'checked', 'disabled', 'name', 'value'],
  td: ['colspan', 'rowspan', 'headers', 'scope'],
  th: ['colspan', 'rowspan', 'headers', 'scope', 'abbr'],
  table: ['summary'],
  col: ['span', 'width'],
  colgroup: ['span'],
  blockquote: ['cite'],
  q: ['cite'],
  del: ['cite', 'datetime'],
  ins: ['cite', 'datetime'],
  time: ['datetime'],
  details: ['open'],
  code: ['class'],
  pre: ['class'],
  abbr: ['title'],
  section: ['data-footnotes', 'data-footnote-ref'],
  sup: ['data-footnote-ref'],
}

const ATTRIBUTE_ALIASES: Record<string, string> = {
  classname: 'class',
  htmlfor: 'for',
  srcset: 'srcset',
  colspan: 'colspan',
  rowspan: 'rowspan',
  charset: 'charset',
  httpequiv: 'http-equiv',
  tabindex: 'tabindex',
  readonly: 'readonly',
  maxlength: 'maxlength',
  minlength: 'minlength',
  autocomplete: 'autocomplete',
  referrerpolicy: 'referrerpolicy',
  crossorigin: 'crossorigin',
  datetime: 'datetime',
}

function kebab(value: string): string {
  return value
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/[_\s]+/g, '-')
    .toLowerCase()
}

export function toAttributeName(key: string): string {
  if (/^data[A-Z]/.test(key)) return `data-${kebab(key.slice(4))}`
  if (/^aria[A-Z]/.test(key)) return `aria-${kebab(key.slice(4))}`
  const alias = ATTRIBUTE_ALIASES[key.toLowerCase()]
  if (alias) return alias
  return key.includes('-') ? key.toLowerCase() : kebab(key)
}

export function isAllowedAttribute(tag: string, name: string): boolean {
  if (name.startsWith('on')) return false
  if (name === 'style' || name === 'srcdoc') return false
  if (name.startsWith('aria-') || name.startsWith('data-')) return true
  if (GLOBAL_ATTRIBUTES.has(name)) return true
  const tagAttributes = TAG_ATTRIBUTES[tag]
  if (tagAttributes) return tagAttributes.includes(name)
  // Unknown tags are plugin/custom tags: accept safe named props, but still
  // reject event handlers and validate URL-bearing attributes below.
  return /^[a-z][a-z0-9-]*$/.test(name)
}

function isSafeUrl(value: string, key: string): boolean {
  return value.trim() === '' || defaultUrlTransform(value, key) !== ''
}

/**
 * Validate one URL-bearing attribute value. `srcset` holds a comma-separated
 * candidate list, so each candidate is checked individually.
 */
export function sanitizeUrlValue(
  value: string,
  key: string,
): string | undefined {
  if (key === 'srcset') {
    const safe = value
      .split(',')
      .map((part) => part.trim())
      .filter((candidate) => {
        const url = candidate.split(/\s+/)[0] ?? ''
        return isSafeUrl(url, 'src')
      })
    return safe.length > 0 ? safe.join(', ') : undefined
  }
  return isSafeUrl(value, key) ? value : undefined
}

/** Convert hast properties into safe, normalized attributes. */
export function propertiesToAttrs(
  tag: string,
  properties: Properties | undefined,
): Record<string, string> {
  const attrs: Record<string, string> = {}
  if (!properties) return attrs

  for (const key of Object.keys(properties)) {
    const raw = properties[key]
    if (raw === null || raw === undefined || raw === false) continue
    const name = toAttributeName(key)
    if (!isAllowedAttribute(tag, name)) continue

    let value: string
    if (raw === true) {
      value = ''
    } else if (Array.isArray(raw)) {
      value = name === 'class' ? raw.join(' ') : raw.join(' ')
    } else {
      value = String(raw)
    }

    if (URL_ATTRIBUTES.has(name)) {
      const safe = sanitizeUrlValue(value, name)
      if (safe === undefined) continue
      attrs[name] = safe
      continue
    }

    attrs[name] = value
  }

  return attrs
}
