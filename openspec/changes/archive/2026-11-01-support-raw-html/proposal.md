## Why

Raw HTML support existed as a documented side effect of adding `rehype-raw` to
`rehypePlugins`, but the contract had gaps: `skipHtml` stopped working once raw
HTML was parsed, the sanitizer schema and the core attribute policy disagreed,
hosts could not extend the schema, and the parser was neither discoverable nor
consistently paired with sanitization. The component has not been published, so
this change replaces the half-contract with one explicit, safe entry point.

## What Changes

- **Enable raw HTML only through `@coderminer/vue-markdown/html`.** The new
  `htmlPlugin()` contributes `rehype-raw` and marks the plugin with
  `html: true`; the official pipeline always runs the built-in sanitizer after
  it. A manual `rehype-raw` in `rehypePlugins` is ignored with a warning.
- **Remove `skipHtml`.** Raw HTML is dropped by default, so `skipHtml` had no
  meaning once `htmlPlugin()` is the only switch. `PipelineCapabilities.html`,
  `PipelineContext.allowHtml`, and `NormalizeOptions.allowHtml`/`skipHtml` are
  removed as well.
- **Keep the parser out of the default bundle.** `rehype-raw` becomes an optional
  peer required only by the `html` entry; applications that never import it keep
  the main and pipeline entries unchanged.
- **Align sanitization with the model policy.** The built-in schema uses the
  shared tag allowlist, strips dangerous tags with their content, allows
  class/data/ARIA scaffolding needed by raw HTML, and keeps data image URLs at
  parity with Markdown images. `htmlPlugin({ schema })` adds tags, properties,
  but cannot weaken safety.
- **Update documentation and specifications** for the new entry, the removal of
  `skipHtml`, and the add-only schema extension.

## Impact

- Affected specs: `security-and-trust`, `remark-pipeline`, `markdown-rendering`,
  `plugin-system`, `library-packaging`, `node-components`.
- Affected code: `src/html/`, `src/pipeline/official.ts`, `src/core/security.ts`,
  `src/core/normalize.ts`, `src/core/finalize.ts`, `src/core/run.ts`,
  `src/core/types.ts`, `src/composables/useMarkdownDocument.ts`,
  `src/components/MarkdownRenderer.vue`, package exports, and the size guard.
- Breaking: `skipHtml` is removed; raw HTML requires `htmlPlugin()`.
