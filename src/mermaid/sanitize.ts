import type { Element, RootContent } from 'hast'
import type { MarkdownNode } from '../core/types'

const ALLOWED_TAGS = new Set([
  'svg',
  'g',
  'path',
  'rect',
  'circle',
  'ellipse',
  'line',
  'polyline',
  'polygon',
  'text',
  'tspan',
  'defs',
  'marker',
  'use',
  'title',
  'desc',
  'clippath',
  'lineargradient',
  'radialgradient',
  'stop',
  'pattern',
  'mask',
  'symbol',
  'textpath',
  'style',
])

// Hast lowercases element lookups while SVG element names are case-sensitive.
const SVG_TAG_NAMES: Record<string, string> = {
  clippath: 'clipPath',
  lineargradient: 'linearGradient',
  radialgradient: 'radialGradient',
  textpath: 'textPath',
}

// Keys are normalized with `attributeName` (lowercase, without `-`, `_`, or
// `:`), values are the case-sensitive SVG attribute names. Hast exposes SVG
// properties in camelCase (`strokeWidth`, `stopColor`, `viewBox`, ...), while
// Vue writes the keys it receives with `setAttribute`, so both sides must be
// converted back to their SVG spelling.
const ALLOWED_ATTRIBUTES: Record<string, string> = {
  id: 'id',
  class: 'class',
  d: 'd',
  fill: 'fill',
  fillopacity: 'fill-opacity',
  fillrule: 'fill-rule',
  stroke: 'stroke',
  strokewidth: 'stroke-width',
  strokedasharray: 'stroke-dasharray',
  strokedashoffset: 'stroke-dashoffset',
  strokelinecap: 'stroke-linecap',
  strokelinejoin: 'stroke-linejoin',
  strokemiterlimit: 'stroke-miterlimit',
  strokeopacity: 'stroke-opacity',
  x: 'x',
  y: 'y',
  x1: 'x1',
  y1: 'y1',
  x2: 'x2',
  y2: 'y2',
  cx: 'cx',
  cy: 'cy',
  r: 'r',
  rx: 'rx',
  ry: 'ry',
  width: 'width',
  height: 'height',
  viewbox: 'viewBox',
  preserveaspectratio: 'preserveAspectRatio',
  transform: 'transform',
  transformorigin: 'transform-origin',
  points: 'points',
  pathlength: 'pathLength',
  offset: 'offset',
  stopcolor: 'stop-color',
  stopopacity: 'stop-opacity',
  markerstart: 'marker-start',
  markermid: 'marker-mid',
  markerend: 'marker-end',
  markerwidth: 'markerWidth',
  markerheight: 'markerHeight',
  markerunits: 'markerUnits',
  refx: 'refX',
  refy: 'refY',
  orient: 'orient',
  gradientunits: 'gradientUnits',
  gradienttransform: 'gradientTransform',
  spreadmethod: 'spreadMethod',
  fx: 'fx',
  fy: 'fy',
  fr: 'fr',
  patternunits: 'patternUnits',
  patterncontentunits: 'patternContentUnits',
  patterntransform: 'patternTransform',
  clippathunits: 'clipPathUnits',
  clippath: 'clip-path',
  cliprule: 'clip-rule',
  mask: 'mask',
  maskunits: 'maskUnits',
  maskcontentunits: 'maskContentUnits',
  textlength: 'textLength',
  lengthadjust: 'lengthAdjust',
  textanchor: 'text-anchor',
  dominantbaseline: 'dominant-baseline',
  alignmentbaseline: 'alignment-baseline',
  baselineshift: 'baseline-shift',
  fontfamily: 'font-family',
  fontsize: 'font-size',
  fontweight: 'font-weight',
  fontstyle: 'font-style',
  fontvariant: 'font-variant',
  letterspacing: 'letter-spacing',
  wordspacing: 'word-spacing',
  textdecoration: 'text-decoration',
  whitespace: 'white-space',
  texttransform: 'text-transform',
  direction: 'direction',
  writingmode: 'writing-mode',
  lineheight: 'line-height',
  dx: 'dx',
  dy: 'dy',
  rotate: 'rotate',
  startoffset: 'startOffset',
  method: 'method',
  spacing: 'spacing',
  side: 'side',
  color: 'color',
  display: 'display',
  visibility: 'visibility',
  overflow: 'overflow',
  opacity: 'opacity',
  role: 'role',
  arialabel: 'aria-label',
  ariahidden: 'aria-hidden',
  ariahaspopup: 'aria-haspopup',
  arialabelledby: 'aria-labelledby',
  ariadescribedby: 'aria-describedby',
  ariaroledescription: 'aria-roledescription',
  focusable: 'focusable',
  tabindex: 'tabindex',
  href: 'href',
  xlinkhref: 'xlink:href',
  xmlspace: 'xml:space',
  vectoreffect: 'vector-effect',
  paintorder: 'paint-order',
  shaperendering: 'shape-rendering',
  pointerevents: 'pointer-events',
  filter: 'filter',
  cursor: 'cursor',
}

