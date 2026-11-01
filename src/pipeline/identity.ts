import { identityOf, listIdentity } from '../core/identity'
import type { MarkdownDocumentOptions, MarkdownPlugin } from '../core/types'

export interface PipelineIdentityInput {
  pipelineName: string
  plugins: readonly MarkdownPlugin[]
  remarkPlugins: readonly unknown[]
  rehypePlugins: readonly unknown[]
  remarkRehypeOptions: Record<string, unknown> | undefined
  options: MarkdownDocumentOptions
}

/** Deterministic identity for parse-affecting configuration. */
export function createPipelineIdentity(input: PipelineIdentityInput): string {
  const { options } = input
  return [
    input.pipelineName,
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
    options.search?.query?.trim() ?? '',
    options.search?.caseSensitive ? '1' : '0',
  ].join('\u001e')
}

export function createMemoKey(
  source: string,
  pipelineIdentity: string,
  extra = '',
): string {
  return `${pipelineIdentity}\u001d${extra}\u001d${source}`
}
