import type {
  MarkdownDiagnostic,
  MarkdownDocument,
  MarkdownDocumentOptions,
  MarkdownSlugger,
  PipelineResult,
} from './types'
import type { ResolvedPlugins } from '../plugins/registry'
import { createPluginContext } from '../plugins/define'
import { createDiagnostic, errorMessage } from './diagnostics'
import { buildDocument, withDerivedDocument } from './model'
import { normalizeHast } from './normalize'
import { searchDocument } from './search'

export interface FinalizeDocumentOptions {
  source: string
  result: PipelineResult
  options: MarkdownDocumentOptions
  plugins: ResolvedPlugins
  pipelineName: string
  slugger: MarkdownSlugger
  idPrefix: string
  diagnostics: MarkdownDiagnostic[]
}

/**
 * Turn a pipeline result into the public document model. Both the reactive
 * composable and static export use this path so filtering, URL policy, heading
 * IDs, and plugin document transforms cannot diverge.
 */
export function finalizeMarkdownDocument(
  input: FinalizeDocumentOptions,
): MarkdownDocument {
  const {
    source,
    result,
    options,
    plugins,
    pipelineName,
    slugger,
    idPrefix,
    diagnostics,
  } = input

  const normalized = normalizeHast(result.hast, {
    slugger,
    idPrefix,
    urlTransform: options.urlTransform,
    baseUrl: options.baseUrl,
    allowedElements: options.allowedElements,
    disallowedElements: options.disallowedElements,
    unwrapDisallowed: options.unwrapDisallowed,
    allowElement: options.allowElement,
    diagnostics,
  })

  let documentValue = buildDocument({
    nodes: normalized.nodes,
    plugins: plugins.names,
    pipeline: pipelineName,
    frontmatter: result.frontmatter,
  })

  const context = createPluginContext(source, options, diagnostics)
  for (const plugin of plugins.plugins) {
    if (!plugin.transformDocument) continue
    try {
      const transformed = plugin.transformDocument(documentValue, context)
      if (transformed) documentValue = transformed
    } catch (error) {
      diagnostics.push(
        createDiagnostic('plugin-transform', errorMessage(error), {
          phase: 'document',
          plugin: plugin.name,
        }),
      )
      plugin.onError?.(error, 'document', context)
    }
  }

  // The host-level search option is the renderer-friendly form of the search
  // transform. Run it after plugin transforms so the explicit option wins when
  // both are present.
  if (options.search?.query?.trim()) {
    documentValue = searchDocument(documentValue, options.search)
  }

  return withDerivedDocument(documentValue)
}
