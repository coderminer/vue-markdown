import { describe, expect, it } from 'vitest'
import GithubSlugger from 'github-slugger'
import rehypeRaw from 'rehype-raw'
import { createOfficialPipeline } from '../../src/pipeline'
import { normalizeHast } from '../../src/core/normalize'
import { defaultUrlTransform } from '../../src/core/url'
import { defaultPlugins } from '../../src/plugins/builtin'
import type { MarkdownUrlTransform, PipelineContext } from '../../src/core/types'

function parse(
  source: string,
  options: {
    rehypePlugins?: PipelineContext['rehypePlugins']
    allowHtml?: boolean
    skipHtml?: boolean
    urlTransform?: MarkdownUrlTransform
  } = {},
) {
  const ctx: PipelineContext = {
    source,
    plugins: defaultPlugins,
    remarkPlugins: [],
    rehypePlugins: options.rehypePlugins ?? [],
    remarkRehypeOptions: {},
    slugger: new GithubSlugger(),
    idPrefix: '',
    allowHtml: options.allowHtml ?? false,
    diagnostics: [],
  }
  const result = createOfficialPipeline().processSync!(source, ctx)
  return normalizeHast(result.hast, {
    slugger: new GithubSlugger(),
    allowHtml: options.allowHtml,
    skipHtml: options.skipHtml,
    urlTransform: options.urlTransform,
  })
}

function serialized(nodes: unknown): string {
  return JSON.stringify(nodes)
}

describe('URL protocol policy', () => {
  it.each([
    'javascript:alert(1)',
    'JavaScript:alert(1)',
    'vbscript:msgbox(1)',
    'data:text/html,<script>alert(1)</script>',
    'data:image/svg+xml,<svg onload=alert(1)>',
    'file:///etc/passwd',
    'ftp://example.com/file',
  ])('removes %s', (url) => {
    expect(defaultUrlTransform(url)).toBe('')
  })

  it.each([
    'https://example.com',
    'http://example.com',
    'irc://example.com',
    'ircs://example.com',
    'mailto:a@b.c',
    'xmpp:a@b.c',
    '/relative',
    './relative',
    '../relative',
    '#hash',
    '?query',
    '//protocol-relative.example.com',
  ])('keeps %s', (url) => {
    expect(defaultUrlTransform(url)).toBe(url)
  })

  it('allows raster image data URLs and rejects SVG', () => {
    expect(defaultUrlTransform('data:image/png;base64,abc', 'src')).toBe(
      'data:image/png;base64,abc',
    )
    expect(defaultUrlTransform('data:image/gif;base64,abc', 'src')).toBe(
      'data:image/gif;base64,abc',
    )
    expect(defaultUrlTransform('data:image/svg+xml,<svg/>', 'src')).toBe('')
    expect(defaultUrlTransform('data:image/png;base64,abc', 'href')).toBe('')
  })
})

