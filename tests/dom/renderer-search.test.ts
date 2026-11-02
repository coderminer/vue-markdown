import { describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import MarkdownRenderer from '../../src/components/MarkdownRenderer.vue'

const countSpy = vi.hoisted(() => vi.fn())

vi.mock('../../src/core/search', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('../../src/core/search')>()
  return {
    ...actual,
    countSearchMatches(
      nodes: Parameters<typeof actual.countSearchMatches>[0],
    ): number {
      countSpy()
      return actual.countSearchMatches(nodes)
    },
  }
})

describe('renderer search counting', () => {
  it('does not walk the document for an empty query', async () => {
    countSpy.mockClear()
    const wrapper = mount(MarkdownRenderer, {
      props: { source: '# Hello\n\nBody with hello' },
    })
    await flushPromises()
    await flushPromises()
    expect(countSpy).not.toHaveBeenCalled()

    await wrapper.setProps({ search: 'hello' })
    await flushPromises()
    await flushPromises()
    expect(countSpy).toHaveBeenCalled()

    countSpy.mockClear()
    await wrapper.setProps({ search: '' })
    await flushPromises()
    await flushPromises()
    expect(countSpy).not.toHaveBeenCalled()
  })
})
