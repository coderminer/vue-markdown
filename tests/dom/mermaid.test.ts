import { afterEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { h } from 'vue'
import MermaidBlock from '../../src/components/MermaidBlock.vue'
import MarkdownMermaid from '../../src/components/MarkdownMermaid.vue'
import type { MermaidRenderer, MermaidRenderOptions, MermaidRenderResult } from '../../src/core/types'

const safeSvg = '<svg viewBox="0 0 10 10"><text>Hello diagram</text></svg>'

function renderer(overrides: Partial<MermaidRenderer> = {}): MermaidRenderer {
  return {
    id: 'test-mermaid',
    render: () => ({ svg: safeSvg, nodes: [] }),
    ...overrides,
  }
}

function mountBlock(
  props: Record<string, unknown> = {},
  slots: Record<string, unknown> = {},
) {
  return mount(MermaidBlock, {
    props: {
      source: 'graph TD; A-->B',
      renderer: renderer(),
      ...props,
    },
    slots: slots as never,
  })
}

describe('MermaidBlock', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('hides a first-render error unless error display is enabled', async () => {
    const hidden = mountBlock({
      source: 'graph TD; broken',
      renderer: renderer({ render: () => ({ nodes: [], error: 'bad syntax' }) }),
    })
    await flushPromises()
    await vi.waitFor(() => {
      expect(hidden.attributes('data-status')).toBe('error')
    })
    expect(hidden.find('[data-vmd-part="mermaid-error"]').exists()).toBe(false)
    expect(hidden.find('[data-vmd-part="mermaid-fallback"]').exists()).toBe(true)
    expect(hidden.text()).toContain('Diagram could not be rendered.')
    expect(hidden.text()).not.toContain('bad syntax')

    const shown = mountBlock({
      source: 'graph TD; broken',
      showErrors: true,
      renderer: renderer({ render: () => ({ nodes: [], error: 'bad syntax' }) }),
    })
    await flushPromises()
    await vi.waitFor(() => {
      expect(shown.attributes('data-status')).toBe('error')
    })
    expect(shown.find('[data-vmd-part="mermaid-error"]').text()).toContain(
      'bad syntax',
    )
  })

  it('forwards a render identifier to injected renderers', async () => {
    const ids: Array<string | undefined> = []
    const wrapper = mountBlock({
      renderer: renderer({
        render: (_source: string, options: MermaidRenderOptions) => {
          ids.push(options.id)
          return { svg: safeSvg, nodes: [] }
        },
      }),
    })
    await flushPromises()
    await vi.waitFor(() => {
      expect(wrapper.attributes('data-status')).toBe('ready')
    })
    expect(ids).toHaveLength(1)
    expect(ids[0]).toMatch(/^vmd-mermaid-\d+$/)
  })

  it('uses a local theme override and exposes it on the root', async () => {
    const themes: Array<string | undefined> = []
    const wrapper = mountBlock({
      theme: 'dark',
      renderer: renderer({
        render: (_source: string, options: MermaidRenderOptions) => {
          themes.push(options.theme)
          return { svg: safeSvg, nodes: [] }
        },
      }),
    })
    await flushPromises()
    await vi.waitFor(() => {
      expect(wrapper.attributes('data-status')).toBe('ready')
    })
    expect(themes).toEqual(['dark'])
    expect(wrapper.attributes('data-vmd-theme')).toBe('dark')
  })

  it('renders sanitized SVG nodes and exposes the renderer identity', async () => {
    const wrapper = mountBlock({
      renderer: renderer({
        render: () => ({
          svg: '<svg><script>alert(1)</script><text>Safe</text></svg>',
          nodes: [],
        }),
      }),
    })
    await flushPromises()
    await vi.waitFor(() => {
      expect(wrapper.attributes('data-status')).toBe('ready')
    })
    expect(wrapper.attributes('data-renderer')).toBe('test-mermaid')
    expect(wrapper.text()).toContain('Safe')
    expect(wrapper.html()).not.toContain('script')
  })

  it('renders Mermaid theme styles and case-sensitive SVG elements', async () => {
    const wrapper = mountBlock({
      renderer: renderer({
        render: () => ({
          svg: '<svg id="d" viewBox="0 0 10 10"><style>#d .node rect{fill:#f9f}</style><defs><linearGradient id="g"><stop stop-color="#fff"/></linearGradient></defs><g class="node"><rect stroke-width="2" fill-opacity=".5"/></g></svg>',
          nodes: [],
        }),
      }),
    })
    await vi.waitFor(() => {
      expect(wrapper.attributes('data-status')).toBe('ready')
    })
    const html = wrapper.html()
    expect(html).toContain('<style>')
    expect(html).toContain('#d .node rect')
    expect(html).toContain('linearGradient')
    expect(html).toContain('stroke-width="2"')
    expect(html).toContain('fill-opacity="0.5"')
  })

  it('keeps the last good diagram after a failure', async () => {
    const wrapper = mountBlock()
    await vi.waitFor(() => {
      expect(wrapper.text()).toContain('Hello diagram')
    })
    await wrapper.setProps({
      source: 'graph TD; broken',
      renderer: renderer({ render: () => ({ nodes: [], error: 'bad syntax' }) }),
      showErrors: true,
    })
    await flushPromises()
    await vi.waitFor(() => {
      expect(wrapper.attributes('data-status')).toBe('error')
    })
    expect(wrapper.text()).toContain('Hello diagram')
    expect(wrapper.text()).toContain('bad syntax')
  })

  it('sanitizes nodes returned by an injected renderer', async () => {
    const wrapper = mountBlock({
      renderer: renderer({
        render: (): MermaidRenderResult => ({
          nodes: [
            {
              kind: 'element',
              key: 'script',
              tag: 'script',
              attrs: {},
              children: [{ kind: 'text', key: 't', value: 'alert(1)' }],
            },
            {
              kind: 'element',
              key: 'svg',
              tag: 'svg',
              attrs: { viewBox: '0 0 10 10' },
              children: [
                {
                  kind: 'element',
                  key: 'label',
                  tag: 'text',
                  attrs: { onclick: 'alert(2)', fill: '#000' },
                  children: [{ kind: 'text', key: 'x', value: 'Safe label' }],
                },
              ],
            },
          ],
        }),
      }),
    })
    await vi.waitFor(() => {
      expect(wrapper.attributes('data-status')).toBe('ready')
    })
    expect(wrapper.text()).toContain('Safe label')
    expect(wrapper.html()).not.toContain('script')
    expect(wrapper.html()).not.toContain('onclick')
  })

  it('reports invalid renderer output and keeps the last good preview', async () => {
    const wrapper = mountBlock()
    await vi.waitFor(() => {
      expect(wrapper.text()).toContain('Hello diagram')
    })
    await wrapper.setProps({
      source: 'graph TD; blank',
      renderer: renderer({ render: () => ({ nodes: [] }) }),
      showErrors: true,
    })
    await vi.waitFor(() => {
      expect(wrapper.attributes('data-status')).toBe('error')
    })
    expect(wrapper.text()).toContain('Hello diagram')
    expect(wrapper.text()).toContain('Renderer returned no usable diagram output.')
    expect(wrapper.emitted('error')).toBeTruthy()
  })

  it('discards stale renderer results', async () => {
    let resolveFirst: (value: MermaidRenderResult) => void = () => undefined
    let resolveSecond: (value: MermaidRenderResult) => void = () => undefined
    const first = new Promise<MermaidRenderResult>((resolve) => {
      resolveFirst = resolve
    })
    const second = new Promise<MermaidRenderResult>((resolve) => {
      resolveSecond = resolve
    })
    const wrapper = mountBlock({
      source: 'first',
      renderer: renderer({ render: () => first }),
    })
    await flushPromises()
    await wrapper.setProps({
      source: 'second',
      renderer: renderer({ render: () => second }),
    })
    await flushPromises()

    resolveSecond({
      nodes: [
        {
          kind: 'element',
          key: 'svg',
          tag: 'svg',
          attrs: {},
          children: [{ kind: 'text', key: 't', value: 'Fresh' }],
        },
      ],
    })
    await flushPromises()
    expect(wrapper.text()).toContain('Fresh')

    resolveFirst({
      nodes: [
        {
          kind: 'element',
          key: 'svg',
          tag: 'svg',
          attrs: {},
          children: [{ kind: 'text', key: 't', value: 'Stale' }],
        },
      ],
    })
    await flushPromises()
    expect(wrapper.text()).toContain('Fresh')
    expect(wrapper.text()).not.toContain('Stale')
  })


  it('switches to source, copies, zooms, and toggles fullscreen', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    })
    const wrapper = mountBlock({ enableZoom: true })
    await flushPromises()

    expect(
      wrapper.find('[data-vmd-part="mermaid-tabs"] svg.vmd-icon').exists(),
    ).toBe(true)
    expect(
      wrapper
        .find('[data-vmd-part="mermaid-actions"] button[data-icon="true"] svg.vmd-icon')
        .exists(),
    ).toBe(true)

    const buttons = wrapper.findAll('button')
    const byText = (text: string) => buttons.find((button) => button.text() === text)!
    await byText('Source').trigger('click')
    expect(wrapper.find('[data-vmd-part="mermaid-source"]').text()).toContain(
      'graph TD; A-->B',
    )
    await byText('Preview').trigger('click')

    await wrapper.find('[data-action="copy"]').trigger('click')
    await flushPromises()
    expect(writeText).toHaveBeenCalledWith('graph TD; A-->B')

    await wrapper.find('[data-action="zoom-in"]').trigger('click')
    expect(wrapper.find('.vmd-mermaid-diagram').attributes('style')).toContain(
      'scale(1.25)',
    )

    await wrapper.find('[data-action="fullscreen"]').trigger('click')
    expect(wrapper.attributes('data-fullscreen')).toBe('true')
  })

  it('replaces the header and exposes the default actions', async () => {
    const wrapper = mountBlock(
      {},
      {
        header: (ctx: {
          label: string
          view: string
          actions: { copy: unknown }
        }) =>
          h(
            'div',
            { 'data-custom-header': '' },
            `${ctx.label}:${ctx.view}:${typeof ctx.actions.copy}`,
          ),
      },
    )
    await flushPromises()
    expect(wrapper.find('[data-custom-header]').text()).toBe(
      'Diagram:preview:function',
    )
    expect(wrapper.find('[data-vmd-part="mermaid-tabs"]').exists()).toBe(false)
  })

  it('replaces tabs and actions independently', async () => {
    const tabs = mountBlock(
      {},
      {
        tabs: (ctx: {
          view: string
          actions: { source(): void }
        }) =>
          h(
            'button',
            {
              'data-custom-tabs': '',
              onClick: ctx.actions.source,
            },
            ctx.view,
          ),
      },
    )
    await flushPromises()
    expect(tabs.find('[data-custom-tabs]').text()).toBe('preview')
    expect(tabs.find('[data-vmd-part="mermaid-actions"]').exists()).toBe(true)
    await tabs.find('[data-custom-tabs]').trigger('click')
    expect(tabs.find('[data-custom-tabs]').text()).toBe('source')

    const actions = mountBlock(
      {},
      {
        actions: (ctx: { source: string }) =>
          h('button', { 'data-custom-actions': '' }, ctx.source),
      },
    )
    await flushPromises()
    expect(actions.find('[data-action="copy"]').exists()).toBe(false)
    expect(actions.find('[data-custom-actions]').text()).toBe('graph TD; A-->B')
  })

  it('runs custom actions and emits action errors', async () => {
    const run = vi.fn()
    const wrapper = mountBlock({
      actions: [
        { key: 'log', label: 'Log', run },
        {
          key: 'boom',
          label: 'Boom',
          run() {
            throw new Error('nope')
          },
        },
      ],
    })
    await flushPromises()
    await wrapper.find('[data-action="log"]').trigger('click')
    expect(run).toHaveBeenCalledWith(
      expect.objectContaining({ source: 'graph TD; A-->B' }),
    )
    expect(wrapper.emitted('action')?.[0]).toEqual(['log'])

    await wrapper.find('[data-action="boom"]').trigger('click')
    await flushPromises()
    expect(wrapper.emitted('error')?.[0]?.[0]).toContain('nope')
  })

  it('reports clipboard failures through the error event', async () => {
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: vi.fn().mockRejectedValue(new Error('denied')),
      },
    })
    const wrapper = mountBlock()
    await flushPromises()
    await wrapper.find('[data-action="copy"]').trigger('click')
    await flushPromises()
    expect(wrapper.emitted('error')?.[0]?.[0]).toContain('denied')
  })

  it('forwards header slots and actions through MarkdownMermaid', async () => {
    const wrapper = mount(MarkdownMermaid, {
      props: {
        code: 'graph TD; A-->B',
        renderer: renderer(),
        actions: [{ key: 'log', label: 'Log', run: vi.fn() }],
      },
      slots: {
        header: (ctx: { label: string }) =>
          h('div', { 'data-mm-header': '' }, ctx.label),
      },
    })
    await flushPromises()
    expect(wrapper.find('[data-mm-header]').text()).toBe('Diagram')

    const actions = mount(MarkdownMermaid, {
      props: {
        code: 'graph TD; A-->B',
        renderer: renderer(),
        actions: [{ key: 'log', label: 'Log', run: vi.fn() }],
      },
    })
    await flushPromises()
    expect(actions.find('[data-action="log"]').exists()).toBe(true)
  })

  it('forwards display props through MarkdownMermaid', async () => {
    const wrapper = mount(MarkdownMermaid, {
      props: {
        code: 'graph TD; broken',
        showErrors: true,
        theme: 'dark',
        renderer: renderer({ render: () => ({ nodes: [], error: 'bad syntax' }) }),
      },
    })
    await vi.waitFor(() => {
      expect(wrapper.attributes('data-status')).toBe('error')
    })
    expect(wrapper.attributes('data-vmd-theme')).toBe('dark')
    expect(wrapper.find('[data-vmd-part="mermaid-error"]').text()).toContain(
      'bad syntax',
    )
  })

  it('uses the mermaid and mermaid-error slots', async () => {
    const slotWrapper = mount(MermaidBlock, {
      props: { source: 'graph TD', renderer: renderer() },
      slots: {
        mermaid: (ctx: { source: string; status: string }) =>
          h('div', { 'data-custom-mermaid': '' }, `${ctx.status}:${ctx.source}`),
      },
    })
    await flushPromises()
    expect(slotWrapper.find('[data-custom-mermaid]').text()).toContain('graph TD')
  })
})
