# Improvement backlog after 1.1.0

This document records work that is intentionally deferred from the 1.1.0 release
line (first beta: `1.1.0-beta.0`). It covers the issues from the architecture
review that were judged to be refactors, hardening, or evolution work rather
than defects in the shipped behavior. It is not a release plan; prioritize
against real usage and benchmarks.

For the fixes that did ship in `1.1.0-beta.0`, see `CHANGELOG.md`.

## Status summary

| Issue | Topic | Status |
| --- | --- | --- |
| 001 | Plugin `effectScope` did not wrap `setup()` | Fixed in 1.1.0 |
| 002 | Explicit `source=""` fell back to slot content | Fixed in 1.1.0 |
| 003 | Pipeline identity lacked instance identity | Fixed in 1.1.0 |
| 004 | Pipeline dispose ownership was unclear | Fixed in 1.1.0 |
| 005 | Async runs shared slugger/configuration state | Fixed in 1.1.0 |
| 006 | Search was coupled to the parse identity | Fixed in 1.1.0 |
| 007 | Cache has no memory budget or SSR isolation | Deferred to 1.2.0 |
| 008 | Plugin `onError` failures were not isolated | Fixed in 1.1.0 |
| 009 | `MarkdownRenderer` responsibilities are too broad | Deferred to 1.3.0 |
| 010 | Standalone components depend on renderer context | Verified: not a defect |
| 011 | HTML security boundary needs a wider corpus | Completed in 1.1.1; trusted-plugin mode still open |
| 012 | Document model has no version protocol | Deferred to 1.3.0 |
| 013 | No incremental parsing | Deferred to 1.5.0 (research) |
| 014 | No unified Feature registry | Deferred to 1.4.0 |
| 015 | Public component entry uses auto-discovery | Runtime list explicit; build and exports still deferred to 1.3.0 |
| 016 | `render.ts` is not modularized | Deferred to 1.3.0 |
| 017 | Mermaid SVG sanitizer is a custom security boundary | Completed in 1.1.1 |
| 018 | Raw HTML classes can collide with host utility CSS | Documented boundary; opt-in isolation deferred to 1.4.0 |

## One additional defect fixed in 1.1.0

**Presentation-only option changes rebuilt the official processor.** The
composable resolved the official pipeline inside a `computed`, so any option
change could create a new pipeline object, invalidate the memo identity, and
re-attach every remark/rehype plugin. The composable now owns one stable
official pipeline instance per call. Host pipelines are never created or
disposed by the library.

## Security fixes in 1.1.0

- **Mermaid stylesheet overlay.** Scoped theme CSS kept `position`, `inset`,
  edge offsets, `z-index`, and `overflow`, so a diagram could cover the host
  page. Root rules now keep only presentation declarations, descendant rules
  drop layout declarations, and comments are removed before checks so
  `pos/**/ition` cannot evade the filter.
- **Mermaid external resource references.** `fill`, `stroke`, `filter`, `mask`,
  `clip-path`, marker attributes, and `cursor` accepted `url(https://...)`.
  Only same-document fragment references are kept now.
- **Raw HTML DOM clobbering.** `clobberPrefix: ''` disabled the sanitizer's
  protection, so `<a id="app" name="getElementById">` reached the DOM as-is.
  Raw `id`/`name` values are now prefixed with `user-content-`, and
  same-document fragments are rewritten to the prefixed target.

## Deferred items

### ISSUE-007: Cache memory budget and SSR isolation

Current behavior: the memo is a module-level LRU with a 64-entry limit.
`memoClear()` and `memoSize()` are already public; budgets, observability, and
per-instance isolation are planned for `1.2.0`.

Gaps:

- No byte or document-size budget, so a few large documents can still hold a lot
  of memory.
- The cache is process-global. In a long-lived SSR server, documents from one
  request can be reused by another request.
- There is no public way to configure the cache per host; only the global
  `memoClear()`/`memoSize()` helpers exist.

Proposed direction:

- Add `maxEntries`, `maxBytes`, `maxDocumentSize`, and `clear()`/stats, either on
  the existing memo or as an injectable cache instance.
- Skip caching for documents above `maxDocumentSize`.
- Define an SSR strategy: per-request cache, opt-out, or a cache key that includes
  a request/tenant identity. Do not share documents that embed user data.
- Keep cache hits side-effect free by replaying diagnostics, which 1.1.0 already
  does.

