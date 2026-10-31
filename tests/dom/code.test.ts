import { afterEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { Comment, defineComponent, h } from 'vue'
import CodeBlock from '../../src/components/CodeBlock.vue'
import MarkdownRenderer from '../../src/components/MarkdownRenderer.vue'
import VueSyntaxHighlighter from '../../src/components/VueSyntaxHighlighter.vue'
import type { MarkdownHighlighter } from '../../src/core/types'

const customHighlighter: MarkdownHighlighter = {
  id: 'test-highlighter',
  highlight(code, language) {
    return {
      language,
      nodes: [
        {
          kind: 'element',
          key: 'token',
          tag: 'span',
          attrs: { class: 'test-token' },
          children: [{ kind: 'text', key: 'token-text', value: code }],
        },
      ],
    }
  },
}

function mountBlock(props: Record<string, unknown> = {}, slots = {}) {
  return mount(CodeBlock, {
    props: {
      node: { kind: 'code', key: '0', code: 'const x = 1', language: 'ts' },
      code: 'const x = 1',
      language: 'ts',
      highlighter: customHighlighter,
      ...props,
    },
    slots,
  })
}

describe('CodeBlock', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders the language label, highlighted nodes, and adapter identity', async () => {
    const wrapper = mountBlock()
    await flushPromises()
    expect(wrapper.attributes('data-language')).toBe('ts')
    expect(wrapper.attributes('data-highlighter')).toBe('test-highlighter')
    expect(wrapper.find('.test-token').text()).toBe('const x = 1')
  })

  it('applies a local theme override to the block and highlighter', async () => {
    const themes: Array<string | undefined> = []
    const themeHighlighter: MarkdownHighlighter = {
      id: 'theme-highlighter',
      highlight(code, language, options) {
        themes.push(options.theme)
        return {
          language,
          nodes: [{ kind: 'text', key: 'x', value: code }],
        }
      },
    }
    const wrapper = mountBlock({ theme: 'dark', highlighter: themeHighlighter })
    await flushPromises()
    expect(wrapper.attributes('data-vmd-theme')).toBe('dark')
    expect(themes).toEqual(['dark'])
  })

  it('falls back to plain text for an unknown language or invalid adapter', async () => {
    const unknown: MarkdownHighlighter = {
      id: 'unknown',
      highlight(code) {
        return { language: '', nodes: [{ kind: 'text', key: 'x', value: code }] }
      },
    }
    const wrapper = mountBlock({ language: 'nope', highlighter: unknown })
    await flushPromises()
    expect(wrapper.text()).toContain('const x = 1')

    const invalid = { id: 'bad' } as unknown as MarkdownHighlighter
    const fallback = mountBlock({ highlighter: invalid })
    await flushPromises()
    expect(fallback.text()).toContain('const x = 1')
  })

  it('reports highlighter readiness failures with a diagnostic', async () => {
    const broken: MarkdownHighlighter = {
      id: 'broken',
      async load() {
        throw new Error('missing grammar')
      },
      highlight(code, language) {
        return {
          language,
          nodes: [{ kind: 'text', key: 'x', value: code }],
        }
      },
    }
    const wrapper = mount(VueSyntaxHighlighter, {
      props: { source: 'x', highlighter: broken },
    })
    await flushPromises()
    const error = wrapper.emitted('error')?.[0]?.[0] as
      | { code: string; message: string }
      | undefined
    expect(error?.code).toBe('highlighter-load')
    expect(error?.message).toContain('missing grammar')
  })

  it(
    'loads the default highlight.js adapter lazily',
    async () => {
      const wrapper = mountBlock({ highlighter: undefined })
      await vi.waitFor(
        () => {
          expect(wrapper.attributes('data-highlighter')).toBe('highlight.js')
        },
        { timeout: 12000 },
      )
      expect(wrapper.find('.hljs-keyword').exists()).toBe(true)
    },
    15000,
  )

  it('renders built-in icon actions with accessible labels', async () => {
    const wrapper = mountBlock()
    await flushPromises()
    expect(
      wrapper.find('[data-vmd-part="code-heading"] svg.vmd-icon').exists(),
    ).toBe(true)
    expect(
      wrapper.find('[data-action="copy"] svg.vmd-icon').exists(),
    ).toBe(true)
    expect(wrapper.find('[data-action="copy"]').attributes('aria-label')).toBe(
      'Copy',
    )
    expect(
      wrapper.find('[data-action="download"] svg.vmd-icon').exists(),
    ).toBe(true)
    expect(
      wrapper.find('[data-action="download"]').attributes('aria-label'),
    ).toBe('Download')
  })

  it('copies source and emits copy', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    })
    const wrapper = mountBlock()
    await wrapper.find('[data-action="copy"]').trigger('click')
    await flushPromises()
    expect(writeText).toHaveBeenCalledWith('const x = 1')
    expect(wrapper.emitted('copy')?.[0]).toEqual(['const x = 1'])
  })

  it('replaces code and actions through slots', async () => {
    const wrapper = mountBlock(
      {},
      {
        code: (ctx: { source: string; language: string }) =>
          h('mark', { 'data-custom-code': '' }, `${ctx.language}:${ctx.source}`),
        'code-actions': (ctx: { actions: { copy: unknown } }) =>
          h('span', { 'data-custom-actions': '' }, typeof ctx.actions.copy),
      },
    )
    await flushPromises()
    expect(wrapper.find('[data-custom-code]').text()).toBe('ts:const x = 1')
    expect(wrapper.find('[data-custom-actions]').text()).toBe('function')
  })

  it('keeps custom actions when default actions are hidden', async () => {
    const run = vi.fn()
    const wrapper = mountBlock({
      showActions: false,
      actions: [{ key: 'log', label: 'Log', run }],
    })
    await flushPromises()
    expect(wrapper.find('[data-action="copy"]').exists()).toBe(false)
    const action = wrapper.find('[data-action="log"]')
    expect(action.exists()).toBe(true)
    await action.trigger('click')
    expect(run).toHaveBeenCalledTimes(1)
    expect(wrapper.emitted('action')?.[0]).toEqual(['log'])
  })

  it('treats a comment-only conditional slot as empty', async () => {
    const wrapper = mountBlock(
      {
        showActions: false,
        actions: [{ key: 'log', label: 'Log', run: vi.fn() }],
      },
      { 'code-actions': () => h(Comment) },
    )
    await flushPromises()
    expect(wrapper.find('[data-action="log"]').exists()).toBe(true)
  })

  it('exposes highlighted nodes and lines to the code slot', async () => {
    const wrapper = mountBlock(
      {},
      {
        code: (ctx: {
          nodes: unknown[]
          highlighted: { language: string }
          lines: unknown[]
        }) =>
          h(
            'span',
            { 'data-custom-code': '' },
            `${ctx.highlighted.language}:${ctx.nodes.length}:${ctx.lines.length}`,
          ),
      },
    )
    await flushPromises()
    expect(wrapper.find('[data-custom-code]').text()).toBe('ts:1:1')
  })

  it('renders a custom header and a file name', async () => {
    const named = mountBlock({ fileName: 'demo.ts' })
    await flushPromises()
    expect(named.find('[data-vmd-part="code-file-name"]').text()).toBe(
      'demo.ts',
    )
    expect(named.find('[data-vmd-part="code-lang"]').text()).toBe('ts')

    const custom = mountBlock(
      {},
      {
        header: () =>
          h('div', { 'data-custom-header': '' }, 'Custom header'),
      },
    )
    await flushPromises()
    expect(custom.find('[data-custom-header]').text()).toBe('Custom header')
    expect(custom.find('[data-vmd-part="code-lang"]').exists()).toBe(false)
  })

  it('supports line numbers, highlighted lines, and truncation', async () => {
    const wrapper = mountBlock({
      code: 'a\nb\nc\nd',
      lineNumbers: true,
      highlightLines: [2],
      maxLines: 2,
    })
    await flushPromises()
    expect(
      wrapper.findAll('[data-vmd-part="highlighter-line"]'),
    ).toHaveLength(2)
    expect(
      wrapper
        .findAll('[data-vmd-part="highlighter-gutter"]')
        .map((node) => node.text()),
    ).toEqual(['1', '2'])
    expect(
      wrapper.find('[data-line="2"]').attributes('data-highlighted'),
    ).toBe('true')
    await wrapper
      .find('[data-vmd-part="highlighter-toggle"]')
      .trigger('click')
    expect(
      wrapper.findAll('[data-vmd-part="highlighter-line"]'),
    ).toHaveLength(4)
  })

  it('reports clipboard and action failures', async () => {
    const writeText = vi.fn().mockRejectedValue(new Error('denied'))
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    })
    const wrapper = mountBlock({
      actions: [
        {
          key: 'boom',
          label: 'Boom',
          run() {
            throw new Error('nope')
          },
        },
      ],
    })
    await wrapper.find('[data-action="copy"]').trigger('click')
    await flushPromises()
    await wrapper.find('[data-action="boom"]').trigger('click')
    await flushPromises()

    const errors = (wrapper.emitted('error') ?? []).map(
      (event) => event[0] as { code: string; message: string },
    )
    expect(errors.map((error) => error.code)).toEqual([
      'copy-error',
      'action-error',
    ])
    expect(errors[0]?.message).toContain('denied')
    expect(errors[1]?.message).toContain('nope')
    expect(wrapper.emitted('action')).toBeUndefined()
  })

  it('does not recurse when a codeBlock region renders CodeBlock', async () => {
    const Region = defineComponent({
      setup() {
        return () =>
          h(CodeBlock, {
            code: 'const x = 1',
            language: 'ts',
            highlighter: customHighlighter,
          })
      },
    })
    const wrapper = mount(MarkdownRenderer, {
      props: {
        source: '```ts\nconst x = 1\n```',
        regions: { codeBlock: Region },
        highlighter: customHighlighter,
      },
    })
    await flushPromises()
    expect(wrapper.findAll('.vmd-code-block')).toHaveLength(1)
  })

  it('lets a region wrapper opt out of region resolution', async () => {
    const Region = defineComponent({
      setup() {
        return () =>
          h('section', { 'data-region': '' }, [
            h(CodeBlock, {
              code: 'const x = 1',
              language: 'ts',
              highlighter: customHighlighter,
              standalone: true,
            }),
          ])
      },
    })
    const wrapper = mount(MarkdownRenderer, {
      props: {
        source: '```ts\nconst x = 1\n```',
        regions: { codeBlock: Region },
        highlighter: customHighlighter,
      },
    })
    await flushPromises()
    expect(wrapper.find('[data-region]').exists()).toBe(true)
    expect(wrapper.findAll('.vmd-code-block')).toHaveLength(1)
  })
})

