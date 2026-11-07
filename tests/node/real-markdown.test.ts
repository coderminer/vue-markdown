import { describe, expect, it } from 'vitest'
import { fromHtml } from 'hast-util-from-html'
import { visit } from 'unist-util-visit'
import type { Element } from 'hast'
import { exportMarkdownHtmlSync } from '../../src/export'
import { useMarkdownDocument } from '../../src/composables/useMarkdownDocument'
import { createOfficialPipeline } from '../../src/pipeline'
import { fullPlugins } from '../../src/plugins/builtin'
import { htmlPlugin } from '../../src/html'
import { hostileMarkdown, realMarkdown } from '../fixtures/real-markdown'
import type {
  MarkdownNode,
  MarkdownPipeline,
  PipelineResult,
} from '../../src/core/types'

const plugins = [...fullPlugins, htmlPlugin()]

function collectTags(nodes: readonly MarkdownNode[], tags = new Set<string>()): Set<string> {
  for (const node of nodes) {
    if (node.kind === 'element') {
      tags.add(node.tag)
      collectTags(node.children, tags)
    }
  }
  return tags
}

function htmlElements(html: string): Element[] {
  const elements: Element[] = []
  visit(fromHtml(html), 'element', (node) => {
    elements.push(node)
  })
  return elements
}

function propertyText(value: unknown): string {
  if (Array.isArray(value)) return value.join(' ')
  return value === null || value === undefined ? '' : String(value)
}

function elementText(element: Element): string {
  return element.children
    .map((child) =>
      child.type === 'text'
        ? child.value
        : child.type === 'element'
          ? elementText(child)
          : '',
    )
    .join('')
}

function markedPipeline(mode: 'sync' | 'async'): MarkdownPipeline {
  const official = createOfficialPipeline()
  const marker = mode === 'sync' ? 'MARKER-S' : 'MARKER-A'
  const addMarker = (result: PipelineResult): PipelineResult => ({
    ...result,
    hast: {
      ...result.hast,
      children: [
        ...result.hast.children,
        {
          type: 'element',
          tagName: 'p',
          properties: {},
          children: [{ type: 'text', value: marker }],
        },
      ],
    },
  })

  return {
    name: `real-${mode}`,
    capabilities: { sync: mode === 'sync' },
    process(source, ctx) {
      return official.process(source, ctx).then(addMarker)
    },
    processSync(source, ctx) {
      return addMarker(official.processSync!(source, ctx))
    },
  }
}

describe('real-world Markdown rendering', () => {
  it('renders every common Markdown node type', () => {
    const html = exportMarkdownHtmlSync(realMarkdown, { plugins })

    for (const fragment of [
      '<h1 id="real-world-markdown">Real-world Markdown</h1>',
      '<h2 id="headings">Headings</h2>',
      '<h3 id="level-three">Level three</h3>',
      '<h4 id="level-four">Level four</h4>',
      '<h5 id="level-five">Level five</h5>',
      '<h6 id="level-six">Level six</h6>',
      '<h2 id="setext-heading">Setext heading</h2>',
      '<strong>bold text</strong>',
      '<em>italic text</em>',
      '<del>struck text</del>',
      '<code>inline code</code>',
      '<a href="https://example.com/docs">external link</a>',
      '<a href="./guide/start">relative link</a>',
      '<img src="./assets/diagram.png" alt="architecture diagram" title="Diagram title">',
      '<blockquote>',
      'A nested quote with <code>inline code</code>.',
      '<ul>',
      '<ol>',
      '<pre><code class="language-ts">',
      '<pre><code>indented code block',
      '<hr>',
      '<kbd>Ctrl</kbd>',
      'H<sub>2</sub>O, x<sup>2</sup>',
      '<mark>highlighted text</mark>',
      '<details>',
      '<summary>More information</summary>',
      '<a href="https://example.com/auto">https://example.com/auto</a>',
      '<a href="https://example.com/reference" title="Reference title">reference link</a>',
    ]) {
      expect(html).toContain(fragment)
    }

    // Structural HTML is asserted through the parsed tree so table newlines,
    // attribute order, and serializer formatting cannot make the test flaky.
    const elements = htmlElements(html)
    const table = elements.find((element) => element.tagName === 'table')
    expect(table).toBeDefined()
    const headers = elements.filter((element) => element.tagName === 'th')
    expect(headers.map(elementText)).toEqual(['Name', 'Kind', 'Count'])
    expect(headers.map((header) => header.properties.align)).toEqual([
      undefined,
      'center',
      'right',
    ])
    const cells = elements.filter((element) => element.tagName === 'td')
    expect(cells.map(elementText)).toEqual([
      'alpha',
      'text',
      '1',
      'beta',
      'bold',
      '2',
    ])

    const taskCheckboxes = elements.filter(
      (element) => element.tagName === 'input',
    )
    expect(taskCheckboxes).toHaveLength(2)
    expect(taskCheckboxes[0]?.properties).toMatchObject({
      type: 'checkbox',
      checked: true,
      disabled: true,
    })
    expect(taskCheckboxes[1]?.properties).toMatchObject({
      type: 'checkbox',
      disabled: true,
    })

    const callout = elements.find(
      (element) =>
        propertyText(element.properties.className) === 'callout' &&
        element.properties.dataKind === 'note',
    )
    expect(callout?.tagName).toBe('div')

    // Code fences keep executable-looking text literal.
    expect(html).toContain("javascript:alert(1)")
    expect(html).toContain('&#x3C;script>alert(1)&#x3C;/script>')
    // Frontmatter is captured, not rendered as a paragraph.
    expect(html).not.toContain('description: A document')
  })

  it('builds the TOC, frontmatter, and node inventory from the real document', () => {
    const result = useMarkdownDocument(realMarkdown, { plugins })
    const document = result.document.value

    expect(document?.frontmatter?.title).toBe('Real-world Markdown')
    expect(document?.frontmatter?.tags).toEqual(['markdown', 'security'])
    expect(document?.toc.map((item) => item.id)).toEqual([
      'real-world-markdown',
      'headings',
      'level-three',
      'level-four',
      'level-five',
      'level-six',
      'setext-heading',
    ])
    expect(document?.toc.map((item) => item.text)).toEqual([
      'Real-world Markdown',
      'Headings',
      'Level three',
      'Level four',
      'Level five',
      'Level six',
      'Setext heading',
    ])

    const tags = collectTags(document?.nodes ?? [])
    for (const tag of [
      'h1',
      'h6',
      'p',
      'strong',
      'em',
      'del',
      'code',
      'a',
      'img',
      'blockquote',
      'ul',
      'ol',
      'li',
      'input',
      'table',
      'thead',
      'tbody',
      'tr',
      'th',
      'td',
      'hr',
      'div',
      'details',
      'summary',
      'kbd',
      'mark',
      'sub',
      'sup',
    ]) {
      expect(tags.has(tag)).toBe(true)
    }

    // Block code is a first-class `code` node in the public model.
    const codeNodes = (document?.nodes ?? []).filter((node) => node.kind === 'code')
    expect(codeNodes.map((node) => node.language)).toEqual(['ts', ''])
    expect(codeNodes[0]?.code).toContain("javascript:alert(1)")
  })
})

