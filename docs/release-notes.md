---
description: Release notes and upgrade guidance for @coderminer/vue-markdown 1.0.
---

# Release notes

## 1.0.0 — 2026-11-01

The first stable release of `@coderminer/vue-markdown`.

### Highlights

- Vue-native Markdown rendering through `unified`, `remark-parse`, and
  `remark-rehype` with no HTML string round-trip and no `v-html`.
- A serializable document model shared by the renderer, headless composables,
  and static HTML export.
- Tag components, node components, function renderers, regions, named slots,
  labels, tokens, presets, and inspectable manifests.
- TOC generation and placement, search, custom tags, GFM, frontmatter,
  footnotes, task items, filtering, URL policy, and static export.
- Optional highlight.js and Shiki highlighting, `CodeBlock`,
  `VueSyntaxHighlighter`, KaTeX math, Mermaid rendering, and the CodeMirror
  Mermaid editor behind separate entries.
- Sanitized raw HTML through `@coderminer/vue-markdown/html`.

### Upgrade notes

#### Raw HTML

`skipHtml` is removed. Raw HTML is dropped by default. Enable sanitized raw
HTML explicitly:

```ts
import { htmlPlugin } from '@coderminer/vue-markdown/html'

const plugins = [...defaultPlugins, htmlPlugin()]
```

Install the optional parser when using this entry:

```bash
npm install rehype-raw
```

#### Error region default

`showError` now defaults to `true`. Opt out if the previous behavior is
required:

```vue
<MarkdownRenderer :source="source" :show-error="false" />
```

#### Renderer structure

The renderer now includes `[data-vmd-part="body"]` and
`[data-vmd-part="toc-column"]` wrappers. Host CSS should target stable parts
instead of direct-child structure:

```css
[data-vmd-part='content'] {
  /* content */
}

[data-vmd-part='toc-column'] {
  /* TOC layout column */
}
```

#### Search

The renderer accepts `search` and `searchCaseSensitive`; `search-change`
reports `{ query, caseSensitive, matches }`. It reflects the rendered document,
so pending or failed runs do not emit stale counts. Mounting with an empty
query emits nothing. Debounce search-as-you-type because each settled query
change participates in the parse memo key.

#### Mermaid editor

`MermaidLiveEditor` now exposes `toolbar`, `editor`, `preview`,
`editor-diagnostics`, `empty`, and `fullscreen` slots, plus `rawDetails` and
`autoFocus`. An empty `editor` slot now falls back to CodeMirror, and shared
page scrolling is restored when fullscreen editors exit or unmount.

### Full changelog

The complete history is in
[CHANGELOG.md](https://github.com/coderminer/vue-markdown/blob/main/CHANGELOG.md).
