## Context

See `proposal.md` for motivation. The relevant current state is:

- The working tree, not commit `e3a85ba` or `task.md`, is the real baseline. It
  already contains the v1.0 closeout and customization work through 7.14, and
  `npm test` passes 217 tests. The only remaining customization item is 7.7.
- `src/export/index.ts` runs the pipeline and stringifies `result.hast` directly.
  Rendering instead runs `normalizeHast`, builds a document, applies URL and
  element policy, and runs plugin document transforms. Export therefore diverges
  from rendering and can emit `javascript:` URLs.
- `useMarkdownDocument` owns normalization, document transforms, memoization,
  diagnostics, and plugin setup. Export duplicates the pipeline preparation but
  none of the finalization. There is no model-to-hast serializer.
- The public types already declare `MarkdownHighlighter`, `MathEngine`,
  `MermaidRenderer`, math and Mermaid node kinds, presets, provider config,
  manifests, and behavior injection. None of the highlighter, math, or Mermaid
  components or adapters exist yet.
- `src/core/parts.ts`, `tokens.css`, and `math.css` already reserve names for
  highlighter, math, and Mermaid parts and tokens.
- The library build externalizes highlight.js, Shiki, KaTeX, Mermaid, and
  CodeMirror, but `package.json` only declares some of them as optional peers
  and the build has no entries for the optional adapters.
- `openspec/specs/` is empty. The predecessor change and closeout are complete
  but unarchived, so this change's MODIFIED deltas can only archive after they
  are archived first.

## Goals / Non-Goals

**Goals:**

- Make export a second consumer of the same document finalization used by
  rendering, not a second implementation of it.
- Add the remaining v1.x surfaces without re-parsing documents for
  presentation-only changes such as switching highlighters, math engines, or
  Mermaid renderers.
- Keep optional engines out of the root, headless, pipeline, plugins, and
  presets entries unless the host actually uses them.
- Finish the named-slot contract across all regions, including code,
  highlighter, math, Mermaid, and editor.
- Leave the repository with one authoritative backlog.

**Non-Goals:**

- No new Markdown tokenizer, no `markdown-it`, no HTML string round-trip in the
  render path, and no `v-html` for document content.
- No breaking changes to the v1.0 root/headless/pipeline/plugins/presets/
  node-component entries.
- No mandatory new runtime dependency for consumers who do not use an optional
  engine.
- No attempt to make Mermaid or CodeMirror work during server rendering beyond
  a deterministic placeholder.
- No redesign of the existing plugin, pipeline, manifest, preset, or provider
  contracts beyond the additions listed here.

## Decisions

### 1. Treat the working tree as the baseline and gate on archive order

The plan starts by preserving the current uncommitted 7.x work and confirming
the 217-test baseline. `task.md` is corrected rather than trusted: T-01–T-05 and
T-07–T-09/T-11–T-17 are already shipped, so only T-06, T-10 (7.7), T-18–T-46
remain. The OpenSpec tasks in this change become the authoritative checklist.

`add-vue-markdown-component-suite` must be archived first, then
`finish-v1-0-closeout`, then this change. Without that order the MODIFIED
deltas have no target specs and archiving this change would create partial
capability specs.

Alternative considered: re-plan inside the predecessor change. Rejected because
the predecessor is a completed v1.0 contract and its archive is a release step,
not a planning bucket.

### 2. Share one document finalization path with export

Extract the non-reactive part of `useMarkdownDocument`'s `finalize` into a
DOM-free core helper, for example `src/core/finalize.ts`:

```
finalizeMarkdownDocument({
  source,
  result,            // PipelineResult
  options,           // MarkdownDocumentOptions
  resolvedPlugins,   // ResolvedPluginSet
  pipelineName,
  allowHtml,
  slugger,
  idPrefix,
  diagnostics,
}) -> MarkdownDocument
```

It performs `normalizeHast`, `buildDocument`, plugin `transformDocument` calls
with the same error isolation, and `withDerivedDocument`. The composable calls
it from its reactive `finalize`; export calls it through a new non-reactive run
helper, for example `src/core/run.ts`, which resolves plugins and the pipeline,
applies source transforms, creates the pipeline context, resets the slugger,
and returns the finalized document plus diagnostics.

