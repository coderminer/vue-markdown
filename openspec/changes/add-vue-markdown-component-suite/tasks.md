# Tasks

## 1. v1.0 Foundations and architecture

- [x] 1.1 Create `package.json` with the library name, `"type": "module"`, Vue 3.5+/Vite 7+/Node 20+ ranges, `vue` as a peer dependency, runtime and dev dependencies, and scripts for `dev`, `build`, `build:lib`, `build:demo`, `test`, `typecheck`, `lint`, and `size`; verify `npm install` completes and every script is listed.
- [x] 1.2 Add `tsconfig.json`, `tsconfig.node.json`, `env.d.ts`, and the demo Vite config with the Vue plugin and `demo/` root; verify `npm run dev` serves the shell and `npm run build:demo` produces output.
- [x] 1.3 Add the library Vite config with root, headless, pipeline, plugins, node-components, and per-component entries, CSS extraction, and declaration generation; verify `npm run build:lib` emits JS, `.d.ts`, and CSS for placeholder entries.
- [x] 1.4 Configure Vitest with separate Node and happy-dom projects, add `@vue/server-renderer`, and create smoke tests for pure core code, a mounted Vue component, and a server-rendered component; verify `npm test` passes.
- [x] 1.5 Create the style foundation: token files with defaults, no global element/body rules, `vmd-` class convention, and `data-vmd-part` convention; verify importing the stylesheet does not change demo chrome.
- [x] 1.6 Define the v1.0 part-name and token-name constants used by the core node components, and verify the renderer emits only documented parts and classes.
- [x] 1.7 Write `AGENTS.md` documenting the layered architecture, dependency direction, customization rules, plugin rules, pipeline rules, performance rules, commands, and the no-business-logic boundary; verify it matches the implemented scripts and folders.

## 2. v1.0 Core model, pipeline, and security

- [x] 2.1 Define the public core types: `MarkdownNode`, `MarkdownDocument`, `TocItem`, `MarkdownDiagnostic`, `SourceRange`, `MarkdownPipeline`, `PipelineResult`, `PipelineCapabilities`, `PluginContext`, and the customization maps; verify a type-only consumer can import them without Vue or DOM types.
- [x] 2.2 Implement the official pipeline with `unified`, `remark-parse`, and `remark-rehype` using `allowDangerousHtml: true`, and consume hast directly; verify a mixed CommonMark document produces the expected model with no HTML string round-trip.
- [x] 2.3 Implement the documented stage order: library remark plugins, host `remarkPlugins`, `remark-rehype`, optional `rehype-raw`, `rehype-sanitize`, library rehype plugins, host `rehypePlugins`; verify a host rehype plugin runs after library slug/TOC output and sanitization runs immediately after `rehype-raw`.
- [x] 2.4 Implement hast normalization into text, element, code, custom, and plugin nodes with stable keys, safe attributes, and source ranges where available; verify serialization contains no hast, mdast, unist, or pipeline instances.
- [x] 2.5 Implement raw HTML handling: drop `raw` nodes by default, honor `skipHtml`, and sanitize with `rehype-sanitize` only when the host adds `rehype-raw`; verify default drop, `skipHtml`, and sanitized-HTML scenarios.
- [x] 2.6 Implement the core safety checks: tag/attribute allowlists, `on*` removal, URL scheme validation, and image data-URL policy that rejects `data:image/svg+xml`; verify script tags, event handlers, `javascript:`, `vbscript:`, `data:text/html`, and SVG data URLs.
- [x] 2.7 Implement the document model builder: heading identifiers, TOC extraction, custom-tag inventory, frontmatter metadata slot, pipeline identity, and plugin names; verify nested structures, duplicate headings, and empty input.
- [x] 2.8 Implement search segmentation over text nodes with case sensitivity and regex escaping, without altering element structure or link destinations; verify match metadata and empty-query behavior.
- [x] 2.9 Implement element filtering on the normalized model: `allowedElements`, `disallowedElements`, `unwrapDisallowed`, and `allowElement`, running after sanitization and before rendering; verify allow/deny, unwrap, predicate rejection including falsy returns, and conflicting-list diagnostics.
- [x] 2.10 Implement `urlTransform` for every URL-bearing attribute and export `defaultUrlTransform` with the react-markdown-compatible protocol set; verify replacement, `null` removal, thrown/non-string fallback, revalidation of transformed output, safe protocols, and relative URLs.
- [x] 2.11 Implement `baseUrl` resolution for relative links and images, `idPrefix` for heading IDs, and opt-in hash scrolling via `scrollToHeading`; verify resolved URLs, prefixed IDs, duplicate handling, and no hash side effects when disabled.
- [x] 2.12 Add the custom pipeline contract and validation: `process`, optional `processSync`, optional `dispose`, capability declaration, invalid-result reporting, and fallback to the official pipeline; verify a custom pipeline and an invalid pipeline.
- [x] 2.13 Implement `process` as the default async path and `processSync` when every plugin is synchronous, with pending status, last-good retention, coalescing, and stale-result rejection; verify out-of-order completion and SSR.
- [x] 2.14 Add the explicit static HTML export helper using `rehype-stringify` after the same pipeline; verify export matches sanitized rendered nodes and the render path never calls `rehype-stringify`.