Acceptance sketch: the cache never exceeds its budget, large documents do not
grow it without bound, manual clearing works, and concurrent SSR requests do not
observe each other's documents.

### ISSUE-009: Split `MarkdownRenderer`

`MarkdownRenderer.vue` still owns prop validation, slot reading, preset/provider
merging, document lifecycle, search, TOC, active heading, events, render context,
and layout. Extract cohesive composables behind the existing public API:

```text
composables/
  useMarkdownSource.ts
  useMarkdownConfigResolver.ts
  useMarkdownSearch.ts
  useMarkdownToc.ts
  useMarkdownNavigation.ts
  useMarkdownRenderContext.ts
```

Constraints: no prop, event, or slot changes; each composable is independently
testable; search and TOC logic become reusable by headless hosts.

### ISSUE-011: Security corpus hardening

Not a known vulnerability. The default pipeline already drops raw HTML, sanitizes
when the html plugin is enabled, and validates URLs in rendering and export. The
base corpus shipped with `1.1.0`; `1.1.1` adds the regression matrix and the
trust-boundary documentation:

- Add fixtures for `srcset` mixed URLs, SVG external resources and event
  attributes, CSS injection, MathML, custom tags, and custom attributes.
  (Added in `1.1.1`.)
- Verify Vue rendering and static HTML export agree on the same policy.
  (Added in `1.1.1`.)
- Document three trust levels: library-managed rendering, host-defined
  components, and trusted plugin output. (Added in `1.1.1`.)
- Consider a documented trusted mode for plugin output instead of disabling
  sanitization implicitly. Still open; evaluate with `1.2.0`.

### ISSUE-012: Document model version protocol

Decide whether `MarkdownDocument` needs an explicit `version` field and document:

- compatibility rules between document revisions;
- node ID and key generation rules;
- source-position guarantees;
- a custom-node extension protocol;
- JSON round-trip guarantees;
- what plugins may mutate and when.

This is a contract decision, not a bug fix. Do it before encouraging hosts to
persist or post-process documents outside the library.

### ISSUE-013: Incremental parsing

The current memo avoids re-parsing identical input; it is not block-level
incremental parsing. Do not implement this speculatively.

First establish a benchmark with small, medium, large, and very large documents,
then measure which costs dominate (parse, normalize, VNode construction, search).
Only then evaluate a staged design: split into blocks, cache per block, stabilize
block IDs, reuse unchanged nodes, and re-render locally.

### ISSUE-014: Feature registry

A `MarkdownFeature` layer would group components, plugins, styles, and metadata
into installable feature packs (`gfmFeature()`, `mathFeature()`,
`mermaidFeature()`). Plugins remain the low-level extension contract; features are
the user-facing composition layer. Defer until the standalone-component story is
stable, then define install order, dependency checks, and tree-shaking behavior.

### ISSUE-015: Explicit public component allowlist

The runtime component entry (`src/components/index.ts`) is already an explicit
list. The build entry list is still generated by scanning the component
directory, and `package.json` still exposes `./components/*`, so an internal
component can still become a public subpath by accident. Replace discovery with
an explicit public list (or split `components/public` and
`components/internal`), and make type declarations, docs, and the manifest
derive from that list. Target: `1.3.0`.

Acceptance sketch: adding an internal component does not expand the public API;
declarations and docs only include public components.

### ISSUE-016: Modularize render logic

`src/components/render.ts` combines node recognition, component resolution, VNode
construction, and special-node handling. A future split could look like:

```text
render/
  resolve-node.ts
  component-registry.ts
  render-code.ts
  render-special.ts
  render-children.ts
  render-context.ts
```

This is an internal refactor. Keep the resolution precedence and public behavior
unchanged, and rely on the existing renderer tests as the safety net.

### ISSUE-017: Mermaid sanitizer maintenance and adversarial corpus

The Mermaid SVG sanitizer is a tree-based allowlist over parsed hast, which is
the right shape: it never rewrites markup with regular expressions. The residual
risk is that it is security-critical custom code, and its CSS policy is a
hand-written parser.

Already done in 1.1.0: strict element/attribute allowlists, scoped stylesheet
validation, presentation-only root declarations, layout-declaration removal,
fragment-only `url()` values, and regression tests for the overlay and external
resource cases.

Deferred:

