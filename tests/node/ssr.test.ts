import { describe, expect, it } from 'vitest'
import { createSSRApp, h } from 'vue'
import { renderToString } from '@vue/server-renderer'
import MarkdownRenderer from '../../src/components/MarkdownRenderer.vue'
import MarkdownEmpty from '../../src/components/MarkdownEmpty.vue'
import MarkdownError from '../../src/components/MarkdownError.vue'
import MarkdownLoading from '../../src/components/MarkdownLoading.vue'
import MarkdownToc from '../../src/components/MarkdownToc.vue'
import { exportMarkdownHtmlSync } from '../../src/export'
import { gfmPlugin } from '../../src/plugins/builtin'
import type { MarkdownPipeline } from '../../src/core/types'

async function render(source: string, props: Record<string, unknown> = {}) {
  const app = createSSRApp({
    render: () => h(MarkdownRenderer, { source, ...props }),
  })
  return renderToString(app)
}

async function renderComponent(
  component: Parameters<typeof h>[0],
  props: Record<string, unknown> = {},
) {
  const app = createSSRApp({
    render: () => h(component, props),
  })
  return renderToString(app)
}

describe('server rendering', () => {
  it('runs without browser globals', () => {
    expect(typeof document).toBe('undefined')
    expect(typeof window).toBe('undefined')
  })

  it('renders Markdown to semantic HTML', async () => {
    const html = await render('# Hello\n\nA **bold** paragraph.')
    expect(html).toContain('<h1')
    expect(html).toContain('Hello')
    expect(html).toContain('<strong')
    expect(html).toContain('bold')
  })

  it('produces deterministic heading IDs', async () => {
    const first = await render('# Same\n\n# Same')
    const second = await render('# Same\n\n# Same')
    expect(first).toBe(second)
    expect(first).toContain('id="same"')
    expect(first).toContain('id="same-1"')
  })

  it('renders empty input without throwing', async () => {
    const html = await render('')
    expect(html).toContain('vmd-root')
    expect(html).toContain('vmd-empty')
  })

  it('renders static shells on the server', async () => {
    const toc = await renderComponent(MarkdownToc, {
      items: [{ id: 'one', text: 'One', level: 1 }],
    })
    expect(toc).toContain('vmd-toc')
    expect(toc).toContain('href="#one"')

    expect(await renderComponent(MarkdownError, { label: 'Broken' })).toContain(
      'Broken',
    )
    expect(await renderComponent(MarkdownEmpty)).toContain('No content')
    expect(await renderComponent(MarkdownLoading)).toContain('Loading')
  })

  it('matches client structure for headings and inline markup', async () => {
    const html = await render('# Title\n\nA **bold** [link](https://example.com)')
    expect(html).toContain('<h1')
    expect(html).toContain('id="title"')
    expect(html).toContain('bold')
    expect(html).toContain('href="https://example.com"')
    expect(html).not.toContain('vmd-toc')
  })

  it('uses the synchronous pipeline path when available', async () => {
    const html = await render('# Title', { toc: true })
    expect(html).toContain('<h1')
    expect(html).toContain('id="title"')
    expect(html).toContain('vmd-toc')
    expect(html).not.toContain('vmd-loading')
  })

  it('renders a pending placeholder for an async-only pipeline', async () => {
    const pipeline: MarkdownPipeline = {
      name: 'async-only-ssr',
      async process() {
        return {
          hast: {
            type: 'root',
            children: [
              {
                type: 'element',
                tagName: 'p',
                properties: {},
                children: [{ type: 'text', value: 'Later' }],
              },
            ],
          },
        }
      },
    }
    const html = await render('# Title', { pipeline })
    expect(html).toContain('vmd-loading')
    expect(html).not.toContain('Later')
  })
})

describe('static HTML export', () => {
  it('renders synchronously with deterministic output', () => {
    const first = exportMarkdownHtmlSync('# Title\n\n**bold**')
    const second = exportMarkdownHtmlSync('# Title\n\n**bold**')
    expect(first).toBe(second)
    expect(first).toContain('<h1 id="title">Title</h1>')
    expect(first).toContain('<strong>bold</strong>')
  })

  it('supports synchronous official plugins', () => {
    const html = exportMarkdownHtmlSync(
      ['| a | b |', '| - | - |', '| 1 | 2 |', '', '~~gone~~'].join('\n'),
      { plugins: [gfmPlugin] },
    )
    expect(html).toContain('<table>')
    expect(html).toContain('<del>gone</del>')
  })
})
