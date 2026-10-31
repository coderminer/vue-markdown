import { describe, expect, it } from 'vitest'
import {
  CodeBlock,
  MarkdownMath,
  MarkdownMermaid,
  MarkdownTaskItem,
  MermaidBlock,
  MermaidLiveEditor,
  VueSyntaxHighlighter,
} from '../../src/components'
import { highlightjs } from '../../src/highlight'
import { shiki } from '../../src/highlight/shiki'
import { mathPlugin, katexEngine } from '../../src/math'
import { mermaidPlugin, renderMermaid, sanitizeSvg } from '../../src/mermaid'
import { createMermaidEditor } from '../../src/editor'

describe('documented public APIs', () => {
  it('exports every v1.x API referenced by the guides and demo', () => {
    expect(highlightjs.id).toBe('highlight.js')
    expect(shiki.id).toBe('shiki')
    expect(typeof mathPlugin).toBe('function')
    expect(katexEngine.id).toBe('katex')
    expect(typeof renderMermaid).toBe('function')
    expect(typeof mermaidPlugin).toBe('function')
    expect(typeof sanitizeSvg).toBe('function')
    expect(typeof createMermaidEditor).toBe('function')
    expect(CodeBlock).toBeTruthy()
    expect(VueSyntaxHighlighter).toBeTruthy()
    expect(MarkdownTaskItem).toBeTruthy()
    expect(MarkdownMath).toBeTruthy()
    expect(MarkdownMermaid).toBeTruthy()
    expect(MermaidBlock).toBeTruthy()
    expect(MermaidLiveEditor).toBeTruthy()
  })
})
