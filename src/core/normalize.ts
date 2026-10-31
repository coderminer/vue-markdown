import type { Element, Root, RootContent } from 'hast'
import type {
  AllowElement,
  MarkdownDiagnostic,
  MarkdownDocument,
  MarkdownElementNode,
  MarkdownNode,
  MarkdownSlugger,
  MarkdownUrlTransform,
  SourceRange,
  TocItem,
} from './types'
import { createDiagnostic, errorMessage } from './diagnostics'
import { DANGEROUS_TAGS, URL_ATTRIBUTES, propertiesToAttrs, sanitizeUrlValue } from './security'
import { defaultUrlTransform, resolveUrl } from './url'

export interface NormalizeOptions {
  slugger: MarkdownSlugger
  idPrefix?: string
  urlTransform?: MarkdownUrlTransform
  baseUrl?: string
  allowedElements?: string[]
  disallowedElements?: string[]
  unwrapDisallowed?: boolean
  allowElement?: AllowElement
  skipHtml?: boolean
  allowHtml?: boolean
  diagnostics?: MarkdownDiagnostic[]
}

interface FilterState {
  options: NormalizeOptions
  conflictReported: boolean
  urlErrorReported: boolean
}

function toSourceRange(node: { position?: Element['position'] }): SourceRange | undefined {
  const position = node.position
  if (!position?.start || !position.end) return undefined
  return {
    start: {
      line: position.start.line,
      column: position.start.column,
      offset: position.start.offset,
    },
    end: {
      line: position.end.line,
      column: position.end.column,
      offset: position.end.offset,
    },
  }
}

function textContent(nodes: readonly MarkdownNode[]): string {
  let value = ''
  for (const node of nodes) {
    if (node.kind === 'text') value += node.value
    else if ('children' in node && Array.isArray(node.children)) {
      value += textContent(node.children)
    } else if (node.kind === 'code') value += node.code
  }
  return value
}

function classNames(element: Element): string[] {
  const value: unknown = element.properties?.className
  if (Array.isArray(value)) return value.map(String)
  if (typeof value === 'string') return value.split(/\s+/)
  return []
}

function mathContainer(element: Element): {
  tex: string
  displayMode: boolean
  rendered: readonly RootContent[]
} | undefined {
  const names = classNames(element)
  const isMath =
    element.tagName === 'vmd-math' ||
    (names.includes('language-math') &&
      names.some((name) => name.startsWith('math-')))
  if (!isMath) return undefined

  const displayMode =
    element.properties?.['data-display'] === 'true' ||
    names.includes('math-display')
  const explicitTex = element.properties?.['data-tex']
  const code = findMathCode(element)
  const tex =
    typeof explicitTex === 'string'
      ? explicitTex
      : code
        ? code.children.map((child) => (child.type === 'text' ? child.value : '')).join('')
        : ''

  const source = code ?? element
  let rendered: readonly RootContent[] = source.children
  const first = rendered.find(
    (child): child is Element => child.type === 'element',
  )
  if (first?.tagName === 'pre' || first?.tagName === 'code') {
    rendered = first.children
  }

  return { tex, displayMode, rendered }
}

function findMathCode(element: Element): Element | undefined {
  for (const child of element.children) {
    if (child.type !== 'element') continue
    if (child.tagName === 'code' && classNames(child).includes('language-math')) {
      return child
    }
    if (child.tagName === 'pre') {
      const nested = findMathCode(child)
      if (nested) return nested
    }
  }
  return undefined
}

function isCodeBlock(element: Element): boolean {
  if (element.tagName !== 'pre') return false
  const meaningful = element.children.filter(
    (child) => !(child.type === 'text' && child.value.trim() === ''),
  )
  return meaningful.length === 1 && meaningful[0]?.type === 'element' && meaningful[0].tagName === 'code'
}

function codeLanguage(element: Element): string {
  const code = element.children.find(
    (child): child is Element => child.type === 'element' && child.tagName === 'code',
  )
  const classNames = [
    ...(Array.isArray(element.properties.className)
      ? element.properties.className.map(String)
      : []),
    ...(Array.isArray(code?.properties.className)
      ? code.properties.className.map(String)
      : []),
  ]
  for (const name of classNames) {
    const match = /^(?:language|lang)-(.+)$/u.exec(name)
    if (match?.[1]) return match[1].toLowerCase()
  }
  return ''
}

