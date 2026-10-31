import type { HighlightLine } from './types'

/**
 * Expand numeric lines and `start-end` ranges into a lookup set.
 *
 * Invalid, zero, negative, and reversed entries are ignored. Plain numeric
 * strings are treated as a single line.
 */
export function resolveHighlightedLines(
  values: readonly HighlightLine[] | undefined,
): Set<number> {
  const lines = new Set<number>()
  for (const value of values ?? []) {
    if (typeof value === 'number') {
      if (Number.isInteger(value) && value > 0) lines.add(value)
      continue
    }
    if (typeof value !== 'string') continue
    const match = /^\s*(\d+)\s*(?:-\s*(\d+))?\s*$/.exec(value)
    if (!match) continue
    const start = Number(match[1])
    const end = match[2] ? Number(match[2]) : start
    if (start <= 0 || end < start) continue
    for (let line = start; line <= end; line += 1) lines.add(line)
  }
  return lines
}
