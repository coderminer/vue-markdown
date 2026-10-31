# Design: General-Purpose, Customizable, Plugin-Driven Vue Markdown Suite

## Context

See `proposal.md` for motivation. The repository starts empty. The reference project at `D:\works\vue-markdown` is treated as behavioral input, not as an implementation template. Its renderer is DOM-dependent, its styling is implicit, and its extension surface is limited to a few props and slots. Reusing those boundaries would prevent the library from delivering its main differentiator: deep customization.

This design starts from four principles — componentization, generalization, customization, and pluginization — and defines the contracts before the components. v1.0 deliberately mirrors `react-markdown`'s implementation model: the same `unified` + `remark-parse` + `remark-rehype` pipeline, the same tag-keyed `components` map, and the same plugin interoperability. The framework is designed for the larger suite, but the first release is a faithful Vue-native clone, not a bundle of every differentiator.

## Goals / Non-Goals

**Goals:**

- Deliver a library where customization is a designed feature with documented layers, deterministic precedence, and machine-readable manifests.
- Match `react-markdown` in v1.0: safe defaults, tag-keyed component overrides, element filtering, URL transformation, remark/rehype interoperability, and asynchronous rendering.
- Use the same rendering model as `react-markdown`: Markdown → mdast → hast → Vue VNodes, with no HTML string round-trip and no browser HTML parser.
- Keep the core DOM-free so the same document model supports client rendering, server rendering, and headless consumers.
- Make plugins the primary behavioral extension seam for parsing, transforms, renderers, labels, and defaults, while keeping TOC, code shape, link policy, and safety as core invariants.
- Provide small preset components composed from exported subcomponents and a complete node component catalog.
- Make syntax highlighting replaceable: highlight.js by default, Shiki as an official optional adapter, custom adapters supported.
- Ship safe defaults without making customization require unsafe opt-outs.
- Make performance a guardrail rather than the headline: Vue-native reactivity, memoized parsing, and a text fast path, with benchmarks used as sanity checks.
- Keep heavy runtimes (Mermaid, CodeMirror, Shiki, KaTeX) and optional plugins out of unrelated bundles.

**Non-Goals:**

- Matching the reference's props, class names, or component boundaries.
- Copying React-specific APIs such as `children`-only input or exposing `hast` nodes as the public override contract. Vue-idiomatic equivalents are used instead.
- Supporting arbitrary untrusted HTML as a first-class use case.
- Shipping `markdown-it` or a second official parser in v1.0. A custom pipeline contract remains available for advanced hosts.
- Incremental Markdown streaming in v1. It is designed as a post-v1 additive plugin and renderer mode.
- SSR streaming, a Nuxt module, publishing automation, or marketplace packaging.
- Visual design systems, Tailwind presets, or a component theme marketplace in v1.
- Implementing a full Markdown parser or a full syntax-highlighting engine in-house.
- Shipping every possible highlighter adapter; official support covers highlight.js and Shiki, with a documented custom contract.

## Design Principles

1. **Customization is the product.** A host should never need to fork a component to change a color, a label, an action, a structural region, a renderer, a pipeline, or a behavior.
2. **Composition over monolith.** The renderer is a small composition of exported subcomponents; every construct maps to a node component.
3. **Plugins are the behavior seam.** Host features and most built-ins are plugins; TOC construction, code shape, link policy, and safety remain core invariants.
4. **Engines are replaceable.** The Markdown pipeline and syntax highlighting are adapters, not assumptions baked into components.
5. **Safe by default.** Raw HTML is off, URLs are filtered, Mermaid is strict, KaTeX trust is off, and plugins are explicitly trusted.
6. **Environment-agnostic core.** Parsing and modeling do not require a browser; browser features activate on mount.
7. **Progressive disclosure.** A one-prop renderer works out of the box; advanced hooks are available but never required.
8. **Style-agnostic.** Tokens and parts make styling predictable; no global CSS, no UI framework dependency.
9. **Accessible by default.** Keyboard, focus, semantics, and announcements are part of the component contract.

## Competitive Benchmark: react-markdown

`react-markdown` is the primary benchmark, not a compatibility target for React code. It establishes the minimum bar for a modern Markdown component:

| Concern | react-markdown | This library |
| --- | --- | --- |
| Rendering model | remark → mdast → hast → React elements | remark → mdast → hast → normalized model → Vue VNodes |
| Default pipeline | unified/remark/rehype | unified/remark/rehype, the same pipeline |
| Component overrides | `components` keyed by HTML tag | `components` keyed by HTML tag, plus `regions` and `nodeComponents` as later layers |
| Plugin model | remark and rehype plugins | `remarkPlugins` / `rehypePlugins` first-class, plus a typed library plugin contract |
| Safe defaults | escapes HTML, safe URL transform, optional `rehype-sanitize` | raw HTML dropped by default, `rehype-raw` opt-in, `rehype-sanitize`, safe URL transform |
| Element filtering | `allowedElements`, `disallowedElements`, `unwrapDisallowed`, `allowElement` | same concepts on the normalized model |
| URL handling | `urlTransform` and `defaultUrlTransform` | `urlTransform` and `defaultUrlTransform` for every URL-bearing attribute |
| Input | `children` string | `source` prop or default slot |
| Async rendering | `MarkdownAsync`, `MarkdownHooks` | async pipeline state with pending, last-good output, and SSR-aware awaiting |
| Styling | unstyled by default | unstyled by default in v1.0; tokens, parts, and themes in v1.x |
| Code blocks | via `components.code` and a third-party highlighter | `components.code` in v1.0; first-class `CodeBlock` and highlighter adapters in v1.x |
| Math | via `remark-math` + `rehype-katex` | the same `remark-math` + `rehype-katex` plugins, wrapped by `mathPlugin` in v1.x |
| Mermaid | via a custom component or plugin | first-class `MermaidBlock` and `MermaidLiveEditor` in v1.x |
| TOC and search | not built in | built-in official plugins in v1.x |
| Incremental streaming | not built in | post-v1 enhancement |
| Headless use | not the primary mode | public composables and a serializable document model |
| SSR | supported | supported with a DOM-free core and deterministic IDs |
| Performance | React element tree per render | Vue shallow-reactive model, parse memoization, text fast path, benchmark sanity checks |

### Parity checklist

- [x] **Safe by default** — no `v-html` for untrusted content, raw HTML dropped by default, safe URL transform, sanitizer, and explicit trust boundaries.
- [x] **Components** — `components` keyed by HTML tag, so `## hi` can render through a host `<h2>` replacement without forking the renderer.
- [x] **Plugins** — `remarkPlugins` / `rehypePlugins` are first-class, plus a typed library plugin contract.
- [x] **Compliant** — 100% of the official CommonMark test suite through `remark-parse`, and 100% of the official GFM fixtures with `remark-gfm` enabled.

### What we adopt

- The unified/remark/rehype pipeline and hast intermediate representation.
- Safe-by-default rendering and an explicit trust boundary for raw HTML.
- Tag-keyed component overrides as the first customization layer a React user learns.
- Element allow/deny filtering with unwrap behavior and an element predicate.
- A single URL transformation hook that applies to links, images, and other URL attributes.
- `remarkPlugins` / `rehypePlugins` / `remarkRehypeOptions` with tuple options and ordered execution.
- CommonMark conformance and GFM support through official remark plugins.
- Async rendering as a first-class state, not a separate component family.
- Unstyled usage and SSR support.

### What we deliberately extend

- `regions` for structural replacement, so a host can replace the TOC, content, error, or loading region without replacing a tag.
- `nodeComponents` for semantic constructs that do not map cleanly to one HTML tag, such as math, Mermaid, footnotes, custom tags, and plugin nodes. Function renderers are values of `nodeComponents`, not a fourth map.
- A typed plugin contract with phases, remark/rehype contributions, document transforms, and cleanup, so built-in features and host features use the same mechanism.
- Highlighter and math engines as replaceable adapters.
- First-class code, math, Mermaid, TOC, and search experiences instead of leaving them to third-party plugins.
- Design tokens, stable parts, presets, manifests, and a live customization inspector.
- A Vue-native performance approach: shallow-reactive model, memoized parsing, text fast path, and benchmark sanity checks.

### What we do differently

- The public override contract is the normalized document model, not `hast`. `hast` is an internal stage; hosts do not need to learn it.
- Input is `source` or the default slot, not a React `children` prop.
- Async behavior is expressed through pipeline status and pending state, so one renderer supports sync and async plugins without a separate `MarkdownAsync` component.
- Vue reactivity is explicit: `shallowRef` for the document, `markRaw` for component maps, immutable replacement, and `effectScope` for plugin lifecycle.
- The library ships styled presets in v1.x but keeps every visual decision in tokens and parts, so unstyled use remains a supported mode.

