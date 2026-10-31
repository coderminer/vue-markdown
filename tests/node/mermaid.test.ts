import { describe, expect, it } from 'vitest'
import { renderMermaid, sanitizeSvg } from '../../src/mermaid'
import { sanitizeMermaidNodes } from '../../src/mermaid/sanitize'

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

  it('preserves SVG tag and attribute casing', () => {
    const nodes = sanitizeSvg(
      '<svg viewBox="0 0 10 10"><defs><linearGradient id="g"><stop stop-color="#fff" stop-opacity=".5"/></linearGradient><clipPath id="c"><rect width="5" height="5"/></clipPath></defs><rect stroke-width="2" fill-opacity=".5" marker-end="url(#a)"/><text text-anchor="middle" font-size="12" aria-label="Node">A</text></svg>',
    )
    const html = JSON.stringify(nodes)
    expect(html).toContain('"tag":"linearGradient"')
    expect(html).toContain('"tag":"clipPath"')
    expect(html).toContain('"stroke-width":"2"')
    expect(html).toContain('"fill-opacity":"0.5"')
    expect(html).toContain('"marker-end":"url(#a)"')
    expect(html).toContain('"stop-color":"#fff"')
    expect(html).toContain('"text-anchor":"middle"')
    expect(html).toContain('"font-size":"12"')
    expect(html).toContain('"aria-label":"Node"')
    expect(html).not.toContain('strokewidth')
  })

  it('keeps Mermaid data attributes used by scoped theme CSS', () => {
    const nodes = sanitizeSvg(
      '<svg><g data-look="neo" data-color-id="color-1"><rect data-id="node-1"/></g></svg>',
    )
    const html = JSON.stringify(nodes)
    expect(html).toContain('"data-look":"neo"')
    expect(html).toContain('"data-color-id":"color-1"')
    expect(html).toContain('"data-id":"node-1"')
  })

  it('converts foreignObject labels into SVG text nodes', () => {
    const nodes = sanitizeSvg(
      '<svg><g><foreignObject width="10" height="10"><div><span>Edge label</span><br/><span>Second line</span></div></foreignObject></g></svg>',
    )
    const html = JSON.stringify(nodes)
    expect(html).not.toContain('foreignObject')
    expect(html).toContain('"tag":"text"')
    expect(html).toContain('"tag":"tspan"')
    expect(html).toContain('Edge label')
    expect(html).toContain('Second line')
  })

  it('preserves scoped theme CSS and removes unsafe CSS constructs', () => {
    const scoped = sanitizeSvg(
      '<svg id="d"><style>#d .node rect{fill:#f9f;stroke:#333}</style><g class="node"><rect/></g></svg>',
    )
    const scopedHtml = JSON.stringify(scoped)
    expect(scopedHtml).toContain('"tag":"style"')
    expect(scopedHtml).toContain('#d .node rect')
    expect(scopedHtml).toContain('fill:#f9f')

    const unsafe = sanitizeSvg(
      '<svg id="d"><style>@import url("https://evil.example/x.css");#d{background:url(https://evil.example/y.png)}</style><rect/></svg>',
    )
    const unsafeHtml = JSON.stringify(unsafe)
    expect(unsafeHtml).not.toContain('@import')
    expect(unsafeHtml).not.toContain('evil.example')
  })

  it('keeps quoted and padded fragment URLs in scoped theme CSS', () => {
    const nodes = sanitizeSvg(
      '<svg id="d"><defs><linearGradient id="a"/></defs><style>#d{fill:url(#a);stroke:url("#a");background:url( #a );mask:url("https://evil.example/x.png")}</style><rect/></svg>',
    )
    const html = JSON.stringify(nodes)
    expect(html).toContain('fill:url(#a)')
    expect(html).toContain('stroke:url(\\"#a\\")')
    expect(html).toContain('background:url( #a )')
    expect(html).toContain('mask:none')
    expect(html).not.toContain('evil.example')
  })

  it('drops stylesheets whose selectors are not scoped to the SVG id', () => {
    const unscoped = sanitizeSvg(
      '<svg id="d"><style>body{background:#f00}</style><rect/></svg>',
    )
    expect(JSON.stringify(unscoped)).not.toContain('"tag":"style"')

    const mixed = sanitizeSvg(
      '<svg id="d"><style>#d rect{fill:#0f0}body{background:#f00}</style><rect/></svg>',
    )
    expect(JSON.stringify(mixed)).not.toContain('"tag":"style"')

    const sibling = sanitizeSvg(
      '<svg id="d"><style>#d.node ~ body{background:#f00}</style><rect/></svg>',
    )
    expect(JSON.stringify(sibling)).not.toContain('"tag":"style"')
  })

  it('drops stylesheets when the root SVG has no id', () => {
    const nodes = sanitizeSvg(
      '<svg><style>rect{fill:#0f0}</style><rect/></svg>',
    )
    expect(JSON.stringify(nodes)).not.toContain('"tag":"style"')
  })

  it('keeps scoped at-rules and keyframes', () => {
    const nodes = sanitizeSvg(
      '<svg id="d"><style>@media (max-width:10px){#d .node{fill:#0f0}}@keyframes vmd-pulse{from{opacity:0}to{opacity:1}}#d .edge{stroke:#f00}</style><rect/></svg>',
    )
    const html = JSON.stringify(nodes)
    expect(html).toContain('"tag":"style"')
    expect(html).toContain('@media')
    expect(html).toContain('@keyframes')
    expect(html).toContain('#d .edge')
  })

  it('applies the same scoping rule to injected renderer nodes', () => {
    const styleNode = (css: string) => ({
      kind: 'element' as const,
      key: 'style',
      tag: 'style',
      attrs: {},
      children: [{ kind: 'text' as const, key: 'css', value: css }],
    })
    const svg = (css: string, id?: string) => {
      const attrs: Record<string, string> = {}
      if (id) attrs.id = id
      return {
        kind: 'element' as const,
        key: 'svg',
        tag: 'svg',
        attrs,
        children: [styleNode(css), {
          kind: 'element' as const,
          key: 'rect',
          tag: 'rect',
          attrs: {},
          children: [],
        }],
      }
    }

    const scoped = sanitizeMermaidNodes([svg('#d rect{fill:#0f0}', 'd')])
    expect(JSON.stringify(scoped)).toContain('"tag":"style"')

    const unscoped = sanitizeMermaidNodes([svg('body{background:#f00}', 'd')])
    expect(JSON.stringify(unscoped)).not.toContain('"tag":"style"')

    const noId = sanitizeMermaidNodes([svg('rect{fill:#0f0}')])
    expect(JSON.stringify(noId)).not.toContain('"tag":"style"')
  })
})

describe('Mermaid runtime', () => {
  it('returns a server fallback without a browser', async () => {
    const result = await renderMermaid('graph TD; A-->B')
    expect(result.error).toContain('browser')
    expect(result.nodes).toEqual([])
  })
})
