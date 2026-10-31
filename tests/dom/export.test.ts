import { describe, expect, it } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import MarkdownRenderer from '../../src/components/MarkdownRenderer.vue'
import { exportMarkdownHtmlSync } from '../../src/export'

describe('static export mirror', () => {
  it('keeps the same IDs, filtering, and resolved links as the renderer', async () => {
    const source = '# Hello\n\n[link](docs)\n\n![x](javascript:alert(1))'
    const options = {
      baseUrl: 'https://example.com/base/',
      disallowedElements: ['h1'],
      unwrapDisallowed: true,
    }

    const wrapper = mount(MarkdownRenderer, { props: { source, ...options } })
    await flushPromises()

    const html = exportMarkdownHtmlSync(source, options)
    const rendered = wrapper.html()

    expect(rendered).not.toContain('<h1')
    expect(html).not.toContain('<h1')
    expect(rendered).toContain('href="https://example.com/base/docs"')
    expect(html).toContain('href="https://example.com/base/docs"')
    expect(rendered).not.toContain('javascript:')
    expect(html).not.toContain('javascript:')
  })
})
