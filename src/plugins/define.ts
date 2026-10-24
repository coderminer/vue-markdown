import type { MarkdownPlugin, PluginContext } from '../core/types'

export type MarkdownPluginFactory<Options> = (
  options: Options,
) => MarkdownPlugin

/** Identity helper for plugins created through the typed helper. */
export function defineMarkdownPlugin(plugin: MarkdownPlugin): MarkdownPlugin
export function defineMarkdownPlugin<Options>(
  factory: MarkdownPluginFactory<Options>,
): MarkdownPluginFactory<Options>
export function defineMarkdownPlugin<Options>(
  input: MarkdownPlugin | MarkdownPluginFactory<Options>,
): MarkdownPlugin | MarkdownPluginFactory<Options> {
  if (typeof input === 'function') {
    return (options: Options) => validatePlugin(input(options))
  }
  return validatePlugin(input)
}

export function validatePlugin(plugin: MarkdownPlugin): MarkdownPlugin {
  if (!plugin || typeof plugin !== 'object') {
    throw new TypeError('A Markdown plugin must be an object.')
  }
  if (typeof plugin.name !== 'string' || plugin.name.trim() === '') {
    throw new TypeError('A Markdown plugin requires a non-empty `name`.')
  }
  if (plugin.phase && !['pre', 'normal', 'post'].includes(plugin.phase)) {
    throw new TypeError(
      `Plugin "${plugin.name}" has an invalid phase "${plugin.phase}".`,
    )
  }
  return plugin
}

export function createPluginContext(
  source: string,
  options: PluginContext['options'],
  diagnostics: PluginContext['diagnostics'],
): PluginContext {
  return {
    source,
    options,
    diagnostics,
    addDiagnostic(diagnostic) {
      diagnostics.push(diagnostic)
    },
  }
}
