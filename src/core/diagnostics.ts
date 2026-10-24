import type { MarkdownDiagnostic, DiagnosticPhase } from './types'

export function createDiagnostic(
  code: string,
  message: string,
  options: {
    severity?: MarkdownDiagnostic['severity']
    phase?: DiagnosticPhase
    plugin?: string
  } = {},
): MarkdownDiagnostic {
  return {
    code,
    message,
    severity: options.severity ?? 'error',
    phase: options.phase,
    plugin: options.plugin,
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
