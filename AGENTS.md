# AGENTS.md

This repository builds `vue-markdown-suite`, a Vue 3 Markdown component suite.
The OpenSpec change in `openspec/changes/add-vue-markdown-component-suite/` is
the source of truth for behavior. `tasks.md` is the implementation checklist.

## Layers and dependency direction

```
demo / host app
  -> preset components (MarkdownRenderer, node components)
    -> Vue adapter (composables, render context, resolution)
      -> core (model, normalization, security, URL, search, memo)
        -> unified / remark / rehype
```

Dependencies point downward only. The core must not import Vue, DOM globals,
component code, or the pipeline/plugin/export composition layers. Vue components
must not import the demo. Presets must not import internal implementation files
of other presets.

- `src/core/` — DOM-free, Vue-free types, normalization, filtering, security,
  URL policy, TOC/search/model building, memoization.
- `src/pipeline/` — official unified pipeline, custom pipeline contract,
  identity/memo keys.
- `src/plugins/` — plugin contract, registry, built-in plugins, source and
  document transforms.
- `src/export/` — static HTML export composition layer; may import core,
  pipeline, and plugins.
- `src/composables/` — Vue state adapters; the only place that owns
  `shallowRef` documents and watchers.
- `src/components/` — node catalog, renderer, render context, resolution.
- `src/styles/` — tokens and part-based CSS.
- `demo/` — public-entry-only demonstration app; no business logic.

## Commands

```bash
npm install
npm run dev          # demo
npm run build:lib    # library, declarations, styles
npm run build:demo   # static demo
npm test             # node + happy-dom projects
npm run typecheck
npm run lint
npm run size         # bundle entry guard
npm run bench        # parse/render budget gate
```

## Customization rules

- Every visual part is addressable through `data-vmd-part` and a stable
  `vmd-*` class. Never target internal DOM structure in docs or tests.
- Design tokens use the `--vmd-*` prefix and live in `src/styles/tokens.css`.
- Precedence is documented in `design.md`; do not invent a parallel mechanism.
- Components accept `node` and receive rendered children through the default
  slot. Keep them CSS-independent and SSR-safe.
- New public components must ship parts, tokens, and labels. From v1.x they
  also ship a manifest entry.
- Do not use `v-html` anywhere in the render path.

## Plugin rules

- Plugins are plain objects or `defineMarkdownPlugin` factories with a unique
  name.
- A plugin may contribute remark/rehype plugins, `remarkRehypeOptions`, source
  and document transforms, components, labels, tokens, and setup/cleanup.
- `transformSource` runs in resolved order before parsing. A thrown transform or
  a non-string result keeps the previous source and reports a diagnostic.
- `toc`, `code`, and `link` are core invariant markers, not disableable
  behavior. `disablePlugins` reports `plugin-core` and keeps them in the set.
- Order is `pre` -> `normal` -> `post`, then registration order. Duplicate names
  replace deterministically and report a diagnostic.
- Setup runs once per resolved plugin set inside an `effectScope`; cleanup runs
  on reconfiguration and unmount. Never register global listeners outside a
  cleanup.
- Plugin failures are isolated and reported with a diagnostic. The owning
  plugin's `onError` receives remark/rehype failures, and a cached processor
  must write to the current run's diagnostics. A failing plugin must not corrupt
  the last good document.

## Pipeline rules

- v1.0 uses `unified` + `remark-parse` + `remark-rehype`; do not add
  `markdown-it`, `htmlparser2`, or an HTML string round-trip.
- Stage order: plugin source transforms, `remark-parse`, library remark plugins,
  host `remarkPlugins`, `remark-rehype`, optional `rehype-raw`,
  `rehype-sanitize`, core heading IDs, host `rehypePlugins`.
- Raw HTML is dropped unless the host adds `rehype-raw`. Sanitize immediately
  after raw parsing.
- Hast stays internal. The public model is serializable and contains no Vue,
  DOM, mdast, hast, or processor objects.
- Custom pipelines must return a hast root and may expose `processSync` and
  `dispose`. Invalid pipelines fall back to the official pipeline with a
  diagnostic.

## Performance rules

Performance is a guardrail, not the product's headline feature. Keep the
architecture efficient, but do not block features on marginal wins or optimize
speculatively. Bundle size is a sanity check, not a primary design constraint.

- Store the document in `shallowRef`; replace it atomically.
- Never wrap the document or host components/plugins in a deep reactive proxy.
- Memoize parses by source, pipeline identity, plugin identities, and
  parse-affecting options. Presentation-only changes must not re-parse.
- Render text nodes as strings; do not instantiate one component per text node.
- Keep heavy optional engines behind lazy entries when they are added.
- Run `npm run bench` and `npm run size` as sanity checks, not as a gate for
  every change. Investigate only visible or large regressions.

## Compatibility rules

- Runtime JavaScript follows Vue 3's baseline: native ES2016, no IE11. The
  built library supports Chrome 54+, Edge 15+, Firefox 52+, Safari 10.1+, and
  iOS 10.3+. Chrome 54 rather than 52 is required because a bundled dependency
  uses `Object.entries` during module initialization.
- Runtime **APIs** in `src/` must stay within ES2016. Do not add APIs such as
  `Object.entries`, `Object.values`, `Object.fromEntries`, `Object.hasOwn`,
  `Array.prototype.at`, `structuredClone`, `crypto.randomUUID`,
  `String.prototype.replaceAll`, or `Promise.any`. The `lib` setting stays at
  ES2016 so type checking catches them.
- Source **syntax** may use newer TypeScript/JavaScript (optional chaining,
  nullish coalescing, class fields, async/await) because Vite downlevels it to
  `es2016` at build time. `tsconfig` targets ES2022 for authoring; the published
  syntax target is `build.target`.
- The optional stylesheet follows the same browser baseline as the runtime:
  Chrome 54+, Edge 15+, Firefox 52+, Safari 10.1+, and iOS 10.3+. It keeps
  logical properties, `:focus-visible`, `position: sticky`, and
  `text-align: start` as progressive enhancement and ships physical-property,
  `:focus`, `-webkit-sticky`, and `text-align: left` fallbacks for older
  engines. `prefers-color-scheme`, `text-underline-offset`, and `forced-colors`
  are enhancements. Unstyled and headless usage follows the runtime baseline.
  The demo stylesheet is not part of the published claim. Avoid `:has()`,
  container queries, CSS nesting, `color-mix()`, `oklch()`, `dvh`, and
  `text-wrap: balance`.
- The Vite configs pin `build.target` to `es2016` and `cssTarget` to the
  stylesheet baseline. They transpile syntax but do not polyfill runtime APIs.
- Prefer progressive enhancement: guard browser-only APIs and keep server
  output usable when they are unavailable.

## Boundaries

- No network calls, persistence, routing, or global application state in
  library components or the demo.
- Security invariants are not customizable away without an explicit trusted
  option.
- Keep `openspec/` artifacts in sync when implementation changes a contract.