const DROPPED_TAGS = new Set([
  'script',
  'foreignobject',
  'iframe',
  'object',
  'embed',
  'image',
  'audio',
  'video',
])

// Mermaid scopes its generated stylesheet to the SVG id. Keep that scoped
// theme CSS, but remove constructs that could load remote resources or execute
// in older engines.
const UNSAFE_CSS =
  /@import|@font-face|expression\s*\(|javascript\s*:|-moz-binding|behavior\s*:/i
const CSS_URL = /url\(\s*([^)]*)\)/gi
const SCOPED_AT_RULES = new Set(['media', 'supports', 'layer'])
const SCOPED_STATEMENT_AT_RULES = new Set(['charset', 'layer'])

// Declarations that can take an SVG out of its layout box and turn it into an
// overlay (for example a fake login prompt covering the host page). The root
// rule is restricted to a presentation allowlist below; these are also dropped
// from descendant rules as defense in depth.
const DANGEROUS_LAYOUT_PROPERTIES = new Set([
  'position',
  'inset',
  'inset-block',
  'inset-block-start',
  'inset-block-end',
  'inset-inline',
  'inset-inline-start',
  'inset-inline-end',
  'top',
  'right',
  'bottom',
  'left',
  'z-index',
  'overflow',
  'overflow-x',
  'overflow-y',
])

// Mermaid's root rule carries theme colors and fonts. Anything that controls
// placement, sizing, stacking, animation, or filtering is intentionally absent:
// a scoped rule can still target the root `<svg>` and overlay the host page.
const ROOT_SAFE_PROPERTIES = new Set([
  'color',
  'fill',
  'fill-opacity',
  'fill-rule',
  'stroke',
  'stroke-width',
  'stroke-dasharray',
  'stroke-dashoffset',
  'stroke-linecap',
  'stroke-linejoin',
  'stroke-miterlimit',
  'stroke-opacity',
  'font',
  'font-family',
  'font-size',
  'font-style',
  'font-variant',
  'font-weight',
  'letter-spacing',
  'word-spacing',
  'line-height',
  'text-align',
  'text-anchor',
  'text-decoration',
  'text-transform',
  'dominant-baseline',
  'alignment-baseline',
  'baseline-shift',
  'direction',
  'writing-mode',
  'white-space',
  'opacity',
  'visibility',
  'background',
  'background-color',
  'background-image',
  'mask',
  'shape-rendering',
  'paint-order',
  'vector-effect',
  'pointer-events',
  'cursor',
])

function isFragmentReference(reference: string): boolean {
  let value = reference.trim()
  const quote = value.charAt(0)
  if (
    (quote === '"' || quote === "'") &&
    value.charAt(value.length - 1) === quote
  ) {
    value = value.slice(1, -1).trim()
  }
  return value.startsWith('#')
}

/**
 * Presentation attributes that accept a `<url>` value can fetch an external
 * resource (`fill="url(https://example.com/paint.svg#x)"`). Only same-document
 * fragment references are safe; anything else drops the attribute. This is the
 * attribute-level counterpart of the stylesheet `url()` filter.
 */
