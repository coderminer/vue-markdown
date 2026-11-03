import { beforeEach, describe, expect, it, vi } from 'vitest'

const mermaidMock = vi.hoisted(() => ({
  initialize: vi.fn(),
  render: vi.fn(),
}))

vi.mock('mermaid', () => ({
  default: {
    initialize: mermaidMock.initialize,
    render: mermaidMock.render,
  },
}))

import { renderMermaid, resetMermaidRuntime } from '../../src/mermaid'

describe('Mermaid runtime configuration', () => {
  beforeEach(() => {
    resetMermaidRuntime()
    mermaidMock.initialize.mockReset()
    mermaidMock.initialize.mockResolvedValue(undefined)
    mermaidMock.render.mockReset()
    mermaidMock.render.mockResolvedValue({
      svg: '<svg viewBox="0 0 10 10"><text>Diagram</text></svg>',
    })
  })

  it('renders labels as SVG text instead of HTML labels', async () => {
    const result = await renderMermaid('graph TD; A-->B')

    expect(result.error).toBeUndefined()
    expect(mermaidMock.initialize).toHaveBeenCalledWith(
      expect.objectContaining({
        htmlLabels: false,
        securityLevel: 'strict',
      }),
    )
    expect(result.nodes.length).toBeGreaterThan(0)
  })

  it('returns an error instead of throwing for a non-string source', async () => {
    const result = await renderMermaid(
      Promise.resolve('graph TD; A-->B') as unknown as string,
    )

    expect(result.nodes).toEqual([])
    expect(result.error).toContain('Mermaid source must be a string.')
    expect(result.error).toContain('await its result')
    expect(mermaidMock.render).not.toHaveBeenCalled()
  })

  it('reinitializes when different block configurations alternate', async () => {
    await renderMermaid('graph TD; A-->B', { theme: 'dark' })
    await renderMermaid('graph TD; C-->D', { theme: 'light' })
    await renderMermaid('graph TD; E-->F', { theme: 'dark' })

    expect(mermaidMock.initialize).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ theme: 'dark' }),
    )
    expect(mermaidMock.initialize).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ theme: 'default' }),
    )
    expect(mermaidMock.initialize).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining({ theme: 'dark' }),
    )
  })

  it('renders into an offscreen host instead of the end of the body', async () => {
    await renderMermaid('graph TD; A-->B')

    const host = document.querySelector('[data-vmd-mermaid-measure]')
    expect(host).not.toBeNull()
    expect((host as HTMLElement).style.position).toBe('fixed')
    expect((host as HTMLElement).style.visibility).toBe('hidden')
    expect(host?.getAttribute('aria-hidden')).toBe('true')
    // Exactly one host exists, so a document does not grow per diagram.
    expect(document.querySelectorAll('[data-vmd-mermaid-measure]').length).toBe(1)
    expect(mermaidMock.render).toHaveBeenCalledTimes(1)
    // Mermaid receives the host so its temporary `dvmd-mermaid-*` node never
    // lands in normal flow at the end of the page.
    expect(mermaidMock.render.mock.calls[0]?.[2]).toBe(host)
    // Mermaid's temporary node is removed again, leaving no stray markup.
    expect(host?.childNodes.length).toBe(0)
  })

  it('reuses one measuring host across diagrams', async () => {
    await renderMermaid('graph TD; A-->B')
    await renderMermaid('graph TD; C-->D')
    const hosts = document.querySelectorAll('[data-vmd-mermaid-measure]')
    expect(hosts.length).toBe(1)
  })

  it('serializes renders so a second configuration cannot interleave', async () => {
    let release: () => void = () => undefined
    const gate = new Promise<void>((resolve) => {
      release = resolve
    })
    mermaidMock.render.mockImplementationOnce(async () => {
      await gate
      return { svg: '<svg viewBox="0 0 10 10"><text>First</text></svg>' }
    })

    const first = renderMermaid('graph TD; A-->B', { theme: 'dark' })
    const second = renderMermaid('graph TD; C-->D', { theme: 'light' })
    await vi.waitFor(() => {
      expect(mermaidMock.render).toHaveBeenCalledTimes(1)
    })

    release()
    await Promise.all([first, second])
    expect(mermaidMock.render).toHaveBeenCalledTimes(2)
  })
})
