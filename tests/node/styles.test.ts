import { readFileSync } from 'node:fs'
import { fileURLToPath, URL } from 'node:url'
import { describe, expect, it } from 'vitest'
import { TOKEN_NAMES } from '../../src/core/parts'

const stylesDir = fileURLToPath(new URL('../../src/styles/', import.meta.url))

function readStyle(name: string): string {
  return readFileSync(`${stylesDir}${name}`, 'utf8')
}

interface Declaration {
  property: string
  value: string
  index: number
}

function blockDeclarations(css: string): Declaration[][] {
  const blocks: Declaration[][] = []
  const blockPattern = /\{([^{}]*)\}/g
  let block: RegExpExecArray | null
  while ((block = blockPattern.exec(css))) {
    const body = block[1] ?? ''
    const bodyStart = block.index + 1
    const declarations: Declaration[] = []
    const declarationPattern = /([a-z-]+)\s*:\s*([^;]+);/g
    let declaration: RegExpExecArray | null
    while ((declaration = declarationPattern.exec(body))) {
      declarations.push({
        property: declaration[1] ?? '',
        value: (declaration[2] ?? '').trim(),
        index: bodyStart + declaration.index,
      })
    }
    blocks.push(declarations)
  }
  return blocks
}

/**
 * Every logical declaration needs a physical fallback earlier in the same rule
 * so engines without logical-property support keep the documented layout.
 */
const PHYSICAL_FALLBACKS: Record<string, readonly (readonly string[])[]> = {
  'margin-block-start': [['margin-top']],
  'margin-block-end': [['margin-bottom']],
  'margin-block': [['margin'], ['margin-top', 'margin-bottom']],
  'margin-inline-start': [['margin-left']],
  'margin-inline-end': [['margin-right']],
  'padding-block': [['padding-top', 'padding-bottom']],
  'padding-block-start': [['padding-top']],
  'padding-block-end': [['padding-bottom']],
  'padding-inline-start': [['padding-left']],
  'padding-inline-end': [['padding-right']],
  'inset-block-start': [['top']],
  'inset-block-end': [['bottom']],
  'inset-inline-start': [['left']],
  'inset-inline-end': [['right']],
  'scroll-margin-block-start': [['scroll-margin-top']],
  'scroll-margin-block-end': [['scroll-margin-bottom']],
  'border-inline-start': [['border-left']],
  'border-inline-end': [['border-right']],
}

function expectPhysicalFallbacks(css: string, file: string): void {
  for (const declarations of blockDeclarations(css)) {
    const positions = new Map<string, number>()
    for (const declaration of declarations) {
      if (!positions.has(declaration.property)) {
        positions.set(declaration.property, declaration.index)
      }
    }

    for (const declaration of declarations) {
      const alternatives = PHYSICAL_FALLBACKS[declaration.property]
      if (!alternatives) continue
      const satisfied = alternatives.some((group) =>
        group.every((fallback) => {
          const position = positions.get(fallback)
          return position !== undefined && position < declaration.index
        }),
      )
      expect(
        satisfied,
        `${file}: ${declaration.property} needs an earlier physical fallback`,
      ).toBe(true)
    }

    if (declarations.some((item) => item.property === 'position' && item.value === 'sticky')) {
      const prefixed = declarations.find(
        (item) => item.property === 'position' && item.value === '-webkit-sticky',
      )
      expect(prefixed, `${file}: position: sticky needs a -webkit-sticky fallback`).toBeDefined()
      const sticky = declarations.find(
        (item) => item.property === 'position' && item.value === 'sticky',
      )!
      expect(prefixed!.index).toBeLessThan(sticky.index)
    }

    const start = declarations.find(
      (item) => item.property === 'text-align' && item.value === 'start',
    )
    if (start) {
      const left = declarations.find(
        (item) => item.property === 'text-align' && item.value === 'left',
      )
      expect(left, `${file}: text-align: start needs a left fallback`).toBeDefined()
      expect(left!.index).toBeLessThan(start.index)
    }
  }
}