## Scope Guardrails

v1.0 is deliberately small. It ships only what the react-markdown parity baseline needs:

- The official `unified`/`remark` pipeline, hast normalization, document model, sanitizer, heading IDs, and TOC.
- The `components` tag map, element filtering, `urlTransform`, `skipHtml`, raw-HTML rules, link target policy, and the `baseUrl`/`idPrefix`/`syncHash` options.
- The plugin contract with `searchPlugin` and `customTagsPlugin` as real transforms; `tocPlugin`, `codePlugin`, and `linkPlugin` are exported core invariant markers that cannot be disabled and carry no behavior of their own. Plus opt-in GFM and frontmatter. Highlighter invocation inside the code path is v1.x.
- The headless document composable, `MarkdownRenderer`, the core node catalog, SSR, security, performance, and packaging.

Deferred to v1.x with stable contracts already written: `regions`, `nodeComponents`, slots, presets, manifests, the customization inspector, rich code blocks, highlighters, math, Mermaid, the live editor, and TOC/search UI. Deferred to post-v1: streaming, SSR streaming, extra adapters, and the Nuxt module.

A feature is implemented only when a v1.0 scenario needs it. Advanced hooks stay isolated from the quick-start path, and no abstraction is added without a shipped consumer or a concrete v1.x task.

## Architecture

```
┌────────────────────────────────────────────────────────────────────────────┐
│ Host app / demo                                                            │
│  presets · provider · local props · slots · overrides · injected behavior  │
├────────────────────────────────────────────────────────────────────────────┤
│ Preset layer                                                               │
│  MarkdownRenderer · CodeBlock · VueSyntaxHighlighter ·                     │
│  MermaidBlock · MermaidLiveEditor · node components · subcomponents        │
├────────────────────────────────────────────────────────────────────────────┤
│ Vue adapter layer                                                          │
│  useMarkdownDocument · useMermaid · useFullscreen · useSplitLayout         │
│  MarkdownConfigProvider · node component registry · slots · overrides      │
├────────────────────────────────────────────────────────────────────────────┤
│ Core layer (no Vue, no DOM)                                                │
│  unified pipeline · hast normalizer · document model · sanitizer            │
│  slugger · TOC · search · plugin registry · memoization                    │
├────────────────────────────────────────────────────────────────────────────┤
│ Pipeline and plugin layer                                                  │
│  remark-parse · remark-gfm? · remark-math? · remark-rehype                  │
│  rehype-raw? · rehype-sanitize · rehype-katex? · rehype-highlight?          │
└────────────────────────────────────────────────────────────────────────────┘
```

Dependency direction is strictly downward. Core never imports Vue. The Vue adapter never imports preset components. Presets compose the adapter and core. Optional engines and plugins are isolated entries or dynamic imports so unrelated engines are not bundled.

## Remark Pipeline

### Contract

v1.0 uses the same pipeline as `react-markdown`:

```
source
  → remark-parse (mdast)
  → remark plugins (GFM, math, frontmatter, host plugins)
  → remark-rehype (hast, allowDangerousHtml)
  → rehype plugins (raw HTML, sanitize, slug, math, highlight, host plugins)
  → hast
  → normalized document model
  → Vue VNodes
```

There is no `rehype-stringify` and no HTML re-parse. The core consumes `hast` directly. This removes the HTML round-trip, the `htmlparser2` dependency, and a whole class of parser-output sanitizer bugs.

The advanced injection point is a typed pipeline contract:

```ts
export interface MarkdownPipeline {
  id: string;
  capabilities?: PipelineCapabilities;
  process(source: string, context: PipelineContext):
    | PipelineResult
    | Promise<PipelineResult>;
  processSync?(source: string, context: PipelineContext): PipelineResult;
  dispose?(): void;
}

export interface PipelineResult {
  hast: HastRoot;
  meta?: Record<string, unknown>;
  diagnostics?: MarkdownDiagnostic[];
}

export interface PipelineCapabilities {
  commonmark: boolean;
  gfm: boolean;
  math: boolean;
  rawHtml: boolean;
  frontmatter: boolean;
  customTags: boolean;
}
```

A custom pipeline must return hast and must not construct Vue components. The core owns normalization, sanitization, heading IDs, TOC extraction, and model construction. Custom pipelines are an advanced escape hatch; the official pipeline is the only one shipped in v1.0.

### Official pipeline

The official pipeline is `unified` + `remark-parse` + `remark-rehype`. It is part of the default entry, not an optional peer. `remark-gfm`, `remark-math`, `remark-frontmatter`, `rehype-raw`, `rehype-katex`, and `rehype-highlight` are official optional plugins or entries.

The pipeline is CommonMark-compliant by default. GFM tables, strikethrough, task lists, autolinks, and footnotes require `remark-gfm`; this matches react-markdown's "100% GFM with a plugin" contract. Footnotes are a GitHub extension rather than part of the formal GFM specification, and the documentation says so explicitly.

Soft line breaks follow CommonMark: they become whitespace in the output, not `<br>`. Hosts that want hard breaks add `remark-breaks` through `remarkPlugins`. This is a deliberate parity choice and is documented in the migration guide.

### Plugin order

The documented order is:

1. `remark-parse`.
2. Library remark plugins: `remark-gfm` (when enabled), `remark-math` (when enabled), `remark-frontmatter` (when enabled).
3. Host `remarkPlugins`, in the supplied order, with `[plugin, options]` tuple support.
4. `remark-rehype` with `allowDangerousHtml: true`.
5. `rehype-raw` when raw HTML is enabled.
6. `rehype-sanitize` for raw-HTML content.
7. Library rehype plugins: slug/TOC, math, highlight, custom tags.
8. Host `rehypePlugins`, in the supplied order.
9. Hast capture and model construction.

Library defaults run before host plugins so a host can override or post-process their output. A duplicate addition such as a second `remark-gfm` is detected and reported rather than silently applied twice. A throwing remark or rehype plugin is isolated, reported with its name and stage, and the last successful document is preserved.

### Raw HTML

`remark-rehype` runs with `allowDangerousHtml: true`, so raw HTML survives as `raw` nodes. By default the model builder drops `raw` nodes, matching react-markdown's safe default. `skipHtml` removes them explicitly. A host enables raw HTML by adding `rehype-raw` to `rehypePlugins`; sanitization runs immediately after `rehype-raw` and before trusted transforms. `rehype-raw` is never enabled implicitly by a component prop.

### GFM, math, and frontmatter

- `gfmPlugin` composes `remark-gfm`.
- `mathPlugin` composes `remark-math` + `rehype-katex`; custom engines replace the rehype transform, not the parser.
- `frontmatterPlugin` composes `remark-frontmatter` and exposes parsed frontmatter as document metadata instead of rendering it.
- These are official plugins, not hardcoded pipeline stages.

### Async and SSR

`unified().process` is asynchronous and is the default path. A synchronous `processSync` path is available when every configured plugin is synchronous; it is used for server rendering and for hosts that need immediate output. An asynchronous update reports `pending`, preserves the last successful document, coalesces superseded runs, and ignores stale results. Server rendering uses the synchronous path or awaits the pipeline result before rendering.

## Core Pipeline

```
source
  → source transforms (host / plugins)
  → remark pipeline (mdast → hast)
  → sanitize raw HTML (only when rehype-raw is present)
  → build document model (heading IDs, TOC, code/Mermaid/math/footnote nodes, custom tags)
  → document transforms (plugin phases)
  → search segmentation (search plugin)
  → MarkdownDocument
```

### Why hast normalization

Returning hast from the pipeline gives every plugin a uniform, typed hand-off point without an HTML string round-trip. It is the same intermediate representation react-markdown uses, so remark/rehype plugin behavior is predictable and documented examples transfer directly. The public model remains library-owned and serializable, so hosts are not coupled to hast.

Alternatives considered:

- **HTML string + `htmlparser2`**: the previous design. It adds a parse step, a second HTML parser, and sanitizer edge cases; it also makes plugin interoperability less direct.
- **Direct mdast-to-model conversion**: possible, but then every remark plugin that produces hast-only constructs would need a parallel mapper, and math/highlight plugins would not work as designed.
- **Browser `<template>` parsing**: client-only and unsuitable for SSR or headless Node use.
- **Exposing hast as the public override contract**: maximum power, but it leaks plugin internals and makes the Vue component catalog unstable. Hast stays internal; the normalized model is public.

