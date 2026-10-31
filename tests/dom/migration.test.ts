import { describe, expect, it } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { defineComponent, h, nextTick, shallowRef } from 'vue'
import remarkGfm from 'remark-gfm'
import rehypeRaw from 'rehype-raw'
import MarkdownRenderer from '../../src/components/MarkdownRenderer.vue'
import { useMarkdownDocument } from '../../src/composables/useMarkdownDocument'
import type { MarkdownPipeline, PipelineResult } from '../../src/core/types'

function renderer(props: Record<string, unknown>) {
  return mount(MarkdownRenderer, { props })
}

function okResult(text: string): PipelineResult {
  return {
    hast: {
      type: 'root',
      children: [
        {
          type: 'element',
          tagName: 'p',
          properties: {},
          children: [{ type: 'text', value: text }],
        },
      ],
    },
  }
}

/**
 * One test per row of the react-markdown migration table. Keeping them together
 * makes a missing row obvious during review.
 */
describe('react-markdown migration table', () => {
  it('components', () => {
    const wrapper = renderer({
      source: '# Title',
      components: { h1: 'h2' },
    })
    expect(wrapper.find('h2').text()).toBe('Title')
    expect(wrapper.find('h1').exists()).toBe(false)
  })

  it('allowedElements', () => {
    const wrapper = renderer({
      source: '# Title\n\nParagraph **bold**',
      allowedElements: ['p'],
    })
    expect(wrapper.find('h1').exists()).toBe(false)
    expect(wrapper.find('strong').exists()).toBe(false)
    expect(wrapper.findAll('p')).toHaveLength(1)
  })

  it('disallowedElements', () => {
    const wrapper = renderer({
      source: '# Title\n\nParagraph',
      disallowedElements: ['h1'],
    })
    expect(wrapper.find('h1').exists()).toBe(false)
    expect(wrapper.text()).not.toContain('Title')
    expect(wrapper.text()).toContain('Paragraph')
  })

  it('unwrapDisallowed', () => {
    const wrapper = renderer({
      source: '# Title\n\nParagraph',
      disallowedElements: ['h1'],
      unwrapDisallowed: true,
    })
    expect(wrapper.find('h1').exists()).toBe(false)
    expect(wrapper.text()).toContain('Title')
  })

  it('allowElement', () => {
    const wrapper = renderer({
      source: 'Keep **bold**',
      allowElement: (node: { tag: string }) => node.tag !== 'strong',
      unwrapDisallowed: true,
    })
    expect(wrapper.find('strong').exists()).toBe(false)
    expect(wrapper.text()).toContain('bold')
  })

  it('urlTransform', () => {
    const nulled = renderer({
      source: '[link](https://example.com)',
      urlTransform: () => null,
    })
    expect(nulled.find('a').attributes('href')).toBeUndefined()

    const rewritten = renderer({
      source: '[link](https://example.com)',
      urlTransform: (url: string) => url.replace('example.com', 'example.org'),
    })
    expect(rewritten.find('a').attributes('href')).toBe('https://example.org')
  })

  it('skipHtml', () => {
    const wrapper = renderer({
      source: '<b>raw</b>\n\nMarkdown',
      skipHtml: true,
    })
    expect(wrapper.find('b').exists()).toBe(false)
    expect(wrapper.html()).not.toContain('<b')
    expect(wrapper.text()).toContain('Markdown')
  })

  it('remarkPlugins', () => {
    const wrapper = renderer({
      source: '| a | b |\n| - | - |\n| 1 | 2 |',
      remarkPlugins: [remarkGfm],
    })
    expect(wrapper.find('table').exists()).toBe(true)
    expect(wrapper.findAll('th')).toHaveLength(2)
  })

  it('rehypePlugins', () => {
    const markParagraphs = () => (tree: {
      children: Array<{ type: string; tagName?: string; properties?: Record<string, unknown> }>
    }) => {
      for (const node of tree.children) {
        if (node.type === 'element' && node.tagName === 'p') {
          node.properties = { ...node.properties, 'data-marked': 'yes' }
        }
      }
    }
    const wrapper = renderer({
      source: 'Markdown',
      rehypePlugins: [markParagraphs as never],
    })
    expect(wrapper.find('p').attributes('data-marked')).toBe('yes')
  })

  it('children as the default slot', () => {
    const wrapper = mount(MarkdownRenderer, {
      slots: { default: '# From the slot' },
    })
    expect(wrapper.find('h1').text()).toBe('From the slot')

    const withSource = mount(MarkdownRenderer, {
      props: { source: '# From the prop' },
      slots: { default: '# From the slot' },
    })
    expect(withSource.find('h1').text()).toBe('From the prop')
  })

  it('MarkdownAsync via useMarkdownDocument', async () => {
    const pipeline: MarkdownPipeline = {
      name: 'async-only',
      async process() {
        await Promise.resolve()
        return okResult('Async content')
      },
    }

    const Host = defineComponent({
      setup() {
        const { document, status } = useMarkdownDocument('source', { pipeline })
        return () => h('div', { 'data-status': status.value }, document.value ? 'ready' : 'waiting')
      },
    })

    const wrapper = mount(Host)
    expect(wrapper.attributes('data-status')).toBe('pending')
    await flushPromises()
    await nextTick()
    expect(wrapper.text()).toBe('ready')
    expect(wrapper.attributes('data-status')).toBe('ready')
  })

  it('MarkdownHooks via useMarkdownDocument', async () => {
    const source = shallowRef('# One')
    const Host = defineComponent({
      setup() {
        const { document, toc, status } = useMarkdownDocument(source)
        return () =>
          h('div', { 'data-status': status.value }, [
            h('span', { 'data-toc': toc.value.length }, document.value?.nodes.length ?? 0),
          ])
      },
    })

    const wrapper = mount(Host)
    await nextTick()
    expect(wrapper.attributes('data-status')).toBe('ready')
    expect(wrapper.find('[data-toc]').attributes('data-toc')).toBe('1')

    source.value = '# One\n\n## Two'
    await nextTick()
    await nextTick()
    expect(wrapper.find('[data-toc]').attributes('data-toc')).toBe('2')
  })
})

