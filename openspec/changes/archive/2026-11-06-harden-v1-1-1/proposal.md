## Why

`1.1.0` identifies asynchronous custom pipelines by matching error text when
`processSync` throws. That fallback is fragile, and a pipeline that declares
`capabilities.sync: false` is still called synchronously when it exposes a
`processSync` method. The same assumption exists in synchronous static export.
At the same time, the security and Mermaid regression corpora and the
trust-boundary documentation do not yet cover the attack classes recorded after
the release.

`1.1.1` is a hardening patch: no public API, prop, event, slot, or package
version changes. It makes pipeline capability selection explicit, extends the
adversarial corpora, and records the current trust and cache limits.

## What Changes

- **Honor `PipelineCapabilities.sync`.** A pipeline that declares
  `sync: false` always runs through `process()`, even when `processSync` exists.
  A pipeline that declares `sync: true` uses `processSync` when available.
  Undeclared capabilities keep the existing error-message fallback.
- **Validate the capability shape.** `capabilities` must be an object and its
  declared fields must be booleans. Invalid capabilities produce a diagnostic
  and fall back to the official pipeline. `exportMarkdownHtmlSync` refuses to
  call a pipeline that declares `sync: false`.
- **Extend the security corpus.** Cover mixed `srcset` candidates, SVG external
  resources and `xlink:href`, CSS URL/escape/comment injection, MathML, custom
  tags and attributes, and render/export parity on the same hostile input.
- **Extend the Mermaid SVG corpus.** Cover escaped selectors, CDATA, unclosed
  comments, nested at-rules, namespaced tags, mixed casing, deep nesting,
  pseudo fragments, `data:` references, and image functions that accept a bare
  string source, and assert a stable output policy independently of Mermaid's
  runtime formatting.
- **Document trust boundaries and cache limits.** Record the three trust levels,
  class non-isolation, the process-level memo cache, `memoClear()`, and the
  `PipelineCapabilities.sync` contract. Correct stale backlog entries.
- **Exercise realistic data.** Add realistic Markdown, Mermaid, and
  custom-element fixtures so the pipeline, document model, renderer, and static
  export are tested with the documents and diagram families users actually
  write, not only minimal examples.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `remark-pipeline`: pipeline capability selection becomes authoritative for
  custom pipelines and synchronous export.
- `security-and-trust`: the regression corpus and trust-boundary documentation
  cover additional hostile inputs.
- `mermaid-rendering`: the sanitizer corpus covers additional adversarial SVG
  and CSS inputs.
- `performance`: SSR documentation states that the memo cache is process-level
  and that per-request isolation is deferred to a later minor release.

## Impact

- Affected code: `src/composables/useMarkdownDocument.ts`,
  `src/pipeline/custom.ts`, `src/export/index.ts`.
- Affected tests: `tests/node/pipeline.test.ts`, `tests/dom/behavior.test.ts`,
  `tests/node/security.test.ts`, `tests/node/export.test.ts`,
  `tests/node/mermaid.test.ts`, and the realistic fixtures under
  `tests/fixtures/` with their node and DOM integration suites.
- Affected docs: `docs/guide/security.md`, `docs/guide/ssr.md`,
  `docs/reference/api.md`, their Chinese counterparts, `IMPROVEMENTS.md`, and
  `CHANGELOG.md`.
- Not changing: public exports, props, events, slots, default security policy,
  package version, tags, or publishing.