### Document model

```ts
export type MarkdownNode =
  | { kind: 'text'; key: string; value: string; source?: SourceRange }
  | {
      kind: 'element';
      key: string;
      tag: string;
      attrs: Record<string, string>;
      children: MarkdownNode[];
      source?: SourceRange;
    }
  | {
      kind: 'code';
      key: string;
      code: string;
      language: string;
      highlighted?: MarkdownNode[];
      source?: SourceRange;
    }
  | {
      kind: 'mermaid';
      key: string;
      code: string;
      complete: boolean;
      index: number;
      source?: SourceRange;
    }
  | {
      kind: 'math';
      key: string;
      tex: string;
      displayMode: boolean;
      rendered?: MarkdownNode[];
      source?: SourceRange;
    }
  | {
      kind: 'custom';
      key: string;
      tag: string;
      props: Record<string, unknown>;
      attrs: Record<string, string>;
      children: MarkdownNode[];
      source?: SourceRange;
    }
  | {
      kind: 'plugin';
      key: string;
      type: string;
      payload: unknown;
      children?: MarkdownNode[];
      source?: SourceRange;
    };

export interface MarkdownDocument {
  nodes: MarkdownNode[];
  toc: TocItem[];
  customTags: CustomTagInstance[];
  frontmatter?: Record<string, unknown>;
  plugins: string[];
  pipeline: string;
}
```

The model is immutable, serializable, deterministic, and free of Vue, DOM, mdast, and hast objects. The Vue adapter stores it in a `shallowRef` and replaces it atomically; it is never wrapped in a deep `reactive()` proxy. Component maps and plugin instances are `markRaw`.

## Node Component Catalog

Every renderable construct maps to an exported component. Text nodes use a fast path and do not instantiate a component per text sequence.

| Node / tag | Default component | Notes |
| --- | --- | --- |
| text | fast path | Rendered as text or search segments |
| p | `MarkdownParagraph` | Block paragraph |
| h1–h6 | `MarkdownHeading` | Stable ID, optional anchor link |
| em | `MarkdownEmphasis` | Inline emphasis |
| strong | `MarkdownStrong` | Strong emphasis |
| del | `MarkdownStrikethrough` | Strikethrough |
| a | `MarkdownLink` | Target, rel, external indication, safety |
| img | `MarkdownImage` | Alt, dimensions, lazy/async defaults, fallback |
| ul / ol | `MarkdownList` | Nested list semantics |
| li | `MarkdownListItem` | Task-list state via plugin |
| blockquote | `MarkdownBlockquote` | Optional callout styling via plugin |
| hr | `MarkdownHorizontalRule` | Thematic break |
| table | `MarkdownTable` | Alignment and optional overflow wrapper |
| thead / tbody | `MarkdownTableSection` | Semantic sections |
| tr | `MarkdownTableRow` | Row |
| th / td | `MarkdownTableCell` | Header vs data cell, alignment, `scope` |
| inline code | `MarkdownInlineCode` | Inline code styling |
| code fence | `MarkdownCode` | Delegates to `CodeBlock` and highlighter |
| math | `MarkdownMath` | Inline or display, KaTeX or custom engine |
| mermaid | `MarkdownMermaid` | Delegates to `MermaidBlock` |
| footnote reference | `MarkdownFootnoteReference` | Superscript link to the note |
| footnote section | `MarkdownFootnotes` | Back-links and ordered notes |
| task list item | `MarkdownTaskItem` | Checkbox state from `remark-gfm` |
| raw HTML | element nodes | Renders as normal element components when `rehype-raw` is enabled; `MarkdownHtml` is a standalone export, not the default path |
| custom tag | `MarkdownCustomTag` | Host component mapping |
| plugin node | plugin component | Registered by the plugin |

In v1.0, element tags resolve as `nodeComponents[tag]` > `components[tag]` > built-in. Semantic nodes (`code`, `math`, `mermaid`, `custom`, plugin nodes) resolve through `nodeComponents[kind]` > built-in. Function values in `nodeComponents`, host `nodeComponents`/`regions` props, `defaultRender`, presets, and tag-to-kind aliases are v1.x.

v1.0 ships the core catalog needed for react-markdown parity: text, paragraph, headings, emphasis, strong, strikethrough (with GFM), link, image, lists, list item, blockquote, horizontal rule, table family, inline code, fenced code, break, and raw-HTML fallback. Math, Mermaid, footnote, task-list, and custom-tag components are specified now and shipped in v1.x so their contracts do not change later.

Default components are functional, CSS-independent, SSR-safe, and resolved once per node type rather than per node. A benchmark with a large document guards against component-per-text-node regressions.

## Plugin System

### Contract

```ts
export interface MarkdownPlugin {
  name: string;
  enforce?: 'pre' | 'normal' | 'post';
  remarkPlugins?: PluggableList;
  rehypePlugins?: PluggableList;
  remarkRehypeOptions?: RemarkRehypeOptions;
  transformSource?(source: string, ctx: PluginContext): string;
  transformDocument?(
    document: MarkdownDocument,
    ctx: PluginContext,
  ): MarkdownDocument | void;
  nodeComponents?: Partial<MarkdownNodeComponents>;
  components?: Partial<MarkdownTagComponents>;
  regions?: Partial<MarkdownRegionComponents>;
  labels?: Partial<MarkdownLabels>;
  tokens?: Record<string, string>;
  setup?(ctx: PluginContext): void | (() => void);
  onError?(error: unknown, phase: PluginPhase, ctx: PluginContext): void;
}
```

`defineMarkdownPlugin` provides type inference. Plugin names are required and unique per pipeline; duplicates are reported and resolved by deterministic replacement (last registration wins) for predictable reconfiguration and HMR. A plugin contributes remark/rehype plugins instead of configuring a parser object, so it works with the official pipeline and with custom pipelines that declare the same stages.

### Phases and order

1. `setup` for all plugins, in phase order.
2. `transformSource` in phase order.
3. Collect `remarkPlugins`, `rehypePlugins`, and `remarkRehypeOptions` in phase order.
4. Run the remark pipeline and build the base model.
5. `transformDocument` in phase order.
6. Render; node components resolve through customization precedence.
7. `cleanup` on unmount or reconfiguration, in reverse order.

Within a phase, registration order is preserved. The registry exposes the resolved order for debugging and tests.

### Built-in plugins

| Plugin | Responsibility | Phase |
| --- | --- | --- |
| `tocPlugin` | Core invariant marker: TOC construction is built in and cannot be disabled | marker |
| `codePlugin` | Core invariant marker: fenced-code node construction is built in and cannot be disabled | marker |
| `linkPlugin` | Core invariant marker: link policy and URL transforms are built in and cannot be disabled | marker |
| `mermaidPlugin` | Mermaid nodes and completeness (v1.x) | rehype + model |
| `mathPlugin` | `remark-math` + `rehype-katex` (v1.x) | remark + rehype |
| `searchPlugin` | Case-aware text segmentation | document transform |
| `customTagsPlugin` | Tag-to-component mapping and click payloads | document transform |
| `gfmPlugin` | Tables, strikethrough, task lists, autolinks, footnotes | remark (`remark-gfm`) |
| `frontmatterPlugin` | Frontmatter metadata, removed from output | remark (`remark-frontmatter`) |

Sanitization, URL validation, and the base document model are core invariants, not plugins. A plugin can extend behavior but cannot silently disable unsafe-URL filtering; bypassing it requires an explicit trusted-content option documented as a trust boundary.

`defaultPlugins` includes the three core invariant markers plus search and custom tags. GFM, math, frontmatter, and Mermaid are opt-in official plugins; `fullPlugins` composes them for the demo and hosts that want a batteries-included preset.

### Error isolation

Each hook call is wrapped with plugin identity and phase. A throwing transform reports the error, preserves the last successful document, and lets unrelated plugins continue. The pipeline tracks repeated identical failures to avoid loops.

## Customization Architecture

Customization has five layers, each with a different cost and lifetime.

### Layer 1: Design tokens

Tokens are CSS custom properties with documented names and safe defaults. They are inherited, scoped, and SSR-safe.

```css
--vmd-font-family
--vmd-font-size
--vmd-line-height
--vmd-color-text
--vmd-color-muted
--vmd-color-bg
--vmd-color-surface
--vmd-color-border
--vmd-color-accent
--vmd-color-accent-contrast
--vmd-color-danger
--vmd-color-success
--vmd-space-1 … --vmd-space-6
--vmd-radius-sm / -md / -lg
--vmd-shadow-sm / -md
--vmd-motion-duration
--vmd-motion-easing
--vmd-code-bg
--vmd-code-text
--vmd-code-border
--vmd-code-toolbar-bg
--vmd-math-color
--vmd-math-bg
--vmd-mermaid-bg
--vmd-mermaid-border
--vmd-z-fullscreen
```