Export then becomes:

```
source transforms -> pipeline.process/processSync -> finalizeMarkdownDocument
-> modelToHast -> rehype-stringify
```

The render path never imports `rehype-stringify`. Export throws when any
diagnostic is an error, preserving the current "no partial output" behavior.

Alternative considered: duplicate the normalize/filter/url calls inside export.
Rejected because two policy implementations will drift, which is exactly the
current bug. Alternative considered: serialize raw hast after adding a second
sanitizer pass. Rejected because element filtering and plugin document
transforms operate on the normalized model, so a sanitizer-only pass cannot
produce parity.

### 3. Serialize the normalized model back to hast

Add `modelToHast(document)` in `src/core/model-hast.ts`. It maps:

- `text` to `{ type: 'text' }`
- `element` to `{ type: 'element', tagName: tag, properties: attrs }`
- `code` to `pre > code` with the documented language class
- `math` to a math element carrying `data-vmd-part`, TeX, and display mode, with
  rendered children when present
- `mermaid` to a Mermaid code block placeholder
- `custom` to its tag with normalized attributes and children
- `plugin` to its children when present, otherwise a documented fallback
  diagnostic

The serializer performs no new trust decisions; it receives a document that has
already passed sanitization, filtering, URL policy, and document transforms.
This keeps `rehype-stringify` as the only HTML serialization step and keeps the
render path node-based. Golden tests compare export HTML with the renderer's
DOM output for the same source and options.

Alternative considered: keep an extra normalized hast tree alongside the model.
Rejected because it doubles the document state and makes document transforms
ambiguous: they can change the model but not the parallel hast.

### 4. Add host slots through render context, not component templates

The renderer owns `useSlots()`. Extend `MarkdownRenderContext` with the host
slot map and a helper:

```
renderHostSlot(name, props, fallback)
```

The helper calls the host slot with scoped props, checks for empty output, and
falls back to the default region. Rich components receive the context through
the existing provide/inject path, so a renderer-level `#code`, `#math`,
`#mermaid`, or `#editor` slot reaches the component that renders that region.
Renderer region slots keep their current names and contexts.

Slots and minimum contexts:

| Slot | Context |
| --- | --- |
| `root`, `toc`, `toc-item`, `content`, `error`, `empty`, `loading` | existing documented contexts |
| `code` | `{ node, source, language, highlighted, nodes, lines, visibleLines, actions: { copy, download } }` |
| `code-actions` | `{ source, language, fileName, title, highlighted, nodes, actions: { copy, download } }` |
| `header` | `{ source, language, label, fileName, title, highlighted, nodes, actions: { copy, download } }` |
| `toolbar` | `{ source, language, fileName, title, highlighted, nodes, actions: { copy, download } }` |
| `highlighter` | `{ source, language, nodes, lines, highlighted, actions: { copy } }` |
| `math` | `{ tex, displayMode, rendered, error }` |
| `math-error` | `{ tex, error, retry }` |
| `mermaid` | `{ source, svg, status, error, actions: { copy, exportPng, fullscreen, retry } }` |
| `mermaid-error` | `{ source, error, retry, focusSource }` |
| `editor` | `{ value, update, diagnostics, status, actions: { focus, reset, fullscreen } }` |
| `editor-diagnostics` | `{ diagnostics, focusLine }` |

Slot output is host-authored Vue, not untrusted Markdown. It is an explicit
trust boundary like a host component override. Manifests declare every slot so
the demo inspector and validator can discover them.

Alternative considered: per-component slots supplied directly by the host.
Rejected because a host cannot pass a slot to a grandchild component through the
renderer's template without a slot-forwarding prop for every component.

### 5. Detect rich nodes structurally and keep the public model unchanged

- `MarkdownTaskItem`: the resolver selects it for an `li` whose direct children
  include an `input` with `type="checkbox"`. The normalized input keeps its
  `checked` and `disabled` attributes. The component renders the checkbox with
  accessible semantics and emits `task-change` with the checked state and node.
- `MarkdownFootnoteReference`: selected for `sup` elements carrying the
  `footnote-ref` class produced by GFM.
