import { describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { defineComponent, h, isReactive, nextTick } from 'vue'
import rehypeRaw from 'rehype-raw'
import MarkdownRenderer from '../../src/components/MarkdownRenderer.vue'
import {
  customTagsPlugin,
  searchPlugin,
} from '../../src/plugins/builtin'
import { defineMarkdownPlugin } from '../../src/plugins/define'
import { createOfficialPipeline } from '../../src/pipeline'
import type {
  MarkdownDocument,
  MarkdownPipeline,
  PipelineContext,
  PipelineResult,
} from '../../src/core/types'

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

function customTagResult(): PipelineResult {
  return {
    hast: {
      type: 'root',
      children: [
        {
          type: 'element',
          tagName: 'x-note',
          properties: { tone: 'info', label: 'Heads up' },
          children: [{ type: 'text', value: 'Body' }],
        },
      ],
    },
  }
}

function countingPipeline(name: string) {
  const official = createOfficialPipeline()
  const counter = { calls: 0 }
  const pipeline: MarkdownPipeline = {
    name,
    processSync(source: string, ctx: PipelineContext) {
      counter.calls += 1
      return official.processSync!(source, ctx)
    },
    async process(source: string, ctx: PipelineContext) {
      counter.calls += 1
      return official.process(source, ctx)
    },
  }
  return { pipeline, counter }
}

function renderer(props: Record<string, unknown>) {
  return mount(MarkdownRenderer, { props })
}

describe('renderer events and actions', () => {
  it('emits ready once and toc-change only when the TOC changes', async () => {
    const wrapper = renderer({ source: '# One\n\n## Two' })
    await nextTick()

    expect(wrapper.emitted('ready')).toHaveLength(1)
    const ready = wrapper.emitted('ready')?.[0]?.[0] as MarkdownDocument
    expect(ready.toc.map((item) => item.id)).toEqual(['one', 'two'])

    const tocEvents = wrapper.emitted('toc-change') ?? []
    expect(tocEvents.at(-1)?.[0]).toEqual([
      { id: 'one', text: 'One', level: 1 },
      { id: 'two', text: 'Two', level: 2 },
    ])

    await wrapper.setProps({ source: '# One\n\n## Two\n\nText' })
    await nextTick()
    expect(wrapper.emitted('ready')).toHaveLength(1)
    expect(wrapper.emitted('toc-change')).toHaveLength(tocEvents.length)
  })

  it('emits link-click with the resolved target', async () => {
    const wrapper = renderer({
      source: '[docs](https://example.com)',
      externalLinkTarget: '_blank',
    })
    await wrapper.find('a').trigger('click')

    const payload = wrapper.emitted('link-click')?.[0]?.[0] as {
      url: string
      target: string
    }
    expect(payload.url).toBe('https://example.com')
    expect(payload.target).toBe('_blank')
  })

  it('emits custom-tag-click for mapped and default custom tags', async () => {
    const pipeline: MarkdownPipeline = {
      name: 'custom-tag-events',
      process: async () => customTagResult(),
      processSync: () => customTagResult(),
    }
    const Note = defineComponent({
      props: { tone: String, label: String },
      setup(props, { slots }) {
        return () =>
          h('aside', { 'data-tone': props.tone }, [
            h('strong', props.label),
            slots.default?.(),
          ])
      },
    })

    const mapped = renderer({
      source: '',
      pipeline,
      plugins: [customTagsPlugin({ tags: ['x-note'] })],
      components: { 'x-note': Note },
    })
    expect(mapped.find('aside[data-tone="info"]').exists()).toBe(true)
    expect(mapped.find('strong').text()).toBe('Heads up')
    await mapped.find('aside').trigger('click')
    const mappedPayload = mapped.emitted('custom-tag-click')?.[0]?.[0] as {
      tag: string
      props: Record<string, unknown>
    }
    expect(mappedPayload.tag).toBe('x-note')
    expect(mappedPayload.props).toMatchObject({ tone: 'info', label: 'Heads up' })

    const plain = renderer({
      source: '',
      pipeline,
      plugins: [customTagsPlugin({ tags: ['x-note'] })],
    })
    expect(plain.find('span.vmd-custom-tag').text()).toContain('Body')
    await plain.find('span.vmd-custom-tag').trigger('click')
    expect(plain.emitted('custom-tag-click')).toHaveLength(1)
  })

  it('emits update:source through the exposed action', () => {
    const wrapper = renderer({ source: '# Title' })
    const vm = wrapper.vm as unknown as { updateSource: (source: string) => void }
    vm.updateSource('# Next')
    expect(wrapper.emitted('update:source')?.[0]).toEqual(['# Next'])
  })

  it('reports a diagnostic once per distinct failure', async () => {
    const wrapper = renderer({
      source: '# Title',
      pipeline: { name: '', process: undefined } as unknown as MarkdownPipeline,
    })
    await nextTick()

    const errors = wrapper.emitted('render-error') ?? []
    expect(errors.some((event) => (event[0] as { code: string }).code === 'pipeline-name')).toBe(
      true,
    )
    const signatureCount = errors.filter(
      (event) => (event[0] as { code: string }).code === 'pipeline-name',
    ).length
    expect(signatureCount).toBe(1)

    await wrapper.setProps({ source: '# Other' })
    await nextTick()
    expect(
      (wrapper.emitted('render-error') ?? []).filter(
        (event) => (event[0] as { code: string }).code === 'pipeline-name',
      ),
    ).toHaveLength(1)
  })
})

describe('links and URL policy', () => {
  it('defaults to _self and opts into _blank with a safe rel', () => {
    const wrapper = renderer({
      source: '[external](https://example.com) [internal](/docs)',
      externalLinkTarget: '_blank',
    })
    const links = wrapper.findAll('a')
    expect(links[0]?.attributes('target')).toBe('_blank')
    expect(links[0]?.attributes('rel')).toBe('noopener noreferrer')
    expect(links[1]?.attributes('target')).toBe('_self')
    expect(links[1]?.attributes('rel')).toBeUndefined()
  })

  it('resolves baseUrl and applies urlTransform', () => {
    const wrapper = renderer({
      source: '[docs](/guide)',
      baseUrl: 'https://example.com/base/',
      urlTransform: (url: string, key: string) =>
        key === 'href' ? `${url}?from=test` : undefined,
    })
    expect(wrapper.find('a').attributes('href')).toBe(
      'https://example.com/guide?from=test',
    )
  })

  it('drops dangerous protocols and keeps safe ones', () => {
    const wrapper = renderer({
      source: '[bad](javascript:alert(1)) [good](https://example.com)',
    })
    const hrefs = wrapper.findAll('a').map((link) => link.attributes('href'))
    expect(hrefs).toEqual([undefined, 'https://example.com'])
  })
})

describe('filtering props', () => {
  const source = '# Title\n\nKeep **bold**\n\nDrop'

  it('keeps only allowed elements', () => {
    const wrapper = renderer({ source, allowedElements: ['p'] })
    expect(wrapper.find('h1').exists()).toBe(false)
    expect(wrapper.findAll('p')).toHaveLength(2)
    expect(wrapper.find('strong').exists()).toBe(false)
  })

  it('drops disallowed elements', () => {
    const wrapper = renderer({ source, disallowedElements: ['h1'] })
    expect(wrapper.find('h1').exists()).toBe(false)
    expect(wrapper.text()).toContain('Keep')
  })

  it('unwraps disallowed elements', () => {
    const wrapper = renderer({
      source,
      disallowedElements: ['h1'],
      unwrapDisallowed: true,
    })
    expect(wrapper.find('h1').exists()).toBe(false)
    expect(wrapper.text()).toContain('Title')
  })

  it('applies allowElement after the lists', () => {
    const wrapper = renderer({
      source,
      allowElement: (node: { tag: string }) => node.tag !== 'strong',
      unwrapDisallowed: true,
    })
    expect(wrapper.find('strong').exists()).toBe(false)
    expect(wrapper.text()).toContain('bold')
  })
})

describe('TOC and heading navigation', () => {
  it('renders the TOC and navigates to a heading', async () => {
    const wrapper = mount(MarkdownRenderer, {
      props: {
        source: '# One\n\n## Two',
        toc: true,
      },
      attachTo: document.body,
    })
    const links = wrapper.findAll('a[data-vmd-part="toc-item"]')
    expect(links).toHaveLength(2)
    expect(links[1]?.text()).toBe('Two')

    const target = document.getElementById('two')
    expect(target).not.toBeNull()
    const scroll = vi.fn()
    target!.scrollIntoView = scroll

    await links[1]!.trigger('click')
    expect(scroll).toHaveBeenCalledTimes(1)
    wrapper.unmount()
  })

  it('prefixes heading IDs', () => {
    const wrapper = renderer({ source: '# Title', idPrefix: 'doc-' })
    expect(wrapper.find('h1').attributes('id')).toBe('doc-title')
  })
})

describe('search and raw HTML', () => {
  it('highlights search matches and allows a custom mark renderer', () => {
    const wrapper = renderer({
      source: 'Hello hello',
      plugins: [searchPlugin({ query: 'hello' })],
    })
    expect(wrapper.findAll('mark.vmd-search-match')).toHaveLength(2)

    const custom = renderer({
      source: 'Hello hello',
      plugins: [searchPlugin({ query: 'hello' })],
      components: { mark: 'em' },
    })
    expect(custom.findAll('em.vmd-search-match')).toHaveLength(2)
  })

  it('drops raw HTML by default and renders sanitized nodes with rehype-raw', () => {
    const dropped = renderer({ source: '<b>bold</b>\n\nHello' })
    expect(dropped.find('b').exists()).toBe(false)
    expect(dropped.text()).toContain('Hello')

    const enabled = renderer({
      source: '<b>bold</b>\n\nHello',
      rehypePlugins: [rehypeRaw],
    })
    expect(enabled.find('b').text()).toBe('bold')

    const dangerous = renderer({
      source: '<b>bold</b><script>alert(1)</script>',
      rehypePlugins: [rehypeRaw],
    })
    expect(dangerous.html()).not.toContain('<script')
    expect(dangerous.html()).not.toContain('alert(1)')
  })
})

describe('component resolution and plugin contributions', () => {
  it('renders fenced code through tag overrides with the code text', () => {
    const wrapper = renderer({
      source: '```js\nconst value = 1\n```',
      components: { pre: 'section' },
    })
    expect(wrapper.find('section.vmd-code').exists()).toBe(false)
    expect(wrapper.find('section').text()).toContain('const value = 1')
  })

  it('merges plugin components, labels, and tokens under local overrides', () => {
    const brand = defineMarkdownPlugin({
      name: 'brand',
      components: { h1: 'h2' },
      labels: { toc: 'Contents' },
      tokens: { '--vmd-color-text': 'rgb(1, 2, 3)' },
    })

    const wrapper = renderer({
      source: '# Title',
      toc: true,
      plugins: [brand],
    })
    expect(wrapper.find('h2').text()).toBe('Title')
    expect(wrapper.find('nav.vmd-toc').attributes('aria-label')).toBe('Contents')
    expect(wrapper.find('.vmd-root').attributes('style')).toContain(
      '--vmd-color-text',
    )

    const local = renderer({
      source: '# Title',
      plugins: [brand],
      components: { h1: 'h3' },
    })
    expect(local.find('h3').text()).toBe('Title')
    expect(local.find('h2').exists()).toBe(false)
  })

  it('uses a plugin region contribution for an empty document', async () => {
    const EmptyRegion = defineComponent({
      props: { label: String },
      setup(props) {
        return () => h('section', { 'data-custom-empty': '' }, props.label)
      },
    })
    const plugin = defineMarkdownPlugin({
      name: 'empty-region',
      regions: { empty: EmptyRegion },
    })
    const wrapper = renderer({ source: '', plugins: [plugin] })
    await nextTick()
    expect(wrapper.find('[data-custom-empty]').text()).toBe('No content')
  })
})

describe('memoization and resilience', () => {
  it('does not re-parse for presentation-only changes', async () => {
    const { pipeline, counter } = countingPipeline('memo-presentation')
    const wrapper = renderer({ source: '# A', pipeline })
    expect(counter.calls).toBe(1)

    await wrapper.setProps({ tokens: { '--vmd-color-text': 'red' } })
    await wrapper.setProps({ components: { h1: 'h2' } })
    await nextTick()
    expect(counter.calls).toBe(1)
    expect(wrapper.find('h2').text()).toBe('A')

    await wrapper.setProps({ source: '# B' })
    await nextTick()
    expect(counter.calls).toBe(2)
    expect(wrapper.find('h2').text()).toBe('B')
  })

  it('retains the last good document when an async run fails', async () => {
    let fail = false
    const pipeline: MarkdownPipeline = {
      name: 'flaky-async',
      async process(source: string) {
        if (fail) throw new Error('pipeline exploded')
        return okResult(source)
      },
    }

    const wrapper = renderer({ source: 'First' })
    await wrapper.setProps({ pipeline })
    await flushPromises()
    expect(wrapper.text()).toContain('First')

    fail = true
    await wrapper.setProps({ source: 'Second' })
    await nextTick()
    await flushPromises()

    expect(wrapper.text()).toContain('First')
    expect(wrapper.text()).not.toContain('Second')
    const errors = wrapper.emitted('render-error') ?? []
    expect(
      errors.some(
        (event) => (event[0] as { code: string }).code === 'pipeline-process',
      ),
    ).toBe(true)
  })

  it('keeps the document out of a deep reactive proxy', () => {
    const wrapper = renderer({ source: '# Title' })
    const vm = wrapper.vm as unknown as {
      getDocument: () => MarkdownDocument | undefined
    }
    const document = vm.getDocument()
    expect(document).toBeDefined()
    expect(isReactive(document)).toBe(false)
  })
})
