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
        'Mermaid syntax error near line 2.',
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
    expect(document.body.style.overflow).toBe('hidden')
    wrapper.unmount()
    expect(remove).toHaveBeenCalledWith('keydown', expect.any(Function))
    expect(document.body.style.overflow).toBe('')
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
    expect(wrapper.attributes('aria-label')).toBe('Mermaid editor')
    expect(divider.attributes('aria-label')).toBe('Resize editor')
    expect(divider.attributes('aria-valuemin')).toBe('20')
    expect(divider.attributes('aria-valuemax')).toBe('80')
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
    expect(document.body.style.overflow).toBe('hidden')
    expect(wrapper.find('[data-vmd-part="editor-fullscreen"]').exists()).toBe(
      true,
    )
    wrapper.unmount()
    expect(document.body.style.overflow).toBe('')
  })

  it('tolerates non-string model values', async () => {
    const wrapper = mount(MermaidLiveEditor, {
      props: {
        modelValue: null as unknown as string,
        renderer,
        debounce: 0,
      },
    })
    expect(wrapper.find('[data-vmd-part="editor-empty"]').exists()).toBe(true)

    await wrapper.setProps({ modelValue: 42 as unknown as string })
    await flushPromises()
    expect(wrapper.find('[data-vmd-part="editor-empty"]').exists()).toBe(true)

    await wrapper.setProps({ modelValue: 'graph TD' })
    await vi.waitFor(() => {
      expect(wrapper.find('[data-vmd-part="editor-empty"]').exists()).toBe(
        false,
      )
    })
  })

  it('does not lock scrolling when a fullscreen request resolves after unmount', async () => {
    const proto = HTMLElement.prototype as unknown as {
      requestFullscreen?: () => Promise<void>
    }
    const original = proto.requestFullscreen
    let resolveRequest: (() => void) | undefined
    proto.requestFullscreen = () =>
      new Promise<void>((resolve) => {
        resolveRequest = resolve
      })

    const wrapper = mount(MermaidLiveEditor, {
      props: { modelValue: 'graph TD', renderer, debounce: 0 },
    })
    await flushPromises()
    const fullscreen = wrapper
      .findAll('button')
      .find((button) => button.text() === 'Fullscreen')
    await fullscreen!.trigger('click')
    expect(document.body.style.overflow).toBe('')

    wrapper.unmount()
    resolveRequest?.()
    await flushPromises()
    expect(document.body.style.overflow).toBe('')

    if (original) proto.requestFullscreen = original
    else delete proto.requestFullscreen
  })

  it('shares the page scroll lock across fullscreen editors', async () => {
    const first = mount(MermaidLiveEditor, {
      props: { modelValue: 'graph TD', renderer, debounce: 0 },
    })
    const second = mount(MermaidLiveEditor, {
      props: { modelValue: 'graph TD', renderer, debounce: 0 },
    })
    await flushPromises()
    expect(document.body.style.overflow).toBe('')

    const fullscreenButton = (wrapper: typeof first) =>
      wrapper.findAll('button').find((button) => button.text() === 'Fullscreen')!

    await fullscreenButton(first).trigger('click')
    expect(document.body.style.overflow).toBe('hidden')

    await fullscreenButton(second).trigger('click')
    expect(document.body.style.overflow).toBe('hidden')

    first.unmount()
    expect(document.body.style.overflow).toBe('hidden')

    second.unmount()
    expect(document.body.style.overflow).toBe('')
  })

  it('ignores unrelated fullscreen changes in CSS fallback mode', async () => {
    const wrapper = mount(MermaidLiveEditor, {
      props: { modelValue: 'graph TD', renderer, debounce: 0 },
    })
    await flushPromises()
    const fullscreen = wrapper
      .findAll('button')
      .find((button) => button.text() === 'Fullscreen')
    await fullscreen!.trigger('click')
    expect(wrapper.attributes('data-fullscreen')).toBe('true')

    document.dispatchEvent(new Event('fullscreenchange'))
    await flushPromises()
    expect(wrapper.attributes('data-fullscreen')).toBe('true')

    wrapper.unmount()
    expect(document.body.style.overflow).toBe('')
  })

  it('shows an empty preview placeholder and empty slot', async () => {
    const empty = mount(MermaidLiveEditor, {
      props: { modelValue: '', renderer, debounce: 0 },
    })
    expect(empty.find('[data-vmd-part="editor-empty"]').text()).toContain(
      'Nothing to preview yet.',
    )

    const custom = mount(MermaidLiveEditor, {
      props: { modelValue: '', renderer, debounce: 0 },
      slots: {
        empty: () => h('p', { 'data-custom-empty': '' }, 'Nothing here'),
      },
    })
    expect(custom.find('[data-custom-empty]').text()).toBe('Nothing here')
  })

  it('exposes toolbar, fullscreen, and preview slots', async () => {
    const preview = mount(MermaidLiveEditor, {
      props: { modelValue: 'graph TD; A-->B', renderer, debounce: 0 },
      slots: {
        preview: (ctx: { status: string; nodes: unknown[]; error?: string }) =>
          h(
            'div',
            { 'data-custom-preview': '' },
            `${ctx.status}:${ctx.nodes.length}:${ctx.error ?? 'none'}`,
          ),
      },
    })
    await flushPromises()
    await vi.waitFor(() => {
      expect(preview.find('[data-custom-preview]').text()).toContain('ready')
    })

    const toolbar = mount(MermaidLiveEditor, {
      props: { modelValue: 'graph TD', renderer, debounce: 0 },
      slots: {
        toolbar: (ctx: { ratio: number }) =>
          h('div', { 'data-custom-toolbar': '' }, `ratio:${ctx.ratio}`),
      },
    })
    expect(toolbar.find('[data-custom-toolbar]').text()).toBe('ratio:0.5')
    expect(
      toolbar.find('[data-vmd-part="editor-toolbar"]').find('button').exists(),
    ).toBe(false)

    const fullscreen = mount(MermaidLiveEditor, {
      props: { modelValue: 'graph TD', renderer, debounce: 0 },
      slots: {
        fullscreen: (ctx: { fullscreen: boolean }) =>
          h('button', { 'data-custom-fullscreen': '' }, `fullscreen:${ctx.fullscreen}`),
      },
    })
    expect(fullscreen.find('[data-custom-fullscreen]').text()).toBe(
      'fullscreen:false',
    )

    const combined = mount(MermaidLiveEditor, {
      props: { modelValue: 'graph TD', renderer, debounce: 0 },
      slots: {
        toolbar: () => h('span', { 'data-custom-toolbar': '' }, 'toolbar'),
        fullscreen: (ctx: { fullscreen: boolean }) =>
          h(
            'button',
            { 'data-custom-fullscreen': '' },
            `fullscreen:${ctx.fullscreen}`,
          ),
      },
    })
    expect(combined.find('[data-custom-toolbar]').text()).toBe('toolbar')
    expect(combined.find('[data-custom-fullscreen]').text()).toBe(
      'fullscreen:false',
    )
  })

  it('marks the diagnostics panel in compact mode', async () => {
    const wrapper = mount(MermaidLiveEditor, {
      props: {
        modelValue: 'graph TD; broken',
        renderer,
        debounce: 0,
        compact: true,
      },
    })
    await flushPromises()
    expect(
      wrapper
        .find('[data-vmd-part="editor-diagnostics"]')
        .attributes('data-compact'),
    ).toBe('true')
  })

  it('exposes raw parser details only when enabled', async () => {
    const hidden = mount(MermaidLiveEditor, {
      props: { modelValue: 'graph TD; broken', renderer, debounce: 0 },
    })
    await flushPromises()
    expect(hidden.find('.vmd-editor-diagnostic-details').exists()).toBe(false)

    const shown = mount(MermaidLiveEditor, {
      props: {
        modelValue: 'graph TD; broken',
        renderer,
        debounce: 0,
        rawDetails: true,
      },
    })
    await flushPromises()
    expect(shown.find('.vmd-editor-diagnostic-details').text()).toContain(
      'Parse error at line 2',
    )
  })
})
