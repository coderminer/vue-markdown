# remark-pipeline Specification

## Purpose
Defines the official Markdown pipeline: `unified` + `remark-parse` + `remark-rehype`, the same model `react-markdown` uses. Markdown becomes mdast, then hast, then the library's normalized document model and Vue VNodes. There is no HTML string round-trip and no second HTML parser. The pipeline is CommonMark-compliant, GFM-capable through official plugins, interoperable with the remark/rehype ecosystem, and replaceable through an advanced custom pipeline contract.

## Requirements

### Requirement: Official pipeline

The library SHALL use `unified` with `remark-parse` and `remark-rehype` as the default and only official Markdown pipeline in v1.0. The pipeline SHALL produce hast that the core normalizes into the public document model. The default path SHALL NOT use `markdown-it`, `htmlparser2`, `rehype-stringify`, or a browser HTML parser, and SHALL NOT require an HTML round-trip.

#### Scenario: Default parsing
- **WHEN** a host renders Markdown without configuring a pipeline
- **THEN** the document is parsed by `remark-parse`, converted to hast by `remark-rehype`, and rendered through the shared node components

#### Scenario: No HTML round-trip
- **WHEN** a document is rendered
- **THEN** parser output is consumed as hast and no HTML string is generated or re-parsed before model construction

### Requirement: Pipeline stage order

The library SHALL execute stages in a documented, deterministic order: `remark-parse`; library remark plugins; host `remarkPlugins`; `remark-rehype` with `allowDangerousHtml: true`; `rehype-raw` only when raw HTML is enabled; `rehype-sanitize` immediately after `rehype-raw`; library rehype plugins; host `rehypePlugins`; hast capture and model construction. Library defaults SHALL run before host plugins so hosts can post-process them.

#### Scenario: Host plugin runs after library defaults
- **WHEN** a host supplies a rehype plugin that modifies heading elements
- **THEN** it sees the output of the library's slug and TOC stage

#### Scenario: Sanitizer position
- **WHEN** raw HTML is enabled and a host rehype plugin is present
- **THEN** sanitization runs after `rehype-raw` and before the host plugin

### Requirement: remark and rehype interoperability

The renderer and headless API SHALL accept `remarkPlugins`, `rehypePlugins`, and `remarkRehypeOptions` as first-class options. Plugin inputs SHALL support the `[plugin, options]` tuple form. Host plugins SHALL run in the supplied order. A duplicate addition such as a second `remark-gfm` SHALL be reported rather than silently applied twice. A throwing remark or rehype plugin SHALL be isolated, reported with its plugin name and stage, and SHALL NOT break unrelated plugins or discard the last successful document.

#### Scenario: remark plugin
- **WHEN** a host passes a remark plugin through `remarkPlugins`
- **THEN** it runs in the documented order and its mdast output is converted to hast normally

#### Scenario: rehype plugin
- **WHEN** a host passes a rehype plugin through `rehypePlugins`
- **THEN** it transforms hast and the core still normalizes and validates the result

#### Scenario: Plugin options tuple
- **WHEN** a host passes `[plugin, options]`
- **THEN** the pipeline applies those options to that plugin

#### Scenario: Duplicate plugin
- **WHEN** a host adds a plugin already registered by a library plugin
- **THEN** the duplicate is reported and the pipeline does not run the plugin twice

#### Scenario: Throwing plugin
- **WHEN** a remark or rehype plugin throws
- **THEN** the error is reported with its identity and the last successful document remains visible

### Requirement: Hast normalization

The core SHALL convert hast into the public `MarkdownDocument` model, including text, elements, code, math, Mermaid, custom tags, footnotes, and plugin nodes. The public model SHALL NOT contain hast, mdast, unist, or pipeline instances. Normalization SHALL preserve semantic structure, attributes required by rendering, and source positions when available.

#### Scenario: Serialized model
- **WHEN** a host serializes the document model
- **THEN** it contains only library-owned node types and plain values

#### Scenario: Unknown element
- **WHEN** a plugin produces an element the core does not model specially
- **THEN** it is represented as a generic element node with its tag, safe attributes, and children

### Requirement: CommonMark conformance

The default pipeline SHALL pass 100% of the official CommonMark test suite. Soft line breaks SHALL follow CommonMark and render as whitespace rather than `<br>`. Hosts that want hard breaks SHALL add `remark-breaks` through `remarkPlugins`. The library SHALL NOT silently enable non-CommonMark syntax in the default configuration.

#### Scenario: CommonMark suite
- **WHEN** the official CommonMark fixtures run against the default pipeline
- **THEN** every fixture passes

#### Scenario: Soft break
- **WHEN** a paragraph contains a single newline
- **THEN** it renders as whitespace, not a line break

### Requirement: GFM support through an official plugin

The library SHALL provide a `gfmPlugin` that composes `remark-gfm`. With the plugin enabled, tables, strikethrough, task lists, autolinks, and footnotes SHALL render. The library SHALL pass 100% of the official GFM fixtures when `gfmPlugin` is enabled. Footnotes SHALL be documented as a GitHub extension beyond the formal GFM specification.

