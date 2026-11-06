import { beforeAll, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import MarkdownRenderer from '../../src/components/MarkdownRenderer.vue'
import { useMarkdownDocument } from '../../src/composables/useMarkdownDocument'
import { walkNodes } from '../../src/core/normalize'
import { mermaidPlugin } from '../../src/mermaid/plugin'
import {
  realMermaidDiagrams,
  realMermaidMarkdown,
} from '../fixtures/mermaid-diagrams'
import type { MarkdownMermaidNode, MermaidRenderer } from '../../src/core/types'

interface RealMermaidApi {
  initialize(config: Record<string, unknown>): void | Promise<void>
  parse(source: string): Promise<unknown> | unknown
}

let mermaid: RealMermaidApi

beforeAll(async () => {
  mermaid = (await import('mermaid')).default as unknown as RealMermaidApi
  await mermaid.initialize({
    startOnLoad: false,
    securityLevel: 'strict',
    htmlLabels: false,
  })
})

function diagramType(result: unknown): string | undefined {
  if (result && typeof result === 'object' && 'diagramType' in result) {
    return String((result as { diagramType: unknown }).diagramType)
  }
  return undefined
}

describe('real Mermaid diagrams', () => {
  it.each(realMermaidDiagrams)(
    'accepts the $name diagram with the real Mermaid parser',
    async (diagram) => {
      const parsed = await mermaid.parse(diagram.source)
      // Mermaid may return `true` instead of the parsed descriptor depending on
      // the registered diagram, so only assert the type when it is available.
      expect(parsed === true || diagramType(parsed) === diagram.type).toBe(true)
    },
  )

  it('turns every realistic fence into a distinct Mermaid node', async () => {
    const result = useMarkdownDocument(realMermaidMarkdown, {
      plugins: [mermaidPlugin()],
    })
    await result.refresh()

    const nodes: MarkdownMermaidNode[] = []
    walkNodes(result.document.value?.nodes ?? [], (node) => {
      if (node.kind === 'mermaid') nodes.push(node)
    })

    expect(nodes).toHaveLength(realMermaidDiagrams.length)
    expect(nodes.map((node) => node.code.trim())).toEqual(
      realMermaidDiagrams.map((diagram) => diagram.source),
    )
    expect(new Set(nodes.map((node) => node.key)).size).toBe(
      realMermaidDiagrams.length,
    )
    expect(result.document.value?.toc.map((item) => item.text)).toEqual(
      realMermaidDiagrams.map((diagram) => diagram.name),
    )
  })

  it('renders all real diagrams through the plugin and an injected renderer', async () => {
    const rendered: string[] = []
    const names = new Map(
      realMermaidDiagrams.map((diagram) => [diagram.source, diagram.name]),
    )
    const renderer: MermaidRenderer = {
      id: 'real-mermaid-fixture',
      render(source) {
        rendered.push(source.trim())
        const label = names.get(source.trim()) ?? 'Diagram'
        return {
          svg: `<svg viewBox="0 0 320 80"><rect width="320" height="80" fill="#f8f9fa"/><text x="16" y="44">${label}</text></svg>`,
          nodes: [],
        }
      },
    }

    const wrapper = mount(MarkdownRenderer, {
      props: {
        source: realMermaidMarkdown,
        plugins: [mermaidPlugin()],
        mermaidRenderer: renderer,
        mermaidDeferRendering: false,
      },
    })
    await flushPromises()
    await vi.waitFor(() => {
      expect(
        wrapper.findAll('[data-vmd-part="mermaid"][data-status="ready"]'),
      ).toHaveLength(realMermaidDiagrams.length)
    })

    expect(new Set(rendered)).toEqual(
      new Set(realMermaidDiagrams.map((diagram) => diagram.source)),
    )
    expect(wrapper.findAll('[data-vmd-part="code"]')).toHaveLength(0)
    expect(wrapper.findAll('[data-vmd-part="mermaid"]')).toHaveLength(
      realMermaidDiagrams.length,
    )
    for (const diagram of realMermaidDiagrams) {
      expect(wrapper.text()).toContain(diagram.name)
    }
    expect(wrapper.html()).not.toContain('<script')
    expect(wrapper.html()).not.toContain('onload')
  })
})
