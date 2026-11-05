import { describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { nextTick } from 'vue'

const destroy = vi.fn()
let resolveCreate: ((handle: unknown) => void) | undefined

vi.mock('../../src/editor/codemirror', () => ({
  createMermaidEditor: vi.fn(
    () =>
      new Promise((resolve) => {
        resolveCreate = resolve
      }),
  ),
}))

import MermaidLiveEditor from '../../src/components/MermaidLiveEditor.vue'

describe('MermaidLiveEditor mount race', () => {
  it('destroys an editor that finishes loading after unmount', async () => {
    const wrapper = mount(MermaidLiveEditor, {
      props: { modelValue: 'graph TD', debounce: 0 },
    })
    await nextTick()
    await nextTick()
    await flushPromises()

    wrapper.unmount()
    resolveCreate?.({
      destroy,
      focus: vi.fn(),
      setValue: vi.fn(),
      focusLine: vi.fn(),
    })
    await flushPromises()

    expect(destroy).toHaveBeenCalledTimes(1)
  })
})