const URL_VALUE_ATTRIBUTES = new Set([
  'fill',
  'stroke',
  'filter',
  'mask',
  'clip-path',
  'marker-start',
  'marker-mid',
  'marker-end',
  'cursor',
])

const URL_FUNCTION = /url\(\s*([^)]*)\)/gi

function hasOnlyFragmentUrls(value: string): boolean {
  URL_FUNCTION.lastIndex = 0
  let match: RegExpExecArray | null
  while ((match = URL_FUNCTION.exec(value)) !== null) {
    if (!isFragmentReference(match[1] ?? '')) return false
  }
  return true
}

function attributeName(key: string): string | undefined {
  if (key === 'className') return 'class'
  if (key.startsWith('data-')) return key
  if (
    key.startsWith('data') &&
    key.length > 4 &&
    key.charAt(4) >= 'A' &&
    key.charAt(4) <= 'Z'
  ) {
    return key.replace(/([A-Z])/g, '-$1').toLowerCase()
  }
  const normalized = key.toLowerCase().replace(/[-_:]/g, '')
  return ALLOWED_ATTRIBUTES[normalized]
}

function safeAttributes(element: Element): Record<string, string> {
  const attrs: Record<string, string> = {}
  const properties = element.properties ?? {}
  for (const key of Object.keys(properties)) {
    const name = attributeName(key)
    if (!name) continue
    if (name === 'href' || name === 'xlink:href') {
      const value = String(properties[key] ?? '')
      if (value.startsWith('#')) attrs[name] = value
      continue
    }
    const value = properties[key]
    if (value === null || value === undefined || value === false) continue
    const text = Array.isArray(value)
      ? value.map(String).join(' ')
      : String(value)
    if (URL_VALUE_ATTRIBUTES.has(name) && !hasOnlyFragmentUrls(text)) continue
    attrs[name] = text
  }
  return attrs
}

function rawText(nodes: readonly RootContent[]): string {
  let value = ''
  for (const node of nodes) {
    if (node.type === 'text') value += node.value
    else if (node.type === 'element') value += rawText(node.children)
  }
  return value
}

function atRuleName(prelude: string): string {
  const match = /^@([-a-zA-Z]+)/.exec(prelude)
  return match ? match[1].toLowerCase() : ''
}

function hasSiblingCombinator(selector: string): boolean {
  let depth = 0
  let quote = ''
  for (let index = 0; index < selector.length; index++) {
    const char = selector.charAt(index)
    if (quote) {
      if (char === '\\') index++
      else if (char === quote) quote = ''
      continue
    }
    if (char === '"' || char === "'") {
      quote = char
      continue
    }
    if (char === '(' || char === '[') depth++
    else if (char === ')' || char === ']') depth = Math.max(0, depth - 1)
    else if (depth === 0 && (char === '+' || char === '~')) return true
  }
  return false
}

function isScopedSelector(selector: string, scope: string): boolean {
  const value = selector.trim()
  if (!value.startsWith(scope)) return false
  const rest = value.charAt(scope.length)
  if (rest !== '' && /[a-zA-Z0-9_-]/.test(rest)) return false
  // Descendant and child combinators stay inside the SVG. Sibling combinators
  // could reach host-page elements next to the diagram.
  return !hasSiblingCombinator(value)
}

function splitSelectors(prelude: string): string[] {
  const selectors: string[] = []
  let current = ''
  let depth = 0
  let quote = ''
  for (let index = 0; index < prelude.length; index++) {
    const char = prelude.charAt(index)
    if (quote) {
      current += char
      if (char === '\\') {
        current += prelude.charAt(++index)
      } else if (char === quote) {
        quote = ''
      }
      continue
    }
    if (char === '"' || char === "'") {
      quote = char
      current += char
      continue
    }
    if (char === '(' || char === '[') depth++
    else if (char === ')' || char === ']') depth = Math.max(0, depth - 1)
    else if (char === ',' && depth === 0) {
      selectors.push(current)
      current = ''
      continue
    }
    current += char
  }
  selectors.push(current)
  return selectors
}

