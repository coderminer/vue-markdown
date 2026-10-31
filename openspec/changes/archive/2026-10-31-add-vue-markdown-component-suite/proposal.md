## Why

The reference project at `D:\works\vue-markdown` proves the feature set, but it is an internal, host-coupled implementation. Copying its component boundaries would carry over a monolithic renderer, implicit styling, business-specific tags, and extension points that only work by editing the components.

A general-purpose library needs a different architecture, built around four principles:

- **Componentization**: small, composable components and exported subcomponents instead of one monolith.
- **Generalization**: standard Markdown, no business semantics, environment-safe rendering, and a consistent public API.
- **Customization**: customization is a first-class product feature, not a set of escape hatches. Every visual part, string, behavior, and structural region must be replaceable or configurable without forking the library. This is the primary differentiator from existing Vue Markdown renderers.
- **Pluginization**: a stable plugin contract so parsing, document transforms, renderers, presets, and built-in features can be added, replaced, or disabled without patching the library.

The reference is behavioral input only. No public API, component boundary, or styling convention is carried over by default.

The primary competitive benchmark is `react-markdown`. It defines the baseline expectations for safe Markdown rendering, tag-keyed component overrides, unified/remark plugin interoperability, element allow/deny filtering, URL transformation, and asynchronous rendering variants. **v1.0 is a Vue-native reimplementation of react-markdown's rendering model, using the same unified/remark/rehype pipeline, not a React API port.** Later releases add the differentiators: presets, the full node catalog, typed plugins, multi-engine adapters, first-class code/math/Mermaid experiences, and five-layer customization.

The four react-markdown feature pillars are non-negotiable parity requirements:

- **Safe by default**: no `v-html` for untrusted content, raw HTML dropped unless explicitly enabled, safe URL handling, and sanitized output.
- **Components**: a `components` map keyed by HTML tag so a host can replace `<h2>` for `## hi` without forking the renderer.
- **Plugins**: a pick-and-choose extension ecosystem, with `remarkPlugins` / `rehypePlugins` / `remarkRehypeOptions` as first-class options.
- **Compliant**: 100% of the official CommonMark test suite through `remark-parse`, and 100% of the official GFM fixtures with `remark-gfm` enabled.

## What Changes

- Replace the porting approach with a layered architecture:
  - A DOM-free TypeScript core built on `unified` + `remark-parse` + `remark-rehype`, with a normalized hast-to-model layer, sanitization, TOC, search, and plugin orchestration.
  - Headless Vue composables for hosts that want to build their own UI.
  - Small preset components composed from exported subcomponents.
- Use the same implementation model as react-markdown:
  - Markdown → mdast (`remark-parse`) → remark plugins → hast (`remark-rehype`) → rehype plugins → normalized document model → Vue VNodes.
  - No HTML string round-trip for parser output and no `htmlparser2` re-parse. Raw HTML is handled only when the host opts into `rehype-raw`.
  - `remarkPlugins`, `rehypePlugins`, and `remarkRehypeOptions` run in the documented order, with `[plugin, options]` tuple support.
- Make the public API Vue-idiomatic while preserving react-markdown semantics:
  - `source` prop or default slot instead of a React `children` prop.
  - `components` keyed by HTML tag, accepting Vue components or tag-name strings.
  - `allowedElements`, `disallowedElements`, `unwrapDisallowed`, `allowElement`, `skipHtml`, `urlTransform`, and exported `defaultUrlTransform`.
  - Async pipeline state instead of separate `MarkdownAsync` / `MarkdownHooks` component families.
  - `v-model:source`, typed events, exposed actions, and `provide`/`inject` configuration.
- Design the overall framework now, deliver it in phases:
  - v1.0: react-markdown parity renderer, node components, plugin interoperability, safe defaults, SSR, performance, and the headless core.
  - v1.x: tokens, parts, slots, `regions`, `nodeComponents`, labels, presets, the customization inspector, TOC/search UI, rich code blocks, highlighters, math, Mermaid, and the live editor.
- Make customization a cross-cutting contract with five layers:
  1. **Tokens**: documented CSS custom properties for color, type, spacing, radius, motion, code, math, and Mermaid surfaces.
  2. **Parts**: every structural element exposes a stable `data-vmd-part` attribute, `vmd-` class, and state attribute so it can be styled without wrappers.
  3. **Slots and component overrides**: named slots for regions, a react-markdown-style `components` map keyed by HTML tag, a `regions` map for structural replacement, a `nodeComponents` map for semantic Markdown constructs, and function-based node renderers as values of `nodeComponents`.
  4. **Behavior injection**: pluggable remark pipeline, highlighter, math engine, slug generator, sanitizer, URL transform, link transform, Mermaid renderer, diagnostics formatter, and source/document transforms.
  5. **Presets and headless mode**: shareable presets bundle plugins, tag components, regions, node components, labels, tokens, and injected behavior; headless composables allow a completely custom UI with no preset markup.
