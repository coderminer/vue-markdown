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
})
