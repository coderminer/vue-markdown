import { unified, type Pluggable, type Processor } from 'unified'
import type { Root } from 'hast'
import { VFile } from 'vfile'
import remarkParse from 'remark-parse'
import remarkRehype from 'remark-rehype'
import rehypeSanitize from 'rehype-sanitize'
import { defaultSchema } from 'hast-util-sanitize'
import { visit } from 'unist-util-visit'
import type {
  MarkdownPipeline,
  MarkdownPlugin,
  PipelineCapabilities,
  PipelineContext,
  PipelineResult,
  PluginContext,
} from '../core/types'
import { identityOf, listIdentity } from '../core/identity'
import { createDiagnostic, errorMessage } from '../core/diagnostics'

const CONTEXT_KEY = 'vmdPipelineContext'

const CAPABILITIES: PipelineCapabilities = {
  html: false,
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
  return /^rehype[-_]?raw$/i.test(pluginName(item))
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

function sanitizeSchema() {
  return { ...defaultSchema, clobberPrefix: '' }
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
    const rawItems = ctx.rehypePlugins.filter(isRehypeRaw)
    const hostRehype = ctx.rehypePlugins.filter((item) => !isRehypeRaw(item))
    const hasRaw = rawItems.length > 0

    const key = [
      ctx.plugins.map((plugin) => identityOf(plugin)).join(','),
      listIdentity(ctx.remarkPlugins),
      listIdentity(hostRehype),
      listIdentity(rawItems),
      identityOf(ctx.remarkRehypeOptions),
      identityOf(ctx.slugger),
      ctx.idPrefix,
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
      processor.use(rehypeSanitize, sanitizeSchema())
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
