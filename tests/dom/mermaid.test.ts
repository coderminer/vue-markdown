import { afterEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { h } from 'vue'
import MermaidBlock from '../../src/components/MermaidBlock.vue'
import type { MermaidRenderer } from '../../src/core/types'

const safeSvg = '<svg viewBox="0 0 10 10"><text>Hello diagram</text></svg>'

function renderer(overrides: Partial<MermaidRenderer> = {}): MermaidRenderer {
  return {
    id: 'test-mermaid',
    render: () => ({ svg: safeSvg, nodes: [] }),
    ...overrides,
  }
}

function mountBlock(props: Record<string, unknown> = {}) {
  return mount(MermaidBlock, {
    props: {
      source: 'graph TD; A-->B',
      renderer: renderer(),
      ...props,
    },
  })
}

describe('MermaidBlock', () => {
  afterEach(() => {
    vi.restoreAllMocks()
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

  it('switches to source, copies, zooms, and toggles fullscreen', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    })
    const wrapper = mountBlock({ enableZoom: true })
    await flushPromises()

    const buttons = wrapper.findAll('button')
    const byText = (text: string) => buttons.find((button) => button.text() === text)!
    await byText('Source').trigger('click')
    expect(wrapper.find('[data-vmd-part="mermaid-source"]').text()).toContain(
      'graph TD; A-->B',
    )
    await byText('Preview').trigger('click')

    await byText('Copy').trigger('click')
    await flushPromises()
    expect(writeText).toHaveBeenCalledWith('graph TD; A-->B')

    await byText('+').trigger('click')
    expect(wrapper.find('.vmd-mermaid-diagram').attributes('style')).toContain(
      'scale(1.25)',
    )

    await byText('Fullscreen').trigger('click')
    expect(wrapper.attributes('data-fullscreen')).toBe('true')
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
