## 1. Contract and core

- [x] 1.1 Add `htmlPlugin()` in `src/html/index.ts` with `html: true` and an optional add-only `schema`; export `HtmlSchemaExtension`.
- [x] 1.2 Add `html` and `htmlSchema` to `MarkdownPlugin`; remove `skipHtml`, `PipelineCapabilities.html`, `PipelineContext.allowHtml`, and the normalize/finalize/run `allowHtml` chain.
- [x] 1.3 Drop raw nodes unconditionally in normalization; the official pipeline is the only place that parses them.

## 2. Pipeline and sanitizer

- [x] 2.1 Collect every `html: true` plugin, run all rehype contributions before sanitization, remove them from the host rehype list, and merge every `htmlSchema` extension.
- [x] 2.2 Build the sanitizer schema from `ALLOWED_TAGS` and `DANGEROUS_TAGS`, add class/data/ARIA/link/image properties, and align `src` protocols with the core URL policy.
- [x] 2.3 Merge an add-only `htmlSchema` extension for tags and properties without weakening the strip list or core URL/attribute rules.
- [x] 2.4 Drop raw nodes immediately after `remark-rehype` when no html plugin is present, so a manual or minified `rehype-raw` cannot parse them; warn when a manual parser is detectable by name.
- [x] 2.5 Include every html plugin and schema identity in the processor cache key.
- [x] 2.6 Replace tag-specific `className` restrictions so math and raw HTML classes survive sanitization.
- [x] 2.7 Convert multi-word ARIA properties to valid attribute names (`aria-labelledby`, `aria-describedby`).
- [x] 2.8 Add the default `rel` to raw `_blank` links during normalization so export and rendering agree.
- [x] 2.9 Ignore dangerous tags in an `htmlSchema` extension so the sanitizer strip list cannot be re-enabled.
- [x] 2.10 Ignore `on*`, `style`, and `srcdoc` properties in an `htmlSchema` extension.
- [x] 2.11 Parse `srcset` candidates without splitting commas inside `data:` URLs and validate each candidate.

## 3. Packaging and docs

- [x] 3.1 Add the `html` build entry, package export, optional `rehype-raw` peer, external, and size-guard entry.
- [x] 3.2 Update English and Chinese guides, reference tables, demo sections, and README for `htmlPlugin()` and the removal of `skipHtml`.
- [x] 3.3 Update the main specifications and record this change.

## 4. Verification

- [x] 4.1 Update pipeline, security, export, renderer, and migration tests; cover default drop, sanitized raw HTML, style-content stripping, manual parser rejection, wrapped-parser neutralization, multiple html plugins, schema extension, dangerous-tag re-enablement at the sanitizer stage, srcset data URLs, and the unknown-tag children attribute.
- [x] 4.2 Run `npm run typecheck`, `npm test`, `npm run lint`, `npm run build:lib`, and `npm run size`.
