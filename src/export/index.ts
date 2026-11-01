import { unified } from 'unified'
import rehypeStringify from 'rehype-stringify'
import type {
  MarkdownDiagnostic,
  MarkdownDocument,
  MarkdownDocumentOptions,
} from '../core/types'
import { finalizeMarkdownDocument } from '../core/finalize'
import { modelToHast } from '../core/model-hast'
import { prepareMarkdownRun } from '../core/run'
import { assertPipelineResult } from '../pipeline/custom'

export type StaticHtmlOptions = MarkdownDocumentOptions

function toHtml(document: MarkdownDocument): string {
  return unified().use(rehypeStringify).stringify(modelToHast(document))
}

function assertNoErrors(diagnostics: MarkdownDiagnostic[]): void {
  if (diagnostics.some((diagnostic) => diagnostic.severity === 'error')) {
    // The rendered path keeps the last good document; static export reports the
    // failure instead of returning a partial document.
    throw new Error(
      diagnostics.map((diagnostic) => diagnostic.message).join(' '),
    )
  }
}

/** Render Markdown to static HTML with the same normalized document as rendering. */
export async function exportMarkdownHtml(
  source: string,
  options: StaticHtmlOptions = {},
): Promise<string> {
  const diagnostics: MarkdownDiagnostic[] = []
  const run = prepareMarkdownRun(source, options, diagnostics)

  run.slugger.reset?.()
  const result = assertPipelineResult(
    await run.pipeline.process(run.source, run.context),
  )
  const document = finalizeMarkdownDocument({
    source: run.source,
    result,
    options,
    plugins: run.plugins,
    pipelineName: run.pipeline.name,
    slugger: run.slugger,
    idPrefix: options.idPrefix ?? '',
    diagnostics,
  })
  assertNoErrors(diagnostics)
  return toHtml(document)
}

/** Synchronous static HTML export when every configured plugin is synchronous. */
export function exportMarkdownHtmlSync(
  source: string,
  options: StaticHtmlOptions = {},
): string {
  const diagnostics: MarkdownDiagnostic[] = []
  const run = prepareMarkdownRun(source, options, diagnostics)
  if (!run.pipeline.processSync) {
    throw new Error('The configured pipeline does not support synchronous export.')
  }
  run.slugger.reset?.()
  const result = assertPipelineResult(
    run.pipeline.processSync(run.source, run.context),
  )
  const document = finalizeMarkdownDocument({
    source: run.source,
    result,
    options,
    plugins: run.plugins,
    pipelineName: run.pipeline.name,
    slugger: run.slugger,
    idPrefix: options.idPrefix ?? '',
    diagnostics,
  })
  assertNoErrors(diagnostics)
  return toHtml(document)
}
