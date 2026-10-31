## 1. Baseline and release coordination

- [ ] 1.1 Preserve the current working tree before any implementation edit by committing it on a dedicated branch; verify `git status` is clean and `npm test` still passes the 217-test baseline.
- [ ] 1.2 Reconcile `task.md` with the shipped working tree: mark T-01–T-05 and T-07–T-09/T-11–T-17 as done, keep T-06, T-10 (7.7), and T-18–T-46, and verify every remaining item maps to a task in this file or is deliberately retired.
- [ ] 1.3 Confirm archive order by archiving `add-vue-markdown-component-suite` and then `finish-v1-0-closeout`; verify `openspec validate "complete-v1-x-suite" --strict` no longer reports archive-refusal for the MODIFIED deltas.
- [ ] 1.4 Update `AGENTS.md` only for the new entry points and subsystem boundaries introduced by this change (highlight, math, mermaid, editor); verify the documented dependency direction still points downward.

## 2. Shared document finalization and static export parity

- [ ] 2.1 Extract `finalizeMarkdownDocument` from `useMarkdownDocument` into a DOM-free core helper with the same normalization, document build, plugin `transformDocument` error isolation, and derived-document behavior; verify the composable tests still pass unchanged.
- [ ] 2.2 Add a non-reactive run helper for export that resolves plugins and pipeline identity, applies source transforms before parsing, resets the slugger per run, detects `rehype-raw`, and returns the finalized document plus diagnostics; verify a source transform and a failing transform report the same diagnostics as rendering.
- [ ] 2.3 Add `modelToHast(document)` covering text, element, code, math, mermaid, custom, and plugin nodes; verify a round-trip fixture preserves tags, attributes, ordering, and text without adding HTML strings to the model.
- [ ] 2.4 Rewire `exportMarkdownHtmlSync` and `exportMarkdownHtml` to use the shared finalization and serializer, keeping `rehype-stringify` out of every render entry; verify export throws on an error diagnostic instead of returning partial HTML.
- [ ] 2.5 Add parity tests that export the same source/options used by `MarkdownRenderer` and compare elements, attributes, heading IDs, filtered nodes, and resolved links/images; verify the tests fail if export bypasses normalization.
- [ ] 2.6 Add export security tests for `javascript:`, `vbscript:`, `data:text/html`, `data:image/svg+xml`, event-handler attributes, raw HTML with and without `rehype-raw`, and `skipHtml`; verify no unsafe value reaches the exported HTML.
- [ ] 2.7 Add export tests for `allowedElements`, `disallowedElements`, `unwrapDisallowed`, `allowElement`, `urlTransform`, `baseUrl`, `idPrefix`, and a plugin `transformDocument`; verify each option changes export exactly as it changes rendering.
- [ ] 2.8 Update `README.md` and the export/headless docs to state that export is full parity and that export fails on diagnostics; verify the documented behavior matches the new tests.

## 3. Named slot contract

- [ ] 3.1 Extend `MarkdownRenderContext` with the host slot map and `renderHostSlot(name, props, fallback)`; verify an absent slot and an empty slot both return the fallback.
- [ ] 3.2 Pass `useSlots()` from `MarkdownRenderer` into the render context and keep the existing `root`, `toc`, `toc-item`, `content`, `error`, `empty`, and `loading` slots working; verify every renderer slot still replaces its region.
- [ ] 3.3 Declare the slot names and minimum scoped contexts for `code`, `code-actions`, `highlighter`, `math`, `math-error`, `mermaid`, `mermaid-error`, `editor`, and `editor-diagnostics` in the public types and manifests; verify the manifest validator accepts the declarations.
- [ ] 3.4 Add renderer slot tests for replacement, functional actions, empty output, nested provider use, and SSR; verify a slot receives the same data and actions as its default region.
- [ ] 3.5 Document the slot table and action contracts in `docs/customization.md`; verify every documented slot exists in the manifest and is covered by a test.

## 4. Rich node catalog

- [ ] 4.1 Implement `MarkdownTaskItem` and select it for list items containing a GFM checkbox; render accessible checkbox semantics and emit `task-change` with the checked state and node; verify checked, unchecked, keyboard, and custom-component override tests.
- [ ] 4.2 Implement `MarkdownFootnoteReference` and `MarkdownFootnotes` with structural GFM detection, ordered notes, multiple references, back-links, accessible labels, and missing-note fallback; verify duplicate references and an unresolved reference.
- [ ] 4.3 Finish `MarkdownCode` delegation and add delegating `MarkdownMath` and `MarkdownMermaid` that remain independently importable and fall back when the delegated component or adapter is unavailable; verify standalone mounting and in-renderer delegation.
- [ ] 4.4 Add manifests for `MarkdownTaskItem`, `MarkdownFootnoteReference`, `MarkdownFootnotes`, and the delegating components, including parts, slots, labels, and override keys; verify the manifest validator covers every catalog entry.
- [ ] 4.5 Add a full-catalog benchmark that renders every rich node and reports render time and component counts; verify the text fast path keeps component counts bounded and the benchmark remains a sanity check.

