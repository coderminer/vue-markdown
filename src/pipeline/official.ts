import { unified, type Pluggable, type Processor } from 'unified'
import type { Root } from 'hast'
import { VFile } from 'vfile'
import remarkParse from 'remark-parse'
import remarkRehype from 'remark-rehype'
import rehypeSanitize from 'rehype-sanitize'
import { defaultSchema, type Schema } from 'hast-util-sanitize'
import { visit } from 'unist-util-visit'
import type {
  HtmlSchemaExtension,
  MarkdownPipeline,
  MarkdownPlugin,
  PipelineCapabilities,
  PipelineContext,
  PipelineResult,
  PluginContext,
} from '../core/types'
import { identityOf, listIdentity } from '../core/identity'
import { createDiagnostic, errorMessage } from '../core/diagnostics'
import { ALLOWED_TAGS, DANGEROUS_TAGS } from '../core/security'

const CONTEXT_KEY = 'vmdPipelineContext'

const CAPABILITIES: PipelineCapabilities = {
  sync: true,
  plugins: true,
}

type AnyProcessor = Processor<any, any, any, any, any>

function useItem(processor: AnyProcessor, item: Pluggable): void {
  if (Array.isArray(item)) {
    const [plugin, ...rest] = item
    processor.use(plugin as never, ...(rest as never[]))
  } else {
    processor.use(item as never)
  }
}

function recordPluginError(
  ctx: PipelineContext,
  phase: 'remark' | 'rehype',
  plugin: string,
  error: unknown,
): void {
  ctx.diagnostics.push(
    createDiagnostic('plugin-run', errorMessage(error), {
      phase,
      plugin,
    }),
  )
}

function readContext(file: unknown, fallback: PipelineContext): PipelineContext {
  const data = (file as { data?: Record<string, unknown> } | undefined)?.data
  const value = data?.[CONTEXT_KEY]
  return value && typeof value === 'object'
    ? (value as PipelineContext)
    : fallback
}

function pluginContext(ctx: PipelineContext): PluginContext {
  return {
    source: ctx.source,
    options: ctx.options ?? {},
    diagnostics: ctx.diagnostics,
    addDiagnostic(diagnostic) {
      ctx.diagnostics.push(diagnostic)
    },
  }
}

function reportPluginError(
  ctx: PipelineContext,
  phase: 'remark' | 'rehype',
  name: string,
  error: unknown,
  owner: MarkdownPlugin | undefined,
): void {
  recordPluginError(ctx, phase, name, error)
  if (!owner?.onError) return
  try {
    owner.onError(error, phase, pluginContext(ctx))
  } catch (secondary) {
    ctx.diagnostics.push(
      createDiagnostic('plugin-onerror', errorMessage(secondary), {
        phase,
        plugin: name,
      }),
    )
  }
}

function ownerOf(
  ctx: PipelineContext,
  item: Pluggable,
  phase: 'remark' | 'rehype',
): MarkdownPlugin | undefined {
  for (const plugin of ctx.plugins) {
    const list = phase === 'remark' ? plugin.remarkPlugins : plugin.rehypePlugins
    if (list && list.indexOf(item) !== -1) return plugin
  }
  return undefined
}

/** Isolate a plugin transformer so one failure cannot abort the pipeline. */
function guardItem(
  item: Pluggable,
  phase: 'remark' | 'rehype',
  owner: MarkdownPlugin | undefined,
  fallback: PipelineContext,
): Pluggable {
  const name = pluginName(item) || owner?.name || 'anonymous'

  const wrap = (plugin: unknown): unknown => {
    if (typeof plugin !== 'function') return plugin
    return function (this: unknown, ...args: unknown[]) {
      const transformer = (plugin as (...values: unknown[]) => unknown).apply(
        this,
        args,
      )
      if (typeof transformer !== 'function') return transformer
      return (tree: unknown, file: unknown) => {
        const ctx = readContext(file, fallback)
        try {
          const result = (
            transformer as (tree: unknown, file: unknown) => unknown
          )(tree, file)
          if (result && typeof (result as Promise<unknown>).then === 'function') {
            return (result as Promise<unknown>).catch((error: unknown) => {
              reportPluginError(ctx, phase, name, error, owner)
              return tree
            })
          }
          return result
        } catch (error) {
          reportPluginError(ctx, phase, name, error, owner)
          return tree
        }
      }
    }
  }

  if (Array.isArray(item)) {
    return [wrap(item[0]), ...item.slice(1)] as Pluggable
  }
  return wrap(item) as Pluggable
}

