import { afterEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { defineComponent, h, onMounted } from 'vue'
import MermaidBlock from '../../src/components/MermaidBlock.vue'
import MarkdownMermaid from '../../src/components/MarkdownMermaid.vue'
import MarkdownRenderer from '../../src/components/MarkdownRenderer.vue'
import { RENDER_CONTEXT, type RenderContext } from '../../src/components/context'
import { DEFAULT_LABELS } from '../../src/core/labels'
import { mermaidPlugin } from '../../src/mermaid/plugin'
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

function context(overrides: Partial<RenderContext> = {}): RenderContext {
  return {
    components: {},
    labels: DEFAULT_LABELS,
    linkTarget: '_self',
    externalLinkTarget: '_self',
    renderHostSlot: (_name, _props, fallback) => fallback(),
    onLinkClick() {},
    onCustomTagClick() {},
    onTaskChange() {},
    ...overrides,
  }
}

/**
 * happy-dom has no layout, so the preview reports a zero scroll box. Stub it to
 * simulate a diagram that does or does not overflow.
 */
function setPreviewOverflow(element: HTMLElement, overflow: boolean): void {
  const metrics = overflow
    ? { scrollWidth: 1200, scrollHeight: 900, clientWidth: 600, clientHeight: 400 }
    : { scrollWidth: 600, scrollHeight: 400, clientWidth: 600, clientHeight: 400 }
  for (const key of Object.keys(metrics) as Array<keyof typeof metrics>) {
    Object.defineProperty(element, key, {
      configurable: true,
      value: metrics[key],
    })
  }
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
    expect(hidden.find('[data-vmd-part="mermaid-retry"]').exists()).toBe(true)
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

  it('customizes the pending placeholder through render-context labels', async () => {
    const wrapper = mount(MermaidBlock, {
      props: {
        source: 'graph TD; A-->B',
        renderer: renderer({
          render: () => new Promise<MermaidRenderResult>(() => {}),
        }),
      },
      global: {
        provide: {
          [RENDER_CONTEXT]: context({
            labels: { ...DEFAULT_LABELS, mermaidPending: '正在渲染图表…' },
          }),
        },
      },
    })
    await flushPromises()
    const pending = wrapper.find('[data-vmd-part="mermaid-pending"]')
    expect(pending.exists()).toBe(true)
    expect(pending.text()).toBe('正在渲染图表…')
    wrapper.unmount()
  })

  it('customizes labels through the local labels prop', async () => {
    const wrapper = mountBlock({
      renderer: renderer({
        render: () => new Promise<MermaidRenderResult>(() => {}),
      }),
      labels: {
        mermaid: 'Flow',
        mermaidPending: 'Loading diagram…',
        preview: 'View',
      },
    })
    await flushPromises()
    expect(wrapper.attributes('aria-label')).toBe('Flow')
    expect(wrapper.find('[data-action="preview"]').text()).toContain('View')
    expect(wrapper.find('[data-vmd-part="mermaid-pending"]').text()).toBe(
      'Loading diagram…',
    )
    wrapper.unmount()
  })

  it('applies renderer labels to nested Mermaid blocks', async () => {
    const wrapper = mount(MarkdownRenderer, {
      props: {
        source: '```mermaid\ngraph TD; A-->B\n```',
        plugins: [mermaidPlugin()],
        mermaidRenderer: renderer({
          render: () => new Promise<MermaidRenderResult>(() => {}),
        }),
        mermaidDeferRendering: false,
        labels: { mermaidPending: 'Renderer pending' },
      },
    })
    await flushPromises()
    await vi.waitFor(() => {
      expect(wrapper.find('[data-vmd-part="mermaid-pending"]').exists()).toBe(
        true,
      )
    })
    expect(wrapper.find('[data-vmd-part="mermaid-pending"]').text()).toBe(
      'Renderer pending',
    )
    wrapper.unmount()
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
    expect(wrapper.text()).toContain(
      'The Mermaid renderer returned no diagram nodes or SVG.',
    )
    expect(wrapper.text()).toContain('remove the custom renderer')
    expect(wrapper.emitted('error')).toBeTruthy()
  })

  it('distinguishes an invalid renderer result', async () => {
    const wrapper = mountBlock({
      renderer: renderer({
        render: () => null as unknown as MermaidRenderResult,
      }),
      showErrors: true,
    })
    await vi.waitFor(() => {
      expect(wrapper.attributes('data-status')).toBe('error')
    })
    expect(wrapper.text()).toContain(
      'The Mermaid renderer returned an invalid result.',
    )
    expect(wrapper.text()).toContain('Return an object such as `{ nodes }`')
  })

  it('distinguishes SVG that sanitization rejects completely', async () => {
    const wrapper = mountBlock({
      renderer: renderer({
        render: () => ({ nodes: [], svg: '<script>x</script>' }),
      }),
      showErrors: true,
    })
    await vi.waitFor(() => {
      expect(wrapper.attributes('data-status')).toBe('error')
    })
    expect(wrapper.text()).toContain(
      'The Mermaid renderer returned SVG that sanitization rejected completely.',
    )
  })

  it('adds a fix hint when an injected renderer throws', async () => {
    const wrapper = mountBlock({
      renderer: renderer({
        render: () => {
          throw new Error('service unavailable')
        },
      }),
      showErrors: true,
    })
    await vi.waitFor(() => {
      expect(wrapper.attributes('data-status')).toBe('error')
    })
    expect(wrapper.text()).toContain(
      'The Mermaid renderer failed: service unavailable',
    )
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

  it('ignores an in-flight render that settles after unmount', async () => {
    let resolveRender: (value: MermaidRenderResult) => void = () => undefined
    const pending = new Promise<MermaidRenderResult>((resolve) => {
      resolveRender = resolve
    })
    const wrapper = mountBlock({
      renderer: renderer({ render: () => pending }),
    })
    await flushPromises()
    expect(wrapper.attributes('data-status')).toBe('pending')

    wrapper.unmount()
    resolveRender({ svg: safeSvg, nodes: [] })
    await flushPromises()
    expect(wrapper.emitted('rendered')).toBeUndefined()
    expect(wrapper.emitted('error')).toBeUndefined()
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

  it('resets zoom when the source changes', async () => {
    const wrapper = mountBlock({ enableZoom: true })
    await flushPromises()
    await wrapper.find('[data-action="zoom-in"]').trigger('click')
    expect(wrapper.find('.vmd-mermaid-diagram').attributes('style')).toContain(
      'scale(1.25)',
    )

    await wrapper.setProps({ source: 'graph TD; C-->D' })
    await flushPromises()
    await vi.waitFor(() => {
      expect(wrapper.attributes('data-status')).toBe('ready')
    })
    expect(wrapper.find('.vmd-mermaid-diagram').attributes('style')).toContain(
      'scale(1)',
    )
  })

  it('resets zoom after a re-render and when returning from the source tab', async () => {
    const wrapper = mountBlock({ enableZoom: true })
    await flushPromises()

    await wrapper.find('[data-action="zoom-in"]').trigger('click')
    await wrapper.find('[data-action="zoom-in"]').trigger('click')
    expect(wrapper.find('.vmd-mermaid-diagram').attributes('style')).toContain(
      'scale(1.5)',
    )

    await wrapper.find('[data-action="retry"]').trigger('click')
    await flushPromises()
    expect(wrapper.find('.vmd-mermaid-diagram').attributes('style')).toContain(
      'scale(1)',
    )

    await wrapper.find('[data-action="zoom-in"]').trigger('click')
    await wrapper
      .findAll('button')
      .find((button) => button.text() === 'Source')!
      .trigger('click')
    await wrapper
      .findAll('button')
      .find((button) => button.text() === 'Preview')!
      .trigger('click')
    expect(wrapper.find('.vmd-mermaid-diagram').attributes('style')).toContain(
      'scale(1)',
    )

    await wrapper.find('[data-action="zoom-in"]').trigger('click')
    await wrapper.setProps({ theme: 'dark' })
    await flushPromises()
    expect(wrapper.find('.vmd-mermaid-diagram').attributes('style')).toContain(
      'scale(1)',
    )
  })

  it('reports a non-string source instead of throwing', async () => {
    const wrapper = mountBlock({
      source: Promise.resolve('graph TD; A-->B') as unknown as string,
      showErrors: true,
    })
    await flushPromises()
    await vi.waitFor(() => {
      expect(wrapper.attributes('data-status')).toBe('error')
    })
    expect(wrapper.text()).toContain('Mermaid source must be a string.')
  })

  it('offers a retry control in the error region', async () => {
    const render = vi.fn(() => ({ nodes: [], error: 'bad syntax' }))
    const wrapper = mountBlock({
      showErrors: true,
      renderer: renderer({ render }),
    })
    await vi.waitFor(() => {
      expect(wrapper.attributes('data-status')).toBe('error')
    })
    expect(wrapper.find('[data-vmd-part="mermaid-retry"]').exists()).toBe(true)
    expect(render).toHaveBeenCalledTimes(1)

    await wrapper.find('[data-vmd-part="mermaid-retry"]').trigger('click')
    await flushPromises()
    expect(render).toHaveBeenCalledTimes(2)
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

  it('forwards labels through MarkdownMermaid', async () => {
    const wrapper = mount(MarkdownMermaid, {
      props: {
        code: 'graph TD; A-->B',
        renderer: renderer({
          render: () => new Promise<MermaidRenderResult>(() => {}),
        }),
        labels: { mermaidPending: 'Standalone pending' },
      },
    })
    await flushPromises()
    expect(wrapper.find('[data-vmd-part="mermaid-pending"]').text()).toBe(
      'Standalone pending',
    )
    wrapper.unmount()
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

  it('renders immediately when the block has no layout box', async () => {
    // Headless DOMs report a zero rect, so intersection can never be reported
    // and deferring would leave the block pending forever.
    const render = vi.fn(() => ({ svg: safeSvg, nodes: [] }))
    const wrapper = mountBlock({ renderer: renderer({ render }) })
    await flushPromises()
    await vi.waitFor(() => {
      expect(render).toHaveBeenCalledTimes(1)
    })
    expect(wrapper.attributes('data-status')).toBe('ready')
  })

  it('defers the first render until the block nears the viewport', async () => {
    const callbacks: IntersectionObserverCallback[] = []
    const original = globalThis.IntersectionObserver
    globalThis.IntersectionObserver = class {
      constructor(callback: IntersectionObserverCallback) {
        callbacks.push(callback)
      }
      observe(): void {}
      unobserve(): void {}
      disconnect(): void {}
      takeRecords(): IntersectionObserverEntry[] {
        return []
      }
    } as never
    const rect = vi
      .spyOn(Element.prototype, 'getBoundingClientRect')
      .mockReturnValue({
        x: 0,
        y: 5000,
        top: 5000,
        left: 0,
        right: 600,
        bottom: 5400,
        width: 600,
        height: 400,
        toJSON: () => ({}),
      } as DOMRect)
    const render = vi.fn(() => ({ svg: safeSvg, nodes: [] }))
    const wrapper = mountBlock({ renderer: renderer({ render }) })

    try {
      await flushPromises()
      expect(render).not.toHaveBeenCalled()
      expect(wrapper.attributes('data-status')).toBe('idle')
      expect(wrapper.find('[data-vmd-part="mermaid-pending"]').exists()).toBe(true)

      callbacks[0]?.(
        [{ isIntersecting: true } as IntersectionObserverEntry],
        {} as IntersectionObserver,
      )
      await vi.waitFor(() => {
        expect(render).toHaveBeenCalledTimes(1)
      })
      await flushPromises()
      expect(wrapper.attributes('data-status')).toBe('ready')
    } finally {
      rect.mockRestore()
      globalThis.IntersectionObserver = original
      wrapper.unmount()
    }
  })

  it('renders a deferred block when the source changes and it stays hidden', async () => {
    const callbacks: IntersectionObserverCallback[] = []
    const original = globalThis.IntersectionObserver
    globalThis.IntersectionObserver = class {
      constructor(callback: IntersectionObserverCallback) {
        callbacks.push(callback)
      }
      observe(): void {}
      unobserve(): void {}
      disconnect(): void {}
      takeRecords(): IntersectionObserverEntry[] {
        return []
      }
    } as never
    const rect = vi
      .spyOn(Element.prototype, 'getBoundingClientRect')
      .mockReturnValue({
        x: 0,
        y: 5000,
        top: 5000,
        left: 0,
        right: 600,
        bottom: 5400,
        width: 600,
        height: 400,
        toJSON: () => ({}),
      } as DOMRect)
    const render = vi.fn(() => ({ svg: safeSvg, nodes: [] }))
    const wrapper = mountBlock({ renderer: renderer({ render }) })

    try {
      await flushPromises()
      await wrapper.setProps({ source: 'graph TD; C-->D' })
      await flushPromises()
      expect(render).not.toHaveBeenCalled()
      expect(callbacks).toHaveLength(1)

      callbacks[0]?.(
        [{ isIntersecting: true } as IntersectionObserverEntry],
        {} as IntersectionObserver,
      )
      await vi.waitFor(() => {
        expect(render).toHaveBeenCalledTimes(1)
      })
      expect(render).toHaveBeenCalledWith(
        'graph TD; C-->D',
        expect.objectContaining({ id: expect.any(String) }),
      )
    } finally {
      rect.mockRestore()
      globalThis.IntersectionObserver = original
      wrapper.unmount()
    }
  })

  it('pans the preview by scrolling once the diagram overflows', async () => {
    const wrapper = mountBlock()
    await flushPromises()
    await vi.waitFor(() => {
      expect(wrapper.attributes('data-status')).toBe('ready')
    })

    const preview = () => wrapper.get('[data-vmd-part="mermaid-preview"]')
    expect(preview().attributes('data-pannable')).toBeUndefined()

    const element = preview().element as HTMLElement
    setPreviewOverflow(element, true)
    await wrapper.get('[data-action="zoom-in"]').trigger('click')
    await flushPromises()
    expect(preview().attributes('data-pannable')).toBe('true')

    element.scrollLeft = 40
    element.scrollTop = 20
    const dispatch = (type: string, init: PointerEventInit) => {
      element.dispatchEvent(
        new PointerEvent(type, { bubbles: true, cancelable: true, ...init }),
      )
    }

    dispatch('pointerdown', {
      button: 0,
      buttons: 1,
      pointerId: 1,
      pointerType: 'mouse',
      clientX: 100,
      clientY: 100,
    })
    await wrapper.vm.$nextTick()
    expect(preview().attributes('data-dragging')).toBe('true')

    dispatch('pointermove', { pointerId: 1, buttons: 1, clientX: 70, clientY: 80 })
    expect(element.scrollLeft).toBe(70)
    expect(element.scrollTop).toBe(40)

    dispatch('pointerup', { pointerId: 1 })
    await wrapper.vm.$nextTick()
    expect(preview().attributes('data-dragging')).toBeUndefined()

    // Zooming back out to a diagram that fits makes the block non-pannable and
    // rewinds the scroll box.
    setPreviewOverflow(element, false)
    await wrapper.get('[data-action="reset-zoom"]').trigger('click')
    await flushPromises()
    expect(preview().attributes('data-pannable')).toBeUndefined()
    expect(element.scrollLeft).toBe(0)
    expect(element.scrollTop).toBe(0)
  })

  it('clears a stuck drag when no pointerup arrives', async () => {
    const wrapper = mountBlock()
    await flushPromises()
    await vi.waitFor(() => {
      expect(wrapper.attributes('data-status')).toBe('ready')
    })
    const preview = () => wrapper.get('[data-vmd-part="mermaid-preview"]')
    const element = preview().element as HTMLElement
    setPreviewOverflow(element, true)
    await wrapper.get('[data-action="zoom-in"]').trigger('click')
    await flushPromises()

    const dispatch = (type: string, init: PointerEventInit) => {
      element.dispatchEvent(
        new PointerEvent(type, { bubbles: true, cancelable: true, ...init }),
      )
    }

    dispatch('pointerdown', {
      button: 0,
      buttons: 1,
      pointerId: 1,
      pointerType: 'pen',
      clientX: 100,
      clientY: 100,
    })
    await wrapper.vm.$nextTick()
    expect(preview().attributes('data-dragging')).toBe('true')

    // The pointer was released outside the preview and its capture failed, so
    // the next move reports no pressed button. It must not pan.
    element.scrollLeft = 40
    element.scrollTop = 20
    dispatch('pointermove', { pointerId: 1, buttons: 0, clientX: 70, clientY: 80 })
    await wrapper.vm.$nextTick()
    expect(preview().attributes('data-dragging')).toBeUndefined()
    expect(element.scrollLeft).toBe(40)
    expect(element.scrollTop).toBe(20)

    // A regained pointer capture can also be lost without a release.
    dispatch('pointerdown', {
      button: 0,
      buttons: 1,
      pointerId: 2,
      pointerType: 'pen',
      clientX: 100,
      clientY: 100,
    })
    await wrapper.vm.$nextTick()
    expect(preview().attributes('data-dragging')).toBe('true')
    dispatch('lostpointercapture', { pointerId: 2, buttons: 0 })
    await wrapper.vm.$nextTick()
    expect(preview().attributes('data-dragging')).toBeUndefined()
  })

  it('offers panning for real overflow instead of the zoom level', async () => {
    const wrapper = mountBlock()
    await flushPromises()
    await vi.waitFor(() => {
      expect(wrapper.attributes('data-status')).toBe('ready')
    })
    const preview = () => wrapper.get('[data-vmd-part="mermaid-preview"]')
    const element = preview().element as HTMLElement

    // A host-scoped max-height can make a diagram overflow at 1x, before any
    // zoom happens.
    setPreviewOverflow(element, true)
    window.dispatchEvent(new Event('resize'))
    await flushPromises()
    expect(preview().attributes('data-pannable')).toBe('true')
    expect(preview().attributes('tabindex')).toBe('0')

    // Zoomed, but the diagram still fits: no pan affordance, so pointer events
    // and text selection stay untouched.
    setPreviewOverflow(element, false)
    await wrapper.get('[data-action="zoom-in"]').trigger('click')
    await flushPromises()
    expect(preview().attributes('data-pannable')).toBeUndefined()
    expect(preview().attributes('tabindex')).toBeUndefined()
  })

  it('pans the preview with the keyboard while it overflows', async () => {
    const wrapper = mountBlock()
    await flushPromises()
    await vi.waitFor(() => {
      expect(wrapper.attributes('data-status')).toBe('ready')
    })

    const preview = wrapper.get('[data-vmd-part="mermaid-preview"]')
    const element = preview.element as HTMLElement
    setPreviewOverflow(element, true)
    await wrapper.get('[data-action="zoom-in"]').trigger('click')
    await flushPromises()

    element.scrollLeft = 100
    element.scrollTop = 100
    await preview.trigger('keydown', { key: 'ArrowRight' })
    await preview.trigger('keydown', { key: 'ArrowDown', shiftKey: true })
    expect(element.scrollLeft).toBe(140)
    expect(element.scrollTop).toBe(260)
  })

  function stubPngExport() {
    const drawImage = vi.fn()
    const canvas = document.createElement('canvas')
    vi.spyOn(canvas, 'getContext').mockReturnValue({ drawImage } as never)
    canvas.toBlob = ((callback: BlobCallback) => {
      callback(new Blob(['png'], { type: 'image/png' }))
    }) as never
    const createElement = document.createElement.bind(document)
    vi.spyOn(document, 'createElement').mockImplementation(((
      tag: string,
    ) => (tag === 'canvas' ? canvas : createElement(tag))) as typeof document.createElement)

    const createObjectURL = vi.fn((_blob: Blob) => 'blob:mock')
    const revokeObjectURL = vi.fn((_url: string) => undefined)
    const originalCreate = URL.createObjectURL
    const originalRevoke = URL.revokeObjectURL
    URL.createObjectURL = createObjectURL as never
    URL.revokeObjectURL = revokeObjectURL as never

    const anchorClick = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => undefined)
    const originalImage = globalThis.Image
    class FakeImage {
      onload: (() => void) | null = null
      onerror: (() => void) | null = null
      width = 0
      height = 0
      set src(_value: string) {
        this.onload?.()
      }
    }
    globalThis.Image = FakeImage as never

    return {
      canvas,
      drawImage,
      createObjectURL,
      anchorClick,
      revokeObjectURL,
      restore() {
        URL.createObjectURL = originalCreate
        URL.revokeObjectURL = originalRevoke
        globalThis.Image = originalImage
      },
    }
  }

  it('exports a PNG at a higher pixel density', async () => {
    const svg =
      '<svg width="100%" style="max-width: 640px;" viewBox="0 0 640 480"><text>Hi</text></svg>'
    const stub = stubPngExport()
    try {
      const wrapper = mountBlock({
        renderer: renderer({ render: () => ({ svg, nodes: [] }) }),
      })
      await flushPromises()
      await vi.waitFor(() => {
        expect(wrapper.attributes('data-status')).toBe('ready')
      })
      await wrapper.get('[data-action="export-png"]').trigger('click')
      await flushPromises()

      // 640x480 at 3x instead of a 1x bitmap.
      expect(stub.canvas.width).toBe(1920)
      expect(stub.canvas.height).toBe(1440)
      expect(stub.drawImage).toHaveBeenCalledWith(
        expect.anything(),
        0,
        0,
        1920,
        1440,
      )
      expect(stub.anchorClick).toHaveBeenCalled()
      expect(stub.revokeObjectURL).toHaveBeenCalled()

      const source = stub.createObjectURL.mock.calls[0]?.[0] as Blob
      const markup = await source.text()
      expect(markup).toContain('width="640"')
      expect(markup).toContain('height="480"')
      wrapper.unmount()
    } finally {
      stub.restore()
    }
  })

  it('downscales an oversized diagram instead of exceeding the export cap', async () => {
    // A viewBox beyond the 8192 px canvas cap must be scaled down: an oversized
    // bitmap hits canvas limits (notably iOS Safari) and `toBlob` returns null.
    const svg = '<svg viewBox="0 0 10000 500"><text>Wide</text></svg>'
    const stub = stubPngExport()
    try {
      const wrapper = mountBlock({
        renderer: renderer({ render: () => ({ svg, nodes: [] }) }),
      })
      await flushPromises()
      await vi.waitFor(() => {
        expect(wrapper.attributes('data-status')).toBe('ready')
      })
      await wrapper.get('[data-action="export-png"]').trigger('click')
      await flushPromises()

      expect(stub.canvas.width).toBe(8192)
      expect(stub.canvas.height).toBe(410)
      expect(stub.drawImage).toHaveBeenCalledWith(
        expect.anything(),
        0,
        0,
        8192,
        410,
      )
      wrapper.unmount()
    } finally {
      stub.restore()
    }
  })

  it('keeps an oversized square diagram inside the canvas area budget', async () => {
    // Aspect ratio alone is not enough: both edges are under the cap here, but
    // the bitmap would still exceed a canvas backend's total-pixel limit.
    const svg = '<svg viewBox="0 0 8000 8000"><text>Big</text></svg>'
    const stub = stubPngExport()
    try {
      const wrapper = mountBlock({
        renderer: renderer({ render: () => ({ svg, nodes: [] }) }),
      })
      await flushPromises()
      await vi.waitFor(() => {
        expect(wrapper.attributes('data-status')).toBe('ready')
      })
      await wrapper.get('[data-action="export-png"]').trigger('click')
      await flushPromises()

      expect(stub.canvas.width).toBe(4000)
      expect(stub.canvas.height).toBe(4000)
      wrapper.unmount()
    } finally {
      stub.restore()
    }
  })

  it('renders a deferred diagram when printing starts', async () => {
    const callbacks: IntersectionObserverCallback[] = []
    const original = globalThis.IntersectionObserver
    globalThis.IntersectionObserver = class {
      constructor(callback: IntersectionObserverCallback) {
        callbacks.push(callback)
      }
      observe(): void {}
      unobserve(): void {}
      disconnect(): void {}
      takeRecords(): IntersectionObserverEntry[] {
        return []
      }
    } as never
    const rect = vi
      .spyOn(Element.prototype, 'getBoundingClientRect')
      .mockReturnValue({
        x: 0,
        y: 5000,
        top: 5000,
        left: 0,
        right: 600,
        bottom: 5400,
        width: 600,
        height: 400,
        toJSON: () => ({}),
      } as DOMRect)
    const render = vi.fn(() => ({ svg: safeSvg, nodes: [] }))
    const wrapper = mountBlock({ renderer: renderer({ render }) })

    try {
      await flushPromises()
      expect(render).not.toHaveBeenCalled()

      // Printing snapshots without scrolling, so the pending placeholder must
      // not survive a print.
      window.dispatchEvent(new Event('beforeprint'))
      await vi.waitFor(() => {
        expect(render).toHaveBeenCalledTimes(1)
      })
      await flushPromises()
      expect(wrapper.attributes('data-status')).toBe('ready')
      expect(callbacks).toHaveLength(1)

      // A later print must not re-render a diagram that already rendered.
      window.dispatchEvent(new Event('beforeprint'))
      await flushPromises()
      expect(render).toHaveBeenCalledTimes(1)
    } finally {
      rect.mockRestore()
      globalThis.IntersectionObserver = original
      wrapper.unmount()
    }
  })

  it('abandons deferral when the print media query matches', async () => {
    // `beforeprint` is missing in some engines; the print media query covers them.
    const listeners: Array<(event: { matches: boolean }) => void> = []
    const originalMatchMedia = window.matchMedia
    const originalObserver = globalThis.IntersectionObserver
    globalThis.IntersectionObserver = class {
      observe(): void {}
      unobserve(): void {}
      disconnect(): void {}
      takeRecords(): IntersectionObserverEntry[] {
        return []
      }
    } as never
    window.matchMedia = ((query: string) => {
      if (query !== 'print') return originalMatchMedia.call(window, query)
      return {
        matches: false,
        media: query,
        addEventListener: (
          _type: string,
          listener: (event: { matches: boolean }) => void,
        ) => listeners.push(listener),
        removeEventListener: () => undefined,
      }
    }) as never
    const rect = vi
      .spyOn(Element.prototype, 'getBoundingClientRect')
      .mockReturnValue({
        x: 0,
        y: 5000,
        top: 5000,
        left: 0,
        right: 600,
        bottom: 5400,
        width: 600,
        height: 400,
        toJSON: () => ({}),
      } as DOMRect)
    const render = vi.fn(() => ({ svg: safeSvg, nodes: [] }))
    const wrapper = mountBlock({ renderer: renderer({ render }) })

    try {
      await flushPromises()
      expect(render).not.toHaveBeenCalled()

      listeners[0]?.({ matches: true })
      await vi.waitFor(() => {
        expect(render).toHaveBeenCalledTimes(1)
      })
    } finally {
      rect.mockRestore()
      window.matchMedia = originalMatchMedia
      globalThis.IntersectionObserver = originalObserver
      wrapper.unmount()
    }
  })

  it('renders offscreen blocks eagerly when deferral is disabled', async () => {
    const callbacks: IntersectionObserverCallback[] = []
    const original = globalThis.IntersectionObserver
    globalThis.IntersectionObserver = class {
      constructor(callback: IntersectionObserverCallback) {
        callbacks.push(callback)
      }
      observe(): void {}
      unobserve(): void {}
      disconnect(): void {}
      takeRecords(): IntersectionObserverEntry[] {
        return []
      }
    } as never
    const rect = vi
      .spyOn(Element.prototype, 'getBoundingClientRect')
      .mockReturnValue({
        x: 0,
        y: 5000,
        top: 5000,
        left: 0,
        right: 600,
        bottom: 5400,
        width: 600,
        height: 400,
        toJSON: () => ({}),
      } as DOMRect)
    const render = vi.fn(() => ({ svg: safeSvg, nodes: [] }))
    const wrapper = mountBlock({
      renderer: renderer({ render }),
      deferRendering: false,
    })

    try {
      await flushPromises()
      await vi.waitFor(() => {
        expect(render).toHaveBeenCalledTimes(1)
      })
      expect(callbacks).toHaveLength(0)
      expect(wrapper.attributes('data-status')).toBe('ready')
    } finally {
      rect.mockRestore()
      globalThis.IntersectionObserver = original
      wrapper.unmount()
    }
  })

  it('abandons a pending visibility wait when deferral is turned off', async () => {
    const callbacks: IntersectionObserverCallback[] = []
    const original = globalThis.IntersectionObserver
    globalThis.IntersectionObserver = class {
      constructor(callback: IntersectionObserverCallback) {
        callbacks.push(callback)
      }
      observe(): void {}
      unobserve(): void {}
      disconnect(): void {}
      takeRecords(): IntersectionObserverEntry[] {
        return []
      }
    } as never
    const rect = vi
      .spyOn(Element.prototype, 'getBoundingClientRect')
      .mockReturnValue({
        x: 0,
        y: 5000,
        top: 5000,
        left: 0,
        right: 600,
        bottom: 5400,
        width: 600,
        height: 400,
        toJSON: () => ({}),
      } as DOMRect)
    const render = vi.fn(() => ({ svg: safeSvg, nodes: [] }))
    const wrapper = mountBlock({ renderer: renderer({ render }) })

    try {
      await flushPromises()
      expect(render).not.toHaveBeenCalled()
      expect(callbacks).toHaveLength(1)

      // A host can disable deferral later, for example when a capture pipeline
      // starts; the wait must end without waiting for intersection.
      await wrapper.setProps({ deferRendering: false })
      await vi.waitFor(() => {
        expect(render).toHaveBeenCalledTimes(1)
        expect(wrapper.attributes('data-status')).toBe('ready')
      })
    } finally {
      rect.mockRestore()
      globalThis.IntersectionObserver = original
      wrapper.unmount()
    }
  })

  it('remeasures pan affordance when the container resizes', async () => {
    const callbacks: ResizeObserverCallback[] = []
    const original = globalThis.ResizeObserver
    globalThis.ResizeObserver = class {
      constructor(callback: ResizeObserverCallback) {
        callbacks.push(callback)
      }
      observe(): void {}
      unobserve(): void {}
      disconnect(): void {}
    } as never
    const wrapper = mountBlock()

    try {
      await flushPromises()
      await vi.waitFor(() => {
        expect(wrapper.attributes('data-status')).toBe('ready')
      })
      const preview = () => wrapper.get('[data-vmd-part="mermaid-preview"]')
      const element = preview().element as HTMLElement
      expect(preview().attributes('data-pannable')).toBeUndefined()

      // A hidden tab becoming visible, a collapsing column, or fullscreen
      // changes the preview box without a window resize event.
      setPreviewOverflow(element, true)
      callbacks[0]?.([] as never, {} as never)
      await flushPromises()
      expect(preview().attributes('data-pannable')).toBe('true')
    } finally {
      globalThis.ResizeObserver = original
      wrapper.unmount()
    }
  })

  it('renders a deferred block when print media already matches', async () => {
    const originalObserver = globalThis.IntersectionObserver
    const originalMatchMedia = window.matchMedia
    globalThis.IntersectionObserver = class {
      observe(): void {}
      unobserve(): void {}
      disconnect(): void {}
      takeRecords(): IntersectionObserverEntry[] {
        return []
      }
    } as never
    window.matchMedia = ((query: string) =>
      query === 'print'
        ? {
            matches: true,
            media: query,
            addEventListener: () => undefined,
            removeEventListener: () => undefined,
          }
        : originalMatchMedia.call(window, query)) as never
    const rect = vi
      .spyOn(Element.prototype, 'getBoundingClientRect')
      .mockReturnValue({
        x: 0,
        y: 5000,
        top: 5000,
        left: 0,
        right: 600,
        bottom: 5400,
        width: 600,
        height: 400,
        toJSON: () => ({}),
      } as DOMRect)
    const render = vi.fn(() => ({ svg: safeSvg, nodes: [] }))
    const wrapper = mountBlock({ renderer: renderer({ render }) })

    try {
      await flushPromises()
      await vi.waitFor(() => {
        expect(render).toHaveBeenCalledTimes(1)
      })
    } finally {
      rect.mockRestore()
      window.matchMedia = originalMatchMedia
      globalThis.IntersectionObserver = originalObserver
      wrapper.unmount()
    }
  })

  it('forwards renderer-level deferral and emits mermaid-rendered', async () => {
    const seen: Array<boolean | undefined> = []
    const MermaidStub = defineComponent({
      name: 'MermaidStub',
      props: {
        code: { type: String, default: '' },
        deferRendering: { type: Boolean, default: true },
      },
      emits: ['rendered'],
      setup(props, { emit }) {
        seen.push(props.deferRendering)
        onMounted(() => emit('rendered', { nodes: [], svg: safeSvg }))
        return () => h('div', { 'data-mermaid-stub': '' }, props.code)
      },
    })
    const wrapper = mount(MarkdownRenderer, {
      props: {
        source: '```mermaid\ngraph TD; A-->B\n```',
        plugins: [mermaidPlugin()],
        nodeComponents: { mermaid: MermaidStub },
        mermaidDeferRendering: false,
      },
    })

    await flushPromises()
    await vi.waitFor(() => {
      expect(wrapper.emitted('mermaid-rendered')).toBeTruthy()
    })
    expect(seen).toEqual([false])
    expect(wrapper.find('[data-mermaid-stub]').exists()).toBe(true)
    wrapper.unmount()
  })
})
