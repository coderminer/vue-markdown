import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
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
import {
  COMPONENT_MANIFESTS,
  getComponentManifest,
  validateManifest,
  validateManifestRegistry,
} from '../../src/core/manifest'
import { DEFAULT_LABELS } from '../../src/core/labels'
import { PART_NAMES } from '../../src/core/parts'
import type { MarkdownNode } from '../../src/core/types'

const text: MarkdownNode = { kind: 'text', key: '0', value: 'text' }

function node(tag: string, attrs: Record<string, string> = {}): MarkdownNode {
  return { kind: 'element', key: '0', tag, attrs, children: [text] }
}

function partsOf(wrapper: { findAll: (selector: string) => Array<{ attributes: (name: string) => string | undefined }> }): string[] {
  return wrapper
    .findAll('[data-vmd-part]')
    .map((element) => element.attributes('data-vmd-part') ?? '')
    .filter(Boolean)
}

const fixtures: Record<string, () => unknown> = {
  MarkdownRenderer: () => mount(MarkdownRenderer, { props: { source: '# Title\n\nBody', toc: true } }),
  MarkdownRoot: () => mount(MarkdownRoot, { slots: { default: 'content' } }),
  MarkdownContent: () => mount(MarkdownContent, { slots: { default: 'content' } }),
  MarkdownToc: () =>
    mount(MarkdownToc, { props: { items: [{ id: 'one', text: 'One', level: 1 }] } }),
  MarkdownTocItem: () =>
    mount(MarkdownTocItem, { props: { item: { id: 'one', text: 'One', level: 1 } } }),
  MarkdownError: () => mount(MarkdownError, { props: { label: 'Error', diagnostics: [] } }),
  MarkdownEmpty: () => mount(MarkdownEmpty),
  MarkdownLoading: () => mount(MarkdownLoading),
  MarkdownParagraph: () => mount(MarkdownParagraph, { props: { node: node('p') }, slots: { default: 'text' } }),
  MarkdownHeading: () =>
    mount(MarkdownHeading, { props: { node: node('h2', { id: 'title' }) }, slots: { default: 'Title' } }),
  MarkdownEmphasis: () => mount(MarkdownEmphasis, { props: { node: node('em') }, slots: { default: 'text' } }),
  MarkdownStrong: () => mount(MarkdownStrong, { props: { node: node('strong') }, slots: { default: 'text' } }),
  MarkdownStrikethrough: () =>
    mount(MarkdownStrikethrough, { props: { node: node('del') }, slots: { default: 'text' } }),
  MarkdownLink: () =>
    mount(MarkdownLink, { props: { node: node('a'), href: 'https://example.com' }, slots: { default: 'link' } }),
  MarkdownImage: () => mount(MarkdownImage, { props: { node: node('img'), src: '/x.png', alt: 'x' } }),
  MarkdownList: () => mount(MarkdownList, { props: { node: node('ul') } }),
  MarkdownListItem: () => mount(MarkdownListItem, { props: { node: node('li') } }),
  MarkdownBlockquote: () => mount(MarkdownBlockquote, { props: { node: node('blockquote') } }),
  MarkdownHorizontalRule: () => mount(MarkdownHorizontalRule, { props: { node: node('hr') } }),
  MarkdownTable: () => mount(MarkdownTable, { props: { node: node('table') } }),
  MarkdownTableSection: () => mount(MarkdownTableSection, { props: { node: node('tbody') } }),
  MarkdownTableRow: () => mount(MarkdownTableRow, { props: { node: node('tr') } }),
  MarkdownTableCell: () => mount(MarkdownTableCell, { props: { node: node('td') } }),
  MarkdownInlineCode: () => mount(MarkdownInlineCode, { props: { node: node('code') }, slots: { default: 'x' } }),
  MarkdownCode: () =>
    mount(MarkdownCode, {
      props: { node: { kind: 'code', key: '0', code: 'x', language: 'js' }, code: 'x', language: 'js' },
    }),
  MarkdownBreak: () => mount(MarkdownBreak, { props: { node: node('br') } }),
  MarkdownHtml: () => mount(MarkdownHtml, { props: { value: '<b>x</b>' } }),
  MarkdownCustomTag: () =>
    mount(MarkdownCustomTag, {
      props: {
        node: { kind: 'custom', key: '0', tag: 'x-note', props: {}, attrs: {}, children: [text] },
        tag: 'x-note',
      },
    }),
  MarkdownChildren: () => mount(MarkdownChildren, { props: { nodes: [text] } }),
}

describe('component manifests', () => {
  it('covers every public component with a valid registry', () => {
    expect(validateManifestRegistry()).toEqual([])
    expect(Object.keys(COMPONENT_MANIFESTS)).toHaveLength(29)
  })

  it('documents only known parts and default labels', () => {
    for (const entry of Object.values(COMPONENT_MANIFESTS)) {
      for (const part of entry.parts) {
        expect(PART_NAMES).toContain(part)
      }
      for (const label of entry.labels) {
        expect(DEFAULT_LABELS).toHaveProperty(label)
      }
    }
  })

  it('matches rendered parts for every public component', () => {
    for (const [name, create] of Object.entries(fixtures)) {
      const manifest = getComponentManifest(name)
      expect(manifest, `${name} must have a manifest`).toBeDefined()
      const wrapper = create() as ReturnType<typeof mount>
      const issues = validateManifest(manifest!, {
        parts: partsOf(wrapper as never),
        mode: name === 'MarkdownRenderer' ? 'observed' : 'strict',
      })
      expect(issues, `${name}: ${JSON.stringify(issues)}`).toEqual([])
      wrapper.unmount()
    }
  })

  it('reports undeclared parts and missing declared parts', () => {
    const manifest = getComponentManifest('MarkdownEmpty')!
    expect(validateManifest(manifest, { parts: ['unknown'] })).toEqual([
      expect.objectContaining({ code: 'undeclared-part' }),
      expect.objectContaining({ code: 'missing-part' }),
    ])
    expect(validateManifest(manifest, { parts: ['empty'] })).toEqual([])
  })

  it('keeps MarkdownCode manifest entries aligned with the rendered code part', () => {
    const wrapper = mount(MarkdownCode, {
      props: { node: { kind: 'code', key: '0', code: 'x', language: 'js' }, code: 'x', language: 'js' },
    })
    expect(partsOf(wrapper)).toEqual(['code'])
    const manifest = getComponentManifest('MarkdownCode')!
    expect(
      validateManifest(manifest, { parts: ['code'], mode: 'observed' }),
    ).toEqual([])
  })
})

describe('manifest-driven rendering', () => {
  it('renders a component through its manifest default', () => {
    const Host = defineComponent({
      setup() {
        return () => h(MarkdownRenderer, { source: '# Title' })
      },
    })
    const wrapper = mount(Host)
    expect(wrapper.find('[data-vmd-part="heading"]').exists()).toBe(true)
    expect(wrapper.find('[data-vmd-part="heading-anchor"]').exists()).toBe(true)
  })
})