Presets can supply token values as inline custom properties on the component root, producing scoped theming without global CSS. `light`, `dark`, and `auto` presets map to `[data-vmd-theme]` selectors; `auto` uses `prefers-color-scheme`.

### Layer 2: Parts

Every structural element gets a stable `data-vmd-part` and a `vmd-` class:

- Renderer: `root`, `toc`, `toc-nav`, `toc-item`, `content`, `error`, `empty`, `loading`
- Nodes: `paragraph`, `heading`, `heading-anchor`, `emphasis`, `strong`, `strikethrough`, `link`, `image`, `list`, `list-item`, `blockquote`, `hr`, `table`, `table-section`, `table-row`, `table-cell`, `inline-code`, `math`, `math-error`, `custom-tag`, `html`
- Code: `code`, `code-header`, `code-lang`, `code-toolbar`, `code-actions`, `code-body`, `code-feedback`
- Highlighter: `highlighter`, `highlighter-header`, `highlighter-body`, `highlighter-gutter`, `highlighter-line`, `highlighter-hidden`, `highlighter-empty`
- Mermaid: `mermaid`, `mermaid-header`, `mermaid-tabs`, `mermaid-actions`, `mermaid-preview`, `mermaid-source`, `mermaid-pending`, `mermaid-error`, `mermaid-fullscreen`
- Editor: `editor`, `editor-pane`, `editor-divider`, `editor-preview`, `editor-diagnostics`, `editor-toolbar`, `editor-fullscreen`

Interactive parts expose `data-state` (`idle`, `success`, `error`, `pending`, `active`) and documented ARIA state. Part and class names are stable within a major version.

### Layer 3: Slots

Each region has a scoped slot. Slots receive data and actions, not opaque internals. Named region slots ship in v1.x; the v1.0 default slot is the Markdown source input described under `MarkdownRenderer`.

```ts
interface MarkdownRendererSlots {
  root?: (ctx: RendererRootContext) => VNodeChild;
  toc?: (ctx: TocSlotContext) => VNodeChild;
  'toc-item'?: (ctx: TocItemSlotContext) => VNodeChild;
  content?: (ctx: ContentSlotContext) => VNodeChild;
  error?: (ctx: ErrorSlotContext) => VNodeChild;
  empty?: (ctx: EmptySlotContext) => VNodeChild;
  loading?: (ctx: LoadingSlotContext) => VNodeChild;
}
```

A slot fully replaces the default region. Empty or absent slots keep the default. Scoped actions let custom markup remain functional.

### Layer 4: Overrides

Overrides have three maps so the react-markdown mental model and the semantic node catalog can coexist.

**Tag components** are the react-markdown-compatible map. Keys are HTML tag names and values are components or tag-name strings:

```ts
interface MarkdownTagComponents {
  [tag: string]: Component | string | undefined;
}
```

```vue
<MarkdownRenderer
  :source="source"
  :components="{ h1: 'h2', a: MyLink, code: MyCode }"
/>
```

Supported keys include `p`, `h1`–`h6`, `em`, `strong`, `del`, `a`, `img`, `ul`, `ol`, `li`, `blockquote`, `hr`, `table`, `thead`, `tbody`, `tr`, `th`, `td`, `pre`, `code`, `br`, and `input`, plus tags introduced by plugins. `components.pre` replaces the fenced-code wrapper and receives the rendered `code` element as its child. `components.code` applies to both inline and fenced code; fenced code receives a `language-*` `className` and the source text as children, matching react-markdown.

**Region components** replace structural regions:

```ts
interface MarkdownRegionComponents {
  root?: Component;
  content?: Component;
  toc?: Component;
  tocItem?: Component;
  codeBlock?: Component;
  mermaidBlock?: Component;
  error?: Component;
  empty?: Component;
  loading?: Component;
}
```

**Node components** replace semantic constructs, including constructs without a one-to-one HTML tag:

```ts
interface MarkdownNodeComponents {
  paragraph?: Component;
  heading?: Component;
  emphasis?: Component;
  strong?: Component;
  strikethrough?: Component;
  link?: Component;
  image?: Component;
  list?: Component;
  listItem?: Component;
  blockquote?: Component;
  horizontalRule?: Component;
  table?: Component;
  tableSection?: Component;
  tableRow?: Component;
  tableCell?: Component;
  inlineCode?: Component;
  code?: Component;
  math?: Component;
  mermaid?: Component;
  html?: Component;
  customTag?: Component;
  [nodeKind: string]: Component | NodeRenderer | undefined;
}
```

**Node renderers** are the function-based advanced escape hatch, expressed as function values in the same map rather than a fourth override map:

```ts
type NodeRenderer = (ctx: {
  node: MarkdownNode;
  key: string;
  children: () => VNodeChild;
  defaultRender: () => VNodeChild;
  context: RenderContext;
}) => VNodeChild;
```

Resolution:

- Regions: slot > `regions` override > plugin region contribution > preset > built-in.
- Nodes (v1.x): function value in `nodeComponents` > `nodeComponents[tag]` > `components[tag]` > `nodeComponents[kind]` > plugin node component > preset > built-in.
- Nodes (v1.0): local `components[tag]` > plugin `nodeComponents[tag]` > plugin `components[tag]` > built-in for element tags. For semantic nodes, a local `components` key for the same name wins, then plugin `nodeComponents[kind]`, then built-in.
- When the same key exists in both `nodeComponents` and `components`, `nodeComponents` wins because it is the explicit typed catalog.
- For fenced code, `nodeComponents.code` is the semantic override for the inner code element and takes precedence over `components.code`; `components.pre` still wraps it.
- A tag override always beats a kind override at the same layer, so `components.a` beats `nodeComponents.link`, while `nodeComponents.a` beats `components.a`.

The resolved maps and the winning override are inspectable for debugging and tests. In v1.0 only the `components` map is public; `regions` and `nodeComponents` land in v1.x with the same precedence rules.

### Layer 5: Behavior injection

Behavior injection replaces logic while retaining UI:

```ts
interface MarkdownHighlighter {
  id: string;
  load?(): Promise<void>;
  languages?: string[];
  loadLanguage?(language: string): Promise<void>;
  highlight(
    code: string,
    language: string,
    options: HighlightOptions,
  ): HighlightResult;
}

interface MarkdownSlugger {
  slug(text: string): string;
}

interface MermaidRenderer {
  id: string;
  render(source: string, options: MermaidRenderOptions): Promise<MermaidRenderResult>;
}

interface MathEngine {
  id: string;
  load?(): Promise<void>;
  render(tex: string, options: MathRenderOptions): MathRenderResult;
}

interface DiagnosticFormatter {
  format(error: unknown, source: string): MarkdownDiagnostic;
}
```

Adapters are validated. Invalid adapters are reported and the default is used. Asynchronous adapters show plain source or readable TeX until loaded; server output uses synchronous adapters or a documented fallback. The custom pipeline contract from the Remark Pipeline section is the parser-level escape hatch. A host sanitizer is supplied as a rehype plugin, so it composes with the normal pipeline instead of replacing a bespoke hook.

v1.0 exposes the pipeline, `urlTransform`, and `slugger` hooks. Highlighter, math, Mermaid, and diagnostic adapters are v1.x additions; the interfaces are fixed now so their components can be built without redesign.

### Labels

All user-facing strings live in a labels object. Values may be strings or functions receiving context.

```ts
interface MarkdownLabels {
  copy: string | ((ctx: { language: string }) => string);
  copied: string;
  copyFailed: string;
  download: string;
  tocLabel: string;
  errorTitle: string;
  retry: string;
  empty: string;
  mathError: string;
  mermaidPreview: string;
  mermaidSource: string;
  mermaidPending: string;
  zoomIn: string;
  zoomOut: string;
  resetZoom: string;
  fullscreen: string;
  exitFullscreen: string;
  // …
}
```

Components never hardcode user-facing text. Provider values merge with defaults, and local props win.

### Provider and precedence

`MarkdownConfigProvider` supplies app-wide tokens, theme, labels, tag components, region components, node components, plugins, pipeline, highlighter, math engine, and injected behavior through provide/inject. Nested providers merge with outer ones.

Deterministic precedence:

