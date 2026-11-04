# performance Specification

## Purpose
Defines the Vue-native performance guardrail. The renderer parses once, stores an immutable document in shallow-reactive state, avoids deep proxies and per-text-node components, memoizes by pipeline identity, coalesces async work, and loads heavy engines lazily. Performance is a guardrail, not the product's headline feature: the architecture stays efficient, but features are not blocked on marginal wins and benchmarks are sanity checks rather than a gate for every change.

## Requirements

### Requirement: Shallow reactive document state

The Vue adapter SHALL store the document model in a `shallowRef` and SHALL replace it atomically. The document SHALL NOT be wrapped in a deep `reactive()` proxy. Component maps, plugin instances, adapters, and presets SHALL be `markRaw`.

#### Scenario: Document replacement
- **WHEN** a new parse completes
- **THEN** the document ref is replaced once and Vue does not traverse the previous tree to patch it

#### Scenario: Host code is not proxied
- **WHEN** a host supplies components, plugins, or adapters
- **THEN** those objects are not wrapped in reactive proxies

### Requirement: Parse memoization

The library SHALL memoize parsing by source string, pipeline identity, ordered plugin identities, and parse-affecting options. The pipeline identity SHALL include the pipeline name, its optional `version`, and its process-local instance identity, so two pipelines that share a name cannot reuse each other's cached documents. A cache hit SHALL reuse the previous document without re-running the pipeline and SHALL replay the diagnostics of the run that produced it. The cache SHALL be bounded and SHALL be invalidated when any key component changes.

#### Scenario: Same input
- **WHEN** the same source and configuration are rendered again
- **THEN** the pipeline is not re-run

#### Scenario: Changed plugin
- **WHEN** a plugin is added, removed, or reordered
- **THEN** the cache key changes and the document is re-parsed

### Requirement: Presentation-only updates

Changing presentation options such as theme, tokens, labels, slots, CSS parts, or search state SHALL NOT re-parse the document. Search segments SHALL be derived from an immutable parsed document without mutating the cached base document. Only changes that affect parsing, normalization, filtering, or URL transformation SHALL invalidate the document.

#### Scenario: Theme change
- **WHEN** the host switches from light to dark theme
- **THEN** the rendered document updates without re-parsing the source

#### Scenario: Label change
- **WHEN** the host changes a user-facing label
- **THEN** the document model is reused

#### Scenario: Search change
- **WHEN** the host changes the search query or case sensitivity
- **THEN** highlights and match counts update from the parsed document without re-parsing, and the shared base document is not mutated

### Requirement: Text fast path and stable keys

Text nodes SHALL render through a fast path and SHALL NOT instantiate one component per text sequence. Element components SHALL resolve once per tag or kind, not per node. Node keys SHALL be stable across renders so unchanged subtrees are not remounted.

#### Scenario: Large text document
- **WHEN** a document contains thousands of text nodes
- **THEN** rendering does not create thousands of component instances

#### Scenario: Append content
- **WHEN** content is appended to an existing document
- **THEN** existing nodes keep their keys and are not remounted unnecessarily

### Requirement: Async coalescing and last-good output

Asynchronous parsing SHALL coalesce superseded runs, discard stale results, and keep the last successful document visible while a new result is pending. The renderer SHALL expose a pending status without clearing existing content.

#### Scenario: Rapid updates
- **WHEN** source changes several times before an async parse completes
- **THEN** only the latest run is applied and intermediate results are discarded

#### Scenario: Pending state
- **WHEN** a new async parse is running
- **THEN** the previous document remains rendered and status reports pending

### Requirement: Lazy heavy engines

Mermaid, Shiki, KaTeX, and CodeMirror SHALL load lazily and SHALL NOT enter the initial render path or unrelated entries. The base renderer SHALL NOT statically reference the Mermaid component, runtime, or SVG parser; `mermaidPlugin()` SHALL contribute the built-in Mermaid node component so it is only reachable when the host opts in. A page without the corresponding content SHALL NOT request the engine.

#### Scenario: No Mermaid content
- **WHEN** a page imports the renderer and contains no Mermaid blocks
- **THEN** the Mermaid runtime is not requested

#### Scenario: Base renderer import
- **WHEN** a host imports `MarkdownRenderer` without `mermaidPlugin()` or the optional engine entries
- **THEN** the Mermaid runtime, SVG parser, KaTeX, Shiki, and CodeMirror chunks are not part of the rendered bundle

#### Scenario: First math block
- **WHEN** a document contains math and the math plugin is enabled
- **THEN** the math engine loads on demand and the rest of the document renders immediately

### Requirement: Stable processor identity

Each document composable SHALL own one stable official pipeline instance. Presentation-only configuration, including components, labels, tokens, and search state, SHALL NOT rebuild the unified processor or invalidate its identity. A host-supplied pipeline SHALL be used as-is.

#### Scenario: Components change
- **WHEN** the host changes only presentation configuration such as `components`, `labels`, or `tokens`
- **THEN** the unified processor is reused and its plugins are not re-attached

#### Scenario: Host pipeline
- **WHEN** the host supplies a pipeline
- **THEN** the composable uses that instance without replacing or disposing it

### Requirement: Plugin lifecycle scope

Plugin setup, watchers, and resources SHALL run inside an `effectScope` and SHALL be disposed on unmount, pipeline replacement, or plugin removal. Setup SHALL execute through `scope.run()` so watchers and scope-registered cleanups belong to the plugin set. Each cleanup SHALL run at most once, and a reconfiguration SHALL stop the previous scope before starting the next one. Repeated reconfiguration SHALL NOT leak watchers, timers, or engine instances.

#### Scenario: Unmount
- **WHEN** a renderer with plugins unmounts
- **THEN** its effect scope stops and plugin cleanup runs

#### Scenario: Reconfiguration
- **WHEN** a host replaces the plugin list
- **THEN** the previous scope stops, removed plugins are cleaned up, and retained plugins are not duplicated

### Requirement: Server rendering performance

The core SHALL be DOM-free. Server rendering SHALL use the synchronous pipeline path when all configured plugins are synchronous, SHALL produce deterministic IDs, and SHALL NOT wait for browser-only engines. Server output SHALL remain stable across repeated renders.

#### Scenario: Repeated SSR
- **WHEN** the same document is rendered twice on the server
- **THEN** both outputs are identical and no browser global is accessed

### Requirement: Benchmarks and size reports

The repository SHALL include benchmarks for initial parse and render, re-render with unchanged source, re-render with changed source, and a large document, plus a bundle-size report per entry. They SHALL run as sanity checks that surface visible or large regressions; they SHALL NOT block unrelated feature work or be treated as a primary design constraint.

#### Scenario: Large regression
- **WHEN** a change causes a visible or large increase in render time or bundle size
- **THEN** the report identifies the metric so the regression can be investigated

#### Scenario: Benchmark report
- **WHEN** the benchmark suite runs
- **THEN** it reports parse time, render time, component count, and bundle contribution per entry
