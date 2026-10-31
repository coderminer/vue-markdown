import { describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import MarkdownRenderer from '../../src/components/MarkdownRenderer.vue'
import { mermaidPlugin } from '../../src/mermaid/plugin'
import type { MermaidRenderer } from '../../src/core/types'

const renderer: MermaidRenderer = {
  id: 'plugin-test',
  render: () => ({
    svg: '<svg viewBox="0 0 10 10"><text>Rendered diagram</text></svg>',
    nodes: [],
  }),
}

describe('mermaidPlugin', () => {
  it('renders fenced mermaid blocks through MermaidBlock', async () => {
    const wrapper = mount(MarkdownRenderer, {
      props: {
        source: '```mermaid\nflowchart LR\n  A --> B\n```',
        plugins: [mermaidPlugin()],
        mermaidRenderer: renderer,
      },
    })
    await flushPromises()
    await vi.waitFor(() => {
      expect(wrapper.find('[data-vmd-part="mermaid"]').exists()).toBe(true)
    })
    await vi.waitFor(() => {
      expect(wrapper.text()).toContain('Rendered diagram')
    })
    expect(wrapper.find('[data-vmd-part="code"]').exists()).toBe(false)
  })

  it('leaves mermaid fences as code blocks without the plugin', async () => {
    const wrapper = mount(MarkdownRenderer, {
      props: {
        source: '```mermaid\nflowchart LR\n  A --> B\n```',
        mermaidRenderer: renderer,
      },
    })
    await flushPromises()
    expect(wrapper.find('[data-vmd-part="mermaid"]').exists()).toBe(false)
    expect(wrapper.find('[data-vmd-part="code"]').exists()).toBe(true)
  })

  it('supports custom fence languages', async () => {
    const wrapper = mount(MarkdownRenderer, {
      props: {
        source: '```chart\nflowchart LR\n  A --> B\n```',
        plugins: [mermaidPlugin({ languages: ['chart'] })],
        mermaidRenderer: renderer,
      },
    })
    await flushPromises()
    expect(wrapper.find('[data-vmd-part="mermaid"]').exists()).toBe(true)
  })
})