## 5. Code blocks and highlighting

- [ ] 5.1 Implement adapter validation, plaintext fallback, async readiness, cache keys, and theme mapping in the shared highlighter layer; verify custom, async, invalid, and unknown-language adapters.
- [ ] 5.2 Implement the default highlight.js adapter with explicit language registration, synchronous escaping, and an optional async load; verify it is reachable only through its documented entry and never through the headless entry.
- [ ] 5.3 Implement the optional Shiki adapter with lazy highlighter/theme/language preload, content or full-block nodes, dual light/dark output, plaintext server fallback, and clear missing-peer errors; verify its optional entry in Node and happy-dom.
- [ ] 5.4 Implement adapter selection by local prop, provider, preset, and default, expose the resolved identity, and preserve source text, scroll position, and layout when switching; verify local > provider > preset > default.
- [ ] 5.5 Implement `CodeBlock` with language label, highlighted nodes, copy, download, action descriptors, events, custom actions, and the `code`/`code-actions` slots; verify success, failure, hidden actions, slot actions, and keyboard access.
- [ ] 5.6 Implement `VueSyntaxHighlighter` with the shared adapter, language and theme selection, line numbers, highlighted lines, truncation, virtual scrolling, delayed highlighting, empty input, and the `highlighter` slot; verify large-input scroll stability and async readiness.
- [ ] 5.7 Add the `./highlight` and `./highlight/shiki` package entries, optional peer metadata, and build entries; verify `npm pack` resolves both entries and a consumer without Shiki can use the default adapter.
- [ ] 5.8 Document highlighter selection, adapter authoring, the default language set, themes, and SSR fallback; verify every documented API exists in the build and is covered by a test.

## 6. Math

- [ ] 6.1 Implement `mathPlugin` with `remark-math`, configurable delimiters, code exclusion, escaped and unmatched delimiters, a `vmd-math` annotation wrapper carrying TeX and display mode, and `rehype-katex`; verify inline/display parsing, escaped delimiters, and unmatched fallback.
- [ ] 6.2 Extend normalization and `modelToHast` for `kind: 'math'` with TeX, display mode, rendered children, and source range; verify inline and block math survive export, SSR, and document transforms.
- [ ] 6.3 Implement the KaTeX engine entry with `htmlAndMathml`, `throwOnError: false`, `trust: false`, safe strictness, macros, cache, and async readiness; verify valid output, invalid TeX fallback, and `math-error` diagnostics.
- [ ] 6.4 Implement `MarkdownMath` with inline/display modes, MathML or accessible text, pre-rendered default output, custom-engine re-rendering, error and math slots, and host replacement; verify accessibility, slots, and override tests.
- [ ] 6.5 Add the optional `./math` entry, peer metadata, math parts/tokens, and optional stylesheet loading; verify math remains readable without the stylesheet and the root/headless entries do not load KaTeX.
- [ ] 6.6 Add math fixtures for escaping, code exclusion, invalid commands, server rendering, cache hits, and custom engines; verify the math suite passes in both Node and happy-dom projects.
- [ ] 6.7 Document math setup, delimiters, engine authoring, accessibility, styling, and diagnostics; verify every documented option exists in the build.

## 7. Mermaid rendering

- [ ] 7.1 Implement the lazy Mermaid runtime with one module instance, `securityLevel: 'strict'`, theme initialization, render queue, unique IDs, and error classification; verify concurrent renders and initialization failures.
- [ ] 7.2 Implement SVG-to-node parsing and sanitization with an element/attribute allowlist that strips scripts, `foreignObject`, event handlers, and unsafe URLs; verify a malicious-SVG fixture corpus.
- [ ] 7.3 Implement the injectable Mermaid renderer contract with validation, custom-renderer bypass, sanitization of custom output, and last-good retention on failure; verify an invalid renderer falls back safely.
- [ ] 7.4 Implement `MermaidBlock` with typed props, events, preview/source switching, pending state, last-good retention, opt-in errors, zoom/pan, fullscreen, copy, PNG export, recovery, and the `mermaid`/`mermaid-error` slots; verify each action and the failure path.
- [ ] 7.5 Add Mermaid tokens, parts, labels, manifests, CSP guidance, server placeholder, and diagram accessibility metadata; verify SSR output is deterministic and contains no Mermaid runtime.
- [ ] 7.6 Add the `./mermaid` entry and package metadata; verify the runtime remains lazy from the root and node-component entries.
- [ ] 7.7 Add Mermaid tests for invalid syntax, incomplete source, custom renderers, theme changes, PNG/copy actions, and focus behavior; verify the last good diagram survives each failure.

