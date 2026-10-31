import { describe, expect, it } from 'vitest'
import { renderMermaid, sanitizeSvg } from '../../src/mermaid'

describe('Mermaid sanitization', () => {
  it('keeps safe SVG structure and drops active content', () => {
    const nodes = sanitizeSvg(
      '<svg viewBox="0 0 10 10"><script>alert(1)</script><foreignObject><div>x</div></foreignObject><path d="M0 0" onload="x" fill="red"/><a href="javascript:x"><text>safe</text></a></svg>',
    )
    const html = JSON.stringify(nodes)
    expect(html).toContain('viewBox')
    expect(html).toContain('path')
    expect(html).not.toContain('script')
    expect(html).not.toContain('foreignObject')
    expect(html).not.toContain('onload')
    expect(html).not.toContain('javascript:')
    expect(html).toContain('safe')
  })

  it('drops external links but keeps internal references', () => {
    const nodes = sanitizeSvg(
      '<svg><use href="https://evil.example/x"/><use href="#local"/></svg>',
    )
    const html = JSON.stringify(nodes)
    expect(html).not.toContain('evil.example')
    expect(html).toContain('#local')
  })
})

describe('Mermaid runtime', () => {
  it('returns a server fallback without a browser', async () => {
    const result = await renderMermaid('graph TD; A-->B')
    expect(result.error).toContain('browser')
    expect(result.nodes).toEqual([])
  })
})
