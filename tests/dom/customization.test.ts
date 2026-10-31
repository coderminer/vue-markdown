import { describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { defineComponent, h, nextTick } from 'vue'
import MarkdownRenderer from '../../src/components/MarkdownRenderer.vue'
import MarkdownConfigProvider from '../../src/components/MarkdownConfigProvider.vue'
import { useRenderContext } from '../../src/components/context'
import { composePresets, defineMarkdownPreset } from '../../src/core/preset'
import { withUniqueSlugs } from '../../src/core/slugger'
import type { MarkdownHighlighter, MarkdownPipeline } from '../../src/core/types'

function renderer(props: Record<string, unknown>, slots: Record<string, unknown> = {}) {
  return mount(MarkdownRenderer, { props, slots: slots as never })
}

describe('labels', () => {
  it('overrides built-in region and anchor labels, including function values', async () => {
    const wrapper = renderer(
      {
        source: '# Title',
        toc: true,
        labels: {
          toc: 'Contents',
          headingAnchor: (ctx: Record<string, unknown>) => `Link to ${ctx.id}`,
        },
      },
    )
    expect(wrapper.find('nav.vmd-toc').attributes('aria-label')).toBe('Contents')
    expect(wrapper.find('[data-vmd-part="heading-anchor"]').attributes('aria-label')).toBe(
      'Link to title',
    )

    const empty = renderer({
      source: '',
      labels: { empty: 'Nothing here' },
    })
    expect(empty.text()).toContain('Nothing here')
  })

  it('labels the error and loading regions', async () => {
    const errorPipeline: MarkdownPipeline = {
      name: 'fails',
      process: async () => {
        throw new Error('boom')
      },
      processSync() {
        throw new Error('boom')
      },
    }
    const error = renderer({
      source: 'x',
      pipeline: errorPipeline,
      showError: true,
      labels: { error: 'Broken document' },
    })
    await nextTick()
    expect(error.text()).toContain('Broken document')

    const pending = renderer(
      { source: 'x', pipeline: { name: 'pending', process: () => new Promise(() => {}) } },
      { loading: () => h('span', { 'data-custom-loading': '' }, 'Waiting') },
    )
    await nextTick()
    expect(pending.find('[data-custom-loading]').exists()).toBe(true)
  })
})

describe('configuration provider', () => {
  it('applies app-wide labels, components, theme, and tokens', () => {
    const wrapper = mount(MarkdownConfigProvider, {
      props: {
        theme: 'dark',
        tokens: { '--vmd-color-accent': 'rgb(1, 2, 3)' },
        components: { h1: 'h2' },
        labels: { toc: 'Provider contents' },
      },
      slots: {
        default: () => h(MarkdownRenderer, { source: '# Title', toc: true }),
      },
    })
    expect(wrapper.find('h2').text()).toContain('Title')
    expect(wrapper.find('nav.vmd-toc').attributes('aria-label')).toBe(
      'Provider contents',
    )
    expect(wrapper.find('.vmd-root').attributes('data-vmd-theme')).toBe('dark')
    expect(wrapper.find('.vmd-root').attributes('style')).toContain(
      '--vmd-color-accent',
    )
  })

  it('lets local props beat the nearest provider and merges nested providers', () => {
    const inner = defineComponent({
      setup() {
        return () =>
          h(MarkdownConfigProvider, { labels: { empty: 'Inner empty' } }, {
            default: () =>
              h(MarkdownRenderer, {
                source: '',
                labels: { empty: 'Local empty' },
              }),
          })
      },
    })
    const wrapper = mount(MarkdownConfigProvider, {
      props: { labels: { toc: 'Outer toc' } },
      slots: { default: () => h(inner) },
    })
    expect(wrapper.text()).toContain('Local empty')
    expect(wrapper.find('nav.vmd-toc').exists()).toBe(false)

    const nested = mount(MarkdownConfigProvider, {
      props: { labels: { empty: 'Outer empty' } },
      slots: {
        default: () =>
          h(
            MarkdownConfigProvider,
            { labels: { loading: 'Inner loading' } },
            { default: () => h(MarkdownRenderer, { source: '' }) },
          ),
      },
    })
    expect(nested.text()).toContain('Outer empty')
  })

  it('reads provider regions and lets local regions win', () => {
    const EmptyRegion = defineComponent({
      props: { label: String },
      setup(props) {
        return () => h('div', { 'data-provider-empty': '' }, props.label)
      },
    })
    const LocalEmpty = defineComponent({
      props: { label: String },
      setup(props) {
        return () => h('div', { 'data-local-empty': '' }, props.label)
      },
    })

    const provider = mount(MarkdownConfigProvider, {
      props: { regions: { empty: EmptyRegion } },
      slots: { default: () => h(MarkdownRenderer, { source: '' }) },
    })
    expect(provider.find('[data-provider-empty]').exists()).toBe(true)

    const local = mount(MarkdownConfigProvider, {
      props: { regions: { empty: EmptyRegion } },
      slots: {
        default: () =>
          h(MarkdownRenderer, {
            source: '',
            regions: { empty: LocalEmpty },
          }),
      },
    })
    expect(local.find('[data-local-empty]').exists()).toBe(true)
    expect(local.find('[data-provider-empty]').exists()).toBe(false)
  })
})

describe('regions and node components', () => {
  it('accepts local region overrides with default props', () => {
    const ErrorRegion = defineComponent({
      props: { label: String, diagnostics: Array },
      setup(props) {
        return () =>
          h('div', { 'data-custom-error': '' }, `${props.label}:${props.diagnostics?.length}`)
      },
    })
    const pipeline: MarkdownPipeline = {
      name: 'fails-region',
      process: async () => {
        throw new Error('boom')
      },
      processSync() {
        throw new Error('boom')
      },
    }
    const wrapper = renderer(
      { source: 'x', pipeline, showError: true, regions: { error: ErrorRegion } },
    )
    expect(wrapper.find('[data-custom-error]').text()).toContain(
      'The Markdown document could not be rendered.',
    )
  })

  it('resolves regions.codeBlock for default code blocks', () => {
    const CodeRegion = defineComponent({
      props: { code: String, language: String, node: Object },
      setup(props) {
        return () =>
          h(
            'section',
            { 'data-custom-code': '' },
            `${props.language}:${props.code}`,
          )
      },
    })
    const wrapper = renderer({
      source: '```ts\nconst x = 1\n```',
      regions: { codeBlock: CodeRegion },
    })
    expect(wrapper.find('[data-custom-code]').text()).toBe('ts:const x = 1')
    expect(wrapper.find('.vmd-code-block').exists()).toBe(false)
  })

  it('does not run a highlighter when a code region replaces the block', async () => {
    const highlight = vi.fn(() => ({ language: 'ts', nodes: [] }))
    const highlighter: MarkdownHighlighter = { id: 'spy', highlight }
    const CodeRegion = defineComponent({
      props: { code: String, language: String, node: Object },
      setup(props) {
        return () =>
          h(
            'section',
            { 'data-custom-code': '' },
            `${props.language}:${props.code}`,
          )
      },
    })
    const wrapper = renderer({
      source: '```ts\nconst x = 1\n```',
      regions: { codeBlock: CodeRegion },
      highlighter,
    })
    await flushPromises()
    expect(wrapper.find('[data-custom-code]').text()).toBe('ts:const x = 1')
    expect(highlight).not.toHaveBeenCalled()
  })

  it('passes the complete code configuration to a code region', () => {
    const highlighter: MarkdownHighlighter = {
      id: 'region-highlighter',
      highlight(code, language) {
        return { language, nodes: [{ kind: 'text', key: 'x', value: code }] }
      },
    }
    const CodeRegion = defineComponent({
      props: {
        highlighter: Object,
        showActions: Boolean,
        showDownload: Boolean,
        actions: Array,
        highlighted: Object,
      },
      setup(props) {
        return () =>
          h(
            'section',
            { 'data-custom-code': '' },
            [
              (props.highlighter as MarkdownHighlighter | undefined)?.id ?? '',
              String(props.showActions),
              String(props.showDownload),
              String(props.actions?.length ?? -1),
              String(Boolean(props.highlighted)),
            ].join(':'),
          )
      },
    })
    const wrapper = renderer({
      source: '```ts\nconst x = 1\n```',
      regions: { codeBlock: CodeRegion },
      highlighter,
    })
    expect(wrapper.find('[data-custom-code]').text()).toBe(
      'region-highlighter:true:false:0:true',
    )
  })

  it('resolves node components by tag and kind with documented precedence', () => {
    const CustomLink = defineComponent({
      props: { href: String, node: Object },
      setup(props, { slots }) {
        return () =>
          h('a', { href: props.href, 'data-custom-link': '' }, slots.default?.())
      },
    })

    const byKind = renderer({
      source: '[x](https://example.com)',
      nodeComponents: { link: CustomLink },
    })
    expect(byKind.find('[data-custom-link]').exists()).toBe(true)

    const tagWins = renderer({
      source: '[x](https://example.com)',
      components: { a: 'strong' },
      nodeComponents: { link: CustomLink },
    })
    expect(tagWins.find('strong').exists()).toBe(true)
    expect(tagWins.find('[data-custom-link]').exists()).toBe(false)

    const nodeTagWins = renderer({
      source: '[x](https://example.com)',
      components: { a: 'strong' },
      nodeComponents: { a: CustomLink },
    })
    expect(nodeTagWins.find('[data-custom-link]').exists()).toBe(true)
    expect(nodeTagWins.find('strong').exists()).toBe(false)
  })

  it('supports function renderers with defaultRender and keeps heading IDs', () => {
    const wrapper = renderer({
      source: '# Title\n\n[t](https://example.com)',
      toc: true,
      nodeComponents: {
        a: (ctx: {
          node: { attrs: Record<string, string> }
          defaultRender: () => unknown
        }) =>
          h(
            'a',
            { ...ctx.node.attrs, 'data-decorated': 'link' },
            ctx.defaultRender() as never,
          ),
        heading: (ctx: { defaultRender: () => unknown }) =>
          h('div', { 'data-decorated': 'heading' }, ctx.defaultRender() as never),
      },
    })
    const link = wrapper.find('a[data-decorated="link"]')
    expect(link.attributes('href')).toBe('https://example.com')
    expect(wrapper.find('[data-decorated="heading"] h1').attributes('id')).toBe(
      'title',
    )
    expect(wrapper.find('nav.vmd-toc').text()).toContain('Title')
  })

  it('applies inline and fenced code overrides independently', () => {
    const wrapper = renderer({
      source: '`inline`\n\n```js\nfenced\n```',
      nodeComponents: {
        inlineCode: 'kbd',
        code: defineComponent({
          props: { code: String, language: String },
          setup(props) {
            return () =>
              h('code', { 'data-custom-code': props.language }, props.code)
          },
        }),
      },
    })
    expect(wrapper.find('kbd').text()).toBe('inline')
    expect(wrapper.find('pre.vmd-code').exists()).toBe(true)
    expect(wrapper.find('[data-custom-code="js"]').text()).toBe('fenced')
  })

  it('invokes a function nodeComponents.code renderer for fenced code', () => {
    const calls: string[] = []
    const wrapper = renderer({
      source: '```js\nfenced\n```',
      nodeComponents: {
        code: (ctx: {
          node: { code: string; language: string }
          defaultRender: () => unknown
        }) => {
          calls.push(ctx.node.code)
          return h(
            'code',
            { 'data-function-code': ctx.node.language },
            ctx.defaultRender() as never,
          )
        },
      },
    })
    expect(calls.map((value) => value.trim())).toEqual(['fenced'])
    expect(wrapper.find('[data-function-code="js"]').text()).toBe('fenced')
  })
})

describe('presets', () => {
  const brand = defineMarkdownPreset({
    name: 'brand',
    components: { h1: 'h2' },
    labels: { toc: 'Brand contents' },
    theme: 'dark',
    tokens: { '--vmd-color-accent': 'rgb(9, 9, 9)' },
  })

  it('applies a preset without affecting other renderers', () => {
    const branded = renderer({ source: '# Title', toc: true, preset: brand })
    expect(branded.find('h2').exists()).toBe(true)
    expect(branded.find('nav.vmd-toc').attributes('aria-label')).toBe(
      'Brand contents',
    )
    expect(branded.find('.vmd-root').attributes('data-vmd-theme')).toBe('dark')

    const plain = renderer({ source: '# Title', toc: true })
    expect(plain.find('h1').exists()).toBe(true)
    expect(plain.find('nav.vmd-toc').attributes('aria-label')).toBe(
      'Table of contents',
    )
  })

  it('composes presets deterministically and exposes the composed name', () => {
    const first = defineMarkdownPreset({
      name: 'first',
      components: { h1: 'h2' },
      labels: { toc: 'First' },
    })
    const second = defineMarkdownPreset({
      name: 'second',
      components: { h2: 'h3' },
      labels: { toc: 'Second' },
    })
    const composed = composePresets(first, second)
    expect(composed.name).toBe('first+second')
    expect(composed.labels?.toc).toBe('Second')
    expect(composed.components).toMatchObject({ h1: 'h2', h2: 'h3' })

    const wrapper = renderer({ source: '## Title', preset: composed })
    expect(wrapper.find('h3').exists()).toBe(true)
  })

  it('applies provider presets and lets local props win', () => {
    const wrapper = mount(MarkdownConfigProvider, {
      props: { preset: brand },
      slots: {
        default: () =>
          h(MarkdownRenderer, {
            source: '# Title',
            toc: true,
            labels: { toc: 'Local contents' },
          }),
      },
    })
    expect(wrapper.find('h2').exists()).toBe(true)
    expect(wrapper.find('nav.vmd-toc').attributes('aria-label')).toBe(
      'Local contents',
    )
  })
})

describe('behavior injection', () => {
  it('uses a custom slugger and keeps duplicate IDs unique', () => {
    const wrapper = renderer({
      source: '# A\n\n# A',
      slugger: { slug: (text: string) => `custom-${text}` },
    })
    expect(wrapper.findAll('h1').map((heading) => heading.attributes('id'))).toEqual([
      'custom-A',
      'custom-A-1',
    ])
  })

  it('wraps duplicate headings through withUniqueSlugs', () => {
    const slugger = withUniqueSlugs({ slug: () => 'same' })
    expect([slugger.slug('a'), slugger.slug('b')]).toEqual(['same', 'same-1'])
    slugger.reset?.()
    expect(slugger.slug('c')).toBe('same')
  })

  it('reports invalid adapters and falls back safely', async () => {
    const wrapper = renderer({
      source: '# Title\n\n[x](javascript:alert(1))',
      highlighter: {} as never,
      mathEngine: {} as never,
      mermaidRenderer: {} as never,
      diagnosticsFormatter: {} as never,
      slugger: {} as never,
      urlTransform: 42 as never,
    })
    await nextTick()

    const codes = (wrapper.emitted('render-error') ?? []).map(
      (event) => (event[0] as { code: string }).code,
    )
    expect(codes).toEqual(
      expect.arrayContaining([
        'highlighter-invalid',
        'math-engine-invalid',
        'mermaid-renderer-invalid',
        'diagnostic-formatter-invalid',
        'slugger-invalid',
        'url-transform-invalid',
      ]),
    )
    expect(wrapper.find('h1').attributes('id')).toBe('title')
    expect(wrapper.find('a[data-vmd-part="link"]').attributes('href')).toBeUndefined()
  })

  it('applies a custom urlTransform from the provider', () => {
    const wrapper = mount(MarkdownConfigProvider, {
      props: {
        urlTransform: (url: string) => `${url}?provider=1`,
      },
      slots: {
        default: () =>
          h(MarkdownRenderer, { source: '[x](https://example.com)' }),
      },
    })
    expect(wrapper.find('a').attributes('href')).toBe(
      'https://example.com?provider=1',
    )
  })
})

describe('named region slots', () => {
  it('replaces the root and content regions', () => {
    const root = renderer(
      { source: '# Title' },
      {
        root: (ctx: { theme: string }) =>
          h('section', { 'data-custom-root': ctx.theme }, 'custom root'),
      },
    )
    expect(root.find('[data-custom-root="light"]').exists()).toBe(true)
    expect(root.find('.vmd-root').exists()).toBe(false)

    const content = renderer(
      { source: '# Title' },
      {
        content: (ctx: { nodes: unknown[] }) =>
          h('article', { 'data-custom-content': '' }, `nodes:${ctx.nodes.length}`),
      },
    )
    expect(content.find('[data-custom-content]').text()).toBe('nodes:1')
    expect(content.find('h1').exists()).toBe(false)
  })

  it('replaces TOC, TOC item, empty, loading, and error regions', async () => {
    const toc = renderer(
      { source: '# One\n\n## Two', toc: true },
      {
        toc: (ctx: { items: unknown[]; label: string }) =>
          h('aside', { 'data-custom-toc': '' }, `${ctx.items.length}:${ctx.label}`),
      },
    )
    expect(toc.find('nav.vmd-toc').exists()).toBe(false)
    expect(toc.find('[data-custom-toc]').text()).toBe('2:Table of contents')

    const tocItems = renderer(
      { source: '# One\n\n## Two', toc: true },
      {
        'toc-item': (ctx: { item: { text: string }; active: boolean }) =>
          h(
            'button',
            {
              'data-custom-toc-item': '',
              'data-active': String(ctx.active),
            },
            ctx.item.text,
          ),
      },
    )
    expect(tocItems.findAll('[data-custom-toc-item]')).toHaveLength(2)
    expect(tocItems.find('nav.vmd-toc').exists()).toBe(true)

    const empty = renderer(
      { source: '' },
      { empty: (ctx: { label: string }) => h('div', { 'data-custom-empty': '' }, ctx.label) },
    )
    expect(empty.find('[data-custom-empty]').text()).toBe('No content')

    const pending = renderer(
      { source: 'x', pipeline: { name: 'pending-slot', process: () => new Promise(() => {}) } },
      { loading: (ctx: { label: string }) => h('div', { 'data-custom-loading': '' }, ctx.label) },
    )
    await nextTick()
    expect(pending.find('[data-custom-loading]').text()).toBe('Loading…')

    const pipeline: MarkdownPipeline = {
      name: 'fails-slot',
      process: async () => {
        throw new Error('boom')
      },
      processSync() {
        throw new Error('boom')
      },
    }
    const error = renderer(
      { source: 'x', pipeline, showError: true },
      {
        error: (ctx: { diagnostics: unknown[]; retry: () => void }) =>
          h(
            'div',
            { 'data-custom-error': '' },
            `${ctx.diagnostics.length}:${typeof ctx.retry}`,
          ),
      },
    )
    await nextTick()
    expect(error.find('[data-custom-error]').text()).toContain('1:function')
  })
})

describe('host slot helper', () => {
  const Probe = defineComponent({
    setup() {
      const context = useRenderContext()
      return () =>
        h(
          'div',
          { 'data-probe': '' },
          [
            context.renderHostSlot('code', { source: 'const x = 1', language: 'ts' }, () =>
              h('span', { 'data-fallback': '' }, 'default'),
            ),
          ],
        )
    },
  })

  it('renders a host slot with scoped data and falls back when absent or empty', () => {
    const withSlot = renderer(
      { source: 'x', components: { p: Probe } },
      {
        code: (ctx: { source: string; language: string }) =>
          h('button', { 'data-custom-code': '' }, `${ctx.language}:${ctx.source}`),
      },
    )
    expect(withSlot.find('[data-custom-code]').text()).toBe('ts:const x = 1')

    const withoutSlot = renderer({ source: 'x', components: { p: Probe } })
    expect(withoutSlot.find('[data-fallback]').text()).toBe('default')

    const emptySlot = renderer(
      { source: 'x', components: { p: Probe } },
      { code: () => [] },
    )
    expect(emptySlot.find('[data-fallback]').text()).toBe('default')
  })
})

describe('accessibility without stylesheets', () => {
  it('keeps parts and accessible semantics without importing CSS', () => {
    const wrapper = renderer({ source: '# Title', toc: true })
    expect(wrapper.find('[data-vmd-part="root"]').exists()).toBe(true)
    expect(wrapper.find('[data-vmd-part="heading"]').exists()).toBe(true)
    expect(wrapper.find('nav.vmd-toc').attributes('aria-label')).toBe(
      'Table of contents',
    )
    expect(
      wrapper.find('[data-vmd-part="heading-anchor"]').attributes('aria-label'),
    ).toBe('Link to this heading')
  })

  it('keeps CJK text and heading IDs stable without a locale', () => {
    const wrapper = renderer({
      source: '# 中文标题\n\n日本語のテキスト\n\n# 中文标题',
    })
    const headings = wrapper.findAll('h1')
    expect(headings[0]?.text()).toContain('中文标题')
    expect(headings[0]?.attributes('id')).toBe('中文标题')
    expect(headings[1]?.attributes('id')).toBe('中文标题-1')
    expect(wrapper.text()).toContain('日本語のテキスト')
  })
})
