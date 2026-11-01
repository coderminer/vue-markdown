import { describe, expect, it } from 'vitest'
import GithubSlugger from 'github-slugger'
import { createOfficialPipeline } from '../../src/pipeline'
import { normalizeHast } from '../../src/core/normalize'
import { buildDocument } from '../../src/core/model'
import { PARTS, TOKEN_NAMES, partAttrs, partClass } from '../../src/core/parts'
import { defaultUrlTransform } from '../../src/core/url'
import { defaultPlugins } from '../../src/plugins/builtin'
import type { MarkdownNode, PipelineContext } from '../../src/core/types'

function parse(source: string) {
  const slugger = new GithubSlugger()
  const ctx: PipelineContext = {
    source,
    plugins: defaultPlugins,
    remarkPlugins: [],
    rehypePlugins: [],
    remarkRehypeOptions: {},
    slugger,
    idPrefix: '',
    diagnostics: [],
  }
  const result = createOfficialPipeline().processSync!(source, ctx)
  return normalizeHast(result.hast, {
    slugger: new GithubSlugger(),
    diagnostics: ctx.diagnostics,
  })
}

describe('parts and tokens', () => {
  it('exposes stable part attributes', () => {
    expect(partAttrs(PARTS.paragraph)).toEqual({
      class: 'vmd-paragraph',
      'data-vmd-part': 'paragraph',
    })
    expect(partClass(PARTS.code, 'extra')).toBe('vmd-code extra')
    expect(TOKEN_NAMES).toContain('--vmd-color-text')
  })
})

describe('official pipeline', () => {
  it('renders a mixed CommonMark document without an HTML round-trip', () => {
    const source = [
      '# Title',
      '',
      'A paragraph with **strong** and [a link](https://example.com).',
      '',
      '- one',
      '- two',
      '',
      '```js',
      'const value = 1',
      '```',
    ].join('\n')

    const result = parse(source)
    const tags = new Set<string>()
    const visit = (nodes: MarkdownNode[]) => {
      for (const node of nodes) {
        if (node.kind === 'element') {
          tags.add(node.tag)
          visit(node.children)
        }
      }
    }
    visit(result.nodes)

    expect(tags).toContain('h1')
    expect(tags).toContain('p')
    expect(tags).toContain('strong')
    expect(tags).toContain('a')
    expect(tags).toContain('ul')

    const code = result.nodes.find((node) => node.kind === 'code')
    expect(code).toMatchObject({ kind: 'code', language: 'js' })
    expect((code as { code: string }).code).toContain('const value = 1')

    expect(result.toc).toEqual([{ id: 'title', text: 'Title', level: 1 }])
    expect(JSON.stringify(result)).not.toContain('tagName')
  })

  it('handles duplicate headings deterministically', () => {
    const result = parse('# Same\n\n# Same\n\n# Same')
    expect(result.toc.map((item) => item.id)).toEqual(['same', 'same-1', 'same-2'])
  })

  it('renders empty input as an empty model', () => {
    const result = parse('   ')
    expect(result.nodes).toEqual([])
    expect(result.toc).toEqual([])
  })

  it('builds a serializable document', () => {
    const normalized = parse('# Hello')
    const document = buildDocument({
      nodes: normalized.nodes,
      plugins: ['toc'],
      pipeline: 'official',
    })
    expect(document.plugins).toEqual(['toc'])
    expect(document.pipeline).toBe('official')
    expect(JSON.parse(JSON.stringify(document))).toEqual(document)
  })
})

describe('default URL transform', () => {
  it('keeps safe protocols and relative URLs', () => {
    expect(defaultUrlTransform('https://example.com')).toBe('https://example.com')
    expect(defaultUrlTransform('/docs')).toBe('/docs')
    expect(defaultUrlTransform('mailto:a@b.c')).toBe('mailto:a@b.c')
  })

  it('removes dangerous protocols', () => {
    expect(defaultUrlTransform('javascript:alert(1)')).toBe('')
    expect(defaultUrlTransform('vbscript:msgbox(1)')).toBe('')
    expect(defaultUrlTransform('data:text/html,<script>alert(1)</script>')).toBe('')
  })

  it('allows raster image data URLs only', () => {
    expect(defaultUrlTransform('data:image/png;base64,abc', 'src')).toBe(
      'data:image/png;base64,abc',
    )
    expect(defaultUrlTransform('data:image/svg+xml,<svg/>', 'src')).toBe('')
  })
})
