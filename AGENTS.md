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

Dependencies point downward only. The core must not import Vue, DOM globals, or
component code. Vue components must not import the demo. Presets must not import
internal implementation files of other presets.

- `src/core/` — DOM-free, Vue-free types, normalization, filtering, security,
  URL policy, TOC/search/model building, memoization.
- `src/pipeline/` — official unified pipeline, custom pipeline contract,
  identity/memo keys.
- `src/plugins/` — plugin contract, registry, built-in plugins.
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
- Order is `pre` -> `normal` -> `post`, then registration order. Duplicate names
  replace deterministically and report a diagnostic.
- Setup runs once per resolved plugin set inside an `effectScope`; cleanup runs
  on reconfiguration and unmount. Never register global listeners outside a
  cleanup.
- Plugin failures are isolated and reported with a diagnostic. A failing plugin
  must not corrupt the last good document.

## Pipeline rules

- v1.0 uses `unified` + `remark-parse` + `remark-rehype`; do not add
  `markdown-it`, `htmlparser2`, or an HTML string round-trip.
- Stage order: library remark plugins, host `remarkPlugins`, `remark-rehype`,
  optional `rehype-raw`, `rehype-sanitize`, library rehype plugins, host
  `rehypePlugins`.
- Raw HTML is dropped unless the host adds `rehype-raw`. Sanitize immediately
  after raw parsing.
- Hast stays internal. The public model is serializable and contains no Vue,
  DOM, mdast, hast, or processor objects.
- Custom pipelines must return a hast root and may expose `processSync` and
  `dispose`. Invalid pipelines fall back to the official pipeline with a
  diagnostic.

## Performance rules

- Store the document in `shallowRef`; replace it atomically.
- Never wrap the document or host components/plugins in a deep reactive proxy.
- Memoize parses by source, pipeline identity, plugin identities, and
  parse-affecting options. Presentation-only changes must not re-parse.
- Render text nodes as strings; never instantiate one component per text node.
- Keep heavy engines (Shiki, Mermaid, CodeMirror, KaTeX) behind lazy entries.
- Run `npm run bench` and `npm run size` before shipping.

## Boundaries

- No network calls, persistence, routing, or global application state in
  library components or the demo.
- Security invariants are not customizable away without an explicit trusted
  option.
- Keep `openspec/` artifacts in sync when implementation changes a contract.
