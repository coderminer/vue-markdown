import { describe, expect, it } from 'vitest'
import rehypeRaw from 'rehype-raw'
import GithubSlugger from 'github-slugger'
import { createOfficialPipeline, defineMarkdownPipeline } from '../../src/pipeline'
import { normalizeHast } from '../../src/core/normalize'
import { buildDocument } from '../../src/core/model'
import { useMarkdownDocument } from '../../src/composables/useMarkdownDocument'
import { htmlPlugin } from '../../src/html'
import { mathPlugin } from '../../src/math'
import {
  defaultPlugins,
  frontmatterPlugin,
  gfmPlugin,
  searchPlugin,
} from '../../src/plugins/builtin'
import { defineMarkdownPlugin } from '../../src/plugins/define'
import { resolvePlugins } from '../../src/plugins/registry'
import { exportMarkdownHtml, exportMarkdownHtmlSync } from '../../src/export'
import type {
  MarkdownNode,
  MarkdownPipeline,
  PipelineContext,
  PipelineResult,
  PluginContext,
} from '../../src/core/types'

function findElement(nodes: MarkdownNode[], tag: string): MarkdownNode | undefined {
  for (const node of nodes) {
    if (node.kind === 'element') {
      if (node.tag === tag) return node
      const nested = findElement(node.children, tag)
      if (nested) return nested
    }
  }
  return undefined
}