describe('stylesheet compatibility fallbacks', () => {
  it('defines tokens on :root without :where(:root)', () => {
    const tokens = readStyle('tokens.css')
    expect(tokens).toMatch(/:root\s*[,{]/)
    expect(tokens).not.toContain(':where(:root)')
  })

  it('keeps physical fallbacks before logical properties', () => {
    expectPhysicalFallbacks(readStyle('components.css'), 'components.css')
    expectPhysicalFallbacks(readStyle('math.css'), 'math.css')
  })

  it('styles every v1.x part and keeps fullscreen fallbacks', () => {
    const components = readStyle('components.css')
    for (const part of [
      'task-item',
      'task-checkbox',
      'footnote-reference',
      'footnotes',
      'code-header',
      'code-toolbar',
      'highlighter',
      'math',
      'mermaid',
      'mermaid-preview',
      'editor',
      'editor-divider',
      'editor-diagnostics',
    ]) {
      expect(components, `${part} must have a style hook`).toContain(
        `[data-vmd-part='${part}']`,
      )
    }
    expect(components).toContain('top: 0;')
    expect(components).toContain('inset: 0;')
    expect(components).toContain('@media print')
    expect(components).toContain('@media (forced-colors: active)')
  })

  it('keeps the heading anchor :focus fallback before :focus-visible', () => {
    const components = readStyle('components.css')
    const focus = components.search(
      /\[data-vmd-part='heading-anchor'\]:focus(?!-)/,
    )
    const focusVisible = components.indexOf(
      "[data-vmd-part='heading-anchor']:focus-visible",
    )
    expect(focus).toBeGreaterThanOrEqual(0)
    expect(focusVisible).toBeGreaterThanOrEqual(0)
    expect(focus).toBeLessThan(focusVisible)
  })
})

describe('design tokens and theme modes', () => {
  function blockBody(css: string, selector: string): string {
    const start = css.indexOf(selector)
    expect(start, `${selector} must exist`).toBeGreaterThanOrEqual(0)
    const open = css.indexOf('{', start)
    const close = css.indexOf('}', open)
    return css.slice(open + 1, close)
  }

  it('defines every documented token in the root defaults', () => {
    const tokens = readStyle('tokens.css')
    const root = blockBody(tokens, ':root,')
    for (const token of TOKEN_NAMES) {
      expect(root, `${token} must have a default`).toContain(`${token}:`)
    }
  })

  it('supports light, dark, auto, and custom theme modes', () => {
    const tokens = readStyle('tokens.css')
    expect(tokens).toContain("[data-vmd-theme='light']")
    expect(tokens).toContain("[data-vmd-theme='dark']")
    expect(tokens).toContain("[data-vmd-theme='auto']")
    expect(tokens).toContain("[data-vmd-theme='custom']")

    const dark = blockBody(tokens, "[data-vmd-theme='dark']")
    expect(dark).toContain('--vmd-color-text:')

    const auto = blockBody(tokens, "[data-vmd-theme='auto']")
    expect(auto).toContain('--vmd-color-text:')
    const mediaStart = tokens.indexOf('@media (prefers-color-scheme: dark)')
    expect(mediaStart).toBeGreaterThanOrEqual(0)
    expect(tokens.indexOf("[data-vmd-theme='auto']", mediaStart)).toBeGreaterThan(mediaStart)

    const custom = blockBody(tokens, "[data-vmd-theme='custom']")
    expect(custom).not.toContain('--vmd-color-')
    expect(custom).not.toContain('--vmd-code-')
    expect(custom).not.toContain('--vmd-mermaid-')
  })
})

describe('print, forced colors, direction, and motion', () => {
  it('keeps print and forced-colors rules for rendered content', () => {
    const components = readStyle('components.css')
    expect(components).toContain('@media print')
    expect(components).toContain("@media (forced-colors: active)")
    expect(components).toContain('white-space: pre-wrap')
    expect(components).toContain('CanvasText')
  })

  it('uses direction-aware logical properties and a reduced-motion rule', () => {
    const components = readStyle('components.css')
    expect(components).toContain('margin-inline-start')
    expect(components).toContain('padding-inline-start')
    expect(components).toContain('border-inline-start')
    expect(components).toContain('inset-block-start')
    expect(components).toContain('@media (prefers-reduced-motion: reduce)')
    expect(components).toContain('transition-duration: 0.01ms')
  })
})