describe('sanitization and raw HTML', () => {
  it('drops raw HTML by default and honors skipHtml', () => {
    const dropped = parse('<b>bold</b><script>alert(1)</script>')
    expect(serialized(dropped.nodes)).not.toContain('<b')
    expect(serialized(dropped.nodes)).not.toContain('<script')

    const kept = parse('<b>bold</b>\n\nHello', { allowHtml: true })
    expect(serialized(kept.nodes)).toContain('<b>')

    const skipped = parse('<b>bold</b>\n\nHello', {
      skipHtml: true,
      allowHtml: true,
    })
    expect(serialized(skipped.nodes)).not.toContain('<b')
    expect(serialized(skipped.nodes)).toContain('Hello')
  })

  it('sanitizes event handlers, scripts, and unsafe URLs after rehype-raw', () => {
    const source = [
      '<img src="x" onerror="alert(1)">',
      '<a href="javascript:alert(1)">click</a>',
      '<script>alert(1)</script>',
      '<style>body{display:none}</style>',
      '<iframe src="https://example.com"></iframe>',
    ].join('')
    const result = parse(source, { rehypePlugins: [rehypeRaw], allowHtml: true })
    const json = serialized(result.nodes)
    expect(json).not.toContain('onerror')
    expect(json).not.toContain('javascript:')
    expect(json).not.toContain('alert(1)')
    expect(json).not.toContain('<script')
    expect(json).not.toContain('<style')
    expect(json).not.toContain('iframe')
  })

  it('removes unsafe attributes even when a host plugin runs after sanitize', () => {
    const inject = () => (tree: {
      children: Array<Record<string, unknown>>
    }) => {
      tree.children.push({
        type: 'element',
        tagName: 'a',
        properties: {
          href: 'javascript:alert(1)',
          onclick: 'alert(2)',
          style: 'color:red',
        },
        children: [{ type: 'text', value: 'injected' }],
      })
    }

    const result = parse('safe', {
      rehypePlugins: [inject as never],
    })
    const json = serialized(result.nodes)
    expect(json).not.toContain('javascript:')
    expect(json).not.toContain('onclick')
    expect(json).not.toContain('style')
    expect(json).toContain('injected')
  })

  it('applies urlTransform to every URL-bearing attribute and revalidates its output', () => {
    const seen: Array<[string, string]> = []
    const inject = () => (tree: { children: Array<Record<string, unknown>> }) => {
      tree.children.push({
        type: 'element',
        tagName: 'blockquote',
        properties: { cite: 'https://example.com/source' },
        children: [{ type: 'text', value: 'quote' }],
      })
      tree.children.push({
        type: 'element',
        tagName: 'img',
        properties: {
          src: 'https://example.com/a.png',
          srcSet: 'https://example.com/a.png 1x, https://example.com/b.png 2x',
        },
        children: [],
      })
    }

    const result = parse('', {
      rehypePlugins: [inject as never],
      urlTransform: (url, key) => {
        seen.push([key, url])
        if (key === 'cite') return 'javascript:alert(1)'
        return url.split('example.com').join('example.org')
      },
    })

    expect(seen).toContainEqual(['cite', 'https://example.com/source'])
    expect(seen).toContainEqual([
      'srcset',
      'https://example.com/a.png 1x, https://example.com/b.png 2x',
    ])

    const quote = result.nodes.find(
      (node) => node.kind === 'element' && node.tag === 'blockquote',
    )
    expect(quote && quote.kind === 'element' ? quote.attrs : {}).not.toHaveProperty(
      'cite',
    )

    const image = result.nodes.find(
      (node) => node.kind === 'element' && node.tag === 'img',
    )
    expect(image && image.kind === 'element' ? image.attrs : {}).toMatchObject({
      src: 'https://example.org/a.png',
      srcset: 'https://example.org/a.png 1x, https://example.org/b.png 2x',
    })
  })

  it('keeps safe custom-tag props but strips handlers and unsafe URLs', () => {
    const inject = () => (tree: {
      children: Array<Record<string, unknown>>
    }) => {
      tree.children.push({
        type: 'element',
        tagName: 'x-card',
        properties: {
          tone: 'info',
          label: 'Title',
          onclick: 'alert(1)',
          href: 'javascript:alert(1)',
          style: 'color:red',
        },
        children: [{ type: 'text', value: 'Body' }],
      })
    }

    const result = parse('', { rehypePlugins: [inject as never] })
    const element = result.nodes.find(
      (node) => node.kind === 'element' && node.tag === 'x-card',
    )
    expect(element && element.kind === 'element' ? element.attrs : {}).toEqual({
      tone: 'info',
      label: 'Title',
    })
  })
})

describe('malformed input corpus', () => {
  const corpus = [
    '',
    '   ',
    '#',
    '[]()',
    '[unclosed',
    '![image](',
    '**unclosed',
    '```js',
    '~~~',
    '<',
    '<script',
    '<div><span>',
    '<!-- comment',
    '&amp;',
    '\\',
    '\u0000',
    'a'.repeat(10000),
    '#'.repeat(1000),
    '<x-tag a="1" b=2>',
    '| a | b |\n| - |',
    '> quote\n>> nested',
    '- [ ] task\n- [x] done',
    '$$\n\\frac{1}{2}\n$$',
  ]

  it.each(corpus.map((source, index) => [index, source] as const))(
    'normalizes malformed input #%i without throwing',
    (_index, source) => {
      expect(() => parse(source)).not.toThrow()
    },
  )

  it('never emits script elements, event handlers, or unsafe URLs', () => {
    const check = (nodes: ReturnType<typeof parse>['nodes']): void => {
      for (const node of nodes) {
        if (node.kind === 'text') continue
        if (node.kind === 'element') {
          expect(node.tag).not.toBe('script')
          expect(node.tag).not.toBe('style')
          expect(node.tag).not.toBe('iframe')
          for (const [name, value] of Object.entries(node.attrs)) {
            expect(name.startsWith('on')).toBe(false)
            expect(name).not.toBe('style')
            if ((name === 'href' || name === 'src') && value !== '') {
              expect(defaultUrlTransform(value, name)).not.toBe('')
            }
          }
        }
        if ('children' in node && Array.isArray(node.children)) check(node.children)
      }
    }

    for (const source of corpus) {
      check(
        parse(source, {
          rehypePlugins: [rehypeRaw],
          allowHtml: true,
        }).nodes,
      )
    }
  })
})
