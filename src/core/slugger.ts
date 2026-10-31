import type { MarkdownSlugger } from './types'

/**
 * Ensure a host slugger still produces unique heading IDs. The wrapper keeps
 * the host's formatting and appends a numeric suffix for duplicates.
 */
export function withUniqueSlugs(slugger: MarkdownSlugger): MarkdownSlugger {
  const used = new Set<string>()
  return {
    slug(text: string): string {
      const base = slugger.slug(text)
      let candidate = base
      let index = 1
      while (used.has(candidate)) {
        candidate = `${base}-${index}`
        index += 1
      }
      used.add(candidate)
      return candidate
    },
    reset(): void {
      used.clear()
      slugger.reset?.()
    },
  }
}