export function pluginName(item: unknown): string {
  if (typeof item === 'function') return item.name
  if (Array.isArray(item) && item.length > 0) return pluginName(item[0])
  if (item && typeof item === 'object' && 'name' in item) {
    return String((item as { name?: unknown }).name ?? '')
  }
  return ''
}

function isRehypeRaw(item: Pluggable): boolean {
  // Best-effort only: the supported path takes the parser by reference from
  // htmlPlugin(), and raw nodes are dropped before host rehype plugins run, so
  // a wrapped or minified manual parser cannot affect the result.
  return /^rehype[-_]?raw$/i.test(pluginName(item))
}

function rehypeDropRaw() {
  return () => (tree: Root) => {
    visit(tree, 'raw', (node, index, parent) => {
      if (parent && typeof index === 'number') {
        parent.children.splice(index, 1)
        return index
      }
    })
  }
}

function textContent(node: unknown): string {
  if (!node || typeof node !== 'object') return ''
  const value = (node as { value?: unknown }).value
  if (typeof value === 'string') return value
  const children = (node as { children?: unknown[] }).children
  if (!Array.isArray(children)) return ''
  return children.map(textContent).join('')
}

function rehypeHeadingIds(options: { slugger: PipelineContext['slugger']; idPrefix: string }) {
  return () => (tree: Root) => {
    options.slugger.reset?.()
    visit(tree, 'element', (node) => {
      if (!/^h[1-6]$/.test(node.tagName)) return
      const text = textContent(node).trim()
      if (!text) return
      node.properties = {
        ...node.properties,
        id: `${options.idPrefix}${options.slugger.slug(text)}`,
      }
    })
  }
}

function sanitizeSchema(
  extensions: Array<HtmlSchemaExtension | undefined>,
): Schema {
  const defaults = defaultSchema.attributes ?? {}
  const tagNames = [...ALLOWED_TAGS]
  const attributes = {
    ...defaults,
    '*': [
      ...(defaults['*'] ?? []),
      'className',
      'data*',
      'role',
      'hidden',
      'ariaLabel',
      'ariaLabelledBy',
      'ariaDescribedBy',
      'ariaHidden',
      'ariaCurrent',
      'ariaExpanded',
      'ariaControls',
      'ariaLive',
    ],
    a: [...(defaults.a ?? []), 'target', 'rel', 'download'],
    img: [
      ...(defaults.img ?? []),
      'srcSet',
      'sizes',
      'loading',
      'decoding',
    ],
    source: ['src', 'srcSet', 'media', 'sizes', 'type'],
  } as NonNullable<Schema['attributes']>
  const protocols = {
    ...(defaultSchema.protocols ?? {}),
    // The core URL policy still rejects data:image/svg+xml and non-image data
    // URLs; allowing data here keeps raster image data URLs at parity with
    // Markdown image syntax.
    src: ['http', 'https', 'data'],
  } as NonNullable<Schema['protocols']>

  // `hast-util-sanitize` checks tag-specific definitions before the `'*'`
  // fallback. Replace the restrictive `className` entries (for example
  // `code: [['className', /^language-./]]`) with an unconstrained definition
  // so raw HTML classes and math classes survive. Class names are not
  // executable, and the core model builder keeps its global class policy.
  for (const tag of Object.keys(attributes)) {
    if (tag === '*') continue
    const definitions = attributes[tag]
    if (
      !definitions.some(
        (entry) => (typeof entry === 'string' ? entry : entry[0]) === 'className',
      )
    ) {
      continue
    }
    attributes[tag] = [
      'className',
      ...definitions.filter(
        (entry) => (typeof entry === 'string' ? entry : entry[0]) !== 'className',
      ),
    ]
  }

  for (const extension of extensions) {
    if (!extension) continue
    for (const tag of extension.tags ?? []) {
      // tagNames membership short-circuits the strip list in
      // hast-util-sanitize, so a dangerous tag must never be added here.
      if (DANGEROUS_TAGS.has(tag)) continue
      if (tagNames.indexOf(tag) === -1) tagNames.push(tag)
    }
    for (const tag of Object.keys(extension.attributes ?? {})) {
      const extra = (extension.attributes?.[tag] ?? []).filter((name) => {
        const lower = name.toLowerCase()
        return (
          !lower.startsWith('on') &&
          lower !== 'style' &&
          lower !== 'srcdoc'
        )
      })
      attributes[tag] = [...(attributes[tag] ?? []), ...extra]
    }
  }

  return {
    ...defaultSchema,
    clobberPrefix: '',
    tagNames,
    strip: [...DANGEROUS_TAGS],
    attributes,
    protocols,
  }
}

