# Changelog

All notable changes to `@coderminer/vue-markdown` are documented here.

## [1.0.0] - 2026-11-01

First stable release of the Vue 3 Markdown component suite.

### Highlights

- Vue-native Markdown rendering through `unified`, `remark-parse`, and
  `remark-rehype`; no HTML string round-trip and no `v-html` in the render path.
- A serializable, DOM-free document model shared by the renderer, headless
  composables, and static HTML export.
- Customizable tag components, node components, function renderers, regions,
  named slots, labels, tokens, presets, and inspectable manifests.
- TOC generation and navigation, search segmentation, custom tags, GFM,
  frontmatter, footnotes, task items, filtering, URL policy, and static export.
- Optional highlight.js and Shiki adapters, `CodeBlock`,
  `VueSyntaxHighlighter`, KaTeX math, Mermaid rendering, and the CodeMirror
  Mermaid editor, each behind its own entry or lazy chunk.
- Sanitized raw HTML through the optional `@coderminer/vue-markdown/html` entry.

### Added

- `tocPlacement` with `top`, `left`, `right`, and `hidden` layouts.
- `search` and `searchCaseSensitive` renderer props plus the headless `search`
  option.
- `search-change` event with `{ query, caseSensitive, matches }`.
- `math-error` event alongside the general diagnostic stream.
- Renderer parts `body` and `toc-column`; Mermaid/editor fullscreen parts
  `mermaid-fullscreen` and `editor-fullscreen`.
- `MermaidLiveEditor` slots `toolbar`, `editor`, `preview`,
  `editor-diagnostics`, `empty`, and `fullscreen`.
- `MermaidLiveEditor` options `rawDetails` and `autoFocus`, friendly diagnostic
  labels, compact diagnostics, safe empty-state placeholders, and shared page
  scroll locking across multiple fullscreen editors.
- Version consistency coverage across `package.json`, `package-lock.json`, and
  the exported `version` constant.

### Changed

- `showError` now defaults to `true`, so failed renders show the error region by
  default.
- `MarkdownRenderer` wraps content in a stable `[data-vmd-part="body"]` element
  and places the TOC in `[data-vmd-part="toc-column"]`.
- `search-change` is emitted only when the rendered document belongs to the
  current query. Pending or failed runs no longer report stale match counts.
- The explicit `search` option wins over segments produced by `searchPlugin()`;
  disabling the plugin does not disable the explicit option.
- `MermaidLiveEditor` empty slots fall back correctly, including mounting
  CodeMirror when the `editor` slot renders no content.
- Mermaid and editor fullscreen state now restores page scrolling and ignores
  unrelated native fullscreen transitions.

### Breaking changes

- `skipHtml` is removed. Raw HTML is dropped by default and is enabled only by
  adding `htmlPlugin()` from `@coderminer/vue-markdown/html`.
- `PipelineCapabilities.html`, `PipelineContext.allowHtml`, and the
  normalization `allowHtml`/`skipHtml` options are removed.
- `rehype-raw` is an optional peer required only by the `html` entry. A manual
  `rehype-raw` in `rehypePlugins` is ignored with a warning.
- The renderer markup now contains a `body` wrapper and a `toc-column` wrapper.
  Host CSS should target stable `data-vmd-part` hooks instead of direct-child
  structure such as `.vmd-root > .vmd-content`.

### Upgrade notes

Enable sanitized raw HTML explicitly:

```ts
import { htmlPlugin } from '@coderminer/vue-markdown/html'

const plugins = [...defaultPlugins, htmlPlugin()]
```

Install the optional parser when this entry is used:

```bash
npm install rehype-raw
```

Hide the error region if the previous default is required:

```vue
<MarkdownRenderer :source="source" :show-error="false" />
```

Replace structural selectors with the documented parts:

```css
[data-vmd-part='content'] {
  /* content */
}

[data-vmd-part='toc-column'] {
  /* TOC layout column */
}
```

For search-as-you-type on large documents, debounce the `search` prop. Search
participates in the parse memo key, so each settled query change re-parses the
document.

### Verification

The release passes the Node and happy-dom test projects, type checking, lint,
library/demo/docs builds, the bundle-size guard, benchmarks, and OpenSpec
validation.