function parse(
  source: string,
  plugins: PipelineContext['plugins'] = defaultPlugins,
) {
  const resolved = resolvePlugins(plugins)
  const slugger = new GithubSlugger()
  const ctx: PipelineContext = {
    source,
    options: {},
    plugins: resolved.plugins,
    remarkPlugins: resolved.remarkPlugins,
    rehypePlugins: resolved.rehypePlugins,
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

function text(nodes: MarkdownNode[]): string {
  return nodes
    .map((node) => {
      if (node.kind === 'text') return node.value
      if ('children' in node && Array.isArray(node.children)) return text(node.children)
      if (node.kind === 'code') return node.code
      return ''
    })
    .join('')
}

function paragraphResult(value: string): PipelineResult {
  return {
    hast: {
      type: 'root',
      children: [
        {
          type: 'element',
          tagName: 'p',
          properties: {},
          children: [{ type: 'text', value }],
        },
      ],
    },
  }
}

describe('pipeline stages and raw HTML', () => {
  it('drops raw HTML by default', () => {
    const result = parse('<b>bold</b>\n\nHello')
    expect(text(result.nodes)).toContain('Hello')
    expect(text(result.nodes)).toContain('bold')
    expect(findElement(result.nodes, 'b')).toBeUndefined()
  })

  it('renders sanitized HTML through the html plugin', () => {
    const model = parse(
      '<b>bold</b><script>alert(1)</script><a href="javascript:alert(1)">x</a>',
      [...defaultPlugins, htmlPlugin()],
    )
    expect(text(model.nodes)).toContain('bold')
    expect(text(model.nodes)).not.toContain('alert(1)')
    expect(findElement(model.nodes, 'b')).toBeDefined()

    const link = findElement(model.nodes, 'a')
    expect(link?.kind).toBe('element')
    if (link?.kind === 'element') expect(link.attrs.href).toBeUndefined()
  })

  it('does not leak style content from raw HTML', () => {
    const model = parse(
      '<style>body{display:none}</style><b>bold</b>',
      [...defaultPlugins, htmlPlugin()],
    )
    expect(text(model.nodes)).not.toContain('display:none')
    expect(text(model.nodes)).toContain('bold')
  })

  it('ignores manual rehype-raw and reports a warning', () => {
    const slugger = new GithubSlugger()
    const diagnostics: PipelineContext['diagnostics'] = []
    const ctx: PipelineContext = {
      source: '<b>bold</b>',
      options: {},
      plugins: defaultPlugins,
      remarkPlugins: [],
      rehypePlugins: [rehypeRaw],
      remarkRehypeOptions: {},
      slugger,
      idPrefix: '',
      diagnostics,
    }
    const result = createOfficialPipeline().processSync!(ctx.source, ctx)
    const model = normalizeHast(result.hast, {
      slugger: new GithubSlugger(),
    })

    expect(findElement(model.nodes, 'b')).toBeUndefined()
    expect(diagnostics.some((item) => item.code === 'html-plugin')).toBe(true)
  })

  it('merges every html plugin and its schema extension', () => {
    const extra = defineMarkdownPlugin({
      name: 'html-extra',
      html: true,
      htmlSchema: {
        tags: ['video'],
        attributes: { video: ['src', 'controls'] },
      },
    })
    const model = parse(
      '<video src="/a.mp4" controls></video><b>bold</b>',
      [...defaultPlugins, extra, htmlPlugin()],
    )

    expect(findElement(model.nodes, 'video')).toBeDefined()
    expect(findElement(model.nodes, 'b')).toBeDefined()
  })

  it('drops raw nodes before an undetected manual parser can run', () => {
    const wrapped = (options: unknown) => rehypeRaw(options as never)
    const slugger = new GithubSlugger()
    const ctx: PipelineContext = {
      source: '<b>bold</b><script>alert(1)</script>',
      options: {},
      plugins: defaultPlugins,
      remarkPlugins: [],
      rehypePlugins: [wrapped as never],
      remarkRehypeOptions: {},
      slugger,
      idPrefix: '',
      diagnostics: [],
    }
    const result = createOfficialPipeline().processSync!(ctx.source, ctx)
    const model = normalizeHast(result.hast, {
      slugger: new GithubSlugger(),
    })

    expect(JSON.stringify(result.hast)).not.toContain('"tagName":"b"')
    expect(JSON.stringify(result.hast)).not.toContain('"tagName":"script"')
    expect(findElement(model.nodes, 'b')).toBeUndefined()
    expect(findElement(model.nodes, 'script')).toBeUndefined()
  })

  it('keeps math nodes when the html plugin is enabled', () => {
    const model = parse('Inline $E=mc^2$.', [
      ...defaultPlugins,
      mathPlugin(),
      htmlPlugin(),
    ])
    const json = JSON.stringify(model.nodes)
    expect(json).toContain('"kind":"math"')
    expect(json).toContain('E=mc^2')
    expect(json).toContain('"tag":"math"')
  })

  it('keeps dangerous tags stripped even when a schema extension lists them', () => {
    const resolved = resolvePlugins([
      ...defaultPlugins,
      htmlPlugin({ schema: { tags: ['script', 'style'] } }),
    ])
    const ctx: PipelineContext = {
      source: '<script>alert(1)</script><style>x</style><b>ok</b>',
      options: {},
      plugins: resolved.plugins,
      remarkPlugins: resolved.remarkPlugins,
      rehypePlugins: resolved.rehypePlugins,
      remarkRehypeOptions: {},
      slugger: new GithubSlugger(),
      idPrefix: '',
      diagnostics: [],
    }
    const result = createOfficialPipeline().processSync!(ctx.source, ctx)
    const json = JSON.stringify(result.hast)

    expect(json).not.toContain('"tagName":"script"')
    expect(json).not.toContain('"tagName":"style"')
    expect(json).toContain('"tagName":"b"')
  })

  it('keeps event handlers and inline styles out of a schema extension', () => {
    const resolved = resolvePlugins([
      ...defaultPlugins,
      htmlPlugin({
        schema: { attributes: { '*': ['onClick', 'style', 'srcdoc'] } },
      }),
    ])
    const ctx: PipelineContext = {
      source: '<div onclick="alert(1)" style="color:red" srcdoc="<b>x</b>">ok</div>',
      options: {},
      plugins: resolved.plugins,
      remarkPlugins: resolved.remarkPlugins,
      rehypePlugins: resolved.rehypePlugins,
      remarkRehypeOptions: {},
      slugger: new GithubSlugger(),
      idPrefix: '',
      diagnostics: [],
    }
    const result = createOfficialPipeline().processSync!(ctx.source, ctx)
    const json = JSON.stringify(result.hast)

    expect(json.toLowerCase()).not.toContain('onclick')
    expect(json).not.toContain('"style"')
    expect(json.toLowerCase()).not.toContain('srcdoc')
  })

  it('prefixes raw HTML ids and names to prevent DOM clobbering', () => {
    const model = parse('<a id="app" name="getElementById">x</a>', [
      ...defaultPlugins,
      htmlPlugin(),
    ])
    const json = JSON.stringify(model.nodes)
    expect(json).toContain('"id":"user-content-app"')
    expect(json).toContain('"name":"user-content-getElementById"')
  })

  it('keeps raw-HTML fragment links pointing at prefixed targets', () => {
    const model = parse('<div id="target">x</div>\n\n[go](#target)', [
      ...defaultPlugins,
      htmlPlugin(),
    ])
    const json = JSON.stringify(model.nodes)
    expect(json).toContain('"id":"user-content-target"')
    expect(json).toContain('"href":"#user-content-target"')
  })

  it('leaves heading anchors and footnote links intact', () => {
    const model = parse('## Hello\n\n[go](#hello)\n\nText[^1]\n\n[^1]: note', [
      ...defaultPlugins,
      gfmPlugin,
      htmlPlugin(),
    ])
    expect(model.toc[0]?.id).toBe('hello')
    const json = JSON.stringify(model.nodes)
    expect(json).toContain('"href":"#hello"')
    expect(json).toContain('"id":"user-content-fn-1"')
    expect(json).toContain('"href":"#user-content-fn-1"')
    expect(json).toContain('"href":"#user-content-fnref-1"')
  })

  it('runs library slug output before host rehype plugins', () => {
    const seen: Array<string | undefined> = []
    const hostPlugin = () => (tree: unknown) => {
      const root = tree as {
        children: Array<{ type: string; tagName?: string; properties?: { id?: string } }>
      }
      for (const child of root.children) {
        if (child.type === 'element' && child.tagName === 'h1') {
          seen.push(child.properties?.id)
          child.properties = { ...child.properties, id: 'host-override' }
        }
      }
    }

    const slugger = new GithubSlugger()
    const ctx: PipelineContext = {
      source: '# Title',
      plugins: defaultPlugins,
      remarkPlugins: [],
      rehypePlugins: [hostPlugin],
      remarkRehypeOptions: {},
      slugger,
      idPrefix: '',
      diagnostics: [],
    }
    const result = createOfficialPipeline().processSync!(ctx.source, ctx)
    const model = normalizeHast(result.hast, { slugger: new GithubSlugger() })

    expect(seen).toEqual(['title'])
    expect(model.toc[0]?.id).toBe('host-override')
  })

  it('reports a failing plugin without aborting the document', () => {
    const broken = () => () => {
      throw new Error('boom')
    }
    const slugger = new GithubSlugger()
    const diagnostics: PipelineContext['diagnostics'] = []
    const ctx: PipelineContext = {
      source: '# Title\n\nText',
      plugins: defaultPlugins,
      remarkPlugins: [broken],
      rehypePlugins: [],
      remarkRehypeOptions: {},
      slugger,
      idPrefix: '',
      diagnostics,
    }
    const result = createOfficialPipeline().processSync!(ctx.source, ctx)
    const model = normalizeHast(result.hast, { slugger: new GithubSlugger() })

    expect(text(model.nodes)).toContain('Text')
    expect(diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'plugin-run', plugin: 'broken' }),
      ]),
    )
  })

  it('reports later failures to the current run when a cached processor is reused', () => {
    let fail = false
    const flaky = () => () => {
      if (fail) throw new Error('late boom')
    }
    const slugger = new GithubSlugger()
    const base = {
      plugins: defaultPlugins,
      remarkPlugins: [flaky],
      rehypePlugins: [],
      remarkRehypeOptions: {},
      slugger,
      idPrefix: '',
    }
    const pipeline = createOfficialPipeline()

    const first: PipelineContext['diagnostics'] = []
    pipeline.processSync!('# One', { ...base, source: '# One', diagnostics: first })
    expect(first.some((item) => item.code === 'plugin-run')).toBe(false)

    fail = true
    const second: PipelineContext['diagnostics'] = []
    pipeline.processSync!('# Two', { ...base, source: '# Two', diagnostics: second })
    expect(second.some((item) => item.code === 'plugin-run')).toBe(true)
    expect(first.some((item) => item.code === 'plugin-run')).toBe(false)
  })

  it('calls the owning plugin onError for remark failures', () => {
    let reportedPhase = ''
    const broken = () => () => {
      throw new Error('boom')
    }
    const plugin = defineMarkdownPlugin({
      name: 'owner',
      remarkPlugins: [broken],
      onError(_error, phase) {
        reportedPhase = phase
      },
    })
    const empty = defineMarkdownPlugin({ name: 'empty' })
    const diagnostics: PipelineContext['diagnostics'] = []
    const ctx: PipelineContext = {
      source: '# Title',
      plugins: [empty, plugin],
      remarkPlugins: [broken],
      rehypePlugins: [],
      remarkRehypeOptions: {},
      slugger: new GithubSlugger(),
      idPrefix: '',
      diagnostics,
    }
    createOfficialPipeline().processSync!('# Title', ctx)

    expect(reportedPhase).toBe('remark')
    expect(
      diagnostics.some(
        (item) => item.code === 'plugin-run' && item.plugin === 'broken',
      ),
    ).toBe(true)
  })
})

