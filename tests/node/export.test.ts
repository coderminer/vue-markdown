import { describe, expect, it } from 'vitest'
import rehypeRaw from 'rehype-raw'
import {
  exportMarkdownHtml,
  exportMarkdownHtmlSync,
} from '../../src/export'
import { defineMarkdownPlugin } from '../../src/plugins/define'
import type { MarkdownDocument, MarkdownNode } from '../../src/core/types'

describe('static export parity', () => {
  it('applies heading IDs and resolved links like rendering', () => {
    const html = exportMarkdownHtmlSync('# Hello\n\n[link](docs)', {
      baseUrl: 'https://example.com/base/',
      idPrefix: 'doc-',
    })
    expect(html).toContain('id="doc-hello"')
    expect(html).toContain('href="https://example.com/base/docs"')
  })

  it('applies allowed and disallowed element filtering', () => {
    const source = '# Heading\n\nParagraph **bold**'
    expect(exportMarkdownHtmlSync(source, { allowedElements: ['p'] })).not.toContain(
      '<h1',
    )
    expect(
      exportMarkdownHtmlSync(source, {
        disallowedElements: ['h1'],
        unwrapDisallowed: true,
      }),
    ).not.toContain('<h1')
    expect(
      exportMarkdownHtmlSync(source, {
        allowElement: (node) => node.tag !== 'h1',
      }),
    ).not.toContain('<h1')
  })

  it('applies a custom urlTransform and revalidates its result', () => {
    expect(
      exportMarkdownHtmlSync('[x](/a)', {
        urlTransform: () => 'https://safe.example/x',
      }),
    ).toContain('href="https://safe.example/x"')

    const unsafe = exportMarkdownHtmlSync('[x](/a)', {
      urlTransform: () => 'javascript:alert(1)',
    })
    expect(unsafe).not.toContain('javascript:')
  })

  it('applies plugin document transforms', () => {
    const injected: MarkdownNode = {
      kind: 'element',
      key: 'injected',
      tag: 'p',
      attrs: {},
      children: [{ kind: 'text', key: 'injected-text', value: 'Injected' }],
    }
    const plugin = defineMarkdownPlugin({
      name: 'export-document',
      transformDocument(document: MarkdownDocument) {
        return { ...document, nodes: [...document.nodes, injected] }
      },
    })
    expect(exportMarkdownHtmlSync('Hello', { plugins: [plugin] })).toContain(
      'Injected',
    )
  })

  it('supports the asynchronous export form', async () => {
    await expect(exportMarkdownHtml('# Async\n\n**bold**')).resolves.toContain(
      '<strong>bold</strong>',
    )
  })
})

describe('static export security', () => {
  it('drops unsafe protocols', () => {
    const html = exportMarkdownHtmlSync(
      '[x](javascript:alert(1)) [y](vbscript:msgbox(1)) [z](data:text/html,<b>x</b>) ![w](data:image/svg+xml;base64,PHN2Zz4=)',
    )
    expect(html).not.toContain('javascript:')
    expect(html).not.toContain('vbscript:')
    expect(html).not.toContain('data:text/html')
    expect(html).not.toContain('data:image/svg+xml')
  })

  it('drops raw HTML by default and honors skipHtml', () => {
    const source = '<script>alert(1)</script>\n\n<b>bold</b>'
    const dropped = exportMarkdownHtmlSync(source)
    expect(dropped).not.toContain('<script')
    expect(dropped).not.toContain('<b>')

    const skipped = exportMarkdownHtmlSync(source, { skipHtml: true })
    expect(skipped).not.toContain('alert(1)')
  })

  it('sanitizes raw HTML when rehype-raw is enabled', () => {
    const html = exportMarkdownHtmlSync(
      '<script>alert(1)</script><img src="x" onerror="alert(1)"><b>bold</b>',
      { rehypePlugins: [rehypeRaw] },
    )
    expect(html).not.toContain('<script')
    expect(html).not.toContain('onerror')
    expect(html).toContain('<b>bold</b>')
  })

  it('fails instead of returning partial output when a transform reports an error', () => {
    const plugin = defineMarkdownPlugin({
      name: 'export-failure',
      transformDocument() {
        throw new Error('document transform failed')
      },
    })
    expect(() => exportMarkdownHtmlSync('Hello', { plugins: [plugin] })).toThrow(
      /document transform failed/,
    )
  })

  it('reports source transform failures like rendering', () => {
    const plugin = defineMarkdownPlugin({
      name: 'export-source-failure',
      transformSource() {
        throw new Error('source transform failed')
      },
    })
    expect(() => exportMarkdownHtmlSync('Hello', { plugins: [plugin] })).toThrow(
      /source transform failed/,
    )
  })
})
