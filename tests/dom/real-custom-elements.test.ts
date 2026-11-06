import { describe, expect, it } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import MarkdownRenderer from '../../src/components/MarkdownRenderer.vue'
import { customTagsPlugin, fullPlugins } from '../../src/plugins/builtin'
import { htmlPlugin } from '../../src/html'
import { customElementsMarkdown } from '../fixtures/custom-elements'

const plugins = [
  ...fullPlugins.filter((plugin) => plugin.name !== 'custom-tags'),
  customTagsPlugin({ tags: ['x-note', 'x-callout'] }),
  htmlPlugin({
    schema: {
      tags: ['x-note', 'x-callout'],
      attributes: {
        'x-note': ['tone', 'title', 'start-line', 'href'],
        'x-callout': ['kind'],
      },
    },
  }),
]

const Note = defineComponent({
  props: { tone: String, title: String, startLine: String },
  setup(props, { slots, attrs }) {
    return () =>
      h(
        'aside',
        {
          ...attrs,
          'data-testid': attrs['data-testid'],
          'data-tone': props.tone,
          'data-title': props.title,
          'data-start-line': props.startLine,
        },
        slots.default?.(),
      )
  },
})

const Callout = defineComponent({
  props: { kind: String },
  setup(props, { slots, attrs }) {
    return () =>
      h(
        'section',
        {
          ...attrs,
          'data-testid': attrs['data-testid'],
          'data-kind': props.kind,
        },
        slots.default?.(),
      )
  },
})

async function render() {
  const wrapper = mount(MarkdownRenderer, {
    props: {
      source: customElementsMarkdown,
      plugins,
      components: { 'x-note': Note, 'x-callout': Callout },
    },
  })
  await flushPromises()
  return wrapper
}

describe('real custom elements', () => {
  it('maps custom tags to host components and renders nested slots', async () => {
    const wrapper = await render()
    const notes = wrapper.findAllComponents(Note)
    const callouts = wrapper.findAllComponents(Callout)

    expect(notes).toHaveLength(2)
    expect(callouts).toHaveLength(1)

    const info = notes[0]!
    expect(info.props('tone')).toBe('info')
    expect(info.props('title')).toBe('Heads up')
    expect(info.props('startLine')).toBe('12')
    expect(info.attributes('data-testid')).toBe('deploy-note')
    expect(info.text()).toContain('Run npm run build:lib before tagging.')
    expect(info.text()).toContain('Keep the changelog in sync.')

    const nested = callouts[0]!
    expect(nested.props('kind')).toBe('warning')
    expect(nested.attributes('data-testid')).toBe('nested-callout')
    expect(nested.text()).toContain('Keep the changelog in sync.')
    expect(info.html()).toContain('<section')

    const unsafe = notes[1]!
    expect(unsafe.text()).toContain('Sanitized but still visible.')
    expect(unsafe.attributes('onclick')).toBeUndefined()
    expect(unsafe.attributes('style')).toBeUndefined()
    expect(unsafe.attributes('href')).toBeUndefined()
  })

  it('does not let hostile custom-element attributes reach the DOM', async () => {
    const wrapper = await render()
    const html = wrapper.html()

    expect(html).not.toContain('onclick')
    expect(html).not.toContain('javascript:')
    expect(html).not.toContain('style="color:red"')
    expect(wrapper.findAll('[style]')).toHaveLength(0)
    expect(wrapper.findAll('[href="javascript:alert(2)"]')).toHaveLength(0)
  })

  it('emits safe click payloads for nested and hostile custom tags', async () => {
    const wrapper = await render()
    const notes = wrapper.findAllComponents(Note)
    const callouts = wrapper.findAllComponents(Callout)

    await callouts[0]!.trigger('click')
    const payloads = (wrapper.emitted('custom-tag-click') ?? []).map(
      (event) => event[0] as { tag: string; props: Record<string, unknown> },
    )
    expect(payloads.map((payload) => payload.tag)).toContain('x-callout')
    expect(
      payloads.find((payload) => payload.tag === 'x-callout')?.props,
    ).toEqual({ kind: 'warning', 'data-testid': 'nested-callout' })

    wrapper.emitted('custom-tag-click')?.splice(0)
    await notes[1]!.trigger('click')
    const unsafe = wrapper.emitted('custom-tag-click')?.[0]?.[0] as {
      tag: string
      props: Record<string, unknown>
    }
    expect(unsafe.tag).toBe('x-note')
    expect(unsafe.props).toEqual({
      tone: 'danger',
      title: 'Unsafe attrs',
    })
  })
})