describe('safety and URL policy', () => {
  it('removes event handlers and dangerous protocols', () => {
    const result = parse('[x](javascript:alert(1)) ![y](data:image/svg+xml,<svg/>)')
    expect(JSON.stringify(result.nodes)).not.toContain('javascript:')
    expect(JSON.stringify(result.nodes)).not.toContain('svg+xml')
  })

  it('applies a custom urlTransform', () => {
    const slugger = new GithubSlugger()
    const ctx: PipelineContext = {
      source: '[x](https://example.com)',
      plugins: defaultPlugins,
      remarkPlugins: [],
      rehypePlugins: [],
      remarkRehypeOptions: {},
      slugger,
      idPrefix: '',
      diagnostics: [],
    }
    const result = createOfficialPipeline().processSync!(ctx.source, ctx)
    const model = normalizeHast(result.hast, {
      slugger: new GithubSlugger(),
      urlTransform: (url, key) => (key === 'href' ? `${url}?safe=1` : null),
    })
    const link = findElement(model.nodes, 'a')
    expect(link && link.kind === 'element' ? link.attrs.href : '').toBe(
      'https://example.com?safe=1',
    )
  })

  it('removes an attribute when urlTransform returns null', () => {
    const slugger = new GithubSlugger()
    const ctx: PipelineContext = {
      source: '[x](https://example.com)',
      plugins: defaultPlugins,
      remarkPlugins: [],
      rehypePlugins: [],
      remarkRehypeOptions: {},
      slugger,
      idPrefix: '',
      diagnostics: [],
    }
    const result = createOfficialPipeline().processSync!(ctx.source, ctx)
    const model = normalizeHast(result.hast, {
      slugger: new GithubSlugger(),
      urlTransform: () => null,
    })
    const link = findElement(model.nodes, 'a')
    expect(link && link.kind === 'element' ? link.attrs.href : undefined).toBeUndefined()
  })

  it('resolves relative URLs against baseUrl', () => {
    const slugger = new GithubSlugger()
    const ctx: PipelineContext = {
      source: '[docs](/guide)',
      plugins: defaultPlugins,
      remarkPlugins: [],
      rehypePlugins: [],
      remarkRehypeOptions: {},
      slugger,
      idPrefix: '',
      diagnostics: [],
    }
    const result = createOfficialPipeline().processSync!(ctx.source, ctx)
    const model = normalizeHast(result.hast, {
      slugger: new GithubSlugger(),
      baseUrl: 'https://example.com/base/',
    })
    const link = findElement(model.nodes, 'a')
    expect(link && link.kind === 'element' ? link.attrs.href : '').toBe(
      'https://example.com/guide',
    )
  })

  it('prefixes heading IDs', () => {
    const slugger = new GithubSlugger()
    const ctx: PipelineContext = {
      source: '# Title',
      plugins: defaultPlugins,
      remarkPlugins: [],
      rehypePlugins: [],
      remarkRehypeOptions: {},
      slugger,
      idPrefix: 'doc-',
      diagnostics: [],
    }
    const result = createOfficialPipeline().processSync!(ctx.source, ctx)
    const model = normalizeHast(result.hast, {
      slugger: new GithubSlugger(),
      idPrefix: 'doc-',
    })
    expect(model.toc[0]?.id).toBe('doc-title')
  })
})

