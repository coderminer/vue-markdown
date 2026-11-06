## 1. Pipeline capability selection

- [x] 1.1 Validate `capabilities` in `validatePipeline`: it must be an object and declared fields must be booleans; report `pipeline-capabilities` and fall back to the official pipeline when invalid.
- [x] 1.2 Run `processSync` only when the pipeline does not declare `sync: false` and the method exists; keep the error-message fallback when capabilities are absent.
- [x] 1.3 Make `exportMarkdownHtmlSync` refuse a pipeline that declares `sync: false` instead of calling `processSync`.
- [x] 1.4 Add pipeline and renderer tests for `sync: false`, `sync: true`, undeclared capabilities, malformed capabilities, async errors from `processSync`, and export.
- [x] 1.5 Verify no public type change: `MarkdownPipeline`, props, events, and slots are unchanged.

## 2. Security corpus

- [x] 2.1 Add mixed `srcset` candidates (safe plus `javascript:` and `data:image/svg+xml`).
- [x] 2.2 Add SVG external resources, event attributes, and `xlink:href` in raw HTML.
- [x] 2.3 Add CSS `url()`, escapes, comment splitting, `@import`, and `expression()`.
- [x] 2.4 Add MathML, custom tags, and custom attributes.
- [x] 2.5 Assert render and `exportMarkdownHtml` agree on the same hostile input.
- [x] 2.6 Run the existing CommonMark, GFM, URL, and SVG cases to confirm no regression.
- [x] 2.7 Only patch source if a new case exposes a real gap.

## 3. Mermaid adversarial corpus

- [x] 3.1 Add escaped selectors and attribute names.
- [x] 3.2 Add CDATA, unclosed comments, and nested at-rules.
- [x] 3.3 Add namespaced tags, `xlink:href`, and mixed casing.
- [x] 3.4 Add deep nesting, external `url()`, pseudo fragments, and `data:` references.
- [x] 3.5 Add `<style>` `position`/`inset`/`z-index`/`overflow` escape attempts.
- [x] 3.6 Add `<foreignObject>`, `<script>`, and event attributes.
- [x] 3.7 Assert the policy without depending on Mermaid runtime output and keep scoped theme CSS.
- [x] 3.8 Only patch `src/mermaid/sanitize.ts` if the corpus exposes a gap.
- [x] 3.9 Resolve CSS escapes for `<url>` presentation attributes before validating fragment references.
- [x] 3.10 Drop stylesheets that use `image()`, `image-set()`, or `cross-fade()` with a bare string source.

## 4. Documentation

- [x] 4.1 Document the three trust levels in both security guides.
- [x] 4.2 State that `class` is not an isolation layer.
- [x] 4.3 Document the process-level memo cache, `memoClear()`, and the deferred per-request isolation in both SSR guides.
- [x] 4.4 Document `PipelineCapabilities.sync` semantics in both API references.
- [x] 4.5 Correct stale `IMPROVEMENTS.md` entries and add an `Unreleased` CHANGELOG section without bumping the version.

## 5. Verification

- [x] 5.1 Run `npm run typecheck`, `npm run lint`, and `npm test`.
- [x] 5.2 Run `npm run build:lib`, `npm run size`, and `npm run bench`.
- [x] 5.3 Confirm no new public exports, `package.json` still reports `1.1.0`, and no tag or publish occurred.

## 6. Realistic data coverage

- [x] 6.1 Add a realistic Markdown document that covers frontmatter, every heading level, emphasis, inline and block code, links, images, blockquotes, lists, task lists, tables, raw HTML, and GFM constructs.
- [x] 6.2 Exercise the real document through the official pipeline, the public document model, the renderer, and static export, including TOC, node inventory, code-node shape, and render/export parity.
- [x] 6.3 Add realistic Mermaid diagrams across flowchart, sequence, class, state, ER, Gantt, and pie families, and validate every source with the real Mermaid parser.
- [x] 6.4 Exercise the Mermaid corpus through `mermaidPlugin()`, the document model, and the renderer with an injected renderer, asserting distinct keys, preserved sources, and sanitized output.
- [x] 6.5 Add a realistic custom-element document with nested custom tags and hostile attributes, then assert the sanitizer, custom-tag inventory, host-component mapping, slots, click payloads, and static export.
- [x] 6.6 Only change source when a realistic fixture exposes a genuine defect; otherwise keep the fixture setup aligned with the documented `htmlPlugin({ schema })` contract.
- [x] 6.7 Document that raw-HTML custom tags must also be allowed through `htmlPlugin({ schema })` in both customization guides.