#### Scenario: GFM enabled
- **WHEN** a host enables `gfmPlugin` and renders a table, a task list, and strikethrough text
- **THEN** all three constructs render with their GFM semantics

#### Scenario: GFM disabled
- **WHEN** a host does not enable `gfmPlugin`
- **THEN** GFM-only syntax degrades to readable CommonMark output rather than throwing

### Requirement: Raw HTML and `skipHtml`

`remark-rehype` SHALL run with `allowDangerousHtml: true` so raw HTML survives as `raw` nodes. By default the model builder SHALL drop raw nodes. `skipHtml` SHALL remove them explicitly. Raw HTML SHALL be rendered only when the host adds `rehype-raw` to `rehypePlugins`; sanitization SHALL run immediately after it. No component prop SHALL implicitly enable raw HTML.

#### Scenario: Raw HTML dropped
- **WHEN** Markdown contains `<div>hi</div>` and raw HTML is not enabled
- **THEN** the HTML is not rendered

#### Scenario: `skipHtml`
- **WHEN** `skipHtml` is true
- **THEN** raw HTML nodes are removed from the model

#### Scenario: Raw HTML enabled
- **WHEN** a host adds `rehype-raw` and a document contains safe HTML
- **THEN** the HTML is sanitized and rendered as nodes

### Requirement: Frontmatter

The library SHALL provide a `frontmatterPlugin` that composes `remark-frontmatter`. Frontmatter SHALL be removed from rendered content and exposed as document metadata. A document without frontmatter SHALL render unchanged.

#### Scenario: Frontmatter extracted
- **WHEN** a document begins with YAML frontmatter and `frontmatterPlugin` is enabled
- **THEN** the frontmatter does not render and its parsed values are available on the document

### Requirement: Custom pipeline injection

The library SHALL define a typed `MarkdownPipeline` contract that accepts source and context and returns hast plus optional metadata and diagnostics. The renderer, headless composable, provider, and presets SHALL accept a pipeline. Local configuration SHALL override provider and preset configuration. A custom pipeline SHALL NOT construct Vue components or bypass core normalization, sanitization, heading IDs, TOC, or model invariants. The active pipeline identity and capabilities SHALL be inspectable.

#### Scenario: Custom pipeline
- **WHEN** a host implements `MarkdownPipeline` and returns valid hast
- **THEN** the core builds the same document model shape as the official pipeline

#### Scenario: Invalid pipeline
- **WHEN** a pipeline does not implement `process` or returns an invalid result
- **THEN** the renderer reports the problem and falls back to the official pipeline without crashing

### Requirement: Asynchronous and synchronous execution

The pipeline SHALL use `unified().process` as the default asynchronous path. A synchronous `processSync` path SHALL be available when every configured plugin is synchronous. Asynchronous updates SHALL report a pending status, preserve the last successful document, coalesce superseded runs, and ignore stale results. Server rendering SHALL use the synchronous path or await the pipeline before rendering.

#### Scenario: Async pending
- **WHEN** an asynchronous plugin is still running for new source
- **THEN** the last successful document remains visible and status reports pending

#### Scenario: Stale result
- **WHEN** two asynchronous runs complete out of order
- **THEN** only the result for the latest source is applied

#### Scenario: Server rendering
- **WHEN** a document is rendered on the server with only synchronous plugins
- **THEN** `processSync` produces complete markup without browser globals

### Requirement: Pipeline security invariants

All pipeline output SHALL pass core URL and attribute safety checks before entering the document model. A custom pipeline or plugin SHALL NOT disable raw-HTML filtering, event-handler stripping, or unsafe URL rejection unless the host explicitly enables a documented trusted mode. Diagnostics SHALL NOT include raw untrusted HTML in user-facing messages.

#### Scenario: Unsafe output
- **WHEN** a plugin produces an event-handler attribute or an unsafe URL
- **THEN** the core removes or neutralizes it before rendering

#### Scenario: Trusted mode
- **WHEN** a host explicitly enables trusted raw HTML
- **THEN** the trust decision is documented and sanitization still follows the configured policy

### Requirement: Pipeline lifecycle

Pipeline instances SHALL be created per renderer or provider scope, reused across renders when configuration is unchanged, and released on unmount or pipeline replacement. No pipeline module SHALL access browser globals at import time.

#### Scenario: Pipeline replacement
- **WHEN** a host changes the pipeline on an existing renderer
- **THEN** the previous instance is released and the next render uses the new pipeline

#### Scenario: Server import
- **WHEN** the official pipeline is imported on the server
- **THEN** it does not access browser globals and can run synchronously

### Requirement: Pipeline tests

The repository SHALL include tests for stage order, plugin tuples, duplicate detection, error isolation, raw HTML and `skipHtml`, frontmatter, async ordering, custom pipelines, model normalization, CommonMark and GFM conformance, and server rendering.

#### Scenario: Contract suite
- **WHEN** the pipeline test suite runs
- **THEN** every requirement above has at least one passing scenario, including a custom pipeline contract test
