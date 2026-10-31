import { fromHtml } from 'hast-util-from-html'
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
])

const ALLOWED_ATTRIBUTES = new Set([
  'id',
  'class',
  'd',
  'fill',
  'fill-opacity',
  'fill-rule',
  'stroke',
  'stroke-width',
  'stroke-dasharray',
  'stroke-linecap',
  'stroke-linejoin',
  'stroke-opacity',
  'x',
  'y',
  'x1',
  'y1',
  'x2',
  'y2',
  'cx',
  'cy',
  'r',
  'rx',
  'ry',
  'width',
  'height',
  'viewbox',
  'preserveaspectratio',
  'transform',
  'points',
  'offset',
  'stop-color',
  'stop-opacity',
  'marker-start',
  'marker-mid',
  'marker-end',
  'markerwidth',
  'markerheight',
  'refx',
  'refy',
  'orient',
  'gradientunits',
  'patternunits',
  'patterncontentunits',
  'clippathunits',
  'textlength',
  'lengthadjust',
  'text-anchor',
  'dominant-baseline',
  'font-family',
  'font-size',
  'font-weight',
  'dx',
  'dy',
  'role',
  'aria-label',
  'aria-hidden',
  'focusable',
  'href',
  'xlink:href',
])

const DROPPED_TAGS = new Set([
  'script',
  'style',
  'foreignobject',
  'iframe',
  'object',
  'embed',
  'image',
  'audio',
  'video',
])

const SVG_ATTRIBUTE_NAMES: Record<string, string> = {
  viewbox: 'viewBox',
  preserveaspectratio: 'preserveAspectRatio',
  gradientunits: 'gradientUnits',
  patternunits: 'patternUnits',
  patterncontentunits: 'patternContentUnits',
  clippathunits: 'clipPathUnits',
  markerwidth: 'markerWidth',
  markerheight: 'markerHeight',
  refx: 'refX',
  refy: 'refY',
  textlength: 'textLength',
  lengthadjust: 'lengthAdjust',
}

function safeAttributes(element: Element): Record<string, string> {
  const attrs: Record<string, string> = {}
  for (const key of Object.keys(element.properties ?? {})) {
    const lower = key === 'className' ? 'class' : key.toLowerCase()
    if (!ALLOWED_ATTRIBUTES.has(lower)) continue
    const name = SVG_ATTRIBUTE_NAMES[lower] ?? lower
    if (lower === 'href' || lower === 'xlink:href') {
      const value = String(element.properties?.[key] ?? '')
      if (!value.startsWith('#')) continue
      attrs[name] = value
      continue
    }
    const value = element.properties?.[key]
    if (value === null || value === undefined || value === false) continue
    attrs[name] = Array.isArray(value)
      ? value.map(String).join(' ')
      : String(value)
  }
  return attrs
}

function sanitizeNodes(nodes: readonly RootContent[], path = ''): MarkdownNode[] {
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
    if (DROPPED_TAGS.has(tag)) return
    if (!ALLOWED_TAGS.has(tag)) {
      result.push(...sanitizeNodes(node.children, key))
      return
    }
    result.push({
      kind: 'element',
      key,
      tag,
      attrs: safeAttributes(node),
      children: sanitizeNodes(node.children, key),
    })
  })
  return result
}

/** Sanitize Mermaid SVG output into normalized nodes. */
export function sanitizeSvg(svg: string): MarkdownNode[] {
  const root = fromHtml(svg, { fragment: true })
  const svgElement = root.children.find(
    (node): node is Element =>
      node.type === 'element' && node.tagName.toLowerCase() === 'svg',
  )
  return svgElement
    ? sanitizeNodes([svgElement])
    : sanitizeNodes(root.children)
}

export { ALLOWED_TAGS as MERMAID_ALLOWED_TAGS }