describe('filtering', () => {
  const source = '# Title\n\nParagraph **bold**'

  function withOptions(
    options: Omit<Parameters<typeof normalizeHast>[1], 'slugger'>,
  ) {
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
    return normalizeHast(result.hast, { slugger: new GithubSlugger(), ...options })
  }

  it('keeps only allowed elements', () => {
    const model = withOptions({ allowedElements: ['p'] })
    expect(model.nodes.every((node) => node.kind === 'element' && node.tag === 'p')).toBe(
      true,
    )
    expect(model.toc).toEqual([])
  })

  it('drops disallowed elements', () => {
    const model = withOptions({ disallowedElements: ['h1'] })
    expect(text(model.nodes)).toContain('Paragraph')
    expect(text(model.nodes)).not.toContain('Title')
  })

  it('unwraps disallowed elements', () => {
    const model = withOptions({ disallowedElements: ['h1'], unwrapDisallowed: true })
    expect(text(model.nodes)).toContain('Title')
  })

  it('applies allowElement after lists', () => {
    const model = withOptions({
      allowElement: (node) => node.tag !== 'strong',
      unwrapDisallowed: true,
    })
    expect(text(model.nodes)).toContain('bold')
    expect(
      model.nodes.some(
        (node) => node.kind === 'element' && node.tag === 'p',
      ),
    ).toBe(true)
    expect(JSON.stringify(model.nodes)).not.toContain('"tag":"strong"')
  })

  it('reports conflicting lists and lets allowed win', () => {
    const model = withOptions({
      allowedElements: ['p'],
      disallowedElements: ['p'],
    })
    expect(model.nodes.length).toBe(1)
    expect(model.nodes[0]?.kind).toBe('element')
  })
})