## 8. Mermaid live editing

- [ ] 8.1 Implement `MermaidLiveEditor` two-way binding, external value sync, 300 ms default debounce with coalescing, pending state, and SSR placeholder; verify rapid edits apply only the latest preview.
- [ ] 8.2 Integrate CodeMirror 6 with a minimal Mermaid `StreamLanguage`, lazy loading, empty-source placeholder, theme mapping, and lifecycle cleanup; verify no CodeMirror module is requested before mount.
- [ ] 8.3 Implement diagnostics with the default formatter, injectable formatter, line mapping, error-line marking, raw-details opt-in, auto-focus opt-in, compact mode, and preserved last-good preview; verify custom formatters and invalid line data.
- [ ] 8.4 Implement the resizable split with minimum sizes, initial ratio, keyboard adjustment, reset, fullscreen with CSS fallback, and focus containment; verify keyboard paths and unmount cleanup.
- [ ] 8.5 Add the `./editor` entry, optional CodeMirror peers, and the `editor`/`editor-diagnostics` slots; verify the editor entry is absent from the initial root graph and the slots receive update, focus, and diagnostics actions.
- [ ] 8.6 Document Mermaid setup, CSP, server placeholders, the editor, diagnostics, and the split/fullscreen contract; verify every documented API exists in the build.

## 9. Documentation, demo, and hardening

- [ ] 9.1 Add v1.x guides for tokens/parts/slots, regions, node components, presets, behavior injection, highlighter authoring, math setup, Mermaid setup, and the customization cookbook; verify each recipe imports through a published entry.
- [ ] 9.2 Extend the demo with every preset and rich node component, highlighter switching, math, Mermaid interactions, live editing, and the customization inspector; verify `npm run dev` and `npm run build:demo` cover the reachable surface.
- [ ] 9.3 Audit semantics, labels, keyboard paths, focus order, focus-visible styling, and announcements across all components; verify with component tests and a recorded manual keyboard pass.
- [ ] 9.4 Audit RTL layout, reduced-motion behavior, print, forced colors, and token overrides across renderer, code, highlighter, math, Mermaid, and editor components; verify the documented scenarios with CSS and component tests.
- [ ] 9.5 Audit document-level listeners, observers, body classes, timers, fullscreen state, and editor instances for unmount cleanup; verify no listener, timer, or body state leaks after unmount.
- [ ] 9.6 Rewrite `scripts/size-guard.mjs` to walk each built entry's reachable static-import graph from the build manifest, allow dynamic lazy chunks, report per-entry bytes, and fail when Mermaid, CodeMirror, Shiki, KaTeX, or highlight.js leaks into a core entry; verify the guard fails on a deliberately injected import and passes on the real build.
- [ ] 9.7 Perform the manual demo checklist for Markdown rendering, TOC, search, custom tags, HTML safety, pipeline switching, headless usage, plugin extension, and component overrides; record the result and any follow-up in this change.
- [ ] 9.8 Check every public API referenced by the new docs and demo against the built declarations and runtime entries; verify the existing-export documentation test passes.

## 10. Final verification

- [ ] 10.1 Run `npm run typecheck`, `npm test`, and `npm run lint`; verify all pass with the new tests.
- [ ] 10.2 Run `npm run build:lib` and `npm run build:demo`; verify the optional entries, declarations, and styles are emitted correctly.
- [ ] 10.3 Run `npm run size` and `npm run bench`; verify the reachable-chunk guard passes, heavy engines stay lazy, and the full-catalog benchmark reports reasonable counts.
- [ ] 10.4 Run `openspec validate "complete-v1-x-suite" --strict`; verify the change validates and the archive-order prerequisite is recorded.
- [ ] 10.5 Confirm 7.7 is genuinely complete by checking every documented slot in the manifest and tests, then update `task.md` or retire it in favor of this change; verify no remaining unchecked item is left unowned.