- Add a malformed-input corpus (escaped selectors/properties, CDATA, nested
  at-rules, namespace prefixes, mixed-case and `xlink` attributes, deeply nested
  trees) and run it as a property-style/fuzz test.
- Keep the policy tests independent of Mermaid's output so a runtime upgrade
  cannot silently widen the surface.
- Evaluate replacing the stylesheet handling with a maintained CSS parser, or
  replacing the whole node sanitizer with a maintained allowlist engine. The
  public `sanitizeSvg` API and the MarkdownNode output must stay unchanged.
- Add an explicit "sanitizer rejected the output" diagnostic path with a
  corrective hint, so a policy change is observable instead of silently
  blanking the diagram.

### ISSUE-018: Opt-in class isolation for untrusted raw HTML

`class` is intentionally preserved for raw HTML (tested and documented), because
removing it breaks author styling and trusted documentation. The risk is host
utility CSS: `class="fixed inset-0 z-50"` can cover the page when Tailwind or a
similar global stylesheet is present.

Deferred options:

- Add an opt-in `htmlPlugin({ classNames: 'drop' | 'prefix' })` mode for hosts
  that render untrusted content under utility CSS. Default behavior stays
  compatible.
- Or render documents inside a shadow root when the host asks for it, so global
  utility selectors do not reach document content.
- Whichever ships first, keep the boundary documented: `class` alone is not an
  isolation layer, and a host that styles untrusted class names accepts the
  visual-spoofing risk.

## Verified as not defects

### ISSUE-010: Standalone components already work without a renderer

`CodeBlock`, `MermaidBlock`, math components, and the node components resolve
their own defaults when no provider or render context is present; the renderer
context is an optional inheritance layer rather than a hard requirement. No code
change is required. A future test matrix that mounts each public standalone
component with no provider would still be useful documentation.

### ISSUE-011: The existing security suite already covers the core vectors

The repository already tests script/iframe/object/embed removal, `javascript:`
and `vbscript:` URLs, unsafe data URLs, `srcset` handling, SVG sanitization, and
URL traversal. `1.1.1` extends the matrix with mixed `srcset` candidates, SVG
external references, CSS escape/comment bypasses, MathML, custom attributes, and
render/export parity. Further work is the explicit trusted-plugin mode described
above, not a known bug fix.

## Notes on 1.1.0 behavior changes

- **Search no longer re-parses.** This is intentional and documented as a
  presentation-only update. It is not an API break, but consumers that counted
  pipeline invocations as a proxy for query changes will observe fewer runs.
- **`search-change` timing.** The event now fires once the applied query is
  available, using the currently rendered document. If a parse is pending, the
  previous document's count is kept until the new document lands, so a query is
  never paired with a count from a different document.
- **Pipeline disposal.** `dispose()` is only called for the official pipeline the
  library created. Host pipelines are host-owned; unmounting one renderer that
  shares a pipeline no longer affects the others.
- **Pipeline identity.** `name` alone is no longer sufficient. Instance identity
  and `version` are part of the key, and `version` is validated as a string.
- **Raw HTML ids and names are namespaced.** With `htmlPlugin()`, `id` and
  `name` values become `user-content-*`. In-document fragment links are
  rewritten to match; links from outside the document that assumed the original
  id no longer resolve. Heading and footnote ids keep their documented values.
- **Mermaid theme CSS is narrower.** Scoped rules that target the root SVG keep
  presentation declarations only, descendant layout declarations are removed,
  and external `url()` references are dropped. Normal Mermaid themes are
  unaffected; custom renderers that used CSS positioning inside SVG must use
  SVG attributes or transforms instead.
- **Raw HTML classes remain preserved.** This is a documented boundary, not a
  sanitizer bug. Hosts rendering untrusted content under global utility CSS
  should isolate styles at the host level (see ISSUE-018).

## Suggested order

1. Security corpus and trust-boundary docs (ISSUE-011, ISSUE-017) — low risk,
   high value.
2. Cache budget and SSR policy (ISSUE-007) — matters for long-lived servers.
3. Renderer composable split (ISSUE-009) — enables reuse without API change.
4. Public component allowlist (ISSUE-015) and render modularization (ISSUE-016).
5. Document model versioning (ISSUE-012) before persistence is encouraged.
6. Feature registry (ISSUE-014).
7. Incremental parsing (ISSUE-013) only after benchmarks justify it.