describe('built-in plugins', () => {
  it('segments search matches', () => {
    const result = useMarkdownDocument('Hello hello world', {
      plugins: [searchPlugin({ query: 'hello' })],
    })
    const segments = result.document.value?.nodes
      .flatMap((node) =>
        node.kind === 'element' ? node.children : [node],
      )
      .flatMap((node) => (node.kind === 'text' ? node.segments ?? [] : []))

    expect(segments?.filter((segment) => segment.match)).toHaveLength(2)
  })

  it('skips the tree walk when the search query is empty', () => {
    const plugin = searchPlugin()
    const document = {
      nodes: [],
      toc: [],
      customTags: [],
      plugins: [],
      pipeline: 'official',
    }
    expect(plugin.transformDocument?.(document, {} as never)).toBe(document)
  })

  it('applies the renderer-level search option', () => {
    const result = useMarkdownDocument('Hello hello world', {
      search: { query: 'hello', caseSensitive: true },
    })
    const segments = result.document.value?.nodes
      .flatMap((node) =>
        node.kind === 'element' ? node.children : [node],
      )
      .flatMap((node) => (node.kind === 'text' ? node.segments ?? [] : []))

    expect(segments?.filter((segment) => segment.match)).toHaveLength(1)

    const insensitive = useMarkdownDocument('Hello hello world', {
      search: { query: 'hello' },
    })
    const matched = insensitive.document.value?.nodes
      .flatMap((node) =>
        node.kind === 'element' ? node.children : [node],
      )
      .flatMap((node) => (node.kind === 'text' ? node.segments ?? [] : []))
    expect(matched?.filter((segment) => segment.match)).toHaveLength(2)
  })

  it('extracts GFM tables, strikethrough, and task lists', () => {
    const source = [
      '| a | b |',
      '| - | - |',
      '| 1 | 2 |',
      '',
      '~~gone~~',
      '',
      '- [x] done',
    ].join('\n')
    const result = useMarkdownDocument(source, { plugins: [gfmPlugin] })
    const json = JSON.stringify(result.document.value)
    expect(json).toContain('"tag":"table"')
    expect(json).toContain('"tag":"del"')
    expect(json).toContain('"type":"checkbox"')
  })

  it('extracts frontmatter metadata', () => {
    const source = ['---', 'title: Hello', 'draft: false', '---', '', '# Body'].join('\n')
    const result = useMarkdownDocument(source, { plugins: [frontmatterPlugin] })
    expect(result.document.value?.frontmatter).toEqual({
      title: 'Hello',
      draft: false,
    })
    expect(result.document.value?.nodes.some((node) => node.kind === 'text' && node.value.includes('title:'))).toBe(false)
  })

  it('applies source transforms before parsing', () => {
    const plugin = defineMarkdownPlugin({
      name: 'source-prefix',
      transformSource: (source) => `# ${source}`,
    })
    const result = useMarkdownDocument('Hello', { plugins: [plugin] })
    expect(result.document.value?.toc[0]?.text).toBe('Hello')
  })

  it('deduplicates diagnostics and clears them on demand', async () => {
    const plugin = defineMarkdownPlugin({
      name: 'duplicate-diagnostics',
      transformDocument(document, ctx) {
        ctx.addDiagnostic({
          code: 'sample-warning',
          message: 'The same warning.',
          severity: 'warning',
          phase: 'document',
          plugin: 'duplicate-diagnostics',
        })
        ctx.addDiagnostic({
          code: 'sample-warning',
          message: 'The same warning.',
          severity: 'warning',
          phase: 'document',
          plugin: 'duplicate-diagnostics',
        })
        return document
      },
    })

    const result = useMarkdownDocument('# Title', { plugins: [plugin] })
    await result.refresh()
    expect(result.diagnostics.value).toHaveLength(1)

    await result.refresh()
    await result.refresh()
    expect(result.diagnostics.value).toHaveLength(1)

    result.clearDiagnostics()
    expect(result.diagnostics.value).toEqual([])
  })

  it('keeps diagnostics that share a message but occur in different places', async () => {
    const plugin = defineMarkdownPlugin({
      name: 'distinct-diagnostics',
      transformDocument(document, ctx) {
        ctx.addDiagnostic({
          code: 'unsupported-syntax',
          message: 'Unsupported syntax.',
          severity: 'warning',
          phase: 'document',
          plugin: 'distinct-diagnostics',
          source: {
            start: { line: 3, column: 1 },
            end: { line: 3, column: 8 },
          },
        })
        ctx.addDiagnostic({
          code: 'unsupported-syntax',
          message: 'Unsupported syntax.',
          severity: 'warning',
          phase: 'document',
          plugin: 'distinct-diagnostics',
          source: {
            start: { line: 12, column: 1 },
            end: { line: 12, column: 8 },
          },
        })
        ctx.addDiagnostic({
          code: 'unsupported-syntax',
          message: 'Unsupported syntax.',
          severity: 'warning',
          phase: 'document',
          plugin: 'distinct-diagnostics',
          details: 'Parser detail for the first occurrence.',
          source: {
            start: { line: 3, column: 1 },
            end: { line: 3, column: 8 },
          },
        })
        return document
      },
    })

    const result = useMarkdownDocument('# Title', { plugins: [plugin] })
    await result.refresh()
    expect(result.diagnostics.value).toHaveLength(3)
  })

  it('replaces diagnostics instead of accumulating across failed runs', async () => {
    let attempt = 0
    const pipeline: MarkdownPipeline = {
      name: 'always-fails',
      process() {
        return Promise.resolve({ hast: { type: 'root', children: [] } })
      },
      processSync() {
        attempt += 1
        throw new Error(`broken ${attempt}`)
      },
    }

    const result = useMarkdownDocument('# Title', { pipeline })
    await result.refresh()
    await result.refresh()
    await result.refresh()

    expect(result.status.value).toBe('error')
    expect(result.diagnostics.value).toHaveLength(1)
    expect(result.diagnostics.value[0]?.message).toBe('broken 4')
  })

  it('clears failure diagnostics when a later run succeeds', async () => {
    let fail = true
    const pipeline: MarkdownPipeline = {
      name: 'recoverable',
      process() {
        return Promise.resolve({ hast: { type: 'root', children: [] } })
      },
      processSync() {
        if (fail) throw new Error('broken')
        return { hast: { type: 'root', children: [] } }
      },
    }

    const result = useMarkdownDocument('# Title', { pipeline })
    expect(result.diagnostics.value[0]?.code).toBe('pipeline-sync')

    fail = false
    await result.refresh()
    expect(result.status.value).toBe('ready')
    expect(result.diagnostics.value).toEqual([])
  })

  it('does not let a retained setup context grow the diagnostics list', async () => {
    let captured: PluginContext | undefined
    let late = 0
    const plugin = defineMarkdownPlugin({
      name: 'late-reports',
      setup(ctx) {
        captured = ctx
        ctx.addDiagnostic({
          code: 'setup-warning',
          message: 'Diagnosed once during setup.',
          severity: 'warning',
          phase: 'setup',
          plugin: 'late-reports',
        })
      },
      transformDocument(document) {
        late += 1
        captured?.addDiagnostic({
          code: 'late-warning',
          message: `Late warning ${late}.`,
          severity: 'warning',
          phase: 'document',
          plugin: 'late-reports',
        })
        return document
      },
    })

    const result = useMarkdownDocument('# Title', { plugins: [plugin] })
    await result.refresh()
    await result.refresh()

    expect(result.diagnostics.value.map((diagnostic) => diagnostic.code)).toEqual([
      'setup-warning',
    ])
  })

  it('keeps the original source and reports when a source transform fails', () => {
    let reported = 0
    const plugin = defineMarkdownPlugin({
      name: 'broken-source',
      transformSource() {
        throw new Error('nope')
      },
      onError() {
        reported += 1
      },
    })
    const result = useMarkdownDocument('# Safe', { plugins: [plugin] })

    expect(result.document.value?.toc[0]?.id).toBe('safe')
    expect(
      result.diagnostics.value.some(
        (item) => item.code === 'plugin-source' && item.phase === 'source',
      ),
    ).toBe(true)
    expect(reported).toBeGreaterThanOrEqual(1)
  })
})