## 3. v1.0 Plugin contract and headless core

- [x] 3.1 Implement `defineMarkdownPlugin` with typed options and contexts, required unique names, phase hints, remark/rehype contributions, `remarkRehypeOptions`, source/document transforms, and validation; verify valid and invalid plugins.
- [x] 3.2 Implement the per-instance plugin registry with pre/normal/post phases, deterministic registration order, duplicate-name reporting, reconfiguration, and an inspectable resolved order; verify ordering and duplicate tests.
- [x] 3.3 Implement plugin contributions for node components, tag components, region components, labels, and tokens, wired into the documented precedence; verify explicit local overrides beat plugin contributions.
- [x] 3.4 Implement plugin lifecycle with `effectScope`: setup, cleanup on unmount, cleanup on reconfiguration, and SSR-safe setup; verify listeners and timers are removed and setup runs once per plugin.
- [x] 3.5 Implement plugin error isolation with plugin name and stage reporting, last-good document preservation, and repeated-failure loop prevention; verify failing remark/rehype plugins and transforms do not break unrelated plugins.
- [x] 3.6 Implement the v1.0 built-in plugins: `tocPlugin`, `codePlugin` (code-node construction only), `linkPlugin`, `searchPlugin`, and `customTagsPlugin`; verify each can be enabled or disabled independently.
- [x] 3.7 Implement the opt-in official plugins `gfmPlugin` (`remark-gfm`) and `frontmatterPlugin` (`remark-frontmatter`), and the `fullPlugins` set; verify GFM tables/task lists/strikethrough and frontmatter extraction.
- [x] 3.8 Implement `useMarkdownDocument` with shallow-reactive source/options, pipeline support, plugin support, tag/region/node component maps, filtering, URL transform, `remarkPlugins` / `rehypePlugins` / `remarkRehypeOptions`, document/TOC/diagnostics/status/pipeline identity, and update/refresh actions; verify a headless host can render the model without preset components.
- [x] 3.9 Implement parse memoization keyed by source, pipeline identity, ordered plugin identities, and parse-affecting options; verify a cache hit, invalidation on plugin change, and no re-parse for presentation-only changes.
- [x] 3.10 Implement TOC, active-heading, and search utilities that avoid listeners before mount; verify active-item updates with a mocked observer and cleanup on unmount.
- [x] 3.11 Export the headless entry and verify a consumer can import types and composables without resolving any preset component, CSS, highlighter, Mermaid, or editor module.

## 4. v1.0 Vue renderer and react-markdown parity

