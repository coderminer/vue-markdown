---
description: Release notes and upgrade guidance for @coderminer/vue-markdown 1.0.
---

# Release notes

## 1.0.2 — 2026-11-03

Patch release focused on Mermaid rendering quality and document stability.

- Mermaid blocks render in a reusable offscreen measuring host, so the diagram
  no longer briefly enters page flow and shifts content or flashes a scrollbar.
  Diagrams keep the intrinsic width Mermaid reports, capped at the preview
  width, instead of stretching small diagrams to fill the block.
- First renders are deferred until a block nears the viewport. Deferral is
  abandoned when printing starts, and `deferRendering` on `MermaidBlock` /
  `MarkdownMermaid` or `mermaidDeferRendering` on `MarkdownRenderer` /
  `MarkdownConfigProvider` disables it for print, PDF, and screenshot
  pipelines. `MarkdownRenderer` now emits `mermaid-rendered`.
- The Mermaid preview supports drag and keyboard panning based on actual
  overflow, with `data-pannable` and `data-dragging` state attributes. Pending
  height is reserved through `--vmd-mermaid-min-height`.
- PNG export rasterizes at up to 3x within an 8192 px edge and 16-megapixel
  budget, so labels stay crisp and oversized canvases cannot fail the export.
- Mermaid node keys are content-derived, so editing one diagram does not
  remount the diagrams after it.
- The published npm tarball includes `src/` so consumers can inspect the
  source.
- The TOC renders as an unnumbered `<ul role="list">` by default. Hosts can opt
  back into numbering with `list-style: decimal` and marker padding.
- The Vue peer range is now `>=3.3.0 <4.0.0`, and children render correctly for
  string tag overrides and raw HTML on Vue 3.3 and 3.4.

## 1.0.1 — 2026-11-02

Patch release with post-1.0 runtime fixes. The package has no external users
yet, so it also includes intentional contract tightenings: the
`externalLinkTarget` type is narrowed and `mermaidPlugin()` rejects non-object
arguments.

- `toc-change` no longer emits a transient empty TOC before the first parse. A
  first document that really has no headings still emits one settled `[]`.
- Custom-tag attributes normalize from kebab-case to camelCase; `data-*` and
  `aria-*` stay unchanged.
- `MermaidBlock` resets zoom on every render and when returning from the source
  tab, and shows a retry button in its error/fallback regions.
- The Mermaid runtime retries a failed lazy import, keys initialization by the
  full configuration, and serializes configuration changes.
- Diagnostics are replaced and deduplicated per run, including failed runs.
  Entries count as duplicates only when their code, message, severity, phase,
  plugin, source range, and details all match, so distinct occurrences are
  preserved. Setup diagnostics are snapshotted so a retained setup context cannot
  grow the list later. `useMarkdownDocument` exposes `clearDiagnostics()`, and the
  renderer no longer grows its reported-diagnostic bookkeeping indefinitely.
- Typed `MarkdownRendererEvents` and `MermaidBlockEvents` maps are exported, and
  event payload conventions are documented. Interaction events include the
  originating DOM event; the documentation no longer claims that every payload
  is serializable.
- A complete sample plugin and guide exercise every public plugin hook.
- Empty search queries skip the document tree walk and match counting.
- A new `searchDebounce` prop delays parsing after the last query change for
  search-as-you-type; the initial query still applies during server rendering.
- Side TOC columns scroll internally when the TOC is taller than the viewport.
  The stacked mobile layout resets that cap so the TOC expands above the
  content.
- Every scalar renderer prop is validated at runtime. Invalid values report a
  `prop-*` warning and fall back safely. An omitted optional `baseUrl` is valid
  and emits no diagnostic. `externalLinkTarget` is typed as
  `'_self' | '_blank'` and `theme` gets a runtime string type.
- `MermaidBlock` ignores an in-flight render that settles after unmount, and
  `resetMermaidRuntime()` preserves queue ordering and ID uniqueness.
- `mermaidPlugin()` rejects non-object arguments instead of silently ignoring
  them; `languages` remains its only option.
- Browser output no longer includes Node builtins (`node:process`, `node:path`,
  `node:url`), fixing `process.cwd` crashes during rendering.
- The default highlight.js adapter now uses `lowlight` to produce hast directly.
  The highlight entry no longer pulls the HTML parser; Mermaid and KaTeX keep it
  only where they need to convert engine markup. The highlight entry no longer
  exports `highlightedNodesFromHtml`; use `highlightedNodesFromHast` for
  adapters that already produce hast.
- Published JavaScript no longer contains `sourceMappingURL` comments for maps
  that are excluded from the tarball.
- `renderMermaid()` is documented as async, and non-string or Promise sources
  now produce a clear error instead of a `trim is not a function` exception.
- `MermaidBlock` distinguishes an invalid renderer result, empty output, and
  SVG rejected by sanitization, and each error includes a fix hint. The
  invalid-`mermaidRenderer` diagnostic now names the built-in runtime as the
  fallback.
- The Mermaid guide documents renderer precedence: per-block `renderer` >
  provider/preset `mermaidRenderer` > built-in runtime. It also clarifies that
  `renderMermaid()` is a function rather than an adapter object and that
  `resetMermaidRuntime()` is not a lifecycle hook.
- Default heading IDs collapse consecutive whitespace and hyphen runs, so
  `My   -   Heading` becomes `my-heading`. Custom sluggers keep their own
  formatting; only duplicate suffixes are added.
- The base renderer no longer statically includes the HTML parser. Mermaid SVG
  sanitization loads it after a diagram renders, and the highlight entry
  resolves `highlight.js` language subpaths from the host peer dependency
  instead of bundling a second copy.

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
query emits nothing. Set `searchDebounce` for search-as-you-type because each
settled query change participates in the parse memo key.

#### Mermaid editor

`MermaidLiveEditor` now exposes `toolbar`, `editor`, `preview`,
`editor-diagnostics`, `empty`, and `fullscreen` slots, plus `rawDetails` and
`autoFocus`. An empty `editor` slot now falls back to CodeMirror, and shared
page scrolling is restored when fullscreen editors exit or unmount.

### Full changelog

The complete history is in
[CHANGELOG.md](https://github.com/coderminer/vue-markdown/blob/main/CHANGELOG.md).
