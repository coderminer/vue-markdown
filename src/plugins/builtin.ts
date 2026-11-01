import remarkGfm from 'remark-gfm'
import remarkFrontmatter from 'remark-frontmatter'
import { parse as parseYaml } from 'yaml'
import type { MarkdownNode, MarkdownPlugin, SearchOptions } from '../core/types'
import { searchDocument } from '../core/search'

export const tocPlugin: MarkdownPlugin = {
  name: 'toc',
  core: true,
}

export const codePlugin: MarkdownPlugin = {
  name: 'code',
  core: true,
}

export const linkPlugin: MarkdownPlugin = {
  name: 'link',
  core: true,
}

/** Segment search matches inside text nodes. */
export function searchPlugin(options: SearchOptions = {}): MarkdownPlugin {
  return {
    name: 'search',
    transformDocument(document) {
      return searchDocument(document, options)
    },
  }
}

export interface CustomTagsPluginOptions {
  tags: string[]
}

/** Turn selected element tags into custom tag nodes. */
export function customTagsPlugin(
  options: CustomTagsPluginOptions = { tags: [] },
): MarkdownPlugin {
  const tags = new Set(options.tags)

  const convert = (nodes: readonly MarkdownNode[]): MarkdownNode[] =>
    nodes.map((node) => {
      if (node.kind === 'element' && tags.has(node.tag)) {
        return {
          kind: 'custom',
          key: node.key,
          tag: node.tag,
          props: { ...node.attrs },
          attrs: node.attrs,
          children: convert(node.children),
          source: node.source,
        }
      }
      if ('children' in node && Array.isArray(node.children)) {
        return { ...node, children: convert(node.children) } as MarkdownNode
      }
      return node
    })

  return {
    name: 'custom-tags',
    transformDocument(document) {
      return { ...document, nodes: convert(document.nodes) }
    },
  }
}

export const gfmPlugin: MarkdownPlugin = {
  name: 'gfm',
  remarkPlugins: [remarkGfm],
}

function remarkFrontmatterCapture() {
  return (tree: { children: Array<{ type: string; value?: string }> }, file: {
    data: Record<string, unknown>
  }) => {
    const index = tree.children.findIndex((node) => node.type === 'yaml')
    if (index < 0) return
    const node = tree.children[index]
    if (node?.value) {
      try {
        file.data.frontmatter = parseYaml(node.value) as Record<string, unknown>
      } catch {
        file.data.frontmatter = undefined
      }
    }
    tree.children.splice(index, 1)
  }
}

export const frontmatterPlugin: MarkdownPlugin = {
  name: 'frontmatter',
  remarkPlugins: [remarkFrontmatter, remarkFrontmatterCapture],
}

export const defaultPlugins: MarkdownPlugin[] = [
  tocPlugin,
  codePlugin,
  linkPlugin,
  searchPlugin(),
  customTagsPlugin(),
]

export const fullPlugins: MarkdownPlugin[] = [
  ...defaultPlugins,
  gfmPlugin,
  frontmatterPlugin,
]