function collapseCodeBlock(
  element: Element,
  key: string,
  source: SourceRange | undefined,
): MarkdownNode {
  const code = element.children.find(
    (child): child is Element => child.type === 'element' && child.tagName === 'code',
  )
  const raw = code
    ? code.children.map((child) => (child.type === 'text' ? child.value : '')).join('')
    : element.children.map((child) => (child.type === 'text' ? child.value : '')).join('')
  return {
    kind: 'code',
    key,
    code: raw,
    language: codeLanguage(element),
    source,
  }
}

type FilterDecision = 'keep' | 'drop' | 'unwrap'

function filterDecision(
  node: MarkdownElementNode,
  index: number,
  parent: MarkdownElementNode | undefined,
  state: FilterState,
): FilterDecision {
  const {
    allowedElements,
    disallowedElements,
    unwrapDisallowed,
    allowElement,
    diagnostics,
  } = state.options

  let rejected = false

  if (allowedElements && allowedElements.length > 0) {
    if (disallowedElements && disallowedElements.length > 0 && !state.conflictReported) {
      state.conflictReported = true
      diagnostics?.push(
        createDiagnostic(
          'filter-conflict',
          '`allowedElements` and `disallowedElements` were both provided; `allowedElements` wins.',
          { severity: 'warning', phase: 'normalize' },
        ),
      )
    }
    rejected = !allowedElements.includes(node.tag)
  } else if (disallowedElements && disallowedElements.includes(node.tag)) {
    rejected = true
  }

  if (!rejected && allowElement) {
    try {
      // react-markdown treats any falsy return as a rejection.
      rejected = !allowElement(node, index, parent)
    } catch (error) {
      diagnostics?.push(
        createDiagnostic('filter-predicate', errorMessage(error), {
          phase: 'normalize',
        }),
      )
      rejected = true
    }
  }

  if (!rejected) return 'keep'
  return unwrapDisallowed ? 'unwrap' : 'drop'
}

function normalizeUrlAttribute(
  value: string,
  key: string,
  tag: string,
  attrs: Record<string, string>,
  state: FilterState,
): string | undefined {
  const resolved = resolveUrl(value, state.options.baseUrl)
  const transform = state.options.urlTransform

  if (!transform) {
    const transformed = defaultUrlTransform(resolved, key)
    if (transformed !== '') return transformed
    return resolved.trim() === '' ? '' : undefined
  }

  try {
    const result = transform(resolved, key, { tag, attrs })
    if (result === null) return undefined
    if (typeof result !== 'string') {
      return sanitizeUrlValue(defaultUrlTransform(resolved, key), key)
    }
    // A custom transform must not be able to introduce an unsafe URL.
    return sanitizeUrlValue(result, key)
  } catch (error) {
    if (!state.urlErrorReported) {
      state.urlErrorReported = true
      state.options.diagnostics?.push(
        createDiagnostic('url-transform', errorMessage(error), {
          phase: 'normalize',
        }),
      )
    }
    return sanitizeUrlValue(defaultUrlTransform(resolved, key), key)
  }
}

function convertElement(
  element: Element,
  path: string,
  index: number,
  parent: MarkdownElementNode | undefined,
  state: FilterState,
  allowMath = false,
): MarkdownNode | MarkdownNode[] | null {
  if (
    DANGEROUS_TAGS.has(element.tagName) &&
    !(allowMath && element.tagName === 'math')
  ) {
    return null
  }

  const source = toSourceRange(element)
  const attrs = propertiesToAttrs(element.tagName, element.properties)

  const math = mathContainer(element)
  if (math) {
    const provisional: MarkdownElementNode = {
      kind: 'element',
      key: path,
      tag: element.tagName,
      attrs,
      children: [],
      source,
    }
    const decision = filterDecision(provisional, index, parent, state)
    if (decision !== 'keep') return null
    return {
      kind: 'math',
      key: path,
      tex: math.tex,
      displayMode: math.displayMode,
      rendered: convertChildren(
        math.rendered,
        path,
        provisional,
        state,
        true,
      ),
      source,
    }
  }

  const provisional: MarkdownElementNode = {
    kind: 'element',
    key: path,
    tag: element.tagName,
    attrs,
    children: [],
    source,
  }

  const children = convertChildren(
    element.children,
    path,
    provisional,
    state,
    allowMath,
  )
  provisional.children = children

  const decision = filterDecision(provisional, index, parent, state)
  if (decision === 'drop') return null
  if (decision === 'unwrap') return children

  if (isCodeBlock(element)) {
    return collapseCodeBlock(element, path, source)
  }

  for (const key of Object.keys(attrs)) {
    if (!URL_ATTRIBUTES.has(key)) continue
    const transformed = normalizeUrlAttribute(attrs[key], key, element.tagName, attrs, state)
    if (transformed === undefined) delete attrs[key]
    else attrs[key] = transformed
  }

  if (/^h[1-6]$/.test(element.tagName) && !attrs.id) {
    const text = textContent(children)
    if (text.trim()) {
      attrs.id = `${state.options.idPrefix ?? ''}${state.options.slugger.slug(text)}`
    }
  }

  return provisional
}