- Configuration values: local prop > nearest provider > preset > plugin default > built-in default.
- Region rendering: slot > `regions` override > plugin contribution > preset > built-in.
- Node rendering (v1.x): function value in `nodeComponents` > `nodeComponents[tag]` > `components[tag]` > `nodeComponents[kind]` > plugin component > preset > built-in.
- At the same key, `nodeComponents` wins over `components`; for fenced code, `nodeComponents.code` wins over `components.code`, while `components.pre` remains the wrapper.
- If two plugins contribute the same component, phase order then registration order decides; the resolved registry is inspectable.

### Presets

A preset is a named, declarative bundle of customization:

```ts
interface MarkdownPreset {
  name: string;
  plugins?: PluginInput[];
  components?: Partial<MarkdownTagComponents>;
  regions?: Partial<MarkdownRegionComponents>;
  nodeComponents?: Partial<MarkdownNodeComponents>;
  labels?: Partial<MarkdownLabels>;
  tokens?: Record<string, string>;
  theme?: 'light' | 'dark' | 'auto' | 'custom';
  pipeline?: MarkdownPipeline;
  highlighter?: MarkdownHighlighter;
  mathEngine?: MathEngine;
  mermaidRenderer?: MermaidRenderer;
}
```

Presets contain components, plugin instances, and functions, so they are declarative and inspectable but not JSON-serializable. `defineMarkdownPreset` and `composePresets` make presets shareable and testable. Applying a preset does not mutate global state; token values are applied to the component subtree. The demo’s customization panel edits a preset live. Presets ship in v1.x; v1.0 ships one default preset internally so the public renderer has a stable baseline.

### Headless and unstyled usage

- **Unstyled styled components**: import components without the stylesheet. Classes and `data-vmd-part` remain; behavior and accessibility are unchanged.
- **Headless composables**: use `useMarkdownDocument`, `useMermaid`, and interaction composables to render entirely custom markup.
- **Manifests**: each component exports a manifest of its tokens, parts, slots, labels, components, and behaviors. Docs and the demo inspector read the manifests, and tests assert they match rendered output.

### Customization guardrails

- No customization feature may require patching an internal file or relying on an undocumented DOM structure.
- Security invariants are not customizable away without an explicit trusted-HTML option.
- Advanced hooks are documented separately from the quick-start path.
- Every new public component must ship tokens, parts, slots, and labels; from v1.x it must also ship a manifest entry.
- Parts and classes are stable within a major version; changes require a deprecation path.

## Highlighting

### Adapter contract

```ts
export interface HighlightResult {
  language: string;
  nodes: MarkdownNode[];
  mode?: 'content' | 'block';
  className?: string;
}

export interface HighlightOptions {
  theme?: string;
  colorScheme?: 'light' | 'dark';
  [option: string]: unknown;
}
```

Adapters return normalized model nodes, never an HTML string. `content` nodes are placed inside the code element. `block` nodes replace the block body for engines such as Shiki that require their own wrapper; the component keeps its header, actions, and copy behavior around that block. The pipeline path uses `rehype-highlight` and normalizes its hast output through the same node contract, so standalone and in-document highlighting share one representation.

### Default: highlight.js

The default adapter uses `rehype-highlight` for documents and highlight.js core for the standalone API. It is synchronous, small relative to Shiki, and works during server rendering. The default language set is registered explicitly; unknown languages fall back to plain text. It is isolated in `./highlighters/highlight-js` so headless consumers and custom-adapter consumers do not load it.

### Official optional: Shiki

The Shiki adapter is isolated in `./highlighters/shiki` with optional peer dependencies. It preloads themes and requested languages asynchronously, supports light/dark dual-theme output, and returns full block nodes. Until ready, components show escaped plain source. On the server, asynchronous adapters emit plain source unless the host supplies precomputed output or uses a synchronous Shiki core.

### Selection and precedence

The active highlighter is selected by local prop > nearest provider > preset > built-in default. The resolved adapter identity is inspectable. Switching adapters preserves source, scroll position, and layout.

### Caching and themes

Highlighted output is cached by adapter identity, source, language, theme, and adapter options. The cache is bounded and invalidated by any key change. Container surfaces use library tokens; adapter token colors come from the adapter theme. Shiki dual-theme output follows the component’s `light`, `dark`, or `auto` mode.

### Trust

Adapter output is trusted host code, but it is still structurally validated: only element and text nodes are accepted, and attributes pass the same URL and event-handler checks as document content. Built-in adapters escape source text. Custom adapters are documented as responsible for safe markup. Because output is nodes rather than HTML, no raw-HTML sanitizer is needed to protect highlighter output.

## Math

### Plugin and parsing

Math is provided by the opt-in `mathPlugin`, which composes `remark-math` and `rehype-katex`. It parses `$...$` inline and `$$...$$` display by default. `remark-math` handles escaped delimiters, code exclusion, and unmatched-delimiter fallback, so the library does not reimplement a math tokenizer. Delimiter changes are expressed through the `remark-math` options supported by the plugin. Math ships in v1.x.

### Default engine: KaTeX

The default math engine is KaTeX through `rehype-katex`, isolated in `./math/katex`. It renders with `htmlAndMathml` output, `throwOnError: false`, `trust: false`, and a safe strictness default. Invalid TeX produces a readable fallback and a diagnostic instead of breaking the document. KaTeX CSS and fonts are delivered through an optional math stylesheet entry; without it, TeX fallback remains readable.

### Custom engine

Hosts can replace the rehype transform with a custom `MathEngine` that returns normalized nodes. The engine may load asynchronously; until ready, the component shows readable TeX. Rendering is cached by TeX source, display mode, engine identity, and options.

### Accessibility and security

Display math is exposed as a math region with MathML or equivalent accessible text. Inline math stays in sentence flow without duplicate announcements. Trusted KaTeX commands that inject HTML, URLs, or styles are disabled unless the host explicitly opts in.

### Node component

`MarkdownMath` is the math node component. It receives TeX, display mode, rendered nodes, error state, and engine context; supports replacement, a math slot, and an error slot; and participates in the same node component catalog and precedence as every other construct.

## Vue Adapter and Components

### Shared conventions

- `<script setup lang="ts">` with typed props, emits, and slots.
- `source` for raw Markdown/Mermaid input, `code` for code display, `modelValue` for the editor.
- Events are past-tense or descriptive: `update:source`, `toc-change`, `link-click`, `task-change`, `custom-tag-click`, `search-change`, `copy`, `download`, `render-error`, `math-error`, `ready`, `update:modelValue`.
- No business logic, network calls, persistence, routing, or global state in components.
- Icons are inline SVG with `currentColor`; actions are replaceable through slots and the actions prop.

### Vue idioms

- `provide`/`inject` for the configuration provider; nested providers merge deterministically.
- `shallowRef` and `markRaw` for document and host code; `effectScope` for plugin lifecycle.
- `defineAsyncComponent` and `Suspense` for heavy or host-supplied async components; the renderer's pending state covers pipeline work.
- `onErrorCaptured` at the renderer boundary so a failing node component reports through `render-error` without unmounting the host app.
- `useId` only for client-only controls that need a DOM id; heading IDs stay deterministic and server-safe.
- `Teleport` for fullscreen Mermaid and editor surfaces in v1.x.

### `MarkdownRenderer`

Composes `MarkdownRoot`, `MarkdownContent`, `MarkdownToc`, `MarkdownTocItem`, `MarkdownError`, `MarkdownEmpty`, and `MarkdownLoading`. Public props include `source`, `pipeline`, `plugins`, `disablePlugins`, `preset`, `components`, `regions`, `nodeComponents`, `labels`, `theme`, `tokens`, `highlighter`, `mathEngine`, `slugger`, `transformSource`, `transformDocument`, `toc`, `linkTarget`, `externalLinkTarget`, `baseUrl`, `idPrefix`, `syncHash`, `urlTransform`, `allowedElements`, `disallowedElements`, `unwrapDisallowed`, `allowElement`, `skipHtml`, `remarkPlugins`, `rehypePlugins`, `remarkRehypeOptions`, `showError`, and `as`.

The default slot is an alternative to the `source` prop, so `<MarkdownRenderer>{{ source }}</MarkdownRenderer>` works for hosts migrating from react-markdown's children input. When both are present, `source` wins. The default slot is treated as a raw Markdown string, not as pre-rendered VNodes. `v-model:source` is supported for two-way binding.

It emits `update:source`, `toc-change`, `link-click`, `task-change`, `custom-tag-click`, `render-error`, `math-error`, and `ready`. It exposes `scrollToHeading`, `getDocument`, `getToc`, and `refresh` actions.

