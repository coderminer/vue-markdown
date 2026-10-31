import type {
  DiagnosticFormatter,
  MarkdownHighlighter,
  MarkdownSlugger,
  MarkdownUrlTransform,
  MathEngine,
  MermaidRenderer,
} from './types'

export function isValidHighlighter(value: unknown): value is MarkdownHighlighter {
  if (!value || typeof value !== 'object') return false
  const adapter = value as MarkdownHighlighter
  return typeof adapter.id === 'string' && typeof adapter.highlight === 'function'
}

export function isValidMathEngine(value: unknown): value is MathEngine {
  if (!value || typeof value !== 'object') return false
  const adapter = value as MathEngine
  return typeof adapter.id === 'string' && typeof adapter.render === 'function'
}

export function isValidMermaidRenderer(value: unknown): value is MermaidRenderer {
  if (!value || typeof value !== 'object') return false
  const adapter = value as MermaidRenderer
  return typeof adapter.id === 'string' && typeof adapter.render === 'function'
}

export function isValidDiagnosticFormatter(
  value: unknown,
): value is DiagnosticFormatter {
  if (!value || typeof value !== 'object') return false
  return typeof (value as DiagnosticFormatter).format === 'function'
}

export function isValidSlugger(value: unknown): value is MarkdownSlugger {
  if (!value || typeof value !== 'object') return false
  return typeof (value as MarkdownSlugger).slug === 'function'
}

export function isValidUrlTransform(
  value: unknown,
): value is MarkdownUrlTransform {
  return typeof value === 'function'
}
