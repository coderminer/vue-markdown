# Remaining implementation backlog

This is a working checklist for work that is not yet implemented. The OpenSpec
changes remain the contract source of truth:

- `openspec/changes/add-vue-markdown-component-suite/tasks.md`
- `openspec/changes/finish-v1-0-closeout/tasks.md`

Current baseline: commit `e3a85ba`, `npm test` 175 tests passing.

Already landed and not repeated below:

- `transformSource` execution and failure isolation
- `toc` / `code` / `link` as non-disableable core invariant markers
- plugin `onError` for remark/rehype failures
- per-run diagnostics with cached processors
- static export composition moved to `src/export/`
- plugin `regions.tocItem` routing
- local `components` precedence over plugin `nodeComponents`
- TOC calc expression fix

## 0. v1.0 closeout

Source: `openspec/changes/finish-v1-0-closeout/tasks.md`.

### T-01 Reactive default slot

- [ ] Keep the slot-derived source in a ref and refresh it from the existing
      raw-slot reader in `onUpdated`, guarded by an equality check.
- [ ] Keep `source` controlled: a bound `source` always wins over slot text.
- [ ] Add tests for changed slot text, unchanged slot text, and `source` + slot.
- [ ] Update `README.md` and `docs/migration.md`.

### T-02 Heading anchors

- [ ] `MarkdownHeading` renders an anchor when `node.attrs.id` exists.
- [ ] Use `data-vmd-part="heading-anchor"`, `href="#id"`, and the
      `headingAnchor` label.
- [ ] Omit the anchor when no ID exists or the host replaces the heading.
- [ ] Add standalone and renderer integration tests.
- [ ] Update heading anchor, print, and accessibility docs.

### T-03 MarkdownHtml boundary

- [ ] Keep `MarkdownHtml` standalone; do not add an `html` node kind.
- [ ] Test that `rehype-raw` renders normal element components with no `html`
      part.
- [ ] Test that standalone `MarkdownHtml` renders escaped text in the `html`
      part.
- [ ] Align README, migration, and node-catalog docs.

### T-04 CSS compatibility pass

- [ ] Replace `:where(:root)` with `:root` in `tokens.css`.
- [ ] Add physical-property fallbacks before logical properties in
      `components.css`.
- [ ] Add `text-align: left`, `:focus`, and `-webkit-sticky` fallbacks.
- [ ] Add `margin-top` / `margin-bottom` fallbacks in `math.css`.
- [ ] Pin `vite.lib.config.ts` `cssTarget` to the runtime baseline.
- [ ] Add a static CSS fallback guard test.
- [ ] Update README, AGENTS, and styled-usage compatibility notes.

### T-05 Closeout verification

- [ ] `npm run typecheck`
- [ ] `npm test`
- [ ] `npm run lint`
- [ ] `npm run build:lib`
- [ ] `npm run build:demo`
- [ ] `npm run size`
- [ ] `npm run bench`
- [ ] `openspec validate "finish-v1-0-closeout" --strict`
- [ ] Archive `add-vue-markdown-component-suite` before the closeout change.

## 1. v1.0 blocker not covered by the closeout change

### T-06 Static export parity and security

Current `src/export/index.ts` stringifies raw pipeline hast. It does not run
`normalizeHast` or document transforms, so it diverges from the renderer.

- [ ] Reuse the normalized model or an equivalent normalized-hast path for
      export.
- [ ] Apply `urlTransform`, `baseUrl`, element filters, `skipHtml`, and
      document transforms.
- [ ] Add tests proving export output matches sanitized rendered output.
- [ ] Add security tests for `javascript:`, raw HTML, `skipHtml`, and filtered
      elements.
- [ ] Add this work to the closeout or a dedicated v1.0 fix change.

Known current behavior:

```ts
exportMarkdownHtmlSync('[x](javascript:alert(1))')
// <p><a href="javascript:alert(1)">x</a></p>
```

## 2. v1.x customization foundation

Source: `openspec/changes/add-vue-markdown-component-suite/tasks.md` section 7.

### T-07 Customization manifests (7.3)