v1.0 props are the react-markdown parity set: `source`, `components`, `plugins`/`remarkPlugins`/`rehypePlugins`, `remarkRehypeOptions`, `allowedElements`, `disallowedElements`, `unwrapDisallowed`, `allowElement`, `skipHtml`, `urlTransform`, `linkTarget`, `showError`, and `as`. The remaining props are v1.x surface and are documented here so the API does not churn.

### react-markdown-aligned options

The renderer exposes the following familiar options. They are implemented on the normalized model, not on `hast`.

- `components`: tag-keyed component or tag-name map, as described in the overrides layer.
- `allowedElements` / `disallowedElements`: allow or deny element tags. They are mutually exclusive; supplying both is a reported configuration error and `allowedElements` wins.
- `unwrapDisallowed`: when true, a disallowed element is replaced by its children; otherwise it and its children are removed.
- `allowElement`: predicate receiving a normalized element view, its index, and its parent. It runs after the allow/deny lists and may reject an otherwise allowed element.
- `urlTransform`: receives the URL, the attribute name (`href`, `src`, and other URL-bearing attributes), and the normalized node. Returning a string replaces the URL; returning `null` removes the attribute; returning `undefined` or throwing keeps the sanitized URL and reports a diagnostic.
- `defaultUrlTransform`: exported helper implementing the react-markdown-compatible safe protocol set (`http`, `https`, `irc`, `ircs`, `mailto`, `xmpp`, and relative URLs).
- `skipHtml`: when true, raw HTML nodes are removed entirely. When false, the default behavior drops raw HTML nodes and reports nothing. Raw HTML is rendered only when the host adds `rehype-raw` to `rehypePlugins`; sanitization then runs immediately after it.
- `linkTarget`: defaults to `_self`. `externalLinkTarget="_blank"` is opt-in and adds `rel="noopener noreferrer"`.
- `baseUrl`: resolves relative link and image destinations. `idPrefix`: prefixes generated heading IDs. `syncHash`: updates the URL hash when a heading is activated; all three are opt-in.
- `remarkPlugins` / `rehypePlugins` / `remarkRehypeOptions`: forwarded to the official pipeline in the documented order, with `[plugin, options]` tuple support.
- Async rendering: an async pipeline reports `pending`, preserves the last successful document, and upgrades when ready. This replaces the need for separate `MarkdownAsync` and `MarkdownHooks` component families.

Filtering runs after sanitization and before rendering, so a disallowed element can never bypass URL or attribute safety. Filtering is content shaping, not a substitute for the sanitizer.

### `CodeBlock`

Props: `code`, `language`, `highlightedNodes`, `highlighter`, `theme`, `showActions`, `showDownload`, `fileName`, `actions`, `labels`. Slots: `header`, `toolbar`, `actions`. Emits: `copy`, `download`, `error`. The default actions are descriptors used by both the built-in toolbar and custom action slots. `CodeBlock` ships in v1.x; in v1.0 a fenced block renders as `pre` wrapping `code`, with `components.pre` and `components.code` overridable independently.

### `VueSyntaxHighlighter`

Props: `code`, `language`, `highlighter`, `theme`, `showLineNumbers`, `highlightLines`, `maxLines`, `virtual`, `defer`, `labels`. Slots: `header`, `footer`, `empty`, `actions`. It shares the highlighter adapter and token model with `CodeBlock`.

### `MermaidBlock`

Props: `source`, `theme`, `complete`, `renderer`, `showViewToggle`, `showActions`, `showError`, `validateBeforeRender`, `editable`, `labels`. Slots: `header`, `tabs`, `actions`, `toolbar`, `preview`, `source`, `pending`, `error`. Emits: `copy`, `edit`, `render-error`, `export-error`, `fullscreen-change`.

### `MermaidLiveEditor`

Props: `modelValue`, `debounce`, `theme`, `renderer`, `diagnosticsFormatter`, `showRawDetails`, `autoFocusError`, `initialSplit`, `labels`. Slots: `toolbar`, `editor`, `preview`, `diagnostics`, `empty`, `fullscreen`. Emits: `update:modelValue`, `render-error`, `resize`, `fullscreen-change`.

## Vue Reactivity and Performance

The renderer is designed around Vue 3 primitives rather than a deep reactive tree:

- The document model is immutable. It lives in a `shallowRef` and is replaced atomically; it is never wrapped in `reactive()`.
- Component maps, plugin instances, adapters, and presets are `markRaw` so Vue does not proxy host code.
- Parsing is memoized by source string, pipeline identity, ordered plugin identities, and options. Presentation-only prop changes such as theme, labels, or tokens do not re-parse.
- A single parse run is coalesced; superseded async runs are discarded. The last successful document remains visible while a new one is pending.
- Text nodes render through a fast path and do not instantiate one component per text sequence. Element components resolve once per tag/kind, not per node.
- Keys are stable and derived from node position plus content identity, so list and table updates do not remount unrelated subtrees.
- Plugin setup and teardown run inside an `effectScope`; watchers and resources are disposed on unmount or reconfiguration.
- Heavy engines (Mermaid, Shiki, KaTeX, CodeMirror) load lazily and never enter the initial render path.
- Benchmarks cover initial render, re-render with unchanged source, re-render with changed source, and a large document. They are sanity checks that surface large regressions, not a gate for every change.

The goal is predictable performance without a virtual DOM replacement or a custom scheduler: parse once, render once, and let Vue do what it is good at. Performance is a guardrail, not the headline feature: keep the architecture efficient, but do not block features on marginal wins or optimize speculatively. Bundle size is likewise a sanity check rather than a primary design constraint.

## Server Rendering

- Core, pipeline, and model building use `unified`/`remark` and plain JavaScript objects; no `window`, `document`, or HTML parser is required.
- Heading IDs are deterministic; no random or time-based identifiers in the model.
- `MarkdownRenderer`, `CodeBlock`, `VueSyntaxHighlighter`, and static shells of Mermaid/editor render stable markup on the server.
- Mermaid, CodeMirror, and async highlighter loads are deferred until mount; server output is a placeholder or escaped plain source.
- Virtual scrolling activates after measurement; the server renders non-virtualized markup.
- The synchronous `processSync` path produces full static content when every configured plugin is synchronous; asynchronous plugins follow documented fallbacks.
- SSR tests use `@vue/server-renderer` and compare server/client identifiers.

## Security

- Raw HTML is dropped by default: `remark-rehype` emits `raw` nodes and the model builder discards them. `skipHtml` removes them explicitly. Raw HTML is enabled only by adding `rehype-raw` to `rehypePlugins`, never by a component prop.
- When raw HTML is enabled, `rehype-sanitize` runs immediately after `rehype-raw` and before any trusted transform. The default schema blocks `script`/`style`/`iframe`/`object`/`embed`, strips `on*`, allows safe URL schemes, and allows only non-SVG image data URLs.
- `urlTransform` applies to every URL-bearing attribute and defaults to the exported `defaultUrlTransform`; a host replacement is explicit and documented as a trust decision.
- `allowedElements` / `disallowedElements` / `unwrapDisallowed` / `allowElement` filter content after sanitization; they do not weaken URL or attribute safety.
- A host sanitizer is supplied as a rehype plugin and runs inside the documented pipeline order.
- Plugins are trusted code and receive sanitized nodes by default.
- Mermaid uses `securityLevel: 'strict'`; rendered SVG is parsed into nodes and validated, never injected with `v-html`.
- KaTeX trust is off; trusted commands require explicit opt-in.
- Highlighter, math, and Mermaid adapter output is structurally validated as element/text nodes and cannot introduce event handlers or unsafe URLs.
- Custom renderers, highlighter adapters, and Mermaid renderers are host responsibility; documentation states the boundary.
- Tests cover unsafe links, event handlers, raw HTML, custom tags, pipeline output, `data:` SVG, and plugin bypass attempts.
- Documentation includes CSP and Trusted Types guidance; no inline script is required, and style injection is limited to documented token properties.

## Packaging

