# Changelog

All notable changes to `@coderminer/vue-markdown` are documented here.

## [Unreleased]

## [1.1.0-beta.0] - 2026-11-04

Beta release published under the `beta` npm dist-tag; the stable `1.1.0` will
follow. It fixes runtime correctness issues in the Vue adapter, pipeline
identity, search derivation, and renderer input precedence, and moves optional
engines behind explicit entries. Two behavior changes require attention:
`sanitizeSvg` moved to `@coderminer/vue-markdown/mermaid/sanitize-svg`, and
syntax highlighting is now opt-in. See the Changed section. Deferred work is
tracked in `IMPROVEMENTS.md`.

### Added

- `MarkdownPipeline.version` participates in the memoization identity, so a
  pipeline revision can invalidate cached documents.
- `withSearchSegments()` derives search segments from an existing document
  without mutating it.
- `memoGetEntry()`/`memoSetEntry()` cache a document together with the
  diagnostics of the run that produced it and replay them on a cache hit.
- `reportPluginError()` centralizes safe `onError` delivery.
- `@coderminer/vue-markdown/mermaid/plugin` exports `mermaidPlugin` without the
  synchronous SVG sanitizer and the HTML parser it statically imports.

### Changed

- Changing the search query or case sensitivity no longer re-parses. Highlights
  update from the parsed document, and `search-change` emits as soon as the
  applied query changes. Pending or failed runs still keep the previous
  document's match count.
- The official pipeline is created once per document composable and reused, so
  presentation-only changes no longer rebuild the unified processor.
- The base renderer no longer imports the Mermaid component, runtime wrapper, or
  SVG parser. `mermaidPlugin()` contributes the built-in Mermaid component, so
  an app that imports only `MarkdownRenderer` does not emit the Mermaid or HTML
  parser chunks. A `mermaid` node without a registered component falls back to a
  code block.
- Syntax highlighting is opt-in. `CodeBlock` and `VueSyntaxHighlighter` no longer
  auto-load the highlight.js adapter: code renders as plain text until the host
  passes `highlightjs` from `@coderminer/vue-markdown/highlight` (or another
  adapter). The base renderer no longer references any highlighting engine.
- `sanitizeSvg` moved from `@coderminer/vue-markdown/mermaid` to
  `@coderminer/vue-markdown/mermaid/sanitize-svg`. The Mermaid entry no longer
  statically loads the HTML parser; the runtime sanitizes rendered SVG lazily.
- `remark-math` and `rehype-katex` are optional peers of the math entry instead
  of default dependencies. Install them alongside `katex` when using
  `@coderminer/vue-markdown/math`.
- Host-supplied pipelines are never disposed by the library; only the pipeline
  the library created is released on unmount or replacement.

### Fixed

- Plugin `setup()` now runs inside the plugin `effectScope`; watchers and
  scope-registered cleanups stop on reconfiguration and unmount, and a returned
  cleanup runs once.
- An explicit `source=""` renders the empty document instead of falling back to
  default slot content.
- Pipelines that share a name no longer share memoized documents; pipeline
  instance identity and `version` are part of the cache key.
- Async runs use a per-run slugger and a frozen configuration snapshot, so
  concurrent runs cannot reset each other's heading IDs.
- A plugin `onError` hook that throws no longer aborts the run; the failure is
  reported as `plugin-onerror`.
- Search segments no longer mutate the cached base document, so highlights from
  one query or renderer cannot leak into another. An explicit `search` option
  also clears segments contributed by `searchPlugin()` on text that no longer
  matches, so stale highlights and match counts cannot survive a query change.
- Mermaid SVG sanitization now filters scoped stylesheet declarations, so theme
  CSS cannot position the root SVG as a full-page overlay.
- Mermaid presentation attributes (`fill`, `stroke`, `filter`, `mask`,
  `clip-path`, marker attributes, `cursor`) keep only same-document fragment
  `url()` references, so a diagram cannot fetch external paint servers or
  cursors.
- Raw HTML rendered through `htmlPlugin()` prefixes `id` and `name` values with
  `user-content-`, and rewrites same-document fragment links to the prefixed
  target. Author markup can no longer collide with host ids or clobber globals.