function findBlockEnd(css: string, start: number, limit: number): number {
  let depth = 0
  let quote = ''
  for (let index = start; index < limit; index++) {
    const char = css.charAt(index)
    if (quote) {
      if (char === '\\') index++
      else if (char === quote) quote = ''
      continue
    }
    if (char === '"' || char === "'") {
      quote = char
      continue
    }
    if (char === '/' && css.charAt(index + 1) === '*') {
      const close = css.indexOf('*/', index + 2)
      if (close === -1 || close >= limit) return -1
      index = close + 1
      continue
    }
    if (char === '{') depth++
    else if (char === '}') {
      depth--
      if (depth === 0) return index
    }
  }
  return -1
}

function isScopedBlock(
  prelude: string,
  body: string,
  scope: string,
): boolean {
  if (prelude.startsWith('@')) {
    const name = atRuleName(prelude)
    if (name.endsWith('keyframes')) return true
    return SCOPED_AT_RULES.has(name) && isScopedStyleSheet(body, scope)
  }
  if (!prelude) return false
  return splitSelectors(prelude).every((selector) =>
    isScopedSelector(selector, scope),
  )
}

function isScopedStyleSheet(css: string, scope: string): boolean {
  let index = 0
  while (index < css.length) {
    while (index < css.length && /[\s;]/.test(css.charAt(index))) {
      index++
    }
    if (index >= css.length) break

    const start = index
    let quote = ''
    let depth = 0
    let open = -1
    let semicolon = -1
    for (; index < css.length; index++) {
      const char = css.charAt(index)
      if (quote) {
        if (char === '\\') index++
        else if (char === quote) quote = ''
        continue
      }
      if (char === '"' || char === "'") {
        quote = char
        continue
      }
      if (char === '/' && css.charAt(index + 1) === '*') {
        const close = css.indexOf('*/', index + 2)
        if (close === -1) return false
        index = close + 1
        continue
      }
      if (char === '(' || char === '[') depth++
      else if (char === ')' || char === ']') depth = Math.max(0, depth - 1)
      else if (depth === 0) {
        if (char === '{') {
          open = index
          break
        }
        if (char === ';') {
          semicolon = index
          break
        }
        if (char === '}') return false
      }
    }
    if (quote) return false

    const prelude = css.slice(start, open !== -1 ? open : semicolon).trim()
    if (open !== -1) {
      const end = findBlockEnd(css, open, css.length)
      if (end === -1) return false
      if (!isScopedBlock(prelude, css.slice(open + 1, end), scope)) {
        return false
      }
      index = end + 1
      continue
    }
    if (semicolon !== -1) {
      if (
        !prelude.startsWith('@') ||
        !SCOPED_STATEMENT_AT_RULES.has(atRuleName(prelude))
      ) {
        return false
      }
      index = semicolon + 1
      continue
    }
    if (prelude !== '') return false
    break
  }
  return true
}

function stripCssComments(css: string): string {
  let output = ''
  let index = 0
  let quote = ''
  while (index < css.length) {
    const char = css.charAt(index)
    if (quote) {
      output += char
      if (char === '\\') {
        output += css.charAt(index + 1)
        index += 2
        continue
      }
      if (char === quote) quote = ''
      index += 1
      continue
    }
    if (char === '"' || char === "'") {
      quote = char
      output += char
      index += 1
      continue
    }
    if (char === '/' && css.charAt(index + 1) === '*') {
      const close = css.indexOf('*/', index + 2)
      if (close === -1) return output
      output += ' '
      index = close + 2
      continue
    }
    output += char
    index += 1
  }
  return output
}

function splitDeclarations(body: string): string[] {
  const parts: string[] = []
  let current = ''
  let quote = ''
  let depth = 0
  for (let index = 0; index < body.length; index++) {
    const char = body.charAt(index)
    if (quote) {
      current += char
      if (char === '\\') {
        current += body.charAt(index + 1)
        index += 1
      } else if (char === quote) {
        quote = ''
      }
      continue
    }
    if (char === '"' || char === "'") {
      quote = char
      current += char
      continue
    }
    if (char === '(' || char === '[') depth += 1
    else if (char === ')' || char === ']') depth = Math.max(0, depth - 1)
    if (char === ';' && depth === 0) {
      parts.push(current)
      current = ''
      continue
    }
    current += char
  }
  parts.push(current)
  return parts
}

