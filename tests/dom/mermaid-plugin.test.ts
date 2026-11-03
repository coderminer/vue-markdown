import { describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import MarkdownRenderer from '../../src/components/MarkdownRenderer.vue'
import { mermaidPlugin } from '../../src/mermaid/plugin'
import type { MermaidPluginOptions } from '../../src/mermaid/plugin'
import type { MermaidRenderer, PluginContext } from '../../src/core/types'

const renderer: MermaidRenderer = {
  id: 'plugin-test',
  render: () => ({
    svg: '<svg viewBox="0 0 10 10"><text>Rendered diagram</text></svg>',
    nodes: [],
  }),
}

const pluginContext = {
  source: '',
  options: {},
  diagnostics: [],
  addDiagnostic: () => undefined,
} as unknown as PluginContext

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

  it('keys diagrams by source so unrelated edits keep their identity', () => {
    const plugin = mermaidPlugin()
    const transform = (codes: string[]) =>
      plugin.transformDocument?.(
        {
          nodes: codes.map((code, index) => ({
            kind: 'code' as const,
            key: String(index),
            code,
            language: index === 0 && code === 'ts' ? 'ts' : 'mermaid',
            complete: true,
          })),
          toc: [],
          customTags: [],
          plugins: [],
          pipeline: 'test',
        },
        pluginContext,
      )
    const keys = (nodes: unknown[] | undefined) =>
      (nodes ?? [])
        .filter((node) => (node as { kind: string }).kind === 'mermaid')
        .map((node) => (node as { key: string }).key)

    const before = keys(transform(['graph TD; A-->B', 'graph TD; C-->D'])?.nodes)
    // Inserting an unrelated fenced block above the diagrams must not change
    // their keys, otherwise Vue remounts and re-renders every diagram.
    const after = keys(
      transform(['ts', 'graph TD; A-->B', 'graph TD; C-->D'])?.nodes,
    )

    expect(before).toHaveLength(2)
    expect(after).toEqual(before)
  })

  it('gives identical diagrams distinct keys', () => {
    const plugin = mermaidPlugin()
    const document = plugin.transformDocument?.(
      {
        nodes: ['graph TD; A-->B', 'graph TD; A-->B'].map((code, index) => ({
          kind: 'code' as const,
          key: String(index),
          code,
          language: 'mermaid',
          complete: true,
        })),
        toc: [],
        customTags: [],
        plugins: [],
        pipeline: 'test',
      },
      pluginContext,
    )
    const keys = (document?.nodes ?? []).map((node) => node.key)

    expect(keys[0]).not.toBe(keys[1])
  })

  it('rejects renderer arguments instead of ignoring them', () => {
    const unsupported = (() => undefined) as unknown as MermaidPluginOptions

    expect(() => mermaidPlugin(unsupported)).toThrow(
      '`mermaidPlugin` expects an options object',
    )
  })
})
