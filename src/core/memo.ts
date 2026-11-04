import type { MarkdownDiagnostic, MarkdownDocument } from './types'

const MAX_ENTRIES = 64

export interface MarkdownMemoEntry {
  document: MarkdownDocument
  /**
   * Diagnostics produced by the run that built this document. They are replayed
   * on a cache hit so the same input yields the same diagnostics whether or not
   * the cache was warm.
   */
  diagnostics: MarkdownDiagnostic[]
}

const cache = new Map<string, MarkdownMemoEntry>()

function touch(key: string, entry: MarkdownMemoEntry): MarkdownMemoEntry {
  // Refresh LRU order.
  cache.delete(key)
  cache.set(key, entry)
  return entry
}

export function memoGetEntry(key: string): MarkdownMemoEntry | undefined {
  const value = cache.get(key)
  if (!value) return undefined
  return touch(key, value)
}

export function memoSetEntry(key: string, entry: MarkdownMemoEntry): void {
  if (cache.has(key)) cache.delete(key)
  cache.set(key, entry)
  while (cache.size > MAX_ENTRIES) {
    const oldest = cache.keys().next().value
    if (oldest === undefined) break
    cache.delete(oldest)
  }
}

export function memoGet(key: string): MarkdownDocument | undefined {
  return memoGetEntry(key)?.document
}

export function memoSet(key: string, document: MarkdownDocument): void {
  memoSetEntry(key, { document, diagnostics: [] })
}

export function memoClear(): void {
  cache.clear()
}

export function memoSize(): number {
  return cache.size
}