describe('react-markdown migration behavior notes', () => {
  it('defaults link targets to _self and opts into _blank', () => {
    const internal = renderer({ source: '[link](/guide)' })
    expect(internal.find('a').attributes('target')).toBe('_self')

    const external = renderer({
      source: '[link](https://example.com)',
      externalLinkTarget: '_blank',
    })
    expect(external.find('a').attributes('target')).toBe('_blank')
    expect(external.find('a').attributes('rel')).toBe('noopener noreferrer')
  })

  it('drops raw HTML by default and enables it through rehype-raw', () => {
    const dropped = renderer({ source: '<b>raw</b>\n\nText' })
    expect(dropped.find('b').exists()).toBe(false)

    const enabled = renderer({
      source: '<b>raw</b>\n\nText',
      rehypePlugins: [rehypeRaw],
    })
    expect(enabled.find('b').text()).toBe('raw')
  })

  it('wraps fenced code with the pre component and keeps the code element', () => {
    const wrapper = renderer({
      source: '```js\nconst value = 1\n```',
      components: { pre: 'section' },
    })
    expect(wrapper.find('section').text()).toContain('const value = 1')
    expect(wrapper.find('section code').classes()).toContain('language-js')
    expect(wrapper.find('pre').exists()).toBe(false)
  })

  it('uses the code component for fenced and inline code with react-markdown props', () => {
    const classNames: Array<string | undefined> = []
    const wrapper = renderer({
      source: '```js\nconst value = 1\n```\n\n`inline`',
      components: {
        code: defineComponent({
          props: { className: { type: String, default: undefined } },
          setup(props, { slots }) {
            classNames.push(props.className)
            return () =>
              h(
                'code',
                { class: props.className, 'data-custom-code': '' },
                slots.default?.(),
              )
          },
        }),
      },
    })

    const blocks = wrapper.findAll('[data-custom-code]')
    expect(blocks).toHaveLength(2)
    expect(classNames).toEqual(['language-js', undefined])
    expect(blocks[0]?.text()).toBe('const value = 1')
    expect(blocks[1]?.text()).toBe('inline')
  })
})