- [ ] Add the manifest type and registry.
- [ ] Publish manifests for every public component.
- [ ] Add a validator comparing parts, slots, labels, and rendered output.

### T-08 Complete labels system (7.4)

- [ ] Support string and function label values.
- [ ] Add a local `labels` prop.
- [ ] Merge defaults, provider, preset, and plugin labels.
- [ ] Add override tests for every built-in control.

### T-09 MarkdownConfigProvider (7.6)

- [ ] Provide nested theme, tokens, labels, components, regions, node
      components, plugins, pipeline, highlighter, math engine, and behavior.
- [ ] Implement deterministic local > provider > preset > plugin > default
      precedence.

### T-10 Named scoped slots (7.7)

- [ ] Add region slots for renderer, code, highlighter, math, Mermaid, and
      editor.
- [ ] Slots fully replace the default region and receive functional actions.

### T-11 Host regions map (7.8)

- [ ] Add a typed host `regions` prop for root, content, TOC, TOC item, code
      block, Mermaid block, error, empty, and loading.
- [ ] Ensure local overrides win and receive the same props as defaults.

### T-12 Host nodeComponents and renderers (7.9)

- [ ] Add a typed host `nodeComponents` prop.
- [ ] Support function renderers and `defaultRender` decoration.
- [ ] Support tag-to-kind aliases.
- [ ] Complete fenced-code precedence behavior.

### T-13 Behavior injection (7.10)

- [ ] Add highlighter, math engine, Mermaid renderer, and diagnostic formatter
      injection.
- [ ] Validate adapters and fall back safely.
- [ ] Keep injectable identity inspectable.

### T-14 Presets (7.11)

- [ ] Add `defineMarkdownPreset`.
- [ ] Add `composePresets`.
- [ ] Compose plugins, components, labels, tokens, theme, and behavior
      deterministically.

### T-15 Unstyled and headless acceptance (7.12)

- [ ] Verify full behavior and accessibility with no stylesheet.
- [ ] Verify headless markup can be fully custom.

### T-16 Internationalization and compatibility (7.5, 7.13)

- [ ] Add CJK line-breaking, spacing, and heading-ID coverage.
- [ ] Add RTL, reduced-motion, print, forced-colors, and focus-visible tests.

### T-17 Demo customization inspector (7.14)

- [ ] Build the inspector from manifests.
- [ ] Support live edits to tokens, labels, theme, slots, pipeline,
      highlighter, and component overrides.

## 3. v1.x rich node catalog

Source: section 8.

### T-18 MarkdownTaskItem (8.1)

- [ ] Render checkbox state from `remark-gfm`.
- [ ] Add accessible checkbox semantics and `task-change`.

### T-19 Footnote components (8.2)

- [ ] Add `MarkdownFootnoteReference` and `MarkdownFootnotes`.
- [ ] Support multiple references, back-links, labels, and missing-note
      fallback.

### T-20 Delegating rich nodes (8.3)

- [ ] Finish `MarkdownCode` delegation.
- [ ] Add `MarkdownMath`.
- [ ] Add `MarkdownMermaid`.
- [ ] Keep each component independently importable.

### T-21 Full-catalog coverage (8.4, 8.5)

- [ ] Extend manifests to all rich node components.
- [ ] Add a large-document benchmark covering the full catalog.

## 4. v1.x code blocks, highlighting, and math

Source: section 9.

### T-22 Highlighter adapter contract (9.1)

- [ ] Normalized-node output, validation, plaintext fallback, async readiness,
      caching, and theme mapping.

### T-23 Default highlight.js adapter (9.2)

- [ ] Explicit language registration.
- [ ] Synchronous highlighting and escaping.
- [ ] Optional async load step.
- [ ] Isolated entry point.

### T-24 Shiki adapter (9.3)

- [ ] Optional peers.
- [ ] Async theme/language preload.
- [ ] Content or full-block nodes.
- [ ] Dual light/dark output.
- [ ] Server plaintext fallback.

### T-25 Adapter selection (9.4)

- [ ] Resolve local > provider > preset > default.
- [ ] Expose resolved identity.
- [ ] Preserve source, scroll, and layout when switching.

