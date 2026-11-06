import { describe, expect, it } from 'vitest'
import { fromHtml } from 'hast-util-from-html'
import { visit } from 'unist-util-visit'
import type { Element } from 'hast'
import { exportMarkdownHtmlSync } from '../../src/export'
import { useMarkdownDocument } from '../../src/composables/useMarkdownDocument'
import { walkNodes } from '../../src/core/normalize'
import { customTagsPlugin, fullPlugins } from '../../src/plugins/builtin'
import { htmlPlugin } from '../../src/html'
import { customElementsMarkdown } from '../fixtures/custom-elements'
import type { MarkdownCustomTagNode } from '../../src/core/types'

const plugins = [
  ...fullPlugins.filter((plugin) => plugin.name !== 'custom-tags'),
  customTagsPlugin({ tags: ['x-note', 'x-callout'] }),
  htmlPlugin({
    schema: {
      tags: ['x-note', 'x-callout'],
      attributes: {
        'x-note': ['tone', 'title', 'start-line', 'href'],
        'x-callout': ['kind'],
      },
    },
  }),
]

function htmlElements(html: string): Element[] {
  const elements: Element[] = []
  visit(fromHtml(html), 'element', (node) => {
    elements.push(node)
  })
  return elements
}

describe('real custom elements', () => {
  it('builds the custom-tag inventory with safe normalized props', () => {
    const result = useMarkdownDocument(customElementsMarkdown, { plugins })
    const document = result.document.value
    const tags: MarkdownCustomTagNode[] = []
    walkNodes(document?.nodes ?? [], (node) => {
      if (node.kind === 'custom') tags.push(node)
    })

    expect(tags.map((tag) => tag.tag)).toEqual([
      'x-note',
      'x-callout',
      'x-note',
    ])

    expect(tags[0]?.props).toEqual({
      tone: 'info',
      title: 'Heads up',
      startLine: '12',
      'data-testid': 'deploy-note',
    })
    expect(tags[1]?.props).toEqual({
      kind: 'warning',
      'data-testid': 'nested-callout',
    })
    // Unsafe attributes never reach the custom node or the click payload.
    expect(tags[2]?.props).toEqual({
      tone: 'danger',
      title: 'Unsafe attrs',
    })

    // The nested callout stays inside the outer note.
    expect(tags[0]?.children.some((node) => node.kind === 'custom')).toBe(true)

    expect(document?.customTags.map((tag) => tag.tag)).toEqual([
      'x-note',
      'x-callout',
      'x-note',
    ])
    expect(document?.toc.map((item) => item.text)).toEqual([
      'Release checklist',
    ])
  })

  it('exports custom elements as sanitized HTML with their content intact', () => {
    const html = exportMarkdownHtmlSync(customElementsMarkdown, { plugins })
    const elements = htmlElements(html)

    expect(
      elements.filter((element) => element.tagName === 'x-note'),
    ).toHaveLength(2)
    expect(
      elements.filter((element) => element.tagName === 'x-callout'),
    ).toHaveLength(1)
    expect(
      elements.filter((element) => element.tagName === 'figure'),
    ).toHaveLength(1)

    const infoNote = elements.find(
      (element) => element.tagName === 'x-note',
    )
    expect(infoNote?.properties).toMatchObject({
      tone: 'info',
      title: 'Heads up',
      'start-line': '12',
      dataTestid: 'deploy-note',
    })

    expect(html).toContain('start-line="12"')
    expect(html).toContain('data-testid="deploy-note"')
    expect(html).toContain('data-testid="nested-callout"')

    expect(html).toContain('Run <code>npm run build:lib</code> before tagging.')
    expect(html).toContain('Keep the changelog in sync.')
    expect(html).toContain('<strong>Sanitized</strong> but still visible.')
    expect(html).toContain('Request flow')
    expect(html).toContain('src="./assets/architecture.png"')
    expect(html).not.toContain('onclick')
    expect(html).not.toContain('style=')
    expect(html).not.toContain('javascript:')
  })
})