- `MarkdownFootnotes`: selected for a `section` carrying `data-footnotes` or the
  `footnotes` class.
- Missing footnote targets render the documented fallback instead of a broken
  link.
- `MarkdownCode`, `MarkdownMath`, and `MarkdownMermaid` remain independently
  importable and delegate to the resolved code block, math, and Mermaid region
  components or adapters.

Alternative considered: add `taskItem`, `footnoteReference`, and `footnotes`
node kinds. Rejected because it expands the serializable public model and the
model-to-hast serializer for behavior that can be resolved from existing GFM
hast markers. Plugin-defined nodes remain the extension path for new kinds.

### 6. Highlight at render time, not during parsing

The document model stores source code and language only. Highlighters run when
`CodeBlock` or `VueSyntaxHighlighter` renders, using the normalized-node adapter
contract. This keeps adapter switches presentation-only: no re-parse, no
document replacement, and stable source/scroll position. Highlighting results
are cached by adapter identity, code, language, options, and theme.

The default highlight.js adapter uses `highlight.js` directly (optionally with
`rehype-highlight` for hast conversion), registers an explicit default language
set, escapes plain text synchronously, and exposes an optional async `load`.
The Shiki adapter uses Shiki's `codeToHast`, preloads the highlighter, themes,
and requested languages, supports dual light/dark output, and falls back to
plaintext on the server or before readiness.

`CodeBlock` owns the wrapper, language label, highlighted content, copy,
download, custom actions, events, and the `code`/`code-actions`/`header`/
`toolbar` slots. It also supports line numbers, highlighted lines, truncation,
virtual scrolling, and delayed highlighting. Both components share the
highlighter state composable so adapter selection, themes, readiness loading,
and diagnostics cannot drift apart. `VueSyntaxHighlighter` adds empty-input
behavior and the `highlighter` slot.

Root exports the components, but the default highlighter is loaded dynamically
so a consumer that never renders code does not pay for highlight.js. Shiki is
reachable only through its optional entry.

Alternative considered: run `rehype-highlight` in the main pipeline. Rejected
because an adapter switch would then require a re-parse and would put engine
markup into the serializable model, complicating copy, cache, and SSR fallback.

### 7. Preserve TeX in the model and use rehype-katex for the default output

`mathPlugin` composes `remark-math`, a library rehype annotation step, and
`rehype-katex`. The annotation wraps each math container in a `vmd-math` element
carrying `data-tex` and `data-display`, leaving an inner `math` container for
`rehype-katex` to render. Normalization recognizes the wrapper and creates
`kind: 'math'` with the exact TeX source, display mode, and rendered child
nodes. This preserves both the TeX source (for custom engines, caching, and
fallback) and the default KaTeX output (for fast SSR).

`MarkdownMath` uses the pre-rendered nodes when the default engine is active and
re-renders from TeX when a host injects a custom engine. The KaTeX engine entry
uses `renderToString` with `throwOnError: false`, `trust: false`, `htmlAndMathml`
output, safe strictness, and a render cache. Invalid TeX produces a `math-error`
diagnostic and readable TeX fallback.

The library's render path remains Vue-node-based. KaTeX HTML is trusted engine
output and is parsed into normalized nodes by the adapter, not injected as an
HTML string into the document.

Alternative considered: let `rehype-katex` be the only path and drop the TeX
source. Rejected because custom engines, error retry, caching, and accessible
fallback all need the source.

### 8. Keep Mermaid client-only, lazy, and sanitized

`src/mermaid/runtime.ts` dynamically imports `mermaid` once, initializes it once
with `securityLevel: 'strict'` and the resolved theme, serializes renders
through a queue, and generates unique IDs. The SVG string is parsed into a
detached document, walked against an SVG allowlist, stripped of scripts,
`foreignObject`, event-handler attributes, and unsafe URLs, and converted to
normalized nodes. Server rendering and pre-hydration produce a deterministic
placeholder.

The injectable `MermaidRenderer` contract is validated before use. A custom
renderer bypasses the default runtime; its output is still sanitized, and a
failure preserves the last good diagram. `MermaidBlock` owns preview/source
switching, pending state, errors, zoom/pan, fullscreen, copy, PNG export, and
recovery. Tokens, parts, labels, slots, CSP notes, and accessibility metadata
are documented with the component.

