import { describe, expect, it } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import MarkdownRenderer from '../../src/components/MarkdownRenderer.vue'
import { exportMarkdownHtml } from '../../src/export'
import { fullPlugins } from '../../src/plugins/builtin'
import { htmlPlugin } from '../../src/html'
import { hostileMarkdown, realMarkdown } from '../fixtures/real-markdown'

const plugins = [...fullPlugins, htmlPlugin()]

function exportRoot(html: string): HTMLElement {
  const root = document.createElement('div')
  root.innerHTML = html
  return root
}

function headingRecords(root: ParentNode) {
  return Array.from(root.querySelectorAll('h1,h2,h3,h4,h5,h6')).map((heading) => ({
    tag: heading.tagName.toLowerCase(),
    id: heading.getAttribute('id'),
    text: Array.from(heading.childNodes)
      .filter((node) => node.nodeType === Node.TEXT_NODE)
      .map((node) => node.textContent ?? '')
      .join('')
      .trim(),
  }))
}

function linkRecords(root: ParentNode, selector: string) {
  return Array.from(root.querySelectorAll(selector)).map((link) => ({
    href: link.getAttribute('href'),
    title: link.getAttribute('title'),
  }))
}

function imageRecords(root: ParentNode, selector: string) {
  return Array.from(root.querySelectorAll(selector)).map((image) => ({
    src: image.getAttribute('src'),
    alt: image.getAttribute('alt') ?? '',
    title: image.getAttribute('title'),
    srcset: image.getAttribute('srcset'),
  }))
}

function textRecords(root: ParentNode, selector: string): string[] {
  return Array.from(root.querySelectorAll(selector)).map(
    (element) => element.textContent ?? '',
  )
}

async function render(source: string) {
  const wrapper = mount(MarkdownRenderer, { props: { source, plugins } })
  await flushPromises()
  return wrapper
}

function contentOf(wrapper: Awaited<ReturnType<typeof render>>): Element {
  const content = wrapper.element.querySelector('[data-vmd-part="content"]')
  if (!content) throw new Error('Renderer did not publish a content region.')
  return content
}

describe('real-world Markdown rendering parity', () => {
  it('matches static export for headings, links, images, tables, and code', async () => {
    const wrapper = await render(realMarkdown)
    const exported = exportRoot(await exportMarkdownHtml(realMarkdown, { plugins }))
    const content = contentOf(wrapper)

    expect(headingRecords(wrapper.element)).toEqual(headingRecords(exported))
    expect(linkRecords(content, '[data-vmd-part="link"]')).toEqual(
      linkRecords(exported, 'a'),
    )
    expect(imageRecords(content, '[data-vmd-part="image"]')).toEqual(
      imageRecords(exported, 'img'),
    )

    for (const selector of [
      'strong',
      'em',
      'del',
      'code',
      'pre',
      'blockquote',
      'ul',
      'ol',
      'li',
      'table',
      'thead',
      'tbody',
      'tr',
      'th',
      'td',
      'hr',
      'details',
      'summary',
      'kbd',
      'mark',
      'sub',
      'sup',
      'input',
    ]) {
      expect(content.querySelectorAll(selector).length).toBe(
        exported.querySelectorAll(selector).length,
      )
    }

    expect(textRecords(content, 'th,td')).toEqual(textRecords(exported, 'th,td'))
    expect(textRecords(content, 'pre code')).toEqual(
      textRecords(exported, 'pre code'),
    )
    expect(content.querySelector('pre code')?.textContent).toContain(
      'javascript:alert(1)',
    )
  })

  it('matches static export for hostile real Markdown without leaking attributes', async () => {
    const wrapper = await render(hostileMarkdown)
    const html = await exportMarkdownHtml(hostileMarkdown, { plugins })
    const exported = exportRoot(html)
    const content = contentOf(wrapper)

    expect(linkRecords(content, '[data-vmd-part="link"]')).toEqual(
      linkRecords(exported, 'a'),
    )
    expect(imageRecords(content, '[data-vmd-part="image"]')).toEqual(
      imageRecords(exported, 'img'),
    )
    expect(textRecords(content, 'pre code')).toEqual(
      textRecords(exported, 'pre code'),
    )

    expect(
      imageRecords(content, '[data-vmd-part="image"]')
        .map((image) => image.srcset)
        .filter((srcset) => srcset !== null),
    ).toEqual(['safe.png 1x'])

    for (const root of [content, exported]) {
      for (const element of Array.from(root.querySelectorAll('*'))) {
        for (const attribute of Array.from(element.attributes)) {
          expect(attribute.name).not.toMatch(/^on/i)
          expect(attribute.name).not.toBe('style')
          if (
            attribute.name === 'href' ||
            attribute.name === 'src' ||
            attribute.name === 'srcset'
          ) {
            expect(attribute.value).not.toMatch(
              /(?:javascript|vbscript):|data:image\/svg\+xml/i,
            )
          }
        }
      }
    }

    expect(content.querySelectorAll('[style]').length).toBe(0)
    expect(exported.querySelectorAll('[style]').length).toBe(0)
    expect(content.querySelectorAll('script,style,iframe').length).toBe(0)
    expect(exported.querySelectorAll('script,style,svg,iframe').length).toBe(0)
    expect(html).not.toContain('evil.example')
  })
})
