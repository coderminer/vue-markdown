import { describe, expect, it } from 'vitest'
import GithubSlugger from 'github-slugger'
import { createOfficialPipeline } from '../../src/pipeline'
import { normalizeHast } from '../../src/core/normalize'
import {
  propertiesToAttrs,
  sanitizeStyleValue,
  sanitizeUrlValue,
} from '../../src/core/security'
import { defaultUrlTransform } from '../../src/core/url'
import { defaultPlugins } from '../../src/plugins/builtin'
import { resolvePlugins } from '../../src/plugins/registry'
import { htmlPlugin } from '../../src/html'
import type { MarkdownUrlTransform, PipelineContext } from '../../src/core/types'

function parse(
  source: string,
  options: {
    plugins?: PipelineContext['plugins']
    rehypePlugins?: PipelineContext['rehypePlugins']
    urlTransform?: MarkdownUrlTransform
  } = {},
) {
  const resolved = resolvePlugins(options.plugins ?? defaultPlugins)
  const ctx: PipelineContext = {
    source,
    options: {},
    plugins: resolved.plugins,
    remarkPlugins: resolved.remarkPlugins,
    rehypePlugins: [
      ...resolved.rehypePlugins,
      ...(options.rehypePlugins ?? []),
    ],
    remarkRehypeOptions: {},
    slugger: new GithubSlugger(),
    idPrefix: '',
    diagnostics: [],
  }
  const result = createOfficialPipeline().processSync!(source, ctx)
  return normalizeHast(result.hast, {
    slugger: new GithubSlugger(),
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
  it('drops raw HTML by default', () => {
    const dropped = parse('<b>bold</b><script>alert(1)</script>')
    expect(serialized(dropped.nodes)).not.toContain('<b')
    expect(serialized(dropped.nodes)).not.toContain('<script')
  })

  it('renders sanitized HTML through the html plugin', () => {
    const kept = parse('<b>bold</b>\n\nHello', {
      plugins: [...defaultPlugins, htmlPlugin()],
    })
    expect(serialized(kept.nodes)).toContain('bold')
    expect(serialized(kept.nodes)).toContain('"tag":"b"')
  })

  it('sanitizes event handlers, scripts, and unsafe URLs after raw parsing', () => {
    const source = [
      '<img src="x" onerror="alert(1)">',
      '<a href="javascript:alert(1)">click</a>',
      '<script>alert(1)</script>',
      '<style>body{display:none}</style>',
      '<iframe src="https://example.com"></iframe>',
    ].join('')
    const result = parse(source, { plugins: [...defaultPlugins, htmlPlugin()] })
    const json = serialized(result.nodes)
    expect(json).not.toContain('onerror')
    expect(json).not.toContain('javascript:')
    expect(json).not.toContain('alert(1)')
    expect(json).not.toContain('display:none')
    expect(json).not.toContain('<script')
    expect(json).not.toContain('<style')
    expect(json).not.toContain('iframe')
  })

  it('keeps class, data, ARIA, and role scaffolding on raw HTML', () => {
    const result = parse(
      '<div class="note" data-kind="tip" aria-label="Note" role="note"><b>bold</b></div>',
      { plugins: [...defaultPlugins, htmlPlugin()] },
    )
    expect(serialized(result.nodes)).toContain('"class":"note"')
    expect(serialized(result.nodes)).toContain('"data-kind":"tip"')
    expect(serialized(result.nodes)).toContain('"aria-label":"Note"')
    expect(serialized(result.nodes)).toContain('"role":"note"')
  })

  it('extends the sanitizer without weakening safety', () => {
    const result = parse(
      [
        '<video src="/a.mp4" controls onclick="alert(1)"></video>',
        '<x-note data-x="1">hi</x-note>',
        '<a href="javascript:alert(1)">x</a>',
      ].join(''),
      {
        plugins: [
          ...defaultPlugins,
          htmlPlugin({
            schema: {
              tags: ['video', 'x-note'],
              attributes: {
                video: ['src', 'controls'],
                'x-note': ['data*'],
              },
            },
          }),
        ],
      },
    )
    const json = serialized(result.nodes)
    expect(json).toContain('"tag":"video"')
    expect(json).toContain('"tag":"x-note"')
    expect(json).toContain('"data-x":"1"')
    expect(json).not.toContain('onclick')
    expect(json).not.toContain('javascript:')
  })

  it('cannot re-enable stripped tags through the schema extension', () => {
    const result = parse('<script>alert(1)</script><b>ok</b>', {
      plugins: [
        ...defaultPlugins,
        htmlPlugin({ schema: { tags: ['script'] } }),
      ],
    })
    const json = serialized(result.nodes)
    expect(json).not.toContain('alert(1)')
    expect(json).toContain('"tag":"b"')
  })

  it('keeps class on raw links, lists, and code', () => {
    const result = parse(
      '<a class="btn" href="/x">x</a><ul class="list"><li class="item">i</li></ul><code class="lang">c</code>',
      { plugins: [...defaultPlugins, htmlPlugin()] },
    )
    const json = serialized(result.nodes)
    expect(json).toContain('"class":"btn"')
    expect(json).toContain('"class":"list"')
    expect(json).toContain('"class":"item"')
    expect(json).toContain('"class":"lang"')
  })

  it('converts multi-word ARIA properties to valid attribute names', () => {
    expect(
      propertiesToAttrs('div', {
        ariaLabelledBy: ['heading'],
        ariaDescribedBy: ['note'],
      }),
    ).toEqual({
      'aria-labelledby': 'heading',
      'aria-describedby': 'note',
    })
  })

  it('keeps raster image data URLs and rejects SVG data URLs', () => {
    const result = parse(
      '<img src="data:image/png;base64,abc"><img src="data:image/svg+xml,<svg/>">',
      { plugins: [...defaultPlugins, htmlPlugin()] },
    )
    const json = serialized(result.nodes)
    expect(json).toContain('data:image/png;base64,abc')
    expect(json).not.toContain('data:image/svg+xml')
  })

  it('keeps commas inside data URLs when validating srcset', () => {
    expect(
      sanitizeUrlValue('data:image/png;base64,AAAA 1x', 'srcset'),
    ).toBe('data:image/png;base64,AAAA 1x')
    expect(
      sanitizeUrlValue('data:image/svg+xml,<svg/> 1x', 'srcset'),
    ).toBeUndefined()
    expect(
      sanitizeUrlValue('a.png 1x, https://example.com/b.png 2x', 'srcset'),
    ).toBe('a.png 1x, https://example.com/b.png 2x')
  })

  it('keeps a data URL intact in raw srcset output', () => {
    const result = parse(
      '<img srcset="data:image/png;base64,AAAA 1x">',
      { plugins: [...defaultPlugins, htmlPlugin()] },
    )
    expect(serialized(result.nodes)).toContain(
      'data:image/png;base64,AAAA 1x',
    )
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
          plugins: [...defaultPlugins, htmlPlugin()],
        }).nodes,
      )
    }
  })
})

describe('trusted engine styles', () => {
  it('keeps constrained token styles and strips unsafe declarations', () => {
    expect(sanitizeStyleValue('color:#D73A49;--shiki-dark:#F97583')).toBe(
      'color: #D73A49; --shiki-dark: #F97583',
    )
    expect(
      sanitizeStyleValue('background-image:url(https://evil.example/x.png)'),
    ).toBeUndefined()
    expect(sanitizeStyleValue('color:red;position:fixed')).toBe('color: red')
  })

  it('only allows inline styles when explicitly enabled', () => {
    expect(propertiesToAttrs('span', { style: 'color:red' })).toEqual({})
    expect(
      propertiesToAttrs(
        'span',
        { style: 'color:red' },
        { allowStyle: true },
      ),
    ).toEqual({ style: 'color: red' })
  })
})
