import { describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { defineComponent, h, nextTick, ref } from 'vue'
import MarkdownRenderer from '../../src/components/MarkdownRenderer.vue'
import MarkdownHtml from '../../src/components/MarkdownHtml.vue'
import MarkdownParagraph from '../../src/components/MarkdownParagraph.vue'
import { resolveKindComponent, resolveTagComponent, renderNode } from '../../src/components/render'
import type { RenderContext } from '../../src/components/context'
import { DEFAULT_LABELS } from '../../src/core/labels'
import { defineMarkdownPlugin } from '../../src/plugins/define'
import { useActiveHeading } from '../../src/composables/useActiveHeading'
import type {
  MarkdownPipeline,
  PipelineContext,
  PipelineResult,
} from '../../src/core/types'

function context(overrides: Partial<RenderContext> = {}): RenderContext {
  return {
    components: {},
    labels: DEFAULT_LABELS,
    linkTarget: '_self',
    externalLinkTarget: '_self',
    renderHostSlot: (_name, _props, fallback) => fallback(),
    onLinkClick: vi.fn(),
    onCustomTagClick: vi.fn(),
    onTaskChange: vi.fn(),
    ...overrides,
  }
}

function resultWithParagraph(text: string): PipelineResult {
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

describe('node resolution precedence', () => {
  it('prefers nodeComponents over components and built-ins', () => {
    const ctx = context({
      components: { a: 'em' },
      nodeComponents: { a: 'strong' },
    })
    expect(resolveTagComponent('a', ctx)).toBe('strong')
    expect(resolveTagComponent('p', context())).toBe(MarkdownParagraph)
    expect(resolveKindComponent('code', context())).toBeUndefined()
  })

  it('lets a plugin node component beat a local tag component for code', () => {
    const Code = defineComponent({
      props: { code: String, language: String },
      setup(props) {
        return () => h('figure', { 'data-code': props.language }, props.code)
      },
    })
    const plugin = defineMarkdownPlugin({
      name: 'code-component',
      nodeComponents: { code: Code },
    })

    const wrapper = mount(MarkdownRenderer, {
      props: {
        source: '```js\nconst value = 1\n```',
        plugins: [plugin],
        components: { pre: 'section' },
      },
    })
    expect(wrapper.find('section figure[data-code="js"]').text()).toBe('const value = 1')
    expect(wrapper.find('pre').exists()).toBe(false)
  })

  it('renders a plugin tocItem region component', () => {
    const Item = defineComponent({
      props: { item: Object, active: Boolean },
      setup(props) {
        const value = props.item as { id: string; text: string }
        return () => h('span', { 'data-toc-item': value.id }, value.text)
      },
    })
    const plugin = defineMarkdownPlugin({
      name: 'toc-region',
      regions: { tocItem: Item },
    })

    const wrapper = mount(MarkdownRenderer, {
      props: {
        source: '# One\n\n## Two',
        toc: true,
        plugins: [plugin],
      },
    })

    expect(wrapper.find('[data-toc-item="one"]').text()).toBe('One')
    expect(wrapper.find('[data-toc-item="two"]').text()).toBe('Two')
  })

  it('lets a local components.code override a plugin nodeComponents.code', () => {
    const PluginCode = defineComponent({
      setup() {
        return () => h('figure', { 'data-plugin-code': '' })
      },
    })
    const LocalCode = defineComponent({
      setup(_, { slots }) {
        return () => h('mark', { 'data-local-code': '' }, slots.default?.())
      },
    })
    const plugin = defineMarkdownPlugin({
      name: 'plugin-code',
      nodeComponents: { code: PluginCode },
    })

    const wrapper = mount(MarkdownRenderer, {
      props: {
        source: '```js\nconst value = 1\n```',
        plugins: [plugin],
        components: { code: LocalCode },
      },
    })

    expect(wrapper.find('[data-local-code]').text()).toBe('const value = 1')
    expect(wrapper.find('[data-plugin-code]').exists()).toBe(false)
  })

  it('renders text nodes as strings, not components', () => {
    const output = renderNode({ kind: 'text', key: '0', value: 'plain' }, context())
    expect(output).toBe('plain')
  })
})

describe('MarkdownHtml', () => {
  it('renders literal text instead of HTML', () => {
    const wrapper = mount(MarkdownHtml, { props: { value: '<b>not markup</b>' } })
    expect(wrapper.find('b').exists()).toBe(false)
    expect(wrapper.text()).toBe('<b>not markup</b>')
  })
})

describe('exposed actions', () => {
  it('returns the document and TOC, and refresh re-runs the pipeline', async () => {
    const official: MarkdownPipeline = {
      name: 'counting',
      process: async (_source: string, ctx: PipelineContext) =>
        resultWithParagraph(ctx.source),
      processSync: (source: string) => resultWithParagraph(source),
    }
    let calls = 0
    const pipeline: MarkdownPipeline = {
      name: 'counting-wrapper',
      process(source, ctx) {
        calls += 1
        return official.process(source, ctx)
      },
      processSync(source, ctx) {
        calls += 1
        return official.processSync!(source, ctx)
      },
    }

    const wrapper = mount(MarkdownRenderer, {
      props: { source: 'hello', pipeline, toc: true },
    })
    await nextTick()
    const vm = wrapper.vm as unknown as {
      getDocument: () => { nodes: unknown[] } | undefined
      getToc: () => unknown[]
      refresh: () => Promise<void>
    }
    expect(vm.getDocument()?.nodes).toHaveLength(1)
    expect(vm.getToc()).toEqual([])

    const before = calls
    await vm.refresh()
    expect(calls).toBeGreaterThan(before)
  })

  it('updates the URL hash when syncHash is enabled', async () => {
    const wrapper = mount(MarkdownRenderer, {
      props: { source: '# One', syncHash: true },
      attachTo: document.body,
    })
    await nextTick()
    const target = document.getElementById('one')!
    const scroll = vi.fn()
    target.scrollIntoView = scroll

    const vm = wrapper.vm as unknown as {
      scrollToHeading: (id: string) => void
    }
    vm.scrollToHeading('one')
    expect(scroll).toHaveBeenCalledTimes(1)
    expect(window.location.hash).toBe('#one')
    wrapper.unmount()
  })
})

describe('active heading tracking', () => {
  it('updates from an observer and disconnects on unmount', async () => {
    const instances: Array<{
      callback: IntersectionObserverCallback
      observe: ReturnType<typeof vi.fn>
      disconnect: ReturnType<typeof vi.fn>
    }> = []

    class MockObserver {
      callback: IntersectionObserverCallback
      observe = vi.fn()
      disconnect = vi.fn()
      constructor(callback: IntersectionObserverCallback) {
        this.callback = callback
        instances.push(this)
      }
    }

    const original = globalThis.IntersectionObserver
    globalThis.IntersectionObserver = MockObserver as never
    document.body.innerHTML = '<h1 id="one"></h1><h2 id="two"></h2>'

    const ids = ref(['one', 'two'])
    const Host = defineComponent({
      setup() {
        const activeId = useActiveHeading(ids)
        return () => h('div', { 'data-active': activeId.value ?? '' })
      },
    })

    const wrapper = mount(Host)
    await nextTick()
    expect(instances).toHaveLength(1)
    expect(instances[0]?.observe).toHaveBeenCalledTimes(2)

    instances[0]!.callback(
      [
        {
          isIntersecting: true,
          target: document.getElementById('two')!,
          boundingClientRect: { top: 10 },
        },
      ] as never,
      instances[0] as never,
    )
    await nextTick()
    expect(wrapper.attributes('data-active')).toBe('two')

    wrapper.unmount()
    expect(instances[0]?.disconnect).toHaveBeenCalled()

    globalThis.IntersectionObserver = original
    document.body.innerHTML = ''
  })

  it('scopes heading lookups to an optional root', async () => {
    const observed: Element[] = []
    class MockObserver {
      observe = vi.fn((element: Element) => observed.push(element))
      disconnect = vi.fn()
      constructor(_callback: IntersectionObserverCallback) {}
    }
    const original = globalThis.IntersectionObserver
    globalThis.IntersectionObserver = MockObserver as never
    document.body.innerHTML =
      '<div id="first"><h1 id="same">First</h1></div><div id="second"><h1 id="same">Second</h1></div>'
    const root = document.getElementById('second')!

    mount(
      defineComponent({
        setup() {
          useActiveHeading(['same'], true, { root })
          return () => h('div')
        },
      }),
    )
    await nextTick()
    expect(observed).toHaveLength(1)
    expect(observed[0]).toBe(root.querySelector('h1'))
    expect(observed[0]).not.toBe(document.getElementById('same'))

    globalThis.IntersectionObserver = original
    document.body.innerHTML = ''
  })
})

describe('plugin lifecycle and isolation', () => {
  it('runs setup once per plugin set and cleans up on reconfiguration and unmount', async () => {
    const events: string[] = []
    const pluginA = defineMarkdownPlugin({
      name: 'a',
      setup() {
        events.push('setup:a')
        return () => events.push('cleanup:a')
      },
    })
    const pluginB = defineMarkdownPlugin({
      name: 'b',
      setup() {
        events.push('setup:b')
        return () => events.push('cleanup:b')
      },
    })

    const wrapper = mount(MarkdownRenderer, {
      props: { source: 'hello', plugins: [pluginA] },
    })
    await nextTick()
    expect(events).toEqual(['setup:a'])

    await wrapper.setProps({ plugins: [pluginB] })
    await nextTick()
    expect(events).toEqual(['setup:a', 'cleanup:a', 'setup:b'])

    wrapper.unmount()
    expect(events).toEqual(['setup:a', 'cleanup:a', 'setup:b', 'cleanup:b'])
  })

  it('isolates a failing remark plugin and keeps rendering', async () => {
    const failing = defineMarkdownPlugin({
      name: 'failing-remark',
      remarkPlugins: [
        () => () => {
          throw new Error('remark exploded')
        },
      ],
    })

    const wrapper = mount(MarkdownRenderer, {
      props: { source: 'Still **here**', plugins: [failing] },
    })
    await nextTick()

    expect(wrapper.text()).toContain('Still')
    expect(wrapper.find('strong').text()).toBe('here')
    const errors = wrapper.emitted('render-error') ?? []
    expect(
      errors.some((event) => (event[0] as { code: string }).code === 'plugin-run'),
    ).toBe(true)
  })
})

describe('url transform fallbacks', () => {
  it('falls back to the default transform when a custom transform throws', async () => {
    const wrapper = mount(MarkdownRenderer, {
      props: {
        source: '[link](https://example.com)',
        urlTransform: () => {
          throw new Error('transform exploded')
        },
      },
    })
    await nextTick()
    expect(wrapper.find('a').attributes('href')).toBe('https://example.com')
    const errors = wrapper.emitted('render-error') ?? []
    expect(
      errors.some((event) => (event[0] as { code: string }).code === 'url-transform'),
    ).toBe(true)
  })

  it('falls back to the default transform when a custom transform returns a non-string', () => {
    const wrapper = mount(MarkdownRenderer, {
      props: {
        source: '[link](https://example.com)',
        urlTransform: () => 42 as never,
      },
    })
    expect(wrapper.find('a').attributes('href')).toBe('https://example.com')
  })
})

describe('async pipeline ordering', () => {
  it('ignores a stale result that resolves after a newer run', async () => {
    let call = 0
    const pipeline: MarkdownPipeline = {
      name: 'out-of-order',
      async process(source: string) {
        call += 1
        const current = call
        await new Promise((resolve) => setTimeout(resolve, current === 1 ? 40 : 0))
        return resultWithParagraph(source)
      },
    }

    const wrapper = mount(MarkdownRenderer, {
      props: { source: 'First', pipeline },
    })
    await wrapper.setProps({ source: 'Second' })
    await new Promise((resolve) => setTimeout(resolve, 60))
    await flushPromises()

    expect(wrapper.text()).toContain('Second')
    expect(wrapper.text()).not.toContain('First')
  })
})