/**
 * Remove declarations whose property is not allowed (or is denied) while
 * leaving the rest of the stylesheet untouched.
 */
function filterDeclarations(
  body: string,
  allow?: ReadonlySet<string>,
  deny?: ReadonlySet<string>,
): string {
  const kept: string[] = []
  for (const part of splitDeclarations(body)) {
    const colon = part.indexOf(':')
    if (colon === -1) continue
    const property = part.slice(0, colon).trim().toLowerCase()
    if (!property) continue
    if (allow) {
      if (!allow.has(property)) continue
    } else if (deny?.has(property)) {
      continue
    }
    kept.push(part.trim())
  }
  return kept.join(';')
}

/** Does this selector target the root SVG element itself? */
function targetsRoot(selector: string, scope: string): boolean {
  const value = selector.trim()
  if (!value.startsWith(scope)) return false
  const rest = value.slice(scope.length)
  if (rest === '') return true
  // A leading whitespace or combinator selects a descendant or sibling.
  if (rest.startsWith('>') || rest.startsWith('+') || rest.startsWith('~')) {
    return false
  }
  return !/^\s/.test(rest)
}

/**
 * Rewrite rule bodies while walking nested conditional at-rules. The stylesheet
 * has already passed `isScopedStyleSheet`, so the structure is known to be
 * well-formed and every selector is scoped to the root SVG.
 */
function rewriteStyleSheet(css: string, scope: string): string {
  let output = ''
  let index = 0
  while (index < css.length) {
    const start = index
    let quote = ''
    let depth = 0
    let open = -1
    let semicolon = -1
    for (; index < css.length; index++) {
      const char = css.charAt(index)
      if (quote) {
        if (char === '\\') index++
        else if (char === quote) quote = ''
        continue
      }
      if (char === '"' || char === "'") {
        quote = char
        continue
      }
      if (char === '(' || char === '[') depth += 1
      else if (char === ')' || char === ']') depth = Math.max(0, depth - 1)
      else if (depth === 0) {
        if (char === '{') {
          open = index
          break
        }
        if (char === ';') {
          semicolon = index
          break
        }
      }
    }
    if (quote) {
      output += css.slice(start)
      break
    }
    if (open === -1 && semicolon === -1) {
      output += css.slice(start)
      break
    }
    if (semicolon !== -1) {
      output += css.slice(start, semicolon + 1)
      index = semicolon + 1
      continue
    }

    const end = findBlockEnd(css, open, css.length)
    if (end === -1) {
      output += css.slice(start)
      break
    }
    const prelude = css.slice(start, open)
    const body = css.slice(open + 1, end)
    const atRule = prelude.trimStart()
    output += css.slice(start, open + 1)
    if (atRule.startsWith('@')) {
      const name = atRuleName(atRule)
      if (SCOPED_AT_RULES.has(name)) {
        output += rewriteStyleSheet(body, scope)
      } else {
        // Keyframes stay intact: the root rule cannot reference them because
        // `animation` is not in the allowlist.
        output += body
      }
    } else if (
      splitSelectors(prelude).some((selector) => targetsRoot(selector, scope))
    ) {
      output += filterDeclarations(body, ROOT_SAFE_PROPERTIES)
    } else {
      output += filterDeclarations(
        body,
        undefined,
        DANGEROUS_LAYOUT_PROPERTIES,
      )
    }
    output += '}'
    index = end + 1
  }
  return output
}

function sanitizeStyleSheet(
  css: string,
  scope: string | undefined,
): string | undefined {
  if (!scope || !css.trim()) return undefined
  // Strip comments first so `pos/**/ition` or `@im/**/port` cannot hide a
  // construct from the checks below.
  const source = stripCssComments(css)
  if (!source.trim() || UNSAFE_CSS.test(source)) return undefined
  if (!isScopedStyleSheet(source, scope)) return undefined
  const safe = rewriteStyleSheet(source, scope).replace(
    CSS_URL,
    (match, reference: string) =>
      isFragmentReference(reference) ? match : 'none',
  )
  return safe.trim() ? safe : undefined
}

