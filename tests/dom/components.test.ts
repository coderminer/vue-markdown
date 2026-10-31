import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent, h, nextTick, onMounted } from 'vue'
import MarkdownBlockquote from '../../src/components/MarkdownBlockquote.vue'
import MarkdownBreak from '../../src/components/MarkdownBreak.vue'
import MarkdownChildren from '../../src/components/MarkdownChildren'
import MarkdownCode from '../../src/components/MarkdownCode.vue'
import MarkdownContent from '../../src/components/MarkdownContent.vue'
import MarkdownCustomTag from '../../src/components/MarkdownCustomTag.vue'
import MarkdownEmphasis from '../../src/components/MarkdownEmphasis.vue'
import MarkdownEmpty from '../../src/components/MarkdownEmpty.vue'
import MarkdownError from '../../src/components/MarkdownError.vue'
import MarkdownHeading from '../../src/components/MarkdownHeading.vue'
import MarkdownHorizontalRule from '../../src/components/MarkdownHorizontalRule.vue'
import MarkdownHtml from '../../src/components/MarkdownHtml.vue'
import MarkdownImage from '../../src/components/MarkdownImage.vue'
import MarkdownInlineCode from '../../src/components/MarkdownInlineCode.vue'
import MarkdownLink from '../../src/components/MarkdownLink.vue'
import MarkdownList from '../../src/components/MarkdownList.vue'
import MarkdownListItem from '../../src/components/MarkdownListItem.vue'
import MarkdownLoading from '../../src/components/MarkdownLoading.vue'
import MarkdownParagraph from '../../src/components/MarkdownParagraph.vue'
import MarkdownRenderer from '../../src/components/MarkdownRenderer.vue'
import MarkdownRoot from '../../src/components/MarkdownRoot.vue'
import MarkdownStrikethrough from '../../src/components/MarkdownStrikethrough.vue'
import MarkdownStrong from '../../src/components/MarkdownStrong.vue'
import MarkdownTable from '../../src/components/MarkdownTable.vue'
import MarkdownTableCell from '../../src/components/MarkdownTableCell.vue'
import MarkdownTableRow from '../../src/components/MarkdownTableRow.vue'
import MarkdownTableSection from '../../src/components/MarkdownTableSection.vue'
import MarkdownToc from '../../src/components/MarkdownToc.vue'
import MarkdownTocItem from '../../src/components/MarkdownTocItem.vue'
import { RENDER_CONTEXT, type RenderContext } from '../../src/components/context'
import { DEFAULT_LABELS } from '../../src/core/labels'
import type { MarkdownNode } from '../../src/core/types'

const textNode: MarkdownNode = { kind: 'text', key: '0', value: 'plain text' }

function node(tag: string): MarkdownNode {
  return {
    kind: 'element',
    key: '0',
    tag,
    attrs: {},
    children: [textNode],
  }
}

function renderContext(overrides: Partial<RenderContext> = {}): RenderContext {
  return {
    components: {},
    labels: DEFAULT_LABELS,
    linkTarget: '_self',
    externalLinkTarget: '_self',
    renderHostSlot: (_name, _props, fallback) => fallback(),
    onLinkClick: vi.fn(),
    onCustomTagClick: vi.fn(),
    onTaskChange: vi.fn(),
    ...overrides,
  }
}

