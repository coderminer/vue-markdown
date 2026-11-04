import { describe, expect, it } from 'vitest'
import { renderMermaid } from '../../src/mermaid'
import { sanitizeSvg } from '../../src/mermaid/sanitize-svg'
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

  it('drops external url() references in presentation attributes', () => {
    const nodes = sanitizeSvg(
      '<svg id="d"><defs><linearGradient id="a"/></defs>' +
        '<rect fill="url(https://evil.example/p.svg#a)" stroke="url(#a)"/>' +
        '<rect filter="url(https://evil.example/f.svg#f)"/>' +
        '<rect cursor="url(https://evil.example/c.cur), auto"/>' +
        '<rect clip-path="url(https://evil.example/c.svg#c)"/>' +
        '<rect marker-start="url(https://evil.example/m.svg#m)"/>' +
        '<rect fill="url(#a) red"/></svg>',
    )
    const html = JSON.stringify(nodes)
    expect(html).not.toContain('evil.example')
    expect(html).toContain('"stroke":"url(#a)"')
    expect(html).toContain('"fill":"url(#a) red"')
    expect(html).not.toContain('"filter"')
    expect(html).not.toContain('"cursor"')
    expect(html).not.toContain('"clip-path"')
    expect(html).not.toContain('"marker-start"')
  })

  it('drops external url() references in injected renderer nodes', () => {
    const nodes = sanitizeMermaidNodes([
      {
        kind: 'element',
        key: '0',
        tag: 'svg',
        attrs: { id: 'd' },
        children: [
          {
            kind: 'element',
            key: '0.0',
            tag: 'rect',
            attrs: {
              fill: 'url(https://evil.example/p.svg#a)',
              stroke: 'url(#a)',
            },
            children: [],
          },
        ],
      },
    ])
    const html = JSON.stringify(nodes)
    expect(html).not.toContain('evil.example')
    expect(html).toContain('"stroke":"url(#a)"')
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

  it('strips viewport-escaping declarations from scoped stylesheets', () => {
    const nodes = sanitizeSvg(
      '<svg id="d"><style>#d{position:fixed;inset:0;width:100vw;height:100vh;z-index:99999;fill:#333}#d .node{position:absolute;top:0;left:0;fill:#0f0}</style><g class="node"><rect/></g></svg>',
    )
    const html = JSON.stringify(nodes)
    expect(html).not.toContain('position')
    expect(html).not.toContain('inset')
    expect(html).not.toContain('100vw')
    expect(html).not.toContain('z-index')
    expect(html).not.toContain('top:0')
    expect(html).not.toContain('left:0')
    // Theme declarations and descendant selectors survive.
    expect(html).toContain('fill:#333')
    expect(html).toContain('#d .node')
    expect(html).toContain('fill:#0f0')
  })

  it('filters root declarations inside conditional at-rules', () => {
    const nodes = sanitizeSvg(
      '<svg id="d"><style>@media (min-width:1px){#d{position:fixed;fill:#123}}@keyframes vmd-pulse{from{opacity:0}to{opacity:1}}</style><rect/></svg>',
    )
    const html = JSON.stringify(nodes)
    expect(html).not.toContain('position')
    expect(html).toContain('fill:#123')
    expect(html).toContain('@keyframes')
  })

  it('keeps Mermaid useMaxWidth output at its intended pixel size', () => {
    // Mermaid writes `width="100%"` plus an inline `max-width`, and inline
    // styles are dropped while sanitizing. Keeping the pixel width prevents the
    // diagram from stretching to the full container.
    const nodes = sanitizeSvg(
      '<svg id="d" width="100%" style="max-width: 640px;" viewBox="0 0 640 480"><rect/></svg>',
    )
    const html = JSON.stringify(nodes)
    expect(html).toContain('"width":"640"')
    expect(html).not.toContain('"width":"100%"')
    expect(html).not.toContain('max-width')

    const fixed = sanitizeSvg('<svg width="320" height="200"><rect/></svg>')
    const fixedHtml = JSON.stringify(fixed)
    expect(fixedHtml).toContain('"width":"320"')
    expect(fixedHtml).toContain('"height":"200"')

    // A max-width in another unit is not a pixel size and stays unsized.
    const relative = sanitizeSvg(
      '<svg width="100%" style="max-width: 80%"><rect/></svg>',
    )
    expect(JSON.stringify(relative)).toContain('"width":"100%"')
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

    const escaping = sanitizeMermaidNodes([
      svg('#d{position:fixed;inset:0;fill:#0f0}', 'd'),
    ])
    const escapingHtml = JSON.stringify(escaping)
    expect(escapingHtml).not.toContain('position')
    expect(escapingHtml).not.toContain('inset')
    expect(escapingHtml).toContain('fill:#0f0')

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
