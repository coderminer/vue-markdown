---
description: Public components, regions, rich nodes, and the component manifest registry.
---

# Components

Everything is exported from `@coderminer/vue-markdown` and available through
`@coderminer/vue-markdown/components/*` for per-component entries. See the
[Public API](./api.md) for the full export index.

## Renderer and regions

| Component | Role |
| --- | --- |
| `MarkdownRenderer` | Preset renderer with parsing, TOC, events, and slots |
| `MarkdownConfigProvider` | App-wide defaults for theme, tokens, labels, components, and adapters |
| `MarkdownRoot` | Root shell that applies theme and tokens |
| `MarkdownContent` | Content container |
| `MarkdownToc` | Labelled navigation for `TocItem[]` |
| `MarkdownTocItem` | One TOC entry |
| `MarkdownError` | Error region with retry |
| `MarkdownEmpty` | Empty state |
| `MarkdownLoading` | Pending state |

## Core catalog

| Component | Node |
| --- | --- |
| `MarkdownParagraph` | `p` |
| `MarkdownHeading` | `h1`–`h6` with deterministic IDs and anchors |
| `MarkdownEmphasis` | `em` |
| `MarkdownStrong` | `strong` |
| `MarkdownStrikethrough` | `del` |
| `MarkdownLink` | `a` with target policy and click events |
| `MarkdownImage` | `img` with alt fallback |
| `MarkdownList` | `ul` / `ol` |
| `MarkdownListItem` | `li` |
| `MarkdownBlockquote` | `blockquote` |
| `MarkdownHorizontalRule` | `hr` |
| `MarkdownTable` | `table` |
| `MarkdownTableSection` | `thead` / `tbody` |
| `MarkdownTableRow` | `tr` |
| `MarkdownTableCell` | `th` / `td` |
| `MarkdownInlineCode` | inline `code` |
| `MarkdownCode` | fenced code wrapper |
| `MarkdownBreak` | `br` |
| `MarkdownHtml` | escaped host text; not the raw-HTML render path |
| `MarkdownCustomTag` | plugin/custom tag node |
| `MarkdownTaskItem` | GFM task item and checkbox |
| `MarkdownFootnoteReference` | Footnote reference |
| `MarkdownFootnotes` | Footnote section |
| `MarkdownMath` | Math node with slots |
| `MarkdownMermaid` | Mermaid node wrapper |
| `MarkdownChildren` | Internal recursive renderer used by regions |

## Rich components

| Component | Entry | Role |
| --- | --- | --- |
| `CodeBlock` | default | Code header, language, copy/download, lazy highlighting |
| `VueSyntaxHighlighter` | default | Standalone highlighted snippet with line numbers |
| `MermaidBlock` | default | Preview/source tabs, zoom, fullscreen, copy, SVG/PNG export |
| `MermaidLiveEditor` | default | CodeMirror-backed Mermaid editor |

Optional engines stay in their own entries:

```ts
import { highlightjs } from '@coderminer/vue-markdown/highlight'
import { shiki } from '@coderminer/vue-markdown/highlight/shiki'
import { mathPlugin, katexEngine } from '@coderminer/vue-markdown/math'
import {
  mermaidPlugin,
  renderMermaid,
  sanitizeSvg,
} from '@coderminer/vue-markdown/mermaid'
import { createMermaidEditor } from '@coderminer/vue-markdown/editor'
```

`MarkdownMermaid` forwards `renderer`, `theme`, `showErrors`, `enableZoom`,
`allowFullscreen`, and `compact` to `MermaidBlock`. `MarkdownMath` accepts a
standalone `mathEngine` prop. `MarkdownRenderer` exposes the
`MarkdownRendererInstance` type.

See [Rich components](../guide/rich-components.md) for standalone usage of
`CodeBlock`, `VueSyntaxHighlighter`, `MermaidBlock`, `MermaidLiveEditor`, and
`MarkdownMath`.

## Component props

Tag components receive the normalized `node` plus their resolved attributes.
Rendered children arrive through the default slot. The raw child nodes are
passed as a `children` prop only when the component declares `children`; this
keeps Vue from leaking a `children` attribute onto elements. `defineAsyncComponent`
wrappers do not expose the resolved component's props, so rely on the default
slot or resolve the component before passing it.

## Parts, slots, and labels

Every visual part exposes a stable class and a `data-vmd-part` attribute. New
public components must ship parts, tokens, labels, slots, and a manifest entry.

```css
[data-vmd-part='code'] {
  --vmd-code-bg: #0d1117;
}

[data-vmd-part='heading-anchor'] {
  opacity: 0;
}

[data-vmd-part='heading']:hover [data-vmd-part='heading-anchor'] {
  opacity: 1;
}
```

The manifest registry is Vue-free:

```ts
import {
  COMPONENT_MANIFESTS,
  getComponentManifest,
  validateManifest,
} from '@coderminer/vue-markdown'

const code = getComponentManifest('CodeBlock')

validateManifest(code, {
  parts: ['code'],
  labels: ['copy', 'download'],
  slots: ['code'],
  mode: 'observed',
})
```

Each manifest declares `name`, `parts`, `tokens`, `slots`, `labels`,
`overrideKeys`, and `behaviors`. See the [Customization guide](../guide/customization.md)
for the override layers.

## Next

- [Renderer reference](./renderer.md)
- [Adapters](./adapters.md)
- [Styling and themes](../guide/styling.md)
