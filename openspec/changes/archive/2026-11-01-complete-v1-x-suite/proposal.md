## Why

The suite is close to feature-complete, but the remaining work is tracked in two
places that no longer agree. `task.md` still lists customization items that the
working tree already implements, while `add-vue-markdown-component-suite` still
has the rich catalog, highlighting, math, Mermaid, documentation, and final
verification unchecked. The actual remaining v1.0 gap is static export: it
stringifies raw pipeline hast, so it bypasses normalization, element filtering,
URL policy, `baseUrl`, `skipHtml`, and plugin document transforms. Finishing the
suite without a single corrected plan would either redo shipped work or leave
that security divergence in place.

## What Changes

- **Re-baseline the backlog.** Treat the current working tree (217 passing tests)
  as the baseline. Correct the stale `task.md` claims for T-01–T-05 and
  T-07–T-09/T-11–T-17, and carry forward only: static export parity, named
  region slots (7.7), rich nodes (8.x), code/highlighting (9.1–9.6), math
  (9.7–9.10), Mermaid rendering (10.1–10.4), Mermaid editing (10.5–10.8),
  documentation/demo/hardening (11.x), and the manual demo checklist (12.5).
- **Fix static export parity and security.** Share the renderer's document
  finalization with both export helpers, serialize the normalized model back to
  hast, and keep `rehype-stringify` out of the render path. Export SHALL apply
  the same source transforms, sanitization, element filtering, URL transform,
  `baseUrl`, `skipHtml`, heading-ID policy, plugin document transforms, and
  diagnostics as rendering.
- **Finish named region slots.** Expose scoped slots for the renderer regions,
  code content and actions, the standalone highlighter, math and math errors,
  Mermaid and Mermaid errors, and the live editor and its diagnostics. A slot
  fully replaces its region and receives the same data and functional actions
  as the default.
- **Complete the rich node catalog.** Add `MarkdownTaskItem`,
  `MarkdownFootnoteReference`, `MarkdownFootnotes`, and the delegating
  `MarkdownMath`/`MarkdownMermaid` paths; finish `MarkdownCode` delegation;
  publish manifests for every new component; and benchmark the full catalog.
- **Ship code highlighting.** Implement the adapter contract, the default
  highlight.js entry, the optional Shiki entry, `CodeBlock`, and
  `VueSyntaxHighlighter` with line numbers, highlighted lines, truncation,
  virtualization, delayed highlighting, and empty-input handling.
- **Ship math.** Add `mathPlugin`, math-node normalization, the KaTeX engine
  entry, `MarkdownMath`, the optional math stylesheet, and `math-error`
  diagnostics.
- **Ship Mermaid.** Add the lazy runtime, injectable renderer, `MermaidBlock`,
  `MermaidLiveEditor`, CodeMirror integration, diagnostics, and the resizable
  split/fullscreen behavior.
- **Finish docs, demo, and hardening.** Add v1.x guides, extend the demo, audit
  accessibility/compatibility/resource cleanup, make the size guard walk
  reachable chunks, and record the manual demo checklist.
- **No breaking v1.0 changes.** The existing root, headless, pipeline, plugins,
  presets, and node-component entries keep their contracts. New engines ship
  through separate optional entries.

## Capabilities

### New Capabilities

None. The rich catalog, highlighting, math, and Mermaid behavior are already
specified by `add-vue-markdown-component-suite`; this change implements those
requirements and only changes the four contracts below.

### Modified Capabilities

- `markdown-rendering`: `Static HTML export` becomes full parity with the
  rendered document, including filtering and document transforms.
- `headless-composables`: the headless `Static HTML export` helper gets the same
  parity and failure contract.
- `security-and-trust`: adds a static-export trust boundary so export cannot
  bypass sanitization, URL policy, or raw-HTML policy.
- `customization`: `Named slots` names the required renderer, code, highlighter,
  math, Mermaid, and editor slots and their functional actions.

## Impact

- Export/core: `src/export/index.ts`, `src/core/normalize.ts`,
  `src/core/model.ts`, `src/composables/useMarkdownDocument.ts`, plus a new
  DOM-free finalization helper and a model-to-hast serializer.
- Renderer/components: `src/components/MarkdownRenderer.vue`, render context,
  resolver, new rich node components, `CodeBlock`, `VueSyntaxHighlighter`,
  `MarkdownMath`, `MermaidBlock`, and `MermaidLiveEditor`.
- New subsystems: `src/highlight/` (highlight.js and Shiki adapters),
  `src/math/` (plugin and KaTeX engine), `src/mermaid/` (lazy runtime and
  renderer), and `src/editor/` (CodeMirror integration).
- Packaging: new optional entries in `package.json` and `vite.lib.config.ts`;
  optional peers for highlight.js, Shiki, KaTeX, Mermaid, and CodeMirror.
- Quality: `scripts/size-guard.mjs` (reachable chunk graph), `bench/index.mjs`
  (full catalog), tests across DOM, node, and SSR projects.
- Docs and demo: new v1.x guides, the demo sections, `README.md`, `AGENTS.md`,
  and retirement or correction of the stale `task.md`.
- Release ordering: `add-vue-markdown-component-suite` and then
  `finish-v1-0-closeout` must be archived before this change so the MODIFIED
  deltas apply to created capability specs.
