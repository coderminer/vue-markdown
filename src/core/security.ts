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
  'b',
  'i',
  's',
  'u',
  'q',
  'ins',
  'picture',
  'source',
  'ruby',
  'rp',
  'rt',
  'samp',
  'var',
  'tt',
  'strike',
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
  source: ['src', 'srcset', 'sizes', 'media', 'type'],
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
  // ARIA attribute names are lowercase concatenations, not kebab-case:
  // ariaLabelledBy -> aria-labelledby, ariaValueText -> aria-valuetext.
  if (/^aria[A-Z]/.test(key)) return `aria-${key.slice(4).toLowerCase()}`
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

interface SrcsetCandidate {
  url: string
  descriptor: string
}

/**
 * Split a `srcset` value without breaking commas inside a `data:` URL. The URL
 * runs until whitespace, matching the HTML candidate grammar; a trailing comma
 * separates the next candidate.
 */
function parseSrcset(value: string): SrcsetCandidate[] {
  const candidates: SrcsetCandidate[] = []
  let index = 0

  while (index < value.length) {
    while (index < value.length && /[\s,]/.test(value[index]!)) index++
    if (index >= value.length) break

    const urlStart = index
    while (index < value.length && !/\s/.test(value[index]!)) index++
    let url = value.slice(urlStart, index)
    let commaSeparated = false
    while (url.endsWith(',')) {
      url = url.slice(0, -1)
      commaSeparated = true
    }

    let descriptor = ''
    if (!commaSeparated) {
      const descriptorStart = index
      while (index < value.length && value[index] !== ',') index++
      descriptor = value.slice(descriptorStart, index).trim()
    }

    if (url) candidates.push({ url, descriptor })
    if (index < value.length && value[index] === ',') index++
  }

  return candidates
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
    const safe: string[] = []
    for (const candidate of parseSrcset(value)) {
      if (!isSafeUrl(candidate.url, 'src')) continue
      safe.push(
        candidate.descriptor
          ? `${candidate.url} ${candidate.descriptor}`
          : candidate.url,
      )
    }
    return safe.length > 0 ? safe.join(', ') : undefined
  }
  return isSafeUrl(value, key) ? value : undefined
}

// Inline styles are rejected for document content. Trusted engine output
// (highlighters, math) may opt in to a small, non-executable subset so token
// colors survive normalization.
const ALLOWED_STYLE_PROPERTIES = new Set([
  'color',
  'background-color',
  'font-style',
  'font-weight',
  'text-decoration',
  'opacity',
])

const UNSAFE_STYLE =
  /url\s*\(|expression\s*\(|javascript\s*:|@import|behavior\s*:|-moz-binding|[<>{}]/i

export function sanitizeStyleValue(value: string): string | undefined {
  const declarations: string[] = []
  for (const part of value.split(';')) {
    const separator = part.indexOf(':')
    if (separator <= 0) continue
    const name = part.slice(0, separator).trim().toLowerCase()
    const rawValue = part.slice(separator + 1).trim()
    if (!name || !rawValue) continue
    if (UNSAFE_STYLE.test(rawValue)) continue
    const allowed =
      ALLOWED_STYLE_PROPERTIES.has(name) || /^--shiki-[a-z0-9-]+$/.test(name)
    if (!allowed) continue
    declarations.push(`${name}: ${rawValue}`)
  }
  return declarations.length > 0 ? declarations.join('; ') : undefined
}

export interface PropertiesToAttrsOptions {
  /** Allow a constrained inline-style subset for trusted engine output. */
  allowStyle?: boolean
}

/** Convert hast properties into safe, normalized attributes. */
export function propertiesToAttrs(
  tag: string,
  properties: Properties | undefined,
  options: PropertiesToAttrsOptions = {},
): Record<string, string> {
  const attrs: Record<string, string> = {}
  if (!properties) return attrs

  for (const key of Object.keys(properties)) {
    const raw = properties[key]
    if (raw === null || raw === undefined || raw === false) continue
    const name = toAttributeName(key)

    let value: string
    if (raw === true) {
      value = ''
    } else if (Array.isArray(raw)) {
      value = raw.join(' ')
    } else {
      value = String(raw)
    }

    if (name === 'style') {
      if (!options.allowStyle) continue
      const safeStyle = sanitizeStyleValue(value)
      if (safeStyle === undefined) continue
      attrs.style = safeStyle
      continue
    }

    if (!isAllowedAttribute(tag, name)) continue

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