- [x] 4.1 Implement the node resolver with the documented precedence: function value in `nodeComponents` > `nodeComponents[tag]` > `components[tag]` > `nodeComponents[kind]` > plugin > preset > built-in; verify resolution, same-key, tag-vs-kind, and fenced-code exception tests.
- [x] 4.2 Implement core block node components: `MarkdownParagraph`, `MarkdownHeading`, `MarkdownList`, `MarkdownListItem`, `MarkdownBlockquote`, `MarkdownHorizontalRule`, and `MarkdownTable` with section, row, and cell components; verify semantics, alignment, nested lists, and heading IDs.
- [x] 4.3 Implement core inline node components: `MarkdownEmphasis`, `MarkdownStrong`, `MarkdownStrikethrough`, `MarkdownLink`, `MarkdownImage`, `MarkdownInlineCode`, and `MarkdownBreak`; verify link safety, image fallback, and inline-code escaping.
- [x] 4.4 Implement the text fast path so text sequences do not instantiate one component each, while search segments still render correctly; verify output equivalence and component-count bounds.
- [x] 4.5 Implement `MarkdownHtml` (default drop, sanitized nodes when raw HTML is enabled) and `MarkdownCustomTag` (host component mapping with normalized props and click payloads); verify both paths.
- [x] 4.6 Implement exported subcomponents `MarkdownRoot`, `MarkdownContent`, `MarkdownToc`, `MarkdownTocItem`, `MarkdownError`, `MarkdownEmpty`, and `MarkdownLoading`; verify each mounts and renders independently.
- [x] 4.7 Compose `MarkdownRenderer` with typed props, events, slots, exposed actions, and the default plugin preset; verify defaults, `source` prop, default slot, and `v-model:source`.
- [x] 4.8 Implement the react-markdown-compatible `components` map, including string tag replacements, supported tag coverage, and plugin-introduced tags; verify `h1: 'h2'`, `a: MyLink`, `pre` wrapping `code`, and `code` overrides for inline and fenced code.
- [x] 4.9 Implement element filtering in the renderer with `allowedElements`, `disallowedElements`, `unwrapDisallowed`, and `allowElement`; verify allow/deny, unwrap, predicate including falsy rejection, and conflicting-list behavior.
- [x] 4.10 Implement `urlTransform`, `linkTarget` defaulting to `_self`, opt-in `externalLinkTarget="_blank"` with `rel="noopener noreferrer"`, image handling, `skipHtml`, and custom tags; verify security, target, and click tests.
- [x] 4.11 Implement heading IDs, TOC building, active-section tracking, TOC placement, signature-gated `toc-change`, and heading links; verify duplicate, level-filtering, navigation, and accessibility tests.
- [x] 4.12 Implement v1.0 events and actions: `update:source`, `toc-change`, `link-click`, `custom-tag-click`, `render-error`, `ready`, `scrollToHeading`, `getDocument`, `getToc`, and `refresh`; verify each event payload and action.
- [x] 4.13 Implement failure resilience: last-good document retention, error events, and a replaceable error region; verify pipeline and plugin failure and recovery tests.
- [x] 4.14 Implement search highlighting through the search plugin and allow the match renderer to be overridden; verify markup preservation and custom match rendering.
- [x] 4.15 Add react-markdown parity fixtures for tag overrides, allow/deny filtering, unwrap, URL transform, skipHtml, source/default-slot input, and async behavior; verify each documented example.

## 5. v1.0 Performance, SSR, and security verification