- Introduce a plugin system as the primary behavioral extension mechanism. Plugins can contribute remark/rehype plugins, transform the document model, register node components (including function renderers) and Vue components, contribute labels and defaults, and manage lifecycle resources.
- Ship built-in features as official plugins (TOC, code highlighting, Mermaid, math, search, custom tags, GFM, frontmatter) and provide a default plugin preset used by the preset components.
- Define a complete node-component catalog. Every renderable Markdown node maps to an exported component with a documented default implementation, including paragraph, heading, emphasis, strong, strikethrough, link, image, list, list item, blockquote, horizontal rule, table family, code, math, Mermaid, footnote, task list, raw HTML, and custom tags. Text nodes use a fast path and do not instantiate a component each.
- Add first-class KaTeX support as an official opt-in math plugin built on `remark-math` + `rehype-katex`, with a `MarkdownMath` node component, MathML accessibility output, error fallback, optional styles, and an injectable engine for later releases.
- Make syntax highlighting adapter-driven. highlight.js is the default synchronous adapter, integrated as a rehype transform and as a standalone API; Shiki is an official optional adapter built on `@shikijs/rehype`. The source text, copy behavior, line numbers, and layout are owned by the components rather than the highlighter.
- Add official optional plugins for GFM (`remark-gfm`) and frontmatter (`remark-frontmatter`), and document admonitions/callouts as a plugin recipe rather than hardcoding a house style.
- Add a configuration provider for app-wide defaults, with deterministic override precedence: local props > nearest provider > preset > plugin defaults > built-in defaults; region rendering: slot > `regions` override > plugin contribution > preset > built-in; node rendering: `nodeComponents` function > `nodeComponents[tag]` > `components[tag]` > `nodeComponents[kind]` > plugin node component > preset > built-in.
- Make rendering SSR-safe by removing DOM dependencies from the core, producing deterministic heading IDs, and deferring browser-only features (Mermaid, CodeMirror, virtual scrolling measurement) until mount.
- Enforce safe defaults: raw HTML dropped by default and enabled only through `rehype-raw`, URL/attribute allowlisting, a react-markdown-compatible `urlTransform` hook, element allow/deny filtering, a host-supplied sanitizer hook, strict Mermaid security, and KaTeX trust disabled.
- Make performance a first-class requirement: `shallowRef`/`markRaw` document state, parse memoization keyed by source and pipeline identity, no re-parse when only presentation props change, a text-node fast path, stable keys, lazy heavy engines, and benchmark budgets enforced in CI.
- Add a library build with ESM output, TypeScript declarations, and entries for the root, headless API, pipeline, plugins, presets, node components, highlighter adapters, math, individual components, and styles.
- Add a demo application, automated unit/component/SSR tests, react-markdown parity fixtures, CommonMark/GFM conformance fixtures, security fuzz fixtures, a customization cookbook, performance benchmarks, and a bundle-size guard.
- Remove internal-only components (`AiChat`, `DirectoryTree`, `Drawer`, `LoadingIndicator`, reference/field/db-reference tags) from scope.

## Release Phasing

| Phase | Scope | Capabilities |
| --- | --- | --- |
| **v1.0** | react-markdown parity renderer in Vue, remark pipeline, `components`, filtering, URL transform, raw-HTML rules, plugin interoperability, SSR, security, performance | `markdown-rendering`, `remark-pipeline`, `node-components` (core catalog), `plugin-system` (core contract), `headless-composables` (core), `customization` (tag map, provider, tokens), `library-packaging`, `security-and-trust`, `performance` |
| **v1.x** | Full customization suite, rich code blocks, highlighters, math, Mermaid, editor, TOC/search UI, presets, demo inspector | `code-blocks`, `syntax-highlighting`, `math-rendering`, `mermaid-rendering`, `mermaid-editing`, remaining `customization` and `node-components` surface |
| **Post-v1** | Streaming, SSR streaming, additional adapters, Nuxt module | Future enhancements |

Specifications for v1.x capabilities are written now to lock the framework contracts. Tasks are grouped by phase so the first implementation stays a faithful clone.

## Future Enhancements (post-v1)

- **Incremental Markdown streaming**: partial-fence handling, pending Mermaid diagrams, outer-fence unwrapping, and a streaming plugin. This is deliberately excluded from the first release and will be designed as an additive plugin and renderer mode without changing the core model.
- **SSR streaming**: streaming server rendering remains out of scope for v1.
- **Additional parser pipelines**: a markdown-it-based custom pipeline can be implemented through the custom pipeline contract; it is not shipped or used by default.
- **Nuxt module, Prism adapter, publishing automation, and marketplace packaging**: candidate follow-ups after the core library and customization contracts stabilize.

