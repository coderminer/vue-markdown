import { identityOf, listIdentity } from '../core/identity'
import type {
  MarkdownDocumentOptions,
  MarkdownPipeline,
  MarkdownPlugin,
} from '../core/types'

export interface PipelineIdentityInput {
  /** Pipeline name. Defaults to `pipeline.name` when omitted. */
  pipelineName?: string
  /**
   * Pipeline instance. Its process-local identity and optional `version` join
   * the memoization key so two pipelines that share a name cannot reuse each
   * other's cached documents.
   */
  pipeline?: MarkdownPipeline
  plugins: readonly MarkdownPlugin[]
  remarkPlugins: readonly unknown[]
  rehypePlugins: readonly unknown[]
  remarkRehypeOptions: Record<string, unknown> | undefined
  options: MarkdownDocumentOptions
}

/**
 * Deterministic identity for parse-affecting configuration.
 *
 * Presentation-only state (theme, tokens, labels, slots) is excluded. Search
 * state is excluded as well: it is derived from an already parsed document, so a
 * new query must not invalidate the parse cache.
 */
export function createPipelineIdentity(input: PipelineIdentityInput): string {
  const { options } = input
  const pipelineName = input.pipeline?.name ?? input.pipelineName ?? ''
  const pipelineVersion = input.pipeline?.version ?? ''
  const pipelineInstance = input.pipeline ? identityOf(input.pipeline) : ''

  return [
    pipelineName,
    pipelineVersion,
    pipelineInstance,
    input.plugins.map((plugin) => plugin.name).join(','),
    input.plugins.map((plugin) => identityOf(plugin)).join(','),
    listIdentity(input.remarkPlugins),
    listIdentity(input.rehypePlugins),
    identityOf(input.remarkRehypeOptions),
    identityOf(options.slugger),
    options.idPrefix ?? '',
    options.baseUrl ?? '',
    (options.allowedElements ?? []).join('\u001f'),
    (options.disallowedElements ?? []).join('\u001f'),
    options.unwrapDisallowed ? '1' : '0',
    identityOf(options.allowElement),
    identityOf(options.urlTransform),
  ].join('\u001e')
}

export function createMemoKey(
  source: string,
  pipelineIdentity: string,
  extra = '',
): string {
  return `${pipelineIdentity}\u001d${extra}\u001d${source}`
}