- [x] 5.1 Implement `shallowRef`/`markRaw` document state and atomic replacement; verify the document is not wrapped in a deep `reactive()` proxy and host components/plugins are not proxied.
- [x] 5.2 Implement stable keys and per-tag/kind component resolution caching; verify appending content does not remount unchanged subtrees.
- [x] 5.3 Add the benchmark harness for initial render, re-render with unchanged source, re-render with changed source, and a large document; record reference timings as sanity checks.
- [x] 5.4 Add a performance report identifying parse time, render time, component count, and entry size; treat it as a sanity check that surfaces large regressions rather than a gate for every change.
- [x] 5.5 Add SSR smoke tests for `MarkdownRenderer` and the static shells; verify no browser globals, deterministic IDs, stable markup, and matching client structure.
- [x] 5.6 Verify `processSync` produces complete static content when all plugins are synchronous, and async plugins follow their documented server fallback.
- [x] 5.7 Add the security fixture suite: unsafe protocols, event handlers, raw HTML, `skipHtml`, sanitizer ordering, `data:` URLs including SVG, custom tags, plugin bypass attempts, and a malformed HTML/Markdown fuzz corpus.
- [x] 5.8 Document CSP and Trusted Types guidance and verify the default render path requires no inline script or `eval`.

## 6. v1.0 Packaging, docs, and demo

- [x] 6.1 Create and export root, headless, pipeline, plugins, node-components, and per-component entries with public types; verify each entry imports independently in a type-checked consumer module.
- [x] 6.2 Finalize `package.json` exports, `sideEffects`, peer ranges, optional peer metadata, the `browserslist` baseline, and Vite `build.target`/`cssTarget`; verify `npm pack` contains the expected files, resolves from a temporary consumer project, and the build stays within Chrome/Edge 87+, Firefox 78+, Safari 14.1+, and iOS 14.5+.
- [x] 6.3 Implement the bundle-size guard and verify Mermaid, CodeMirror, Shiki, and KaTeX stay out of entries that do not use them.
- [x] 6.4 Write `README.md` and guides for styled usage, headless usage, the official pipeline, custom pipeline authoring, `remarkPlugins` / `rehypePlugins`, CommonMark/GFM, raw-HTML security, SSR, and a react-markdown migration guide; verify every documented API exists in the build.
- [x] 6.5 Build the v1.0 demo per the Appendix B structure: playground, CommonMark, GFM, components, filtering, URL transform, raw HTML, plugin, headless, migration, and SSR sections, each importing through public entries; verify `npm run dev` and `npm run build:demo`.
- [x] 6.6 Add a react-markdown migration table covering `components`, `allowedElements`, `disallowedElements`, `unwrapDisallowed`, `allowElement`, `urlTransform`, `skipHtml`, `remarkPlugins`, `rehypePlugins`, `children`, `MarkdownAsync`, and `MarkdownHooks`; verify each row has a working Vue example and a test.
- [x] 6.7 Add CommonMark and GFM conformance fixtures and track 100% pass counts; verify the suite fails on a newly broken fixture.
- [x] 6.8 Run `npm run typecheck`, `npm test`, `npm run build`, the size guard, and the benchmark; verify all pass.

## 7. v1.x Customization suite