describe('pipeline capabilities with real Markdown', () => {
  it.each(['sync', 'async'] as const)(
    'honors the %s capability without losing document structure',
    async (mode) => {
      const result = useMarkdownDocument(realMarkdown, {
        plugins,
        pipeline: markedPipeline(mode),
      })
      await result.refresh()

      const document = result.document.value
      const json = JSON.stringify(document?.nodes)

      expect(document?.pipeline).toBe(`real-${mode}`)
      expect(document?.frontmatter?.title).toBe('Real-world Markdown')
      expect(document?.toc.map((item) => item.id)).toContain('level-six')
      expect(json).toContain('"tag":"table"')
      expect(json).toContain('"tag":"blockquote"')
      expect(json).toContain('"kind":"code"')

      if (mode === 'sync') {
        expect(json).toContain('MARKER-S')
        expect(json).not.toContain('MARKER-A')
      } else {
        expect(json).toContain('MARKER-A')
        expect(json).not.toContain('MARKER-S')
      }
    },
  )
})

describe('security corpus with real Markdown', () => {
  it('keeps the safe document structure and removes hostile attributes', () => {
    const html = exportMarkdownHtmlSync(hostileMarkdown, { plugins })

    // Safe prose, links, images, lists, tables, and code survive.
    expect(html).toContain('<h1 id="security-corpus">Security corpus</h1>')
    expect(html).toContain('<a href="https://example.com/docs">safe documentation</a>')
    expect(html).toContain('<a href="./guide">relative guide</a>')
    expect(html).toContain('<img src="https://example.com/safe.png" alt="safe image">')
    expect(html).toContain('<img src="safe.png" alt="mixed srcset" srcset="safe.png 1x">')
    expect(html).toContain('<a href="https://example.com/table">safe table link</a>')
    expect(html).toContain('<code>javascript:alert(9)</code>')
    expect(html).toContain('javascript:alert(14)')
    expect(html).toContain('&#x3C;script>alert(13)&#x3C;/script>')
    expect(html).toContain('id="user-content-note"')
    expect(html).toContain('overlay')

    const elements = htmlElements(html)
    for (const element of elements) {
      for (const [property, rawValue] of Object.entries(element.properties)) {
        const name = property.toLowerCase()
        expect(name.startsWith('on')).toBe(false)
        expect(name).not.toBe('style')
        if (name === 'href' || name === 'src' || name === 'srcset') {
          const value = propertyText(rawValue)
          expect(value).not.toMatch(/(?:javascript|vbscript):/i)
          expect(value).not.toMatch(/data:image\/svg\+xml/i)
        }
      }
    }

    // `srcset` is filtered candidate by candidate.
    expect(
      elements
        .map((element) => element.properties.srcSet)
        .filter((value) => value !== undefined && value !== null),
    ).toEqual(['safe.png 1x'])

    // Raw script/style/svg blocks and their text never reach the output.
    expect(html).not.toContain('<script')
    expect(html).not.toContain('<style')
    expect(html).not.toContain('<svg')
    expect(html).not.toContain('alert(10)')
    expect(html).not.toContain('alert(15)')
    expect(html).not.toContain('evil.example')
  })
})
