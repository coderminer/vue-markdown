import type {
  MarkdownDiagnostic,
  DiagnosticPhase,
  MarkdownPlugin,
  PluginContext,
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

/**
 * Deliver a plugin failure to the owning plugin's `onError` hook.
 *
 * A hook that throws must not abort the run: its own failure becomes a
 * `plugin-onerror` diagnostic so the primary failure still surfaces once.
 */
export function reportPluginError(
  plugin: Pick<MarkdownPlugin, 'name' | 'onError'> | undefined,
  error: unknown,
  phase: DiagnosticPhase,
  context: PluginContext,
  diagnostics: MarkdownDiagnostic[],
): void {
  if (!plugin?.onError) return
  try {
    plugin.onError(error, phase, context)
  } catch (secondary) {
    diagnostics.push(
      createDiagnostic('plugin-onerror', errorMessage(secondary), {
        phase,
        plugin: plugin.name,
      }),
    )
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