- [ ] 7.1 Implement `tokens.css` with the documented color, type, spacing, radius, motion, code, math, and Mermaid tokens; verify defaults apply and ancestor overrides inherit into nested components.
- [ ] 7.2 Implement `light`, `dark`, `auto`, and `custom` theme modes through `data-vmd-theme` and `prefers-color-scheme`; verify auto mode follows the media query and custom mode applies no preset colors.
- [ ] 7.3 Implement the customization manifest type and registry, publish manifests for every public component, and make the manifest validator compare declared parts, slots, and labels with rendered output.
- [ ] 7.4 Implement the labels system with defaults, string/function values, context-aware rendering, and merge behavior; verify every built-in control has an override test.
- [ ] 7.5 Add CJK coverage for line breaking, spacing, and heading IDs, and add print and forced-colors checks; verify the documented scenarios.
- [ ] 7.6 Implement `MarkdownConfigProvider` with nested merging and provide/inject for theme, tokens, labels, tag components, region components, node components, plugins, pipeline, highlighter, math engine, and other behavior; verify local > provider > preset > plugin > default precedence.
- [ ] 7.7 Implement named slots with scoped contexts and actions for renderer, code, highlighter, math, Mermaid, and editor regions; verify a slot fully replaces its region and receives functional actions.
- [ ] 7.8 Implement the typed `regions` map for root, content, TOC, TOC item, code block, Mermaid block, error, empty, and loading; verify local override wins and receives the same props as the default.
- [ ] 7.9 Implement the typed `nodeComponents` map including function renderers, `defaultRender` decoration, and the fenced-code exception; verify decorated links keep safety and overridden headings keep stable IDs and TOC behavior.
- [ ] 7.10 Implement behavior injection for pipeline, highlighter, math engine, slugger, URL transform, Mermaid renderer, and diagnostics formatter with validation and fallback; verify custom slugger uniqueness and invalid adapter fallback.
- [ ] 7.11 Implement `defineMarkdownPreset` and `composePresets` with plugins, components, labels, tokens, theme, and injected behavior; verify presets are scoped, inspectable, and compose deterministically.
- [ ] 7.12 Implement unstyled and headless modes so behavior and accessibility do not depend on CSS; verify components work with no stylesheet and headless markup can be fully custom.
- [ ] 7.13 Implement direction-aware layout, reduced-motion handling, and focus-visible guarantees through tokens and documented parts; verify RTL spacing and reduced-motion tests.
- [ ] 7.14 Build the demo customization inspector from component manifests; verify it can change tokens, labels, theme, slots, pipeline, highlighter, tag components, region components, node components, and overrides live without a rebuild.

## 8. v1.x Rich node catalog and content

- [ ] 8.1 Implement `MarkdownTaskItem` with `remark-gfm` state, accessible checkbox semantics, and `task-change`; verify checked, unchecked, and keyboard behavior.
- [ ] 8.2 Implement `MarkdownFootnoteReference` and `MarkdownFootnotes` with ordered notes, back-links, and accessible labels; verify multiple references and missing-note fallback.
- [ ] 8.3 Implement `MarkdownCode`, `MarkdownMermaid`, and `MarkdownMath` delegating node components that remain independently importable; verify delegation and standalone use.
- [ ] 8.4 Extend manifests to the v1.x rich node components, covering parts, slots, labels, and overridable behaviors, and verify the manifest validator covers every catalog entry.
- [ ] 8.5 Add a large-document benchmark that renders the full catalog and reports component counts and render time; verify the text fast path keeps component counts bounded.

## 9. v1.x Code blocks, highlighting, and math

- [ ] 9.1 Implement the highlighter adapter contract with normalized-node output, validation, plaintext fallback, async readiness, caching, and theme mapping; verify custom, async, and invalid adapters.
- [ ] 9.2 Implement the default highlight.js adapter entry with explicit language registration, sync highlighting, escaping, and an optional async load step; verify it is imported only through its own entry.
- [ ] 9.3 Implement the official Shiki adapter entry with optional peers, async preload of themes and languages, content or full-block nodes, dual light/dark output, on-demand grammar loading, and server plaintext fallback.
- [ ] 9.4 Implement adapter selection by local prop, provider, preset, and default, with inspectable identity and stable source/scroll when switching; verify precedence and switch tests.
- [ ] 9.5 Implement `CodeBlock` with language label, highlighted nodes, copy, download, action descriptors, events, and custom actions; verify success, failure, hidden actions, and custom action tests.
- [ ] 9.6 Implement `VueSyntaxHighlighter` with the shared adapter, language selection, themes, tokens, line numbers, highlighted lines, truncation, virtual scrolling, delayed highlighting, and empty input; verify the documented scenarios.
- [ ] 9.7 Implement `mathPlugin` with `remark-math` + `rehype-katex`, inline `$...$`, display `$$...$$`, delimiter options, escaped delimiters, code exclusion, and unmatched-delimiter fallback.
- [ ] 9.8 Implement the `MathEngine` contract and the default KaTeX entry with `htmlAndMathml`, `throwOnError: false`, `trust: false`, safe strictness, readable fallback, caching, and async readiness.
- [ ] 9.9 Implement `MarkdownMath` with inline/display modes, MathML or accessible text, error slot, math slot, and override support; verify accessibility, slots, and override tests.
- [ ] 9.10 Add the optional math stylesheet entry and verify math remains readable without it; add `math-error` diagnostics.