describe('plugin registry', () => {
  it('orders by phase and registration', () => {
    const resolved = resolvePlugins([
      defineMarkdownPlugin({ name: 'post', phase: 'post' }),
      defineMarkdownPlugin({ name: 'normal', phase: 'normal' }),
      defineMarkdownPlugin({ name: 'pre', phase: 'pre' }),
      defineMarkdownPlugin({ name: 'normal-2', phase: 'normal' }),
    ])
    expect(resolved.names).toEqual(['pre', 'normal', 'normal-2', 'post'])
  })

  it('replaces duplicate names and reports a diagnostic', () => {
    const resolved = resolvePlugins([
      defineMarkdownPlugin({ name: 'dup', tokens: { a: '1' } }),
      defineMarkdownPlugin({ name: 'dup', tokens: { b: '2' } }),
    ])
    expect(resolved.names).toEqual(['dup'])
    expect(resolved.tokens).toEqual({ b: '2' })
    expect(resolved.diagnostics[0]?.code).toBe('plugin-duplicate')
  })

  it('merges plugin contributions', () => {
    const resolved = resolvePlugins([
      defineMarkdownPlugin({
        name: 'a',
        components: { h1: 'h2' },
        labels: { toc: 'Contents' },
        remarkPlugins: [],
        rehypePlugins: [],
      }),
    ])
    expect(resolved.components.h1).toBe('h2')
    expect(resolved.labels.toc).toBe('Contents')
  })

  it('keeps core invariant plugins and reports when they are disabled', () => {
    const resolved = resolvePlugins(defaultPlugins, ['toc'])
    expect(resolved.names).toContain('toc')
    expect(
      resolved.diagnostics.some(
        (item) => item.code === 'plugin-core' && item.plugin === 'toc',
      ),
    ).toBe(true)
  })

  it('still disables non-core plugins', () => {
    const resolved = resolvePlugins(defaultPlugins, ['search'])
    expect(resolved.names).not.toContain('search')
  })

  it('disables custom tags by its registered name', () => {
    const resolved = resolvePlugins(defaultPlugins, ['custom-tags'])
    expect(resolved.names).not.toContain('custom-tags')
    expect(resolved.diagnostics).toHaveLength(0)
  })

  it('reports unknown disable names once without removing plugins', () => {
    const resolved = resolvePlugins(defaultPlugins, ['customTags', 'customTags'])
    expect(resolved.names).toEqual(defaultPlugins.map((plugin) => plugin.name))
    expect(
      resolved.diagnostics.filter((item) => item.code === 'plugin-unknown'),
    ).toEqual([
      expect.objectContaining({
        severity: 'warning',
        phase: 'setup',
        plugin: 'customTags',
      }),
    ])
  })
})

