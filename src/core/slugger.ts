import GithubSlugger from 'github-slugger'
import type { MarkdownSlugger } from './types'

const WHITESPACE_RUNS = /\s+/g
const HYPHEN_RUNS = /-{2,}/g

/**
 * Create the default heading slugger. `github-slugger` maps every space to a
 * hyphen, so `My   Heading` would become `my---heading`. Collapsing whitespace
 * before slugging (and hyphen runs after) keeps IDs readable while preserving
 * GitHub-compatible punctuation handling.
 */
export function createDefaultSlugger(): MarkdownSlugger {
  const slugger = new GithubSlugger()
  return {
    slug(text: string): string {
      const collapsed = text.replace(WHITESPACE_RUNS, ' ').trim()
      return slugger.slug(collapsed).replace(HYPHEN_RUNS, '-')
    },
    reset(): void {
      slugger.reset()
    },
  }
}

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