describe('standalone shell components', () => {
  it('renders the root, content, and text fast path', () => {
    const root = mount(MarkdownRoot, {
      props: {
        tokens: { '--vmd-color-text': 'rgb(1, 2, 3)' },
        theme: 'dark',
      },
      slots: { default: '<p>inside</p>' },
    })
    expect(root.classes()).toContain('vmd-root')
    expect(root.attributes('style')).toContain('--vmd-color-text')
    expect(root.attributes('data-vmd-theme')).toBe('dark')

    const light = mount(MarkdownRoot)
    expect(light.attributes('data-vmd-theme')).toBe('light')

    const custom = mount(MarkdownRoot, { props: { theme: 'custom' } })
    expect(custom.attributes('data-vmd-theme')).toBe('custom')

    const content = mount(MarkdownContent, { slots: { default: 'content' } })
    expect(content.text()).toBe('content')

    const children = mount(MarkdownChildren, { props: { nodes: [textNode] } })
    expect(children.text()).toBe('plain text')
  })

  it('renders TOC items, active state, depth, and navigation', async () => {
    const toc = mount(MarkdownToc, {
      props: {
        items: [
          { id: 'one', text: 'One', level: 1 },
          { id: 'two', text: 'Two', level: 2 },
        ],
        activeId: 'two',
        label: 'Contents',
      },
    })
    expect(toc.attributes('aria-label')).toBe('Contents')
    const links = toc.findAll('a[data-vmd-part="toc-item"]')
    expect(links).toHaveLength(2)
    expect(links[1]?.attributes('aria-current')).toBe('true')
    expect(links[1]?.attributes('style')).toContain('--vmd-toc-depth: 2')

    await links[0]!.trigger('click')
    expect(toc.emitted('navigate')?.[0]).toEqual(['one'])
  })

  it('uses a provided tocItem component for every entry', () => {
    const Item = defineComponent({
      props: { item: Object, active: Boolean },
      emits: ['navigate'],
      setup(props) {
        const value = props.item as { id: string; text: string }
        return () => h('span', { 'data-custom-toc': value.id }, value.text)
      },
    })
    const toc = mount(MarkdownToc, {
      props: {
        items: [
          { id: 'one', text: 'One', level: 1 },
          { id: 'two', text: 'Two', level: 2 },
        ],
        tocItem: Item,
      },
    })

    expect(toc.find('[data-custom-toc="one"]').text()).toBe('One')
    expect(toc.find('[data-custom-toc="two"]').text()).toBe('Two')
  })

  it('renders TOC items independently', async () => {
    const item = mount(MarkdownTocItem, {
      props: { item: { id: 'three', text: 'Three', level: 3 } },
    })
    expect(item.text()).toBe('Three')
    expect(item.find('a').attributes('href')).toBe('#three')
    await item.find('a').trigger('click')
    expect(item.emitted('navigate')?.[0]).toEqual(['three'])
  })

  it('renders error, empty, and loading regions', () => {
    const error = mount(MarkdownError, {
      props: {
        label: 'Broken',
        diagnostics: [
          { code: 'x', message: 'detail', severity: 'error' },
        ],
      },
    })
    expect(error.text()).toContain('Broken')
    expect(error.text()).toContain('detail')
    expect(error.attributes('role')).toBe('alert')

    expect(mount(MarkdownEmpty).text()).toBe('No content')
    expect(mount(MarkdownLoading).text()).toBe('Loading…')
  })
})

