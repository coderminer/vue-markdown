import type {
  MarkdownDiagnostic,
  MarkdownDocumentOptions,
  MarkdownPlugin,
  PluginContext,
} from '../core/types'
import { createDiagnostic, errorMessage } from '../core/diagnostics'
import { createPluginContext } from './define'

function report(
  plugin: MarkdownPlugin,
  error: unknown,
  context: PluginContext,
  diagnostics: MarkdownDiagnostic[],
  code: string,
): void {
  diagnostics.push(
    createDiagnostic(code, errorMessage(error), {
      phase: 'source',
      plugin: plugin.name,
    }),
  )
  if (!plugin.onError) return
  try {
    plugin.onError(error, 'source', context)
  } catch (secondary) {
    diagnostics.push(
      createDiagnostic('plugin-onerror', errorMessage(secondary), {
        phase: 'source',
        plugin: plugin.name,
      }),
    )
  }
}

/**
 * Run plugin source transforms in resolved order before parsing. A transform
 * that throws or returns a non-string leaves the previous source intact and
 * reports a diagnostic instead of breaking the run.
 */
export function applySourceTransforms(
  source: string,
  plugins: readonly MarkdownPlugin[],
  options: MarkdownDocumentOptions,
  diagnostics: MarkdownDiagnostic[],
): string {
  let current = source
  const context = createPluginContext(source, options, diagnostics)

  for (const plugin of plugins) {
    if (!plugin.transformSource) continue
    context.source = current
    try {
      const next = plugin.transformSource(current, context)
      if (typeof next === 'string') {
        current = next
        continue
      }
      report(
        plugin,
        new TypeError('transformSource must return a string.'),
        context,
        diagnostics,
        'plugin-source',
      )
    } catch (error) {
      report(plugin, error, context, diagnostics, 'plugin-source')
    }
  }

  return current
}