## Capabilities

### New Capabilities

- `markdown-rendering`: Markdown-to-document-model rendering, react-markdown-aligned tag component mapping, element allow/deny filtering, URL transformation, composed renderer structure, anchors and TOC, links, raw-HTML safety, search, custom tags, plugin integration, failure resilience, events, and accessibility.
- `code-blocks`: fenced code presentation, injectable highlighting through official highlight.js and Shiki adapters, copy/download actions, customization slots, and theming. (v1.x)
- `syntax-highlighting`: standalone source highlighter with the shared adapter contract, official adapters, themes, line numbers, highlighted lines, truncation, virtual scrolling, and delayed rendering. (v1.x)
- `mermaid-rendering`: lazy Mermaid rendering, injectable renderer, last-good retention, view switching, zoom/pan, fullscreen, copy, and PNG export. (v1.x)
- `mermaid-editing`: live Mermaid source editing, debounced preview, injectable diagnostics, split layout, and fullscreen. (v1.x)
- `plugin-system`: plugin contract, registration and ordering, remark/rehype contributions, document transforms, lifecycle, built-in plugin composition, and error isolation.
- `remark-pipeline`: the unified/remark/rehype pipeline, hast normalization, `remarkPlugins` / `rehypePlugins` / `remarkRehypeOptions`, GFM and math integration, custom pipeline injection, async parsing, and conformance testing.
- `node-components`: the exported component catalog for every renderable Markdown node, default implementations, fast-path rules, tag and kind override precedence, and rendering performance.
- `math-rendering`: inline and block KaTeX rendering through `remark-math` + `rehype-katex`, injectable math engine, delimiter configuration, error fallback, MathML accessibility, and optional lazy loading. (v1.x)
- `headless-composables`: public composables and document-model types for building custom Markdown UIs without preset markup.
- `customization`: the cross-cutting contract for tokens, parts, slots, tag/region/node component overrides, behavior injection, labels, locales, presets, provider precedence, and unstyled usage.
- `library-packaging`: build outputs, public entries, dependency and tree-shaking contract, SSR compatibility, react-markdown migration guide, demo, tests, and documentation.
- `security-and-trust`: threat model, no-`v-html` rendering, raw-HTML and sanitizer contract, URL and data-URL policy, trusted-engine output handling, CSP/Trusted Types guidance, plugin trust boundaries, and security tests.
- `performance`: Vue reactivity strategy, parse and render memoization, text fast path, render budgets, SSR performance, lazy loading, benchmark methodology, and CI regression gates.

### Modified Capabilities

None. `openspec/specs/` is empty, so every capability is introduced by this change.

## Impact

- **New project scaffolding**: `package.json`, TypeScript configs, library and demo Vite configs, `src/core`, `src/vue`, `src/components`, `src/plugins`, `src/presets`, `src/styles`, `demo/`, and `tests/`.
- **Runtime dependencies**: `unified`, `remark-parse`, `remark-rehype`, `hast-util-*`, `unist-util-visit`, `github-slugger`, and `rehype-sanitize`/`hast-util-sanitize` for the default pipeline. `remark-gfm`, `remark-math` + `rehype-katex`, `rehype-raw`, `remark-frontmatter`, `rehype-highlight`, and `@shikijs/rehype` are official optional entries or plugins. `highlight.js` backs the default highlighter adapter. `katex`, `mermaid`, and CodeMirror packages are lazy/optional. `vue` is a peer dependency. No `markdown-it` and no `htmlparser2` in the default path. No icon library dependency; built-in icons are inline SVG and replaceable.
- **Public API**: headless composables, core models, node components, tag/region/node override maps, `defaultUrlTransform`, plugin and preset types, six preset components, exported subcomponents, style tokens, and subpath entries. The API is redesigned rather than mirrored from the reference, with react-markdown parity as the v1.0 baseline.
- **Reference source**: used to confirm behavior and edge cases only. Its component boundaries, props, class prefix, and internal business extensions are not carried over.
- **Out of scope**: AI chat, directory tree, drawer, loading indicator, business tag components, SSR streaming, a Nuxt module, publishing automation, and marketplace packaging.
- **Assumptions**: package name is a placeholder until npm availability is verified; class prefix is `vmd-`; raw Markdown input uses a `source` prop or default slot; target is Vue 3.5+, Vite 7+, and Node 20+; styling is CSS-variable based with no Tailwind/UI-framework dependency; KaTeX support is opt-in through the official math plugin with `$...$` and `$$...$$` as default delimiters; the unified/remark/rehype pipeline is the default and only official parser in v1.0; highlight.js is the default highlighter and Shiki is an official optional adapter.