function convertChildren(
  children: readonly RootContent[],
  parentPath: string,
  parent: MarkdownElementNode | undefined,
  state: FilterState,
  allowMath = false,
): MarkdownNode[] {
  const result: MarkdownNode[] = []
  children.forEach((child, index) => {
    const path = parentPath ? `${parentPath}.${index}` : String(index)

    if (child.type === 'text') {
      if (child.value === '') return
      // Whitespace between block-level nodes is not meaningful in the model.
      if (!parent && child.value.trim() === '') return
      result.push({
        kind: 'text',
        key: path,
        value: child.value,
        source: toSourceRange(child),
      })
      return
    }

    if (child.type === 'raw') {
      if (state.options.skipHtml || !state.options.allowHtml) return
      result.push({
        kind: 'text',
        key: path,
        value: child.value,
        source: toSourceRange(child),
      })
      return
    }

    if (child.type !== 'element') return

    const converted = convertElement(child, path, index, parent, state, allowMath)
    if (converted === null) return
    if (Array.isArray(converted)) result.push(...converted)
    else result.push(converted)
  })
  return result
}

export interface NormalizeResult {
  nodes: MarkdownNode[]
  toc: TocItem[]
  customTags: MarkdownDocument['customTags']
}

export function normalizeHast(root: Root, options: NormalizeOptions): NormalizeResult {
  const state: FilterState = {
    options,
    conflictReported: false,
    urlErrorReported: false,
  }
  const nodes = convertChildren(root.children, '', undefined, state)
  return {
    nodes,
    toc: extractToc(nodes),
    customTags: collectCustomTags(nodes),
  }
}

export function extractToc(nodes: readonly MarkdownNode[]): TocItem[] {
  const toc: TocItem[] = []

  const visit = (list: readonly MarkdownNode[]): void => {
    for (const node of list) {
      if (node.kind === 'element') {
        const match = /^h([1-6])$/.exec(node.tag)
        if (match && node.attrs.id) {
          toc.push({
            id: node.attrs.id,
            text: textContent(node.children).trim(),
            level: Number(match[1]),
          })
        }
        visit(node.children)
      } else if ('children' in node && Array.isArray(node.children)) {
        visit(node.children)
      }
    }
  }

  visit(nodes)
  return toc
}

export function collectCustomTags(
  nodes: readonly MarkdownNode[],
): MarkdownDocument['customTags'] {
  const tags: MarkdownDocument['customTags'] = []

  const visit = (list: readonly MarkdownNode[]): void => {
    for (const node of list) {
      if (node.kind === 'custom') {
        tags.push({
          key: node.key,
          tag: node.tag,
          props: node.props,
          attrs: node.attrs,
        })
        visit(node.children)
      } else if ('children' in node && Array.isArray(node.children)) {
        visit(node.children)
      }
    }
  }

  visit(nodes)
  return tags
}

export function walkNodes(
  nodes: readonly MarkdownNode[],
  visit: (node: MarkdownNode, parent: MarkdownNode | undefined) => void,
  parent?: MarkdownNode,
): void {
  for (const node of nodes) {
    visit(node, parent)
    if ('children' in node && Array.isArray(node.children)) {
      walkNodes(node.children, visit, node)
    }
  }
}