export interface OfficialPipelineOptions {
  name?: string
}

export function createOfficialPipeline(
  options: OfficialPipelineOptions = {},
): MarkdownPipeline {
  let cachedKey = ''
  let cachedProcessor: AnyProcessor | undefined

  const build = (ctx: PipelineContext): AnyProcessor => {
    const htmlPlugins = ctx.plugins.filter((plugin) => plugin.html === true)
    const rawItems: Pluggable[] = []
    for (const plugin of htmlPlugins) {
      if (plugin.rehypePlugins) rawItems.push(...plugin.rehypePlugins)
    }
    const hasRaw = rawItems.length > 0
    const hostRehype = ctx.rehypePlugins.filter((item) => {
      if (rawItems.indexOf(item) !== -1) return false
      if (!isRehypeRaw(item)) return true
      // Manual rehype-raw bypasses the guaranteed sanitizer and the documented
      // stage order. It is ignored, and raw nodes are dropped before host
      // plugins run, so a wrapped parser cannot inject elements either.
      ctx.diagnostics.push(
        createDiagnostic(
          'html-plugin',
          'Raw HTML is enabled with `htmlPlugin()` from "@coderminer/vue-markdown/html"; manual rehype-raw is ignored.',
          { severity: 'warning', phase: 'pipeline', plugin: 'html' },
        ),
      )
      return false
    })

    const key = [
      ctx.plugins.map((plugin) => identityOf(plugin)).join(','),
      listIdentity(ctx.remarkPlugins),
      listIdentity(hostRehype),
      listIdentity(rawItems),
      identityOf(ctx.remarkRehypeOptions),
      identityOf(ctx.slugger),
      ctx.idPrefix,
      htmlPlugins.map((plugin) => identityOf(plugin.htmlSchema)).join(','),
      hasRaw ? '1' : '0',
    ].join('\u001e')

    if (cachedProcessor && cachedKey === key) return cachedProcessor

    const processor = unified().use(remarkParse)

    for (const item of ctx.remarkPlugins) {
      useItem(processor, guardItem(item, 'remark', ownerOf(ctx, item, 'remark'), ctx))
    }

    processor.use(remarkRehype, {
      allowDangerousHtml: true,
      ...ctx.remarkRehypeOptions,
    })

    if (hasRaw) {
      for (const item of rawItems) {
        useItem(processor, guardItem(item, 'rehype', ownerOf(ctx, item, 'rehype'), ctx))
      }
      processor.use(
        rehypeSanitize,
        sanitizeSchema(htmlPlugins.map((plugin) => plugin.htmlSchema)),
      )
    } else {
      processor.use(rehypeDropRaw())
    }

    processor.use(rehypeHeadingIds({ slugger: ctx.slugger, idPrefix: ctx.idPrefix }) as never)

    for (const item of hostRehype) {
      useItem(processor, guardItem(item, 'rehype', ownerOf(ctx, item, 'rehype'), ctx))
    }

    cachedKey = key
    cachedProcessor = processor
    return processor
  }

  const read = (hast: Root | undefined, file: VFile): PipelineResult => {
    if (!hast || hast.type !== 'root') {
      throw new Error('The Markdown pipeline did not produce a hast root.')
    }
    const frontmatter = file.data?.frontmatter as Record<string, unknown> | undefined
    return { hast, frontmatter }
  }

  return {
    name: options.name ?? 'official',
    capabilities: { ...CAPABILITIES },
    async process(source, ctx) {
      const processor = build(ctx)
      const file = new VFile({ value: source })
      const data = file.data as Record<string, unknown>
      data[CONTEXT_KEY] = ctx
      const tree = processor.parse(file)
      const hast = (await processor.run(tree, file)) as unknown as Root
      return read(hast, file)
    },
    processSync(source, ctx) {
      const processor = build(ctx)
      const file = new VFile({ value: source })
      const data = file.data as Record<string, unknown>
      data[CONTEXT_KEY] = ctx
      const tree = processor.parse(file)
      const hast = processor.runSync(tree, file) as unknown as Root
      return read(hast, file)
    },
    dispose() {
      cachedProcessor = undefined
      cachedKey = ''
    },
  }
}
