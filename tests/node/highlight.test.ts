import { describe, expect, it, vi } from 'vitest'
import { highlightjs } from '../../src/highlight/highlightjs'
import { shiki } from '../../src/highlight/shiki'
import {
  clearHighlightCache,
  plaintextHighlight,
  runHighlighter,
} from '../../src/highlight/shared'
import type { HighlightResult, MarkdownHighlighter } from '../../src/core/types'

describe('highlight adapters', () => {
  it('highlights javascript with the default adapter', () => {
    const result = highlightjs.highlight('const x = 1', 'javascript', {})
    expect(result.language).toBe('javascript')
    expect(result.nodes.length).toBeGreaterThan(0)
    expect(JSON.stringify(result.nodes)).toContain('keyword')
  })

  it('falls back to plain text for an unknown language', () => {
    const result = highlightjs.highlight('not a language', 'unknown-lang', {})
    expect(result).toEqual(plaintextHighlight('not a language', 'unknown-lang'))
  })

  it('caches by adapter, source, language, and options', () => {
    clearHighlightCache()
    const highlight = vi.fn<MarkdownHighlighter['highlight']>((code, language) => ({
      language,
      nodes: [{ kind: 'text', key: 'x', value: code }],
    }))
    const adapter: MarkdownHighlighter = { id: 'cached', highlight }
    const first = runHighlighter(adapter, 'x', 'ts', { theme: 'a' })
    const second = runHighlighter(adapter, 'x', 'ts', { theme: 'a' })
    expect(first).toBe(second)
    expect(highlight).toHaveBeenCalledTimes(1)
    runHighlighter(adapter, 'x', 'ts', { theme: 'b' })
    expect(highlight).toHaveBeenCalledTimes(2)
  })

  it('falls back when an adapter throws or returns an invalid result', () => {
    const thrown: MarkdownHighlighter = {
      id: 'throws',
      highlight() {
        throw new Error('boom')
      },
    }
    expect(runHighlighter(thrown, 'x', 'ts')).toEqual(plaintextHighlight('x', 'ts'))

    const invalid = {
      id: 'invalid',
      highlight: () => ({ language: 1, nodes: null }),
    } as unknown as MarkdownHighlighter
    expect(runHighlighter(invalid, 'x', 'ts')).toEqual(plaintextHighlight('x', 'ts'))
  })

  it('keeps Shiki on plain text until it is loaded, then highlights', async () => {
    const before = shiki.highlight('const x = 1', 'typescript', {})
    expect(before).toEqual(plaintextHighlight('const x = 1', 'typescript'))

    await shiki.load?.()
    const after: HighlightResult = shiki.highlight('const x = 1', 'typescript', {
      colorScheme: 'dark',
    })
    expect(after.language).toBe('typescript')
    expect(after.nodes.length).toBeGreaterThan(0)
  }, 30000)
})