### T-26 CodeBlock (9.5)

- [ ] Language label, highlighted nodes, copy, download, actions, and events.

### T-27 VueSyntaxHighlighter (9.6)

- [ ] Line numbers, highlighted lines, truncation, virtual scrolling, deferred
      highlighting, and empty input.

### T-28 mathPlugin (9.7)

- [ ] Compose `remark-math` and `rehype-katex`.
- [ ] Support inline/display delimiters, escaped delimiters, code exclusion,
      and unmatched fallback.

### T-29 MathEngine and KaTeX (9.8)

- [ ] Add the engine contract and KaTeX adapter.
- [ ] Use `htmlAndMathml`, `throwOnError: false`, `trust: false`, safe
      strictness, caching, and async readiness.

### T-30 MarkdownMath (9.9)

- [ ] Inline/display modes, MathML or accessible text, error slot, math slot,
      and override support.

### T-31 Math styles and diagnostics (9.10)

- [ ] Verify the optional math stylesheet keeps TeX readable without it.
- [ ] Add `math-error` diagnostics.

## 5. v1.x Mermaid

Source: section 10.

### T-32 Lazy Mermaid runtime (10.1)

- [ ] Single module instance, strict security, theme init, render queue, unique
      IDs, SVG-to-node parsing, sanitization, and error classification.

### T-33 Injectable Mermaid renderer (10.2)

- [ ] Validate custom renderers and preserve the last good diagram on failure.

### T-34 MermaidBlock (10.3)

- [ ] Preview/source switching, pending state, last-good retention, errors,
      zoom/pan, fullscreen, copy, PNG export, and recovery.

### T-35 Mermaid presentation contract (10.4)

- [ ] Tokens, parts, slots, labels, CSP guidance, server placeholder, and
      diagram accessibility metadata.

### T-36 MermaidLiveEditor (10.5)

- [ ] Two-way binding, external value sync, debounce, and coalescing.

### T-37 CodeMirror integration (10.6)

- [ ] Mermaid language mode, lazy loading, placeholder, and lifecycle cleanup.

### T-38 Mermaid diagnostics (10.7)

- [ ] Formatter, line mapping, error-line marking, raw details, auto-focus,
      compact mode, and last-good preview.

### T-39 Split layout and fullscreen (10.8)

- [ ] Min sizes, initial ratio, keyboard adjustment, reset, fullscreen fallback,
      and focus containment.

## 6. Documentation, demo, and hardening

Source: section 11.

### T-40 v1.x guides (11.1)

- [ ] Tokens, parts, slots, regions, node components, presets, behavior
      injection, highlighter authoring, math, Mermaid, and customization
      cookbook.

### T-41 Demo expansion (11.2)

- [ ] Every preset and node component, highlighter switching, math, Mermaid,
      live editing, and the customization inspector.

### T-42 Accessibility audit (11.3)

- [ ] Semantics, labels, keyboard paths, focus order, focus-visible, and
      announcements.

### T-43 Compatibility audit (11.4)

- [ ] RTL, reduced motion, print, forced colors, and token overrides.

### T-44 Resource cleanup audit (11.5)

- [ ] Document listeners, observers, body classes, timers, and fullscreen state.

### T-45 Real bundle guard (11.6)

- [ ] Check reachable chunks, not only entry-file byte size.
- [ ] Fail when Mermaid, CodeMirror, Shiki, or KaTeX leaks into core entries.

### T-46 Manual demo checklist (12.5)

- [ ] Markdown rendering, TOC, search, custom tags, HTML safety, pipeline
      switching, headless usage, plugins, and component overrides.

## Suggested order

1. T-01 through T-05: close the v1.0 contract.
2. T-06: fix static export parity and security.
3. T-07 through T-14: establish customization, provider, regions, node
   components, behavior injection, and presets.
4. T-15 through T-21: rich nodes and catalog coverage.
5. T-22 through T-31: code blocks, highlighting, and math.
6. T-32 through T-39: Mermaid.
7. T-40 through T-46: docs, demo, audits, and final verification.