Alternative considered: use Mermaid's `innerHTML` output directly. Rejected by
the no-injection rule and the need to strip unsafe SVG content.

### 9. Lazy CodeMirror editor with a minimal Mermaid mode

`MermaidLiveEditor` dynamically imports CodeMirror 6 only on the client. It uses
`StreamLanguage` with a small Mermaid tokenizer because there is no official
Mermaid language package. The editor binds `v-model`, syncs external value
changes, debounces previews at 300 ms by default, coalesces superseded renders,
and exposes a placeholder before hydration. Diagnostics come from the renderer,
are mapped to source lines, can mark error lines, and can focus the first error.
The split layout enforces minimum sizes, supports keyboard resizing, reset, and
fullscreen with a CSS fallback and focus containment.

### 10. Make the size guard walk reachable chunks

Enable a build manifest in `vite.lib.config.ts` and rewrite
`scripts/size-guard.mjs` to walk each entry's static import graph. Core entries
fail if Mermaid, CodeMirror, Shiki, KaTeX, or highlight.js is statically
reachable. Optional entries may reach their own adapter. Dynamic imports are
reported as lazy chunks rather than failures. The guard prints per-entry bytes
and the first import path that reaches a forbidden engine.

Alternative considered: keep the current entry-file byte check. Rejected
because it cannot see a heavy engine imported by a shared chunk.

### 11. Package the optional adapters explicitly

Add entries and optional peer metadata:

- `./highlight` — default highlight.js adapter
- `./highlight/shiki` — Shiki adapter
- `./math` — KaTeX engine
- `./mermaid` — Mermaid runtime/renderer (if a host wants the runtime directly)
- `./editor` — CodeMirror live editor

Root and node-component entries keep working without these peers installed.
Missing peers produce a clear error only when the optional entry is imported.
`package.json` peer metadata is aligned with the actual optional peers, and the
Vite entries use the same externalization rules.

## Risks / Trade-offs

- **Archive order blocks the MODIFIED deltas** → make archive order an explicit
  prerequisite task and validate this change after the predecessor archive.
- **The model-to-hast serializer drifts from rendering** → one finalization
  helper, golden export-versus-render parity tests, and security fixtures for
  URLs, raw HTML, `skipHtml`, and filtered elements.
- **Slot plumbing changes render context** → additive context fields, SSR tests,
  and fallback tests for absent slots.
- **`rehype-katex` may not preserve annotation attributes** → verify early with
  a focused fixture; if it replaces the wrapper, annotate a wrapper element and
  read TeX from the wrapper. The normalized model contract does not change.
- **Mermaid SVG sanitization is a new attack surface** → strict Mermaid security,
  an SVG allowlist, a malicious-SVG fixture corpus, and last-good retention.
- **CodeMirror and Shiki are large** → dynamic imports, optional entries, and a
  reachable-chunk size guard.
- **Async highlighter/engine readiness can flicker** → plaintext or last-good
  output, stable layout, and no scroll reset.
- **Full-catalog benchmarks can be noisy** → report timings and component counts
  as sanity checks, not hard gates.
- **The working tree is uncommitted** → preserve or commit it before the first
  implementation edit so the 217-test baseline is recoverable.

## Migration Plan

1. Preserve and commit the current working tree; confirm 217 tests pass.
2. Archive `add-vue-markdown-component-suite`, then `finish-v1-0-closeout`.
3. Land export parity and named-slot plumbing first.
4. Land rich nodes, then highlighting, math, Mermaid rendering, and Mermaid
   editing.
5. Land docs, demo, audits, size-guard changes, and the manual checklist.
6. Run all quality gates and validate this change.

Rollback is per phase: each engine ships behind its own optional entry, so a
failing adapter can be removed without touching the root contract. Export parity
has no runtime rollback path because keeping the old path would retain the
security bug; it should be fixed forward with parity tests.

## Open Questions

None that block the plan. PNG export strategy (canvas rasterization versus SVG
serialization) and the exact default highlight.js language list can be settled
during implementation without changing the specs, the approach, or the task
breakdown.
