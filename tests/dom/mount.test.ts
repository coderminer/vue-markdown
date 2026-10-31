import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import MarkdownRenderer from '../../src/components/MarkdownRenderer.vue'

describe('MarkdownRenderer', () => {
  it('mounts and renders source', () => {
    const wrapper = mount(MarkdownRenderer, {
      props: { source: '# Title\n\nHello **world**' },
    })
    expect(wrapper.find('h1').text()).toContain('Title')
    expect(wrapper.find('strong').text()).toBe('world')
  })

  it('accepts Markdown through the default slot', () => {
    const wrapper = mount(MarkdownRenderer, {
      slots: { default: '## From slot' },
    })
    expect(wrapper.find('h2').text()).toContain('From slot')
  })

  it('applies tag overrides', () => {
    const wrapper = mount(MarkdownRenderer, {
      props: { source: '# Title', components: { h1: 'h2' } },
    })
    expect(wrapper.find('h2').exists()).toBe(true)
    expect(wrapper.find('h1').exists()).toBe(false)
  })

  it('renders a custom link component', () => {
    const MyLink = defineComponent({
      props: { href: String },
      setup(props, { slots }) {
        return () => h('a', { 'data-custom': 'yes', href: props.href }, slots.default?.())
      },
    })
    const wrapper = mount(MarkdownRenderer, {
      props: {
        source: '[docs](https://example.com)',
        components: { a: MyLink },
      },
    })
    expect(wrapper.find('a[data-custom="yes"]').attributes('href')).toBe(
      'https://example.com',
    )
  })

  it('drops raw HTML by default', () => {
    const wrapper = mount(MarkdownRenderer, {
      props: { source: '<script>alert(1)</script>\n\nHello' },
    })
    expect(wrapper.html()).not.toContain('<script')
    expect(wrapper.text()).toContain('Hello')
  })

  it('exposes actions', () => {
    const wrapper = mount(MarkdownRenderer, {
      props: { source: '# Title' },
    })
    const vm = wrapper.vm as unknown as {
      getDocument: () => { toc: Array<{ id: string }> }
      getToc: () => Array<{ id: string }>
    }
    expect(vm.getDocument().toc[0]?.id).toBe('title')
    expect(vm.getToc()[0]?.id).toBe('title')
  })
})