## [1.0.2] - 2026-11-03

Patch release focused on Mermaid rendering quality and document stability. The
TOC is now an unnumbered list by default.

### Added

- `MermaidBlock` and `MarkdownMermaid` accept `deferRendering`, and
  `MarkdownRenderer`/`MarkdownConfigProvider` accept `mermaidDeferRendering`, so
  print, PDF, and screenshot pipelines can render every diagram before
  snapshotting. `MarkdownRenderer` emits `mermaid-rendered` when a diagram
  finishes rendering.
- Mermaid previews support drag and keyboard panning based on actual overflow,
  expose `data-pannable` and `data-dragging`, and leave text selection and
  ordinary pointer interaction untouched while a diagram fits.
- `--vmd-mermaid-min-height` reserves height for the pending state.
- Mermaid PNG export rasterizes at up to 3x with an 8192 px edge and a
  16-megapixel budget, so labels stay crisp and oversized canvases cannot fail
  the export.

### Changed

- Mermaid nodes use content-derived keys, so editing one block no longer
  remounts every later diagram.
- The published npm tarball includes `src/` so consumers can inspect the
  source.
- The TOC renders as a `<ul role="list">` without numbering by default. Hosts
  that want numbering can opt in with `list-style: decimal` and marker padding.
- The Vue peer range is now `>=3.3.0 <4.0.0`. CI runs the full suite against
  Vue 3.3 and 3.4 in addition to the latest 3.x release.

### Fixed

- Mermaid renders measure in a reusable offscreen host instead of appending a
  temporary node to `document.body`, eliminating the layout jump and scrollbar
  flash while diagrams render.
- Diagrams keep the intrinsic pixel width Mermaid reports and are capped at the
  preview width, so small diagrams no longer stretch and wide ones shrink to
  fit instead of overflowing.
- Deferred diagrams render when printing starts, and one shared print listener
  replaces a per-block subscription.
- A pan drag no longer gets stuck when the pointer is released outside the
  preview.
- `sanitizeSvg()` keeps Mermaid's `useMaxWidth` pixel width after inline styles
  are stripped.
- String tag overrides (`components: { h1: 'h2' }`), unknown-tag fallbacks, and
  raw HTML element nodes render their children on Vue 3.3 and 3.4. The renderer
  passed a slot function to an element vnode, which only Vue 3.5 resolves.

## [1.0.1] - 2026-11-02

Patch release that closes runtime and contract issues found after 1.0.0. The
package has no external users yet, so it includes intentional contract
tightenings: the `externalLinkTarget` type is narrowed and `mermaidPlugin()`
rejects non-object arguments.

### Added

- The `MarkdownRenderer` `searchDebounce` prop delays parsing after the last
  search query change, so search-as-you-type can avoid re-parsing large
  documents on every keystroke. The initial query still applies immediately for
  server rendering.

### Fixed

- `toc-change` no longer emits a transient empty array before the first parse
  settles. A first document that really has no headings still emits one settled
  `[]`. The TOC change check compares every field directly instead of
  serializing the array.
- `customTagsPlugin()` and `MarkdownCustomTag` normalize kebab-case attributes
  to camelCase props (`start-line` becomes `startLine`). `data-*` and `aria-*`
  stay in their DOM form. The click payload and host component bindings use the
  normalized props.
- `MermaidBlock` resets zoom on every render (retry, theme, renderer, and
  source changes) and when returning from the source tab, not only when the
  source text changes. The default error/fallback regions include a visible
  retry button.
- The Mermaid runtime clears a rejected lazy import so retry can recover from a
  transient chunk failure. Initialization is keyed by the full configuration
  and checked inside the render queue, so blocks with different themes cannot
  reuse stale global Mermaid state.
- `useMarkdownDocument` publishes a deduplicated diagnostics list for each run,
  including failed runs, and exposes `clearDiagnostics()`. Entries count as
  duplicates only when their code, message, severity, phase, plugin, source
  range, and details all match, so distinct occurrences are preserved. Setup
  diagnostics are snapshotted when plugin setup runs, so a plugin that retains
  the setup context cannot append to the list on later runs. The renderer prunes
  its reported-diagnostic set to the currently active entries instead of growing
  it indefinitely.