## 10. v1.x Mermaid rendering and editing

- [ ] 10.1 Implement the lazy Mermaid runtime loader with one module instance, `securityLevel: 'strict'`, theme initialization, render queue, unique IDs, SVG-to-node parsing, sanitization, and error classification.
- [ ] 10.2 Implement the injectable Mermaid renderer contract and validation; verify a custom renderer bypasses the default runtime, unsafe output is sanitized, and invalid output preserves the last-good diagram.
- [ ] 10.3 Implement `MermaidBlock` with typed props, events, preview/source switching, pending state, last-good retention, opt-in errors, zoom/pan, fullscreen, copy, PNG export, and recovery.
- [ ] 10.4 Add Mermaid tokens, parts, slots, labels, CSP guidance, server placeholder, and diagram accessibility metadata.
- [ ] 10.5 Implement `MermaidLiveEditor` two-way binding, external value synchronization, and 300 ms default debounce with coalescing.
- [ ] 10.6 Integrate CodeMirror 6 with a Mermaid language mode, lazy loading, empty-source placeholder, and editor lifecycle cleanup.
- [ ] 10.7 Implement diagnostics with the default formatter, injectable formatter, line mapping, error-line marking, raw-details opt-in, auto-focus opt-in, compact mode, and preserved last-good preview.
- [ ] 10.8 Implement the resizable split with min sizes, initial ratio, keyboard adjustment, reset, and fullscreen with fallback and focus containment.

## 11. v1.x Documentation, demo, and hardening

- [ ] 11.1 Add guides for tokens/parts/slots, regions, node components, presets, behavior injection, highlighter authoring, math setup, Mermaid setup, and the customization cookbook; verify each recipe against the published entries.
- [ ] 11.2 Extend the demo with every preset component, every node component, highlighter switching, math, Mermaid interactions, live editing, and the customization inspector.
- [ ] 11.3 Audit semantics, labels, keyboard paths, focus order, focus-visible styling, and announcements across all components; verify with component tests and a manual keyboard pass.
- [ ] 11.4 Verify RTL layout, reduced-motion behavior, print, forced colors, and token overrides across renderer, code, highlighter, math, Mermaid, and editor components.
- [ ] 11.5 Audit all document-level listeners, observers, body classes, timers, and fullscreen state for unmount cleanup; verify no state leaks after unmount.
- [ ] 11.6 Report bundle size per entry and verify optional engines remain in lazy chunks; the size guard flags heavy engines that leak into core entries.

## 12. Final verification

- [x] 12.1 Run `npm run typecheck` and fix all errors; verify the command exits successfully.
- [x] 12.2 Run `npm test` and confirm coverage of core, pipeline, CommonMark/GFM conformance, react-markdown parity, node catalog, Vue, plugin contract, customization precedence, security, performance, and SSR.
- [x] 12.3 Run `npm run build` (library and demo) and verify both outputs are produced without consumer-impacting warnings.
- [x] 12.4 Run the size guard and the benchmarks; verify reported entry sizes and component counts are reasonable and no heavy engine leaks into a core entry.
- [ ] 12.5 Perform the manual demo checklist: Markdown rendering, TOC, search, custom tags, HTML safety, pipeline switching, headless usage, plugin extension, and component overrides.
- [x] 12.6 Run `openspec validate "add-vue-markdown-component-suite" --strict` and confirm the change validates.
