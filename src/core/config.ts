import type {
  MarkdownConfig,
  MarkdownPreset,
} from './types'

function mergeMaps<T extends object>(
  base: T | undefined,
  next: T | undefined,
): T | undefined {
  if (!base && !next) return undefined
  return { ...base, ...next } as T
}

/** Merge configuration maps with `next` taking precedence. */
export function mergeMarkdownConfig(
  base: MarkdownConfig | undefined,
  next: MarkdownConfig | undefined,
): MarkdownConfig {
  if (!base) return { ...next }
  if (!next) return { ...base }

  return {
    theme: next.theme ?? base.theme,
    tokens: mergeMaps(base.tokens, next.tokens),
    labels: mergeMaps(base.labels, next.labels),
    components: mergeMaps(base.components, next.components),
    regions: mergeMaps(base.regions, next.regions),
    nodeComponents: mergeMaps(base.nodeComponents, next.nodeComponents),
    plugins: next.plugins ?? base.plugins,
    pipeline: next.pipeline ?? base.pipeline,
    highlighter: next.highlighter ?? base.highlighter,
    mathEngine: next.mathEngine ?? base.mathEngine,
    mermaidRenderer: next.mermaidRenderer ?? base.mermaidRenderer,
    diagnosticsFormatter:
      next.diagnosticsFormatter ?? base.diagnosticsFormatter,
    slugger: next.slugger ?? base.slugger,
    urlTransform: next.urlTransform ?? base.urlTransform,
  }
}

/** Merge presets; later presets win and plugins are appended in order. */
export function mergeMarkdownPreset(
  base: MarkdownPreset | undefined,
  next: MarkdownPreset,
): MarkdownPreset {
  if (!base) return { ...next }
  return {
    ...mergeMarkdownConfig(base, next),
    name: `${base.name}+${next.name}`,
    plugins: [...(base.plugins ?? []), ...(next.plugins ?? [])],
  }
}
