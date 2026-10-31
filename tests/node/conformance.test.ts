import { describe, expect, it } from 'vitest'
import spec from 'commonmark-spec'
import { fromHtml } from 'hast-util-from-html'
import { toHtml } from 'hast-util-to-html'
import { unified } from 'unified'
import remarkParse from 'remark-parse'
import { visit } from 'unist-util-visit'
import type { Properties, RootContent } from 'hast'
import { exportMarkdownHtmlSync } from '../../src/export'
import { gfmPlugin } from '../../src/plugins/builtin'
import { gfmFixtures } from '../fixtures/gfm-conformance'

/** The spec package encodes tabs as an arrow. */
const TAB = '\u2192'

const DANGEROUS = /<(script|style|iframe|object|embed|form|textarea|select|option|template|noscript|svg|math|input)\b/i
const ACTIVE_ATTRIBUTE = /\son[a-z]+\s*=|\sstyle\s*=/i
/** Comments and processing instructions are dropped with raw HTML. */
const RAW_SPECIAL = /<!--|<\?|<![A-Za-z[]/

const parser = unified().use(remarkParse)

/** True when the Markdown contains a raw HTML block or inline tag. */
function hasRawHtml(markdown: string): boolean {
  let found = false
  visit(parser.parse(markdown), 'html', () => {
    found = true
  })
  return found
}

function sortProperties(node: RootContent): void {
  if (node.type === 'element') {
    if (node.properties) {
      const sorted: Properties = {}
      for (const key of Object.keys(node.properties).sort()) {
        sorted[key] = node.properties[key]
      }
      node.properties = sorted
    }
    for (const child of node.children) sortProperties(child)
  }
}

/**
 * Compare HTML structurally instead of byte-for-byte. This ignores entity
 * spelling, attribute order, and the document wrapper that a parser adds.
 */
export function canonicalHtml(html: string): string {
  const root = fromHtml(html.split(TAB).join('\t'), { fragment: true })
  for (const child of root.children) sortProperties(child)
  return toHtml(root).trim()
}

/** Heading IDs are a suite feature, not part of the CommonMark spec. */
function withoutHeadingIds(html: string): string {
  return html.replace(/<(h[1-6])([^>]*?) id="[^"]*"/g, '<$1$2')
}

export interface ConformanceResult {
  total: number
  skipped: number
  passed: number
  failed: number[]
}

export function runCommonMark(): ConformanceResult {
  const result: ConformanceResult = {
    total: spec.tests.length,
    skipped: 0,
    passed: 0,
    failed: [],
  }

  for (const test of spec.tests) {
    const expected = test.html.split(TAB).join('\t')
    // The suite intentionally drops active content, inline styles, raw HTML,
    // comments, and processing instructions. Spec examples that depend on
    // those are outside the render contract.
    if (
      DANGEROUS.test(expected) ||
      ACTIVE_ATTRIBUTE.test(expected) ||
      RAW_SPECIAL.test(expected) ||
      hasRawHtml(test.markdown)
    ) {
      result.skipped += 1
      continue
    }

    const actual = exportMarkdownHtmlSync(test.markdown.split(TAB).join('\t'))

    if (canonicalHtml(withoutHeadingIds(actual)) === canonicalHtml(expected)) {
      result.passed += 1
    } else {
      result.failed.push(test.number)
    }
  }

  return result
}

export function runGfm(): ConformanceResult {
  const result: ConformanceResult = {
    total: gfmFixtures.length,
    skipped: 0,
    passed: 0,
    failed: [],
  }

  gfmFixtures.forEach((fixture, index) => {
    const actual = exportMarkdownHtmlSync(fixture.markdown, {
      plugins: [gfmPlugin],
    })
    if (canonicalHtml(withoutHeadingIds(actual)) === canonicalHtml(fixture.html)) {
      result.passed += 1
    } else {
      result.failed.push(index)
    }
  })

  return result
}

describe('CommonMark conformance', () => {
  it('passes every applicable spec example', () => {
    const result = runCommonMark()
    // Surfaced in CI output so pass-count regressions are obvious.
    console.info(
      `CommonMark: ${result.passed}/${result.total - result.skipped} ` +
        `applicable examples passed (${result.skipped} skipped for active content)`,
    )
    expect(result.failed).toEqual([])
    expect(result.passed).toBe(result.total - result.skipped)
  })
})

describe('GFM conformance', () => {
  it('passes every GFM fixture', () => {
    const result = runGfm()
    console.info(`GFM: ${result.passed}/${result.total} fixtures passed`)
    expect(result.failed).toEqual([])
    expect(result.passed).toBe(result.total)
  })

  it('detects a newly broken fixture', () => {
    const broken = {
      name: 'broken',
      markdown: '| a | b |\n| - | - |\n| 1 | 2 |\n',
      html: '<p>not a table</p>',
    }
    const actual = exportMarkdownHtmlSync(broken.markdown, {
      plugins: [gfmPlugin],
    })
    expect(canonicalHtml(actual)).not.toBe(canonicalHtml(broken.html))
  })
})
