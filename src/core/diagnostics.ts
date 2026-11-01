import type {
  MarkdownDiagnostic,
  DiagnosticPhase,
  SourceRange,
} from './types'

export function createDiagnostic(
  code: string,
  message: string,
  options: {
    severity?: MarkdownDiagnostic['severity']
    phase?: DiagnosticPhase
    plugin?: string
    source?: SourceRange
    details?: string
  } = {},
): MarkdownDiagnostic {
  return {
    code,
    message,
    severity: options.severity ?? 'error',
    phase: options.phase,
    plugin: options.plugin,
    source: options.source,
    details: options.details,
  }
}

export function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  if (typeof error === 'string') return error
  try {
    return JSON.stringify(error)
  } catch {
    return String(error)
  }
}
