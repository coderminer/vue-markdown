import { afterEach, describe, expect, it, vi } from 'vitest'

const loadState = vi.hoisted(() => ({
  attempts: 0,
  initialize: vi.fn(),
  render: vi.fn(),
}))

describe('Mermaid runtime load retry', () => {
  afterEach(() => {
    vi.doUnmock('mermaid')
    vi.resetModules()
  })

  it('retries the lazy import after a transient load failure', async () => {
    loadState.attempts = 0
    loadState.render.mockReset()
    loadState.render.mockResolvedValue({
      svg: '<svg viewBox="0 0 10 10"><text>Recovered</text></svg>',
    })
    vi.doMock('mermaid', () => ({
      get default() {
        loadState.attempts += 1
        if (loadState.attempts === 1) {
          throw new Error('Cannot find module "mermaid"')
        }
        return {
          initialize: loadState.initialize,
          render: loadState.render,
        }
      },
    }))

    const { renderMermaid } = await import('../../src/mermaid/runtime')

    const first = await renderMermaid('graph TD; A-->B')
    expect(first.error).toContain('Mermaid is not available')

    const second = await renderMermaid('graph TD; A-->B')
    expect(second.error).toBeUndefined()
    expect(second.nodes.length).toBeGreaterThan(0)
    expect(loadState.attempts).toBe(2)
  })
})