describe('VueSyntaxHighlighter', () => {
  it('renders line numbers, highlighted lines, and empty input', async () => {
    const wrapper = mount(VueSyntaxHighlighter, {
      props: {
        source: 'one\ntwo\nthree',
        language: 'ts',
        highlighter: customHighlighter,
        lineNumbers: true,
        highlightLines: [2],
      },
    })
    await flushPromises()
    expect(wrapper.findAll('[data-vmd-part="highlighter-line"]')).toHaveLength(3)
    expect(wrapper.findAll('[data-vmd-part="highlighter-gutter"]').map((n) => n.text())).toEqual([
      '1',
      '2',
      '3',
    ])
    expect(
      wrapper.find('[data-line="2"]').attributes('data-highlighted'),
    ).toBe('true')

    const empty = mount(VueSyntaxHighlighter, { props: { source: '' } })
    await flushPromises()
    expect(empty.find('[data-vmd-part="highlighter-empty"]').exists()).toBe(true)
  })

  it('expands truncated output on request', async () => {
    const wrapper = mount(VueSyntaxHighlighter, {
      props: {
        source: 'a\nb\nc\nd',
        highlighter: customHighlighter,
        maxLines: 2,
      },
    })
    await flushPromises()
    expect(wrapper.findAll('[data-vmd-part="highlighter-line"]')).toHaveLength(2)
    await wrapper.find('[data-vmd-part="highlighter-toggle"]').trigger('click')
    expect(wrapper.findAll('[data-vmd-part="highlighter-line"]')).toHaveLength(4)
    expect(wrapper.find('[data-vmd-part="highlighter-toggle"]').text()).toBe(
      'Show less',
    )
  })

  it('truncates and supports a custom highlighter slot', async () => {
    const wrapper = mount(
      VueSyntaxHighlighter,
      {
        props: {
          source: 'a\nb\nc\nd',
          highlighter: customHighlighter,
          maxLines: 2,
        },
        slots: {
          highlighter: (ctx: { source: string }) =>
            h('div', { 'data-custom-highlighter': '' }, ctx.source.length.toString()),
        },
      },
    )
    await flushPromises()
    expect(wrapper.find('[data-custom-highlighter]').text()).toBe('7')
  })

  it('reports clipboard failures', async () => {
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: vi.fn().mockRejectedValue(new Error('denied')),
      },
    })
    const wrapper = mount(VueSyntaxHighlighter, {
      props: { source: 'x', highlighter: customHighlighter },
    })
    await wrapper.vm.copy()
    const error = wrapper.emitted('error')?.[0]?.[0] as
      | { code: string }
      | undefined
    expect(error?.code).toBe('copy-error')
  })
})
