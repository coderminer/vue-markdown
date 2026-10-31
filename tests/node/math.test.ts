import { describe, expect, it } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { nextTick } from 'vue'
import { useMarkdownDocument } from '../../src/composables/useMarkdownDocument'
import { mathPlugin } from '../../src/math/plugin'
import { katexEngine } from '../../src/math/katex'
import { exportMarkdownHtmlSync } from '../../src/export'
import type { MarkdownMathNode, MarkdownNode } from '../../src/core/types'

function mathNodes(nodes: MarkdownNode[] = []): MarkdownMathNode[] {
  const found: MarkdownMathNode[] = []
  for (const node of nodes) {
    if (node.kind === 'math') found.push(node)
    if ('children' in node && Array.isArray(node.children)) {
      found.push(...mathNodes(node.children))
    }
  }
  return found
}

async function parse(source: string, options = {}) {
  const result = useMarkdownDocument(source, {
    plugins: [mathPlugin(options)],
  })
  await flushPromises()
  await nextTick()
  return mathNodes(result.document.value?.nodes)
}

describe('mathPlugin', () => {
  it('parses inline and display math with TeX and display mode', async () => {
    const nodes = await parse('Inline $x^2$.\n\n$$\n\\int_0^1 x dx\n$$')
    expect(nodes).toHaveLength(2)
    expect(nodes[0]?.tex).toBe('x^2')
    expect(nodes[0]?.displayMode).toBe(false)
    expect(nodes[1]?.tex).toContain('\\int_0^1')
    expect(nodes[1]?.displayMode).toBe(true)
    expect(nodes[0]?.rendered?.length).toBeGreaterThan(0)
  })

  it('does not parse math inside code', async () => {
    const nodes = await parse('`$not math$`\n\n```\n$also not math$\n```')
    expect(nodes).toHaveLength(0)
  })

  it('handles escaped and unmatched delimiters', async () => {
    const nodes = await parse('\\$literal\\$ and $unmatched')
    expect(nodes).toHaveLength(0)
  })

  it('supports custom delimiters', async () => {
    const nodes = await parse('Inline \\(x^2\\)', {
      inlineDelimiters: ['\\(', '\\)'],
    })
    expect(nodes[0]?.tex).toBe('x^2')
  })

  it('survives static export', () => {
    const html = exportMarkdownHtmlSync('Inline $x^2$', {
      plugins: [mathPlugin()],
    })
    expect(html).toContain('data-vmd-math')
    expect(html).toContain('data-tex="x^2"')
  })
})

describe('KaTeX engine', () => {
  it('renders valid TeX and caches the result', () => {
    const first = katexEngine.render('x^2', { displayMode: false })
    const second = katexEngine.render('x^2', { displayMode: false })
    expect(first.nodes.length).toBeGreaterThan(0)
    expect(first.error).toBeUndefined()
    expect(second).toBe(first)
  })

  it('returns readable error state for invalid TeX', () => {
    const result = katexEngine.render('\\notacommand{', { displayMode: false })
    expect(result.error).toBeTruthy()
    expect(result.nodes.length).toBeGreaterThan(0)
  })
})


