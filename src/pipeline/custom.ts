import type {
  MarkdownDiagnostic,
  MarkdownPipeline,
  PipelineResult,
} from '../core/types'
import { createDiagnostic } from '../core/diagnostics'
import { createOfficialPipeline } from './official'

export function defineMarkdownPipeline(pipeline: MarkdownPipeline): MarkdownPipeline {
  const issues = validatePipeline(pipeline)
  if (issues.length > 0) {
    throw new TypeError(issues.map((issue) => issue.message).join(' '))
  }
  return pipeline
}

export function validatePipeline(pipeline: unknown): MarkdownDiagnostic[] {
  const diagnostics: MarkdownDiagnostic[] = []
  if (!pipeline || typeof pipeline !== 'object') {
    diagnostics.push(
      createDiagnostic('pipeline-invalid', 'A pipeline must be an object.', {
        phase: 'pipeline',
      }),
    )
    return diagnostics
  }

  const candidate = pipeline as Partial<MarkdownPipeline>
  if (typeof candidate.name !== 'string' || candidate.name.trim() === '') {
    diagnostics.push(
      createDiagnostic('pipeline-name', 'A pipeline requires a non-empty name.', {
        phase: 'pipeline',
      }),
    )
  }
  if (typeof candidate.process !== 'function') {
    diagnostics.push(
      createDiagnostic(
        'pipeline-process',
        'A pipeline requires a `process` function.',
        { phase: 'pipeline' },
      ),
    )
  }
  if (
    candidate.processSync !== undefined &&
    typeof candidate.processSync !== 'function'
  ) {
    diagnostics.push(
      createDiagnostic(
        'pipeline-sync',
        '`processSync` must be a function when provided.',
        { phase: 'pipeline' },
      ),
    )
  }
  if (candidate.dispose !== undefined && typeof candidate.dispose !== 'function') {
    diagnostics.push(
      createDiagnostic('pipeline-dispose', '`dispose` must be a function when provided.', {
        phase: 'pipeline',
      }),
    )
  }
  return diagnostics
}

export function assertPipelineResult(result: unknown): PipelineResult {
  if (!result || typeof result !== 'object') {
    throw new TypeError('A pipeline must return a result object.')
  }
  const candidate = result as Partial<PipelineResult>
  if (!candidate.hast || candidate.hast.type !== 'root') {
    throw new TypeError('A pipeline result must include a hast root.')
  }
  return candidate as PipelineResult
}

export function resolvePipeline(pipeline?: MarkdownPipeline): {
  pipeline: MarkdownPipeline
  diagnostics: MarkdownDiagnostic[]
} {
  if (!pipeline) {
    return { pipeline: createOfficialPipeline(), diagnostics: [] }
  }

  const diagnostics = validatePipeline(pipeline)
  if (diagnostics.length > 0) {
    diagnostics.push(
      createDiagnostic(
        'pipeline-fallback',
        'Falling back to the official pipeline because the custom pipeline is invalid.',
        { severity: 'warning', phase: 'pipeline' },
      ),
    )
    return { pipeline: createOfficialPipeline(), diagnostics }
  }

  return { pipeline, diagnostics }
}
