import type { MarkdownDocument } from './types'

const MAX_ENTRIES = 64

const cache = new Map<string, MarkdownDocument>()

export function memoGet(key: string): MarkdownDocument | undefined {
  const value = cache.get(key)
  if (!value) return undefined
  // Refresh LRU order.
  cache.delete(key)
  cache.set(key, value)
  return value
}

export function memoSet(key: string, document: MarkdownDocument): void {
  if (cache.has(key)) cache.delete(key)
  cache.set(key, document)
  while (cache.size > MAX_ENTRIES) {
    const oldest = cache.keys().next().value
    if (oldest === undefined) break
    cache.delete(oldest)
  }
}

export function memoClear(): void {
  cache.clear()
}

export function memoSize(): number {
  return cache.size
}
