import { describe, expect, it } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import MarkdownRenderer from '../../src/components/MarkdownRenderer.vue'
import { gfmPlugin } from '../../src/plugins/builtin'
import type { MarkdownPipeline } from '../../src/core/types'

function renderer(source: string, props: Record<string, unknown> = {}) {
  return mount(MarkdownRenderer, {
    props: { source, plugins: [gfmPlugin], ...props },
  })
}

describe('task items', () => {
  it('renders checked and unchecked task items and emits task-change', async () => {
    const wrapper = renderer('- [x] done\n- [ ] todo')
    await flushPromises()

    const items = wrapper.findAll('[data-vmd-part="task-item"]')
    expect(items).toHaveLength(2)
    const boxes = wrapper.findAll('input[type="checkbox"]')
    expect((boxes[0]?.element as HTMLInputElement).checked).toBe(true)
    expect((boxes[1]?.element as HTMLInputElement).checked).toBe(false)

    await boxes[1]!.setValue(true)
    const payload = wrapper.emitted('task-change')?.[0]?.[0] as {
      checked: boolean
    }
    expect(payload.checked).toBe(true)
  })

  it('honors a host li override for task items', async () => {
    const CustomItem = defineComponent({
      setup(_, { slots }) {
        return () => h('li', { 'data-custom-li': '' }, slots.default?.())
      },
    })
    const wrapper = renderer('- [x] done', { components: { li: CustomItem } })
    await flushPromises()
    expect(wrapper.find('[data-custom-li]').exists()).toBe(true)
    expect(wrapper.find('[data-vmd-part="task-item"]').exists()).toBe(false)
  })
})

describe('footnotes', () => {
  it('renders references, notes, and multiple back-links', async () => {
    const wrapper = renderer(
      'Text[^1] and again[^1].\n\n[^1]: Note body',
    )
    await flushPromises()

    expect(wrapper.findAll('[data-vmd-part="footnote-reference"]')).toHaveLength(2)
    const notes = wrapper.find('[data-vmd-part="footnotes"]')
    expect(notes.exists()).toBe(true)
    expect(notes.attributes('role')).toBe('doc-endnotes')
    expect(notes.text()).toContain('Note body')
  })

  it('marks a missing footnote target instead of presenting a valid link', async () => {
    const pipeline: MarkdownPipeline = {
      name: 'missing-footnote',
      processSync() {
        return {
          hast: {
            type: 'root',
            children: [
              {
                type: 'element',
                tagName: 'p',
                properties: {},
                children: [
                  {
                    type: 'element',
                    tagName: 'sup',
                    properties: { className: ['footnote-ref'] },
                    children: [
                      {
                        type: 'element',
                        tagName: 'a',
                        properties: { href: '#missing' },
                        children: [{ type: 'text', value: '1' }],
                      },
                    ],
                  },
                ],
              },
            ],
          },
        }
      },
      async process() {
        return this.processSync!('', {} as never)
      },
    }
    const wrapper = renderer('ignored', { pipeline })
    await flushPromises()
    expect(
      wrapper.find('[data-vmd-part="footnote-reference"]').attributes('data-state'),
    ).toBe('missing')
  })
})