- `MarkdownRendererEvents` and `MermaidBlockEvents` are exported typed event
  maps, and the event payload conventions are documented so consumers do not
  need to discover each shape separately. Interaction events include the
  originating DOM event; the docs no longer claim every payload is serializable.
- The default `searchPlugin()` no longer walks the document tree when the query
  is empty, and the renderer skips match counting for an empty query.
- A side TOC column now constrains its height and scrolls internally when the
  table of contents is longer than the viewport. The stacked mobile layout
  resets that cap so the TOC expands above the content.
- `MarkdownRenderer` now validates every scalar prop at runtime, not only the
  enum props. Invalid enums, booleans, strings, and numeric values report a
  `prop-*` warning and use the documented fallback instead of reaching the
  renderer or pipeline. An omitted optional `baseUrl` is valid and emits no
  diagnostic. The `externalLinkTarget` prop and document option are typed as
  `'_self' | '_blank'` instead of `string`, and `theme` is inferred as a runtime
  string prop.
- `MermaidBlock` invalidates in-flight renders on unmount, so a late result
  cannot emit `rendered`/`error` or write state after the component is gone.
  `resetMermaidRuntime()` keeps the serialized queue tail and monotonic render
  counter, so an explicit reset cannot interleave renders or reuse DOM IDs.
- `mermaidPlugin()` rejects non-object arguments with a clear error instead of
  silently ignoring them. Its only supported option remains `languages`.
- The built library no longer resolves Node-only dependency variants. This
  removes `node:process`, `node:path`, and `node:url` imports (including
  `process.cwd`) from browser output and prevents crashes when rendering.
- `renderMermaid()` and `MermaidBlock` now report a clear error for non-string
  sources, such as an un-awaited `renderMermaid()` Promise, instead of throwing
  `trim is not a function`. Empty and non-browser sources also explain how to
  recover.
- `MermaidBlock` now distinguishes an invalid renderer result, empty renderer
  output, and SVG rejected completely by sanitization, with an actionable hint
  for each. Thrown renderer errors are prefixed with the failure stage. The
  invalid `mermaidRenderer` diagnostic now names the actual fallback, the
  built-in runtime.
- Default heading IDs collapse consecutive whitespace and hyphen runs, so
  `My   -   Heading` becomes `my-heading` instead of `my-----heading`. Custom
  sluggers keep their own formatting; only duplicate suffixes are added.
- The base renderer no longer statically includes the HTML parser. Mermaid SVG
  sanitization loads it only after a diagram renders, the math entry uses it for
  KaTeX markup, and the default highlight.js adapter now produces hast through
  `lowlight` instead of parsing HTML. The highlight entry no longer pulls the
  HTML parser, and the highlight entry resolves `highlight.js` language subpaths
  from the host peer dependency instead of bundling a second copy.
- Published JavaScript no longer contains `sourceMappingURL` comments for maps
  that are excluded from the tarball.
- The `highlight` entry no longer exports `highlightedNodesFromHtml`; adapters
  that already produce hast use `highlightedNodesFromHast`. This keeps the HTML
  parser out of the highlight entry.

### Documentation

- Document the Mermaid renderer layers and their precedence: per-block
  `renderer` > provider/preset `mermaidRenderer` > built-in runtime. Clarify
  that `mermaidPlugin()` only converts fences and that `renderMermaid()` is an
  async function, not a `MermaidRenderer` object, so it must be wrapped when
  passed explicitly. Explain why `resetMermaidRuntime()` is not a lifecycle
  hook and cannot unload the browser module cache.
- Document the raw-HTML attribute casing rule: HTML lowercases attribute names,
  so use kebab-case (`start-line`) for camelCase custom props (`startLine`).
- Add a complete sample plugin (`demo/plugins/samplePlugin.ts`) and a
  step-by-step plugin guide that exercises source, remark, rehype, component,
  document, label, token, setup/cleanup, and error hooks.

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
