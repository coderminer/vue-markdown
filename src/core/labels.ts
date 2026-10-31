import type {
  MarkdownLabelContext,
  MarkdownLabelValue,
  MarkdownLabels,
} from '../core/types'

/** Resolve a static or context-aware label value. */
export function resolveLabel(
  value: MarkdownLabelValue,
  context?: MarkdownLabelContext,
): string {
  return typeof value === 'function' ? value(context ?? {}) : value
}

export const DEFAULT_LABELS: MarkdownLabels = {
  toc: 'Table of contents',
  error: 'The Markdown document could not be rendered.',
  empty: 'No content',
  loading: 'Loading…',
  headingAnchor: 'Link to this heading',
  externalLink: 'Opens in a new tab',
  copy: 'Copy',
  copied: 'Copied',
  copyFailed: 'Copy failed',
  download: 'Download',
  footnoteReference: 'Footnote',
  footnotes: 'Footnotes',
  math: 'Math',
  mermaid: 'Diagram',
  mermaidFallback: 'Diagram could not be rendered.',
  preview: 'Preview',
  source: 'Source',
  retry: 'Retry',
  showAll: 'Show all lines',
  showLess: 'Show less',
  exportPng: 'Export PNG',
  fullscreen: 'Fullscreen',
  exitFullscreen: 'Exit fullscreen',
  zoomIn: 'Zoom in',
  zoomOut: 'Zoom out',
  reset: 'Reset zoom',
}