describe('pipeline capabilities', () => {
  it('never calls processSync when a pipeline declares sync: false', async () => {
    let syncCalls = 0
    let asyncCalls = 0
    const pipeline: MarkdownPipeline = {
      name: 'async-only',
      capabilities: { sync: false },
      async process() {
        asyncCalls += 1
        return paragraphResult('Async output')
      },
      processSync() {
        syncCalls += 1
        return paragraphResult('Sync output')
      },
    }

    const result = useMarkdownDocument('ignored', { pipeline })
    await result.refresh()

    expect(syncCalls).toBe(0)
    expect(asyncCalls).toBeGreaterThan(0)
    expect(JSON.stringify(result.document.value)).toContain('Async output')
    expect(JSON.stringify(result.document.value)).not.toContain('Sync output')
  })

  it('uses the synchronous path when a pipeline declares sync: true', () => {
    let syncCalls = 0
    let asyncCalls = 0
    const pipeline: MarkdownPipeline = {
      name: 'sync-only',
      capabilities: { sync: true },
      async process() {
        asyncCalls += 1
        return paragraphResult('Async output')
      },
      processSync() {
        syncCalls += 1
        return paragraphResult('Sync output')
      },
    }

    const result = useMarkdownDocument('ignored', { pipeline })

    expect(syncCalls).toBe(1)
    expect(asyncCalls).toBe(0)
    expect(JSON.stringify(result.document.value)).toContain('Sync output')
  })

  it('keeps the error-message fallback when capabilities are undeclared', async () => {
    let syncCalls = 0
    let asyncCalls = 0
    const pipeline: MarkdownPipeline = {
      name: 'undeclared',
      async process() {
        asyncCalls += 1
        return paragraphResult('Async output')
      },
      processSync() {
        syncCalls += 1
        throw new Error('Cannot run processSync on a processor that finished async.')
      },
    }

    const result = useMarkdownDocument('ignored', { pipeline })
    await result.refresh()

    expect(syncCalls).toBeGreaterThan(0)
    expect(asyncCalls).toBeGreaterThan(0)
    expect(JSON.stringify(result.document.value)).toContain('Async output')
  })

  it('reports malformed capabilities and falls back to the official pipeline', () => {
    const pipeline = {
      name: 'bad-capabilities',
      capabilities: { sync: 'yes' },
      async process() {
        return paragraphResult('Custom output')
      },
      processSync() {
        return paragraphResult('Custom output')
      },
    } as unknown as MarkdownPipeline

    const result = useMarkdownDocument('# Title', { pipeline })

    expect(result.document.value?.pipeline).toBe('official')
    expect(
      result.diagnostics.value.some(
        (item) => item.code === 'pipeline-capabilities',
      ),
    ).toBe(true)
  })

  it.each([
    { label: 'null', capabilities: null },
    { label: 'an array', capabilities: [] },
    { label: 'a string', capabilities: 'sync' },
    { label: 'a non-boolean plugins field', capabilities: { plugins: 'yes' } },
  ])('reports $label capabilities and falls back', ({ capabilities }) => {
    const pipeline = {
      name: 'bad-shape',
      capabilities,
      async process() {
        return paragraphResult('Custom output')
      },
      processSync() {
        return paragraphResult('Custom output')
      },
    } as unknown as MarkdownPipeline

    const result = useMarkdownDocument('# Title', { pipeline })

    expect(result.document.value?.pipeline).toBe('official')
    expect(
      result.diagnostics.value.some(
        (item) => item.code === 'pipeline-capabilities',
      ),
    ).toBe(true)
    expect(JSON.stringify(result.document.value)).not.toContain('Custom output')
  })

  it('throws from defineMarkdownPipeline when capabilities are malformed', () => {
    const pipeline = {
      name: 'bad-capabilities-defined',
      capabilities: { sync: 'yes' },
      async process() {
        return paragraphResult('Custom output')
      },
    } as unknown as MarkdownPipeline

    expect(() => defineMarkdownPipeline(pipeline)).toThrow(/capabilities\.sync/)
  })

  it('falls back to process when sync: true is declared without processSync', async () => {
    let asyncCalls = 0
    const pipeline: MarkdownPipeline = {
      name: 'sync-declared-without-sync',
      capabilities: { sync: true },
      async process() {
        asyncCalls += 1
        return paragraphResult('Async output')
      },
    }

    const result = useMarkdownDocument('ignored', { pipeline })
    await result.refresh()

    expect(asyncCalls).toBeGreaterThan(0)
    expect(JSON.stringify(result.document.value)).toContain('Async output')
  })

  it('rejects malformed capabilities during static export', async () => {
    const pipeline = {
      name: 'bad-export-capabilities',
      capabilities: { sync: 'yes' },
      async process() {
        return paragraphResult('Custom output')
      },
      processSync() {
        return paragraphResult('Custom output')
      },
    } as unknown as MarkdownPipeline

    await expect(exportMarkdownHtml('ignored', { pipeline })).rejects.toThrow(
      /capabilities\.sync/,
    )
    expect(() => exportMarkdownHtmlSync('ignored', { pipeline })).toThrow(
      /capabilities\.sync/,
    )
  })

  it('refuses synchronous export when the pipeline declares sync: false', () => {
    const pipeline: MarkdownPipeline = {
      name: 'async-export',
      capabilities: { sync: false },
      async process() {
        return paragraphResult('Async output')
      },
      processSync() {
        return paragraphResult('Sync output')
      },
    }

    expect(() => exportMarkdownHtmlSync('ignored', { pipeline })).toThrow(
      /synchronous/i,
    )
  })

  it('uses process for asynchronous export when the pipeline declares sync: false', async () => {
    const pipeline: MarkdownPipeline = {
      name: 'async-export-resolved',
      capabilities: { sync: false },
      async process() {
        return paragraphResult('Async output')
      },
      processSync() {
        return paragraphResult('Sync output')
      },
    }

    const html = await exportMarkdownHtml('ignored', { pipeline })

    expect(html).toContain('Async output')
    expect(html).not.toContain('Sync output')
  })
})

