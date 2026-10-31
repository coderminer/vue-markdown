import { describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { h } from 'vue'
import MermaidLiveEditor from '../../src/components/MermaidLiveEditor.vue'
import type { MermaidRenderer } from '../../src/core/types'

const renderer: MermaidRenderer = {
  id: 'editor-test',
  render(source) {
    if (source.includes('broken')) {
      return { nodes: [], error: 'Parse error at line 2' }
    }
    return {
      svg: '<svg><text>preview</text></svg>',
      nodes: [],
    }
  },
}

describe('MermaidLiveEditor', () => {
  it('loads CodeMirror lazily for the default editor', async () => {
    const wrapper = mount(MermaidLiveEditor, {
      props: { modelValue: 'graph TD; A-->B', renderer, debounce: 0 },
    })
    await vi.waitFor(
      () => {
        expect(wrapper.find('.cm-editor').exists()).toBe(true)
      },
      { timeout: 5000 },
    )
    expect(wrapper.find('.cm-editor').exists()).toBe(true)
  })

  it('debounces previews and emits external updates', async () => {
    const wrapper = mount(MermaidLiveEditor, {
      props: {
        modelValue: 'graph TD; A-->B',
        renderer,
        debounce: 10,
      },
    })
    await flushPromises()
    await wrapper.setProps({ modelValue: 'graph TD; A-->C' })
    await new Promise((resolve) => setTimeout(resolve, 20))
    await flushPromises()
    expect(wrapper.emitted('preview')?.slice(-1)[0]?.[0]).toBe('graph TD; A-->C')
  })

  it('uses the editor slot for value updates and diagnostics', async () => {
    const wrapper = mount(MermaidLiveEditor, {
      props: {
        modelValue: 'graph TD; broken',
        renderer,
        debounce: 0,
      },
      slots: {
        editor: (ctx: {
          value: string
          update: (value: string) => void
          diagnostics: unknown[]
        }) =>
          h(
            'button',
            {
              'data-custom-editor': '',
              onClick: () => ctx.update('graph TD; A-->B'),
            },
            `${ctx.value}:${ctx.diagnostics.length}`,
          ),
      },
    })
    await flushPromises()
    await vi.waitFor(() => {
      expect(wrapper.find('[data-vmd-part="editor-diagnostics"]').text()).toContain(
        'Parse error',
      )
    })
    expect(wrapper.emitted('error')?.slice(-1)[0]?.[0]).toMatchObject({
      code: 'mermaid-error',
    })

    await wrapper.find('[data-custom-editor]').trigger('click')
    expect(wrapper.emitted('update:modelValue')?.slice(-1)[0]?.[0]).toBe(
      'graph TD; A-->B',
    )
  })

  it('removes fullscreen listeners and editor state on unmount', async () => {
    const remove = vi.spyOn(document, 'removeEventListener')
    const wrapper = mount(MermaidLiveEditor, {
      props: { modelValue: 'graph TD', renderer, debounce: 0 },
    })
    await flushPromises()
    const fullscreen = wrapper
      .findAll('button')
      .find((button) => button.text() === 'Fullscreen')
    await fullscreen!.trigger('click')
    wrapper.unmount()
    expect(remove).toHaveBeenCalledWith('keydown', expect.any(Function))
    remove.mockRestore()
  })

  it('supports diagnostics formatters, keyboard resizing, and fullscreen', async () => {
    const formatter = {
      format(error: unknown) {
        return {
          code: 'custom-mermaid',
          message: String(error),
          severity: 'error' as const,
          source: { start: { line: 2, column: 1 }, end: { line: 2, column: 1 } },
        }
      },
    }
    const wrapper = mount(MermaidLiveEditor, {
      props: {
        modelValue: 'graph TD; broken',
        renderer,
        debounce: 0,
        diagnosticsFormatter: formatter,
      },
    })
    await flushPromises()
    expect(wrapper.emitted('error')?.slice(-1)[0]?.[0]).toMatchObject({
      code: 'custom-mermaid',
    })

    const divider = wrapper.find('[data-vmd-part="editor-divider"]')
    const before = Number(divider.attributes('aria-valuenow'))
    await divider.trigger('keydown', { key: 'ArrowRight' })
    expect(Number(divider.attributes('aria-valuenow'))).toBeGreaterThan(before)
    await divider.trigger('keydown', { key: 'Home' })
    expect(Number(divider.attributes('aria-valuenow'))).toBe(50)

    const fullscreen = wrapper
      .findAll('button')
      .find((button) => button.text() === 'Fullscreen')
    await fullscreen!.trigger('click')
    expect(wrapper.attributes('data-fullscreen')).toBe('true')
  })
})