describe('standalone node components', () => {
  it('renders block semantics', () => {
    expect(mount(MarkdownParagraph, { props: { node: node('p') } }).element.tagName).toBe('P')
    expect(mount(MarkdownBlockquote, { props: { node: node('blockquote') } }).element.tagName).toBe(
      'BLOCKQUOTE',
    )
    expect(mount(MarkdownHorizontalRule, { props: { node: node('hr') } }).element.tagName).toBe(
      'HR',
    )
    expect(mount(MarkdownBreak, { props: { node: node('br') } }).element.tagName).toBe('BR')

    const heading = mount(MarkdownHeading, {
      props: { node: node('h3') },
      slots: { default: 'Title' },
    })
    expect(heading.element.tagName).toBe('H3')
    expect(heading.classes()).toContain('vmd-heading-3')

    const list = mount(MarkdownList, { props: { node: node('ol') } })
    expect(list.element.tagName).toBe('OL')
    expect(mount(MarkdownListItem, { props: { node: node('li') } }).element.tagName).toBe('LI')
  })

  it('renders a heading anchor only when the heading has an ID', () => {
    const withId = mount(MarkdownHeading, {
      props: { node: { ...node('h2'), attrs: { id: 'title' } } },
      slots: { default: 'Title' },
      global: {
        provide: {
          [RENDER_CONTEXT]: renderContext({
            labels: { ...DEFAULT_LABELS, headingAnchor: 'Permalink' },
          }),
        },
      },
    })
    expect(withId.find('h2').attributes('id')).toBe('title')
    const anchor = withId.find('a[data-vmd-part="heading-anchor"]')
    expect(anchor.attributes('href')).toBe('#title')
    expect(anchor.attributes('aria-label')).toBe('Permalink')
    expect(anchor.classes()).toContain('vmd-heading-anchor')

    const plain = mount(MarkdownHeading, {
      props: { node: node('h2') },
      slots: { default: 'Plain' },
    })
    expect(plain.find('[data-vmd-part="heading-anchor"]').exists()).toBe(false)
  })

  it('renders MarkdownHtml as standalone escaped text', () => {
    const html = mount(MarkdownHtml, {
      props: { value: '**not bold** <em>not parsed</em>' },
    })
    expect(html.element.tagName).toBe('SPAN')
    expect(html.attributes('data-vmd-part')).toBe('html')
    expect(html.classes()).toContain('vmd-html')
    expect(html.text()).toBe('**not bold** <em>not parsed</em>')
    expect(html.find('strong').exists()).toBe(false)
    expect(html.find('em').exists()).toBe(false)
  })

  it('renders inline semantics', () => {
    expect(mount(MarkdownEmphasis, { props: { node: node('em') } }).element.tagName).toBe('EM')
    expect(mount(MarkdownStrong, { props: { node: node('strong') } }).element.tagName).toBe(
      'STRONG',
    )
    expect(
      mount(MarkdownStrikethrough, { props: { node: node('del') } }).element.tagName,
    ).toBe('DEL')
    expect(mount(MarkdownInlineCode, { props: { node: node('code') } }).element.tagName).toBe(
      'CODE',
    )
  })

  it('renders fenced code with a language class', () => {
    const code = mount(MarkdownCode, {
      props: {
        node: { kind: 'code', key: '0', code: 'x', language: 'js' },
        code: 'x',
        language: 'js',
      },
    })
    expect(code.element.tagName).toBe('PRE')
    expect(code.find('code').classes()).toContain('language-js')
    expect(code.find('code').text()).toBe('x')
  })

  it('renders table sections, rows, and cells with alignment', () => {
    const table = mount(MarkdownTable, {
      props: { node: node('table') },
      slots: { default: '<tbody />' },
    })
    expect(table.element.tagName).toBe('TABLE')
    expect(mount(MarkdownTableSection, { props: { node: node('thead') } }).element.tagName).toBe(
      'THEAD',
    )
    expect(mount(MarkdownTableRow, { props: { node: node('tr') } }).element.tagName).toBe('TR')

    const th = mount(MarkdownTableCell, {
      props: { node: node('th'), align: 'right' },
    })
    expect(th.element.tagName).toBe('TH')
    expect(th.attributes('scope')).toBe('col')
    expect(th.attributes('style')).toContain('text-align: right')

    const td = mount(MarkdownTableCell, { props: { node: node('td') } })
    expect(td.element.tagName).toBe('TD')
    expect(td.attributes('scope')).toBeUndefined()
  })

  it('renders a link with target policy and a click payload', async () => {
    const onLinkClick = vi.fn()
    const link = mount(MarkdownLink, {
      props: { node: node('a'), href: 'https://example.com' },
      slots: { default: 'external' },
      global: {
        provide: {
          [RENDER_CONTEXT]: renderContext({
            externalLinkTarget: '_blank',
            onLinkClick,
          }),
        },
      },
    })
    expect(link.attributes('target')).toBe('_blank')
    expect(link.attributes('rel')).toBe('noopener noreferrer')
    await link.trigger('click')
    expect(onLinkClick).toHaveBeenCalledWith(
      expect.objectContaining({ url: 'https://example.com', target: '_blank' }),
    )
  })

  it('falls back when an image fails to load', async () => {
    const image = mount(MarkdownImage, {
      props: { node: node('img'), src: '/missing.png', alt: 'Missing' },
    })
    expect(image.element.tagName).toBe('IMG')
    expect(image.attributes('loading')).toBe('lazy')
    await image.trigger('error')
    expect(image.element.tagName).toBe('SPAN')
    expect(image.text()).toBe('Missing')
  })

  it('renders custom tags through the default and mapped paths', async () => {
    const onCustomTagClick = vi.fn()
    const custom: MarkdownNode = {
      kind: 'custom',
      key: '0',
      tag: 'x-note',
      props: { tone: 'info' },
      attrs: { tone: 'info' },
      children: [textNode],
    }
    const plain = mount(MarkdownCustomTag, {
      props: { node: custom, tag: 'x-note' },
      global: {
        provide: { [RENDER_CONTEXT]: renderContext({ onCustomTagClick }) },
      },
    })
    expect(plain.element.tagName).toBe('SPAN')
    await plain.trigger('click')
    expect(onCustomTagClick).toHaveBeenCalledWith(
      expect.objectContaining({ tag: 'x-note', props: { tone: 'info' } }),
    )

    const Host = defineComponent({
      props: { tone: String },
      setup(props, { slots }) {
        return () => h('aside', { 'data-tone': props.tone }, slots.default?.())
      },
    })
    const mapped = mount(MarkdownCustomTag, {
      props: { node: custom, tag: 'x-note' },
      global: {
        provide: {
          [RENDER_CONTEXT]: renderContext({ components: { 'x-note': Host } }),
        },
      },
    })
    expect(mapped.element.tagName).toBe('ASIDE')
    expect(mapped.attributes('data-tone')).toBe('info')
  })
})

describe('stable keys', () => {
  it('keeps unchanged subtrees mounted when appending content', async () => {
    let mounts = 0
    const Paragraph = defineComponent({
      props: { node: Object, children: Array },
      setup(_props, { slots }) {
        onMounted(() => {
          mounts += 1
        })
        return () => h('p', slots.default?.())
      },
    })

    const wrapper = mount(MarkdownRenderer, {
      props: {
        source: 'a\n\nb',
        components: { p: Paragraph },
      },
    })
    expect(mounts).toBe(2)

    await wrapper.setProps({ source: 'a\n\nb\n\nc' })
    await nextTick()
    expect(mounts).toBe(3)
    expect(wrapper.text()).toContain('c')
  })
})