describe('custom pipelines and export', () => {
  it('uses a valid custom pipeline', () => {
    const pipeline: MarkdownPipeline = {
      name: 'custom',
      async process() {
        return {
          hast: {
            type: 'root',
            children: [
              {
                type: 'element',
                tagName: 'p',
                properties: {},
                children: [{ type: 'text', value: 'Custom output' }],
              },
            ],
          },
        }
      },
      processSync: () => ({
        hast: {
          type: 'root',
          children: [
            {
              type: 'element',
              tagName: 'p',
              properties: {},
              children: [{ type: 'text', value: 'Custom output' }],
            },
          ],
        },
      }),
    }
    const result = useMarkdownDocument('ignored', { pipeline })
    expect(result.document.value?.pipeline).toBe('custom')
    expect(JSON.stringify(result.document.value)).toContain('Custom output')
  })

  it('falls back from an invalid pipeline', () => {
    const result = useMarkdownDocument('# Title', {
      pipeline: { name: '', process: undefined } as unknown as MarkdownPipeline,
    })
    expect(result.document.value?.pipeline).toBe('official')
    expect(result.diagnostics.value.some((item) => item.code === 'pipeline-name')).toBe(
      true,
    )
  })

  it('exports static HTML through the same pipeline', () => {
    const html = exportMarkdownHtmlSync('# Title\n\n**bold**')
    expect(html).toContain('<h1 id="title">Title</h1>')
    expect(html).toContain('<strong>bold</strong>')
  })

  it('applies source transforms during static export', () => {
    const plugin = defineMarkdownPlugin({
      name: 'export-source',
      transformSource: (source) => `# ${source}`,
    })
    const html = exportMarkdownHtmlSync('Hello', { plugins: [plugin] })
    expect(html).toContain('<h1 id="hello">Hello</h1>')
  })
})

describe('document model', () => {
  it('builds TOC and custom tag inventory', () => {
    const pipeline: MarkdownPipeline = {
      name: 'custom',
      async process() {
        return customResult()
      },
      processSync: () => customResult(),
    }
    function customResult() {
      return {
        hast: {
          type: 'root' as const,
          children: [
            {
              type: 'element' as const,
              tagName: 'h2',
              properties: { id: 'note' },
              children: [{ type: 'text' as const, value: 'Note' }],
            },
            {
              type: 'element' as const,
              tagName: 'x-note',
              properties: { tone: 'info' },
              children: [{ type: 'text' as const, value: 'Body' }],
            },
          ],
        },
      }
    }
    const result = useMarkdownDocument('', {
      pipeline,
      plugins: [
        defineMarkdownPlugin({
          name: 'custom-tags',
          transformDocument(document) {
            return {
              ...document,
              nodes: document.nodes.map((node) =>
                node.kind === 'element' && node.tag === 'x-note'
                  ? {
                      kind: 'custom' as const,
                      key: node.key,
                      tag: node.tag,
                      props: node.attrs,
                      attrs: node.attrs,
                      children: node.children,
                    }
                  : node,
              ),
            }
          },
        }),
      ],
    })
    expect(result.document.value?.toc).toEqual([
      { id: 'note', text: 'Note', level: 2 },
    ])
    expect(result.document.value?.customTags[0]?.tag).toBe('x-note')
  })

  it('builds a document from a mixed source', () => {
    const result = parse('# Hello')
    const document = buildDocument({
      nodes: result.nodes,
      plugins: ['toc'],
      pipeline: 'official',
    })
    expect(document.toc).toHaveLength(1)
  })
})
