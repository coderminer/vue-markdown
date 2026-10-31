import type { MarkdownPreset } from './types'
import { mergeMarkdownPreset } from './config'

/**
 * Define a shareable preset. Presets contain components, plugin instances, and
 * functions, so they are declarative and inspectable but not JSON-serializable.
 */
export function defineMarkdownPreset(preset: MarkdownPreset): MarkdownPreset {
  if (!preset.name || typeof preset.name !== 'string') {
    throw new TypeError('A Markdown preset requires a non-empty name.')
  }
  return preset
}

/** Compose presets in order; later presets override earlier values. */
export function composePresets(
  ...presets: Array<MarkdownPreset | false | null | undefined>
): MarkdownPreset {
  const list = presets.filter(
    (preset): preset is MarkdownPreset => Boolean(preset),
  )
  if (list.length === 0) return { name: 'empty' }
  return list
    .slice(1)
    .reduce<MarkdownPreset>(
      (result, preset) => mergeMarkdownPreset(result, preset),
      list[0]!,
    )
}

/** Resolve a single preset, a preset list, or nothing. */
export function resolvePreset(
  input: MarkdownPreset | readonly MarkdownPreset[] | undefined,
): MarkdownPreset | undefined {
  if (!input) return undefined
  if (Array.isArray(input)) {
    return composePresets(...(input as readonly MarkdownPreset[]))
  }
  return input as MarkdownPreset
}
