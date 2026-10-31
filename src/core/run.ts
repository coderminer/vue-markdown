import GithubSlugger from 'github-slugger'
import type {
  MarkdownDiagnostic,
  MarkdownDocumentOptions,
  MarkdownPipeline,
  MarkdownSlugger,
  PipelineContext,
} from './types'
import { withUniqueSlugs } from './slugger'
import type { ResolvedPlugins } from '../plugins/registry'
import { defaultPlugins } from '../plugins/builtin'
import { resolvePlugins } from '../plugins/registry'
import { applySourceTransforms } from '../plugins/source'
import { resolvePipeline } from '../pipeline/custom'

export interface MarkdownRun {
  pipeline: MarkdownPipeline
  plugins: ResolvedPlugins
  source: string
  context: PipelineContext
  allowHtml: boolean
  slugger: MarkdownSlugger
  diagnostics: MarkdownDiagnostic[]
}

export function detectRawPlugin(
  plugins: PipelineContext['rehypePlugins'],
): boolean {
  return plugins.some((item) => {
    const name = Array.isArray(item)
      ? typeof item[0] === 'function'
        ? item[0].name
        : ''
      : typeof item === 'function'
        ? item.name
        : ''
    return /^rehype[-_]?raw$/i.test(name)
  })
}

/**
 * Resolve and prepare one non-reactive pipeline run. Export uses this helper so
 * source transforms, plugin resolution, slugger setup, and raw-HTML detection
 * match the composable's run.
 */
export function prepareMarkdownRun(
  source: string,
  options: MarkdownDocumentOptions = {},
  diagnostics: MarkdownDiagnostic[] = [],
): MarkdownRun {
  const plugins = resolvePlugins(
    options.plugins ?? defaultPlugins,
    options.disablePlugins ?? [],
  )
  diagnostics.push(...plugins.diagnostics)

  const resolvedPipeline = resolvePipeline(options.pipeline)
  diagnostics.push(...resolvedPipeline.diagnostics)

  const remarkPlugins = [
    ...plugins.remarkPlugins,
    ...(options.remarkPlugins ?? []),
  ]
  const rehypePlugins = [
    ...plugins.rehypePlugins,
    ...(options.rehypePlugins ?? []),
  ]

  const transformedSource = applySourceTransforms(
    source,
    plugins.plugins,
    options,
    diagnostics,
  )

  const baseSlugger = options.slugger ?? new GithubSlugger()
  const slugger = withUniqueSlugs(baseSlugger)
  const allowHtml =
    detectRawPlugin(rehypePlugins) ||
    resolvedPipeline.pipeline.capabilities?.html === true

  const context: PipelineContext = {
    source: transformedSource,
    options,
    plugins: plugins.plugins,
    remarkPlugins,
    rehypePlugins,
    remarkRehypeOptions: {
      ...plugins.remarkRehypeOptions,
      ...(options.remarkRehypeOptions ?? {}),
    },
    slugger,
    idPrefix: options.idPrefix ?? '',
    allowHtml,
    diagnostics,
  }

  return {
    pipeline: resolvedPipeline.pipeline,
    plugins,
    source: transformedSource,
    context,
    allowHtml,
    slugger,
    diagnostics,
  }
}
