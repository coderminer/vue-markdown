import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent, h, nextTick } from 'vue'
import MarkdownRenderer from '../../src/components/MarkdownRenderer.vue'
import type { MarkdownPipeline, PipelineResult } from '../../src/core/types'

function captureWarnings() {
  const warnings: string[] = []
  const spy = vi.spyOn(console, 'warn').mockImplementation((...args: unknown[]) => {
    warnings.push(args.map(String).join(' '))
  })
  return {
    childrenWarnings: () =>
      warnings.filter((warning) => warning.includes('children')),
    restore: () => spy.mockRestore(),
  }
}

describe('element component props', () => {
  it('does not pass node children to a string tag override', async () => {
    const capture = captureWarnings()
    const wrapper = mount(MarkdownRenderer, {
      props: { source: '# Title', components: { h1: 'h2' } },
    })
    await nextTick()
    capture.restore()

    expect(wrapper.find('h2').attributes('children')).toBeUndefined()
    expect(capture.childrenWarnings()).toEqual([])
  })

  it('does not leak node children to a host component that does not declare them', async () => {
    const Badge = defineComponent({
      props: { node: { type: Object, default: undefined } },
      setup(_props, { slots }) {
        return () => h('span', { class: 'badge' }, slots.default?.())
      },
    })
    const capture = captureWarnings()
    const wrapper = mount(MarkdownRenderer, {
      props: { source: '# Title', components: { h1: Badge } },
    })
    await nextTick()
    capture.restore()

    const badge = wrapper.find('.badge')
    expect(badge.exists()).toBe(true)
    expect(badge.text()).toBe('Title')
    expect(badge.attributes('children')).toBeUndefined()
    expect(capture.childrenWarnings()).toEqual([])
  })

  it('keeps passing the node children to components that declare the prop', async () => {
    const List = defineComponent({
      props: {
        node: { type: Object, default: undefined },
        children: { type: Array, default: () => [] },
      },
      setup(props, { slots }) {
        return () =>
          h(
            'h1',
            { 'data-child-count': props.children.length },
            slots.default?.(),
          )
      },
    })
    const wrapper = mount(MarkdownRenderer, {
      props: { source: '# Title **bold**', components: { h1: List } },
    })
    await nextTick()

    expect(wrapper.find('h1').attributes('data-child-count')).toBe('2')
  })

  it('does not leak a children attribute on the unknown-tag fallback', async () => {
    const result = (): PipelineResult => ({
      hast: {
        type: 'root',
        children: [
          {
            type: 'element',
            tagName: 'x-widget',
            properties: { children: 'oops' },
            children: [{ type: 'text', value: 'hi' }],
          },
        ],
      },
    })
    const pipeline: MarkdownPipeline = {
      name: 'unknown-tag',
      capabilities: { sync: true },
      async process() {
        return result()
      },
      processSync() {
        return result()
      },
    }

    const wrapper = mount(MarkdownRenderer, {
      props: { source: 'ignored', pipeline },
    })
    await nextTick()

    const widget = wrapper.find('x-widget')
    expect(widget.exists()).toBe(true)
    expect(widget.attributes('children')).toBeUndefined()
    expect(widget.text()).toBe('hi')
  })
})