- Library build: Vite library mode + `vite-plugin-dts`, ESM output, declaration files, CSS extraction.
- Entries: `.` (styled presets), `./headless`, `./pipeline`, `./plugins`, `./presets`, `./node-components`, `./highlighters/highlight-js`, `./highlighters/shiki`, `./math/katex`, `./components/*`, `./styles/tokens.css`, `./styles/components.css`, `./styles/math.css`, `./style.css`.
- `vue` is external. `unified`, `remark-parse`, `remark-rehype`, `hast-util-*`, `unist-util-visit`, `github-slugger`, and `rehype-sanitize`/`hast-util-sanitize` are default dependencies. `remark-gfm`, `remark-math` + `rehype-katex`, `remark-frontmatter`, `rehype-raw`, `rehype-highlight`, and `@shikijs/rehype` are official optional entries or plugins. Shiki, KaTeX, Mermaid, and CodeMirror are isolated entries or lazy imports. No `markdown-it` and no `htmlparser2` in the default path.
- `sideEffects` marks CSS files so bundlers keep required styles.
- `package.json` declares supported Vue 3.5+, Vite 7+, Node 20+, and the Vue 3 runtime baseline (native ES2016, no IE11; effective Chrome 54+, Edge 15+, Firefox 52+, Safari 10.1+, iOS 10.3+ because a bundled dependency uses `Object.entries` at module initialization), plus an exports map per entry. Runtime APIs stay within ES2016, source syntax may use newer features because the build downlevels it, and the build targets `es2016`. The optional stylesheet currently requires Chrome/Edge 87+, Firefox 78+, Safari 14.1+, iOS 14.5+ because it uses logical properties, `gap`, and `:where()`; unstyled and headless usage follows the runtime baseline.
- A size-guard script fails if Mermaid, CodeMirror, Shiki, or KaTeX enter entries that do not use them.

## Testing Strategy

| Layer | Environment | Coverage |
| --- | --- | --- |
| Core | Node, no DOM | pipeline orchestration, hast normalization, model, sanitization, slug/TOC, search, plugins, element filtering, URL transform |
| Remark pipeline | Node | plugin order, tuple options, raw HTML, async/sync, duplicate detection, error isolation, custom pipeline contract |
| CommonMark / GFM | Node | 100% official CommonMark fixtures and 100% official GFM fixtures with `remark-gfm` |
| react-markdown parity | Node + happy-dom | tag component mapping, allow/deny filtering, unwrap, urlTransform, skipHtml, source/default slot, `v-model:source` |
| Highlighter adapters | Node + happy-dom | default, Shiki-style async, node output, caching, themes, unknown languages, SSR |
| Vue adapter | happy-dom + Vue Test Utils | composables, provider precedence, slots, overrides, labels, events |
| Node components | happy-dom | catalog coverage, resolution, fast path, semantics, overrides |
| Preset components | happy-dom | props, events, slots, parts, actions, Mermaid/editor/math mocked |
| SSR | Node + `@vue/server-renderer` | import safety, stable markup, hydration identifiers |
| Plugin contract | Node + Vue | ordering, duplicates, cleanup, error isolation, contribution precedence |
| Build | Vite + size guard | entries, declarations, CSS, lazy chunks |

Mermaid, CodeMirror, KaTeX, Shiki, and clipboard/fullscreen APIs are mocked at module boundaries. The demo provides manual verification for visual and interaction behavior.

## Risks / Trade-offs

- **Customization surface becomes too large** → Start with the five documented layers, manifest-driven docs, and progressive disclosure; freeze the v1 surface and add hooks only for confirmed use cases. v1.0 ships only `components`, the provider, tokens, and documented parts so the first release stays implementable.
- **Over-design** → Every contract must have a shipped consumer in v1.0 or a concrete v1.x task. Advanced hooks (custom pipeline, node renderers, adapters) are isolated from the quick-start path and have small interfaces.
- **react-markdown parity drifts or becomes a copy of React APIs** → Keep a documented parity matrix, encode react-markdown examples as fixtures, and translate React-specific concepts into Vue-idiomatic equivalents instead of copying `children`/`hast` verbatim.
- **Three override maps confuse hosts** → `components` is the tag map, `regions` is the structural map, `nodeComponents` is the semantic map; one documented precedence, a resolved-override inspector, and conflict tests. Only `components` is public in v1.0.
- **Precedence confusion** → One documented order per region and node, a resolved-registry inspector, and tests for slot/component/renderer conflicts.
- **Plugin conflicts and ordering bugs** → Explicit phases, duplicate detection, deterministic registration order, and contract tests.
- **Pipeline behavior differs from react-markdown** → Pin `remark-parse`/`remark-rehype` versions, run the official CommonMark and GFM suites, and keep a fixture set derived from react-markdown examples.
- **Async pipeline complexity** → Default to `process` with pending state and last-good output; use `processSync` only when all plugins are synchronous; coalesce and discard stale runs.
- **Shiki async/SSR and bundle size** → Isolated entry, optional peers, preload with plaintext fallback, sync-core option for SSR, size guard.
- **Node component performance** → Functional defaults, text fast path, cached resolution, and a large-document benchmark.
- **Raw HTML edge cases** → Raw HTML is off by default; when enabled, `rehype-raw` is followed immediately by `rehype-sanitize`, with tests for malformed HTML, custom tags, tables, and inline/block boundaries.
- **Math delimiter ambiguity and security** → Delegate parsing to `remark-math`, document its escaping and code-exclusion rules, keep trust off by default, and add fixtures.
- **Security regressions through customization** → Core URL/tag filtering cannot be disabled silently; sanitizer plugins are explicit; tests cover bypass attempts.
- **SSR hydration mismatch** → DOM-free model, deterministic IDs, server placeholders for client-only features, SSR smoke tests.
- **Styling collisions** → `vmd-` prefix, `data-vmd-part`, scoped tokens, no global selectors, isolation tests.

## Migration Plan

This is a greenfield library. There is no consumer migration and no change to the reference project. v1.0 is the react-markdown parity baseline; the suite differentiators follow. Deliver in phases:

1. **v1.0 core**: project scaffolding, document model, hast normalization, sanitization, official remark pipeline, `components`, allow/deny filtering, `urlTransform`, `skipHtml`, plugin registry, headless composable, `MarkdownRenderer`, SSR, and tests.
2. **v1.0 hardening**: performance contract, CommonMark/GFM conformance, react-markdown parity fixtures, security fixtures, packaging, and the migration guide.
3. **v1.x customization**: tokens, parts, slots, `regions`, `nodeComponents`, labels, presets, provider expansion, and the demo inspector.
4. **v1.x rich content**: `CodeBlock`, highlighters, math, Mermaid rendering and editing, TOC/search UI, and footnote/task-list components.
5. **v1.x ecosystem**: additional docs, benchmark budgets, and adapter examples.

Rollback is a revert of the change; no persisted data or external services are involved.

## Future Enhancements

- **Incremental Markdown streaming (post-v1)**: add partial-fence handling, pending Mermaid diagrams, outer-fence unwrapping, and a `streamingPlugin`. The core document model and plugin phases are designed so this can be added without breaking the v1 contracts, but no streaming prop, plugin, or task ships in the first release.
- **SSR streaming**: remains out of scope for v1.
- **Additional adapters and integrations**: a markdown-it custom pipeline, a Prism highlighter adapter, and a Nuxt module are additive follow-ups.

## Open Questions

- Final npm package name and scope (the repository name is taken; verify availability before publishing).
- Whether a later release should ship an official Prism adapter and a Nuxt module; both are additive adapters/integrations and do not change the core contracts.
- Whether the default preset should include the math plugin or keep KaTeX opt-in; the current design keeps it opt-in and documents `fullPlugins` for batteries-included usage.
- Whether async highlighters should support server rendering through a precomputed node cache or remain client-only; the current design defaults to plaintext on the server.
- Whether v1.x should expose a stable hast view for advanced plugin authors, or keep hast internal and require normalized-model transforms. The current design keeps hast internal.

## Appendix A: v1.0 API Reference

This appendix is the implementation contract for the first release. It lists only what v1.0 ships; deferred surface is listed at the end.

### `MarkdownRenderer` props