function collectLabelLines(nodes: readonly RootContent[]): string[] {
  const lines: string[] = []
  let buffer = ''

  const flush = (): void => {
    const line = buffer.replace(/\s+/g, ' ').trim()
    if (line) lines.push(line)
    buffer = ''
  }

  const visit = (node: RootContent): void => {
    if (node.type === 'text') {
      buffer += node.value
      return
    }
    if (node.type !== 'element') return
    const tag = node.tagName.toLowerCase()
    if (tag === 'br') {
      flush()
      return
    }
    if (tag === 'div' || tag === 'p' || tag === 'li' || tag === 'tr') {
      flush()
      for (const child of node.children) visit(child)
      flush()
      return
    }
    for (const child of node.children) visit(child)
  }

  for (const node of nodes) visit(node)
  flush()
  return lines
}

function convertForeignObject(node: Element, key: string): MarkdownNode[] {
  const lines = collectLabelLines(node.children)
  if (lines.length === 0) return []

  const source = safeAttributes(node)
  const attrs: Record<string, string> = {}
  for (const name of ['x', 'y', 'transform', 'class']) {
    if (source[name] !== undefined) attrs[name] = source[name]
  }
  if (attrs.x === undefined) attrs.x = '0'
  if (attrs.y === undefined) attrs.y = '0'

  return [
    {
      kind: 'element',
      key,
      tag: 'text',
      attrs,
      children: lines.map((line, index) => ({
        kind: 'element',
        key: `${key}.${index}`,
        tag: 'tspan',
        attrs: {
          x: attrs.x,
          dy: index === 0 ? '1em' : '1.2em',
        },
        children: [
          {
            kind: 'text',
            key: `${key}.${index}.text`,
            value: line,
          },
        ],
      })),
    },
  ]
}

function sanitizeNodes(
  nodes: readonly RootContent[],
  path = '',
  scope?: string,
): MarkdownNode[] {
  const result: MarkdownNode[] = []
  nodes.forEach((node, index) => {
    const key = path ? `${path}.${index}` : String(index)
    if (node.type === 'text') {
      if (node.value.trim() !== '') {
        result.push({ kind: 'text', key, value: node.value })
      }
      return
    }
    if (node.type !== 'element') return
    const tag = node.tagName.toLowerCase()
    if (tag === 'foreignobject') {
      result.push(...convertForeignObject(node, key))
      return
    }
    if (tag === 'style') {
      const css = sanitizeStyleSheet(rawText(node.children), scope)
      if (css) {
        result.push({
          kind: 'element',
          key,
          tag: 'style',
          attrs: {},
          children: [{ kind: 'text', key: `${key}.css`, value: css }],
        })
      }
      return
    }
    if (DROPPED_TAGS.has(tag)) return
    if (!ALLOWED_TAGS.has(tag)) {
      result.push(...sanitizeNodes(node.children, key, scope))
      return
    }
    result.push({
      kind: 'element',
      key,
      tag: SVG_TAG_NAMES[tag] ?? tag,
      attrs: safeAttributes(node),
      children: sanitizeNodes(node.children, key, scope),
    })
  })
  return result
}

function svgScope(element: Element): string | undefined {
  const id = element.properties?.id
  return typeof id === 'string' && id !== '' ? `#${id}` : undefined
}

function modelScope(nodes: readonly MarkdownNode[]): string | undefined {
  const svg = nodes.find(
    (node): node is Extract<MarkdownNode, { kind: 'element' }> =>
      node.kind === 'element' && node.tag.toLowerCase() === 'svg',
  )
  const id = svg?.attrs?.id
  return typeof id === 'string' && id !== '' ? `#${id}` : undefined
}

/**
 * Mermaid implements `useMaxWidth` by writing `width="100%"` plus an inline
 * `max-width: <px>` on the root SVG. Inline styles are dropped from sanitized
 * output, so keep the intended pixel width as a plain `width` attribute.
 * Without it a small diagram stretches to the full container and renders
 * oversized. CSS then caps the width at the container so large diagrams still
 * scale down instead of overflowing.
 */
