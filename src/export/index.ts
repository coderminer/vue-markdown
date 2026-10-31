import { unified } from 'unified'
import rehypeStringify from 'rehype-stringify'
import type { PluggableList } from 'unified'
import type {
  MarkdownDiagnostic,
  MarkdownDocumentOptions,
  PipelineContext,
  PipelineResult,
} from '../core/types'
import { defaultPlugins } from '../plugins/builtin'
import { applySourceTransforms } from '../plugins/source'
import { resolvePlugins } from '../plugins/registry'
import { assertPipelineResult, resolvePipeline } from '../pipeline/custom'
import GithubSlugger from 'github-slugger'

export type StaticHtmlOptions = MarkdownDocumentOptions

interface RunOptions {
  source: string
  options: StaticHtmlOptions
  diagnostics: MarkdownDiagnostic[]
}

function prepare({ source, options, diagnostics }: RunOptions) {
  const resolved = resolvePlugins(
    options.plugins ?? defaultPlugins,
    options.disablePlugins ?? [],
  )
  diagnostics.push(...resolved.diagnostics)

  const { pipeline, diagnostics: pipelineDiagnostics } = resolvePipeline(
    options.pipeline,
  )
  diagnostics.push(...pipelineDiagnostics)

  const remarkPlugins: PluggableList = [
    ...resolved.remarkPlugins,
    ...(options.remarkPlugins ?? []),
  ]
  const rehypePlugins: PluggableList = [
    ...resolved.rehypePlugins,
    ...(options.rehypePlugins ?? []),
  ]

  const transformedSource = applySourceTransforms(
    source,
    resolved.plugins,
    options,
    diagnostics,
  )

  const context: PipelineContext = {
    source: transformedSource,
    options,
    plugins: resolved.plugins,
    remarkPlugins,
    rehypePlugins,
    remarkRehypeOptions: {
      ...resolved.remarkRehypeOptions,
      ...(options.remarkRehypeOptions ?? {}),
    },
    slugger: options.slugger ?? new GithubSlugger(),
    idPrefix: options.idPrefix ?? '',
    allowHtml: rehypePlugins.some((item) => {
      const name = Array.isArray(item)
        ? typeof item[0] === 'function'
          ? item[0].name
          : ''
        : typeof item === 'function'
          ? item.name
          : ''
      return /^rehype[-_]?raw$/i.test(name)
    }),
    diagnostics,
  }

  return { pipeline, context }
}

function toHtml(result: PipelineResult): string {
  return unified().use(rehypeStringify).stringify(result.hast)
}

function finalize(
  result: PipelineResult,
  diagnostics: MarkdownDiagnostic[],
): string {
  if (diagnostics.some((diagnostic) => diagnostic.severity === 'error')) {
    // The rendered path keeps the last good document; static export reports the
    // failure instead of returning a partial document.
    throw new Error(
      diagnostics.map((diagnostic) => diagnostic.message).join(' '),
    )
  }
  return toHtml(result)
}

/** Render Markdown to static HTML with the same pipeline as the renderer. */
export async function exportMarkdownHtml(
  source: string,
  options: StaticHtmlOptions = {},
): Promise<string> {
  const diagnostics: MarkdownDiagnostic[] = []
  const { pipeline, context } = prepare({ source, options, diagnostics })
  const result = assertPipelineResult(await pipeline.process(context.source, context))
  return finalize(result, diagnostics)
}

/** Synchronous static HTML export when every configured plugin is synchronous. */
export function exportMarkdownHtmlSync(
  source: string,
  options: StaticHtmlOptions = {},
): string {
  const diagnostics: MarkdownDiagnostic[] = []
  const { pipeline, context } = prepare({ source, options, diagnostics })
  if (!pipeline.processSync) {
    throw new Error('The configured pipeline does not support synchronous export.')
  }
  const result = assertPipelineResult(pipeline.processSync(context.source, context))
  return finalize(result, diagnostics)
}