| Prop | Type | Default | Notes |
| --- | --- | --- | --- |
| `source` | `string` | `''` | Markdown input. Wins over the default slot. Supports `v-model:source`. |
| `components` | `MarkdownTagComponents` | `{}` | Tag-keyed overrides; values are components or tag-name strings. |
| `plugins` | `PluginInput[]` | `defaultPlugins` | Replaces the default plugin set when provided. |
| `disablePlugins` | `string[]` | `[]` | Removes named plugins from the resolved set. |
| `remarkPlugins` | `PluggableList` | `[]` | Runs after library remark plugins. |
| `rehypePlugins` | `PluggableList` | `[]` | Runs after library rehype plugins. Adding `rehype-raw` enables raw HTML. |
| `remarkRehypeOptions` | `RemarkRehypeOptions` | `{ allowDangerousHtml: true }` | Merged into the official conversion step. |
| `pipeline` | `MarkdownPipeline` | official | Advanced escape hatch; must return hast. |
| `slugger` | `MarkdownSlugger` | `github-slugger` | Heading ID generator. |
| `allowedElements` | `string[]` | — | Mutually exclusive with `disallowedElements`; wins on conflict. |
| `disallowedElements` | `string[]` | — | Deny list. |
| `unwrapDisallowed` | `boolean` | `false` | Keep the children of a removed element. |
| `allowElement` | `(node, index, parent) => boolean` | — | Runs after the allow/deny lists. |
| `urlTransform` | `(url, key, node) => string \| null \| undefined` | `defaultUrlTransform` | `null` removes the attribute; `undefined` keeps the sanitized URL. |
| `linkTarget` | `string` | `'_self'` | Applied to links. |
| `externalLinkTarget` | `'_self' \| '_blank'` | `'_self'` | `_blank` adds `rel="noopener noreferrer"`. |
| `baseUrl` | `string` | — | Resolves relative URLs before `urlTransform`. |
| `idPrefix` | `string` | `''` | Prefixes generated heading IDs. |
| `syncHash` | `boolean` | `false` | Updates the URL hash on heading activation. |
| `skipHtml` | `boolean` | `false` | Removes raw HTML nodes. |
| `toc` | `boolean` | `false` | Renders the TOC region. |
| `showError` | `boolean` | `false` | Renders the error region on failure. |
| `tokens` | `Record<string, string>` | `{}` | Inline `--vmd-*` custom properties on the root. |
| `as` | `string \| Component` | `'div'` | Root element or component. |

`source` accepts a string. A non-string value reports a diagnostic and renders the empty state instead of throwing.

### Events

| Event | Payload | Notes |
| --- | --- | --- |
| `update:source` | `source: string` | Only for `v-model:source`; emitted when an exposed action changes the source. |
| `toc-change` | `toc: TocItem[]` | Emitted only when the serialized TOC actually changes. |
| `link-click` | `{ url, target, node, event }` | Fired after the default navigation is allowed. |
| `custom-tag-click` | `{ tag, props, node, event }` | Fired for mapped custom tags. |
| `render-error` | `diagnostic: MarkdownDiagnostic` | Fired once per distinct failure. |
| `ready` | `document: MarkdownDocument` | Fired once for the first successful document. |

### Exposed actions

| Action | Signature | Notes |
| --- | --- | --- |
| `scrollToHeading` | `(id: string, options?: ScrollIntoViewOptions) => void` | No-op on the server. |
| `getDocument` | `() => MarkdownDocument \| undefined` | Returns the current immutable document. |
| `getToc` | `() => TocItem[]` | Returns the current TOC. |
| `refresh` | `() => Promise<void>` | Re-runs the pipeline, bypassing the memo cache. |

### Slots

v1.0 has one slot: the `default` slot, treated as raw Markdown source and ignored when `source` is present. Named region slots are v1.x.

### Headless composable

```ts
const {
  document,     // ShallowRef<MarkdownDocument | undefined>
  toc,          // ComputedRef<TocItem[]>
  status,       // Ref<'idle' | 'pending' | 'ready' | 'error'>
  diagnostics,  // Ref<MarkdownDiagnostic[]>
  pipeline,     // ComputedRef<string>
  plugins,      // ComputedRef<string[]>
  refresh,      // () => Promise<void>
} = useMarkdownDocument(source, options);
```

`source` accepts `MaybeRefOrGetter<string>`. `options` accepts the parse-affecting subset of the renderer props: `components`, `plugins`, `disablePlugins`, `remarkPlugins`, `rehypePlugins`, `remarkRehypeOptions`, `pipeline`, `slugger`, `allowedElements`, `disallowedElements`, `unwrapDisallowed`, `allowElement`, `urlTransform`, `linkTarget`, `externalLinkTarget`, `baseUrl`, `idPrefix`, `skipHtml`. Presentation options are not part of the composable.

### Plugin input

```ts
type PluginInput = MarkdownPlugin | false | null | undefined;
```

`false`, `null`, and `undefined` are ignored so conditional composition stays readable. Built-in exports: `defaultPlugins`, `fullPlugins`, `tocPlugin`, `codePlugin`, `linkPlugin`, `searchPlugin`, `customTagsPlugin`, `gfmPlugin`, `frontmatterPlugin`. In v1.0, `tocPlugin`, `codePlugin`, and `linkPlugin` are core invariant markers; `searchPlugin` and `customTagsPlugin` are real transforms.

### Defaults

| Concern | Default |
| --- | --- |
| Raw HTML | dropped |
| URL protocols | `http`, `https`, `irc`, `ircs`, `mailto`, `xmpp`, relative |
| Image data URLs | raster only; `image/svg+xml` rejected |
| Link target | `_self` |
| Soft line breaks | CommonMark whitespace |
| GFM, math, frontmatter, Mermaid | off; opt-in plugins |
| Heading IDs | deterministic, unique, `github-slugger` |
| Sanitizer | `rehype-sanitize` after `rehype-raw` only |
| Async parse | `process`, last-good document retained |

### Entries shipped in v1.0

| Entry | Contents |
| --- | --- |
| `.` | Renderer, provider, core node components, plugins, public types |
| `./headless` | `useMarkdownDocument`, model types, utilities |
| `./pipeline` | Official pipeline, `defineMarkdownPipeline` helper |
| `./plugins` | Built-in plugins and `defineMarkdownPlugin` |
| `./node-components` | Full core catalog and part/token constants |
| `./components/*` | One entry per public component |
| `./styles/tokens.css` | Token defaults |
| `./styles/components.css` | Component styles |
| `./style.css` | Token + component aggregate |

v1.x adds `./presets`, `./highlighters/highlight-js`, `./highlighters/shiki`, `./math/katex`, and `./styles/math.css`.

### Deferred to v1.x

Props: `regions`, `nodeComponents`, `labels`, `theme`, `highlighter`, `mathEngine`, `preset`, `transformSource`, `transformDocument`.
Events: `task-change`, `search-change`, `math-error`, `copy`, `download`, `update:modelValue`.
Components: `CodeBlock`, `VueSyntaxHighlighter`, `MermaidBlock`, `MermaidLiveEditor`, `MarkdownMath`, `MarkdownMermaid`, `MarkdownTaskItem`, `MarkdownFootnoteReference`, `MarkdownFootnotes`, named region slots, and the customization inspector.

## Appendix B: v1.0 Demo Structure

The demo imports only through public entries so it doubles as a packaging test. It is a single page with a sidebar of sections, one source editor, and one output pane per section.

```
demo/
  index.html
  main.ts
  App.vue
  sections/
    PlaygroundSection.vue      source editor + live renderer
    CommonMarkSection.vue      headings, lists, tables, code, links, images
    GfmSection.vue             gfmPlugin on/off comparison
    ComponentsSection.vue      components map: tag strings and components
    FilteringSection.vue       allowed/disallowed/unwrap/allowElement
    UrlTransformSection.vue    default, custom, null-returning transform
    RawHtmlSection.vue         dropped, skipHtml, rehype-raw + sanitize
    PluginSection.vue          custom plugin: remark, rehype, transform, component
    HeadlessSection.vue        useMarkdownDocument with custom markup
    MigrationSection.vue       react-markdown snippets and Vue equivalents
    SsrSection.vue             server string vs client output
  fixtures/
    commonmark.md
    gfm.md
    unsafe.md
  components/
    SectionShell.vue
    SourceEditor.vue
    OutputPane.vue
```

Section-to-contract mapping:

| Section | Verifies |
| --- | --- |
| Playground | source prop, default slot, `v-model:source`, `ready`, `render-error` |
| CommonMark | `remark-pipeline` conformance, soft breaks, heading IDs |
| GFM | `gfmPlugin` on/off, tables, strikethrough, task lists, footnotes |
| Components | `components` map, tag strings, `code`/`pre` behavior |
| Filtering | allow/deny, unwrap, predicate, conflict diagnostic |
| URL transform | `defaultUrlTransform`, replacement, `null`, thrown fallback, `baseUrl` |
| Raw HTML | default drop, `skipHtml`, `rehype-raw` + `rehype-sanitize`, unsafe fixtures |
| Plugin | `defineMarkdownPlugin`, remark/rehype contribution, document transform, cleanup |
| Headless | `useMarkdownDocument`, document model, TOC, status, no preset markup |
| Migration | react-markdown parity rows from the migration table |
| SSR | `processSync`, deterministic IDs, no browser globals |

The demo holds no business logic, network calls, or persistence. Each section owns its fixture and its option state so a reader can copy one section without the rest. The sidebar is generated from a static array, not from a router, which keeps the first release small.