function applyRootSize(
  element: Element,
  attrs: Record<string, string>,
): void {
  const width = String(element.properties?.width ?? '').trim()
  if (/^\d+(?:\.\d+)?$/.test(width)) return
  const style = element.properties?.style
  if (typeof style !== 'string') return
  const match = /(?:^|;)\s*max-width\s*:\s*(\d+(?:\.\d+)?)px\s*(?:;|$)/i.exec(
    style,
  )
  if (match && match[1]) attrs.width = match[1]
}

/**
 * Sanitize parsed SVG markup into normalized nodes. Prefer the root SVG
 * element so the stylesheet scope is derived from its id.
 */
export function sanitizeHastNodes(
  nodes: readonly RootContent[],
): MarkdownNode[] {
  const svgElement = nodes.find(
    (node): node is Element =>
      node.type === 'element' && node.tagName.toLowerCase() === 'svg',
  )
  const result = svgElement
    ? sanitizeNodes([svgElement], '', svgScope(svgElement))
    : sanitizeNodes(nodes)
  const root = result.find(
    (node): node is Extract<MarkdownNode, { kind: 'element' }> =>
      node.kind === 'element' && node.tag.toLowerCase() === 'svg',
  )
  if (svgElement && root) applyRootSize(svgElement, root.attrs)
  return result
}

function safeModelAttributes(
  attrs: Record<string, string> | undefined,
): Record<string, string> {
  const safe: Record<string, string> = {}
  if (!attrs || typeof attrs !== 'object') return safe
  for (const key of Object.keys(attrs)) {
    const name = attributeName(key)
    if (!name) continue
    const value = String(attrs[key])
    if (name === 'href' || name === 'xlink:href') {
      if (value.startsWith('#')) safe[name] = value
      continue
    }
    if (URL_VALUE_ATTRIBUTES.has(name) && !hasOnlyFragmentUrls(value)) {
      continue
    }
    safe[name] = value
  }
  return safe
}

function modelText(nodes: readonly MarkdownNode[]): string {
  let value = ''
  if (!Array.isArray(nodes)) return value
  for (const node of nodes) {
    if (node.kind === 'text') value += node.value
    else if (node.kind === 'element') value += modelText(node.children)
  }
  return value
}

function sanitizeModelNodes(
  nodes: readonly MarkdownNode[],
  path = '',
  scope?: string,
): MarkdownNode[] {
  const result: MarkdownNode[] = []
  if (!Array.isArray(nodes)) return result
  nodes.forEach((node, index) => {
    const key = path ? `${path}.${index}` : String(index)
    if (node.kind === 'text') {
      result.push({ kind: 'text', key, value: node.value })
      return
    }
    if (node.kind !== 'element' || typeof node.tag !== 'string') return
    const children = Array.isArray(node.children) ? node.children : []
    const tag = node.tag.toLowerCase()
    if (tag === 'style') {
      const css = sanitizeStyleSheet(modelText(children), scope)
      if (css) {
        result.push({
          kind: 'element',
          key,
          tag: 'style',
          attrs: {},
          children: [{ kind: 'text', key: `${key}.css`, value: css }],
        })
      }
      return
    }
    if (DROPPED_TAGS.has(tag)) return
    if (!ALLOWED_TAGS.has(tag)) {
      result.push(...sanitizeModelNodes(children, key, scope))
      return
    }
    result.push({
      kind: 'element',
      key,
      tag: SVG_TAG_NAMES[tag] ?? tag,
      attrs: safeModelAttributes(node.attrs),
      children: sanitizeModelNodes(children, key, scope),
    })
  })
  return result
}

/**
 * Sanitize nodes returned by an injected Mermaid renderer. Renderer output is
 * treated as untrusted even when it looks like normalized SVG nodes. A
 * stylesheet is kept only when the root SVG has an id and every selector is
 * scoped to it.
 */
export function sanitizeMermaidNodes(
  nodes: readonly MarkdownNode[],
): MarkdownNode[] {
  const scope = Array.isArray(nodes) ? modelScope(nodes) : undefined
  return sanitizeModelNodes(nodes, '', scope)
}

export { ALLOWED_TAGS as MERMAID_ALLOWED_TAGS }
