## Purpose

Exposes the library's parsing, document model, search, TOC, Mermaid, and interaction logic as public composables so hosts can build a completely custom Markdown UI without adopting preset markup or styles.

## ADDED Requirements

### Requirement: Document pipeline composable

The library SHALL provide a composable that accepts Markdown source and options and returns a shallow-reactive document model, table of contents, render status, diagnostics, pipeline identity, and actions to update the source, options, or refresh. Options SHALL accept a pipeline, plugins, tag components, region components, node components, element filters, URL transform, `remarkPlugins` / `rehypePlugins` / `remarkRehypeOptions`, and injected behavior using the same contracts as the preset components. When no pipeline is supplied, the composable SHALL use the official `unified`/`remark` pipeline. The document SHALL be stored in a `shallowRef`, replaced atomically, and never wrapped in a deep reactive proxy. The composable SHALL be usable without mounting any preset component.

#### Scenario: Build a custom renderer
- **WHEN** a host calls the document composable with Markdown source
- **THEN** it receives the document model, TOC, pipeline identity, and status and can render them with its own markup

#### Scenario: Reactive updates
- **WHEN** the source or a rendering option changes
- **THEN** the document model and TOC update reactively and diagnostics reflect the latest result

#### Scenario: Injected pipeline
- **WHEN** a host supplies a custom `MarkdownPipeline` to the composable
- **THEN** the returned model and status reflect that pipeline without requiring preset components

#### Scenario: react-markdown-style options
- **WHEN** a headless host supplies `components`, `allowedElements`, and `urlTransform`
- **THEN** the returned model reflects the same filtering and URL rules as the preset renderer

#### Scenario: Presentation-only update
- **WHEN** only a theme or label option changes
- **THEN** the document is not re-parsed

### Requirement: Public document model

The document model SHALL be serializable and SHALL NOT contain Vue VNodes, DOM nodes, hast, mdast, functions, or framework-specific objects. It SHALL expose node kinds for text, elements, code, Mermaid, math, footnotes, task items, custom tags, and plugin-defined nodes, along with stable keys, attributes, and source positions where available. The model SHALL also expose the pipeline identity, the active plugin names, and parsed frontmatter when present.

#### Scenario: Serialize the model
- **WHEN** a host serializes the document model to JSON
- **THEN** serialization succeeds without circular references or framework objects

#### Scenario: Plugin nodes
- **WHEN** a plugin adds a custom node kind
- **THEN** the model exposes that node with its plugin-defined payload and stable key

### Requirement: TOC, search, and active-heading utilities

The library SHALL expose utilities or composables for generating a TOC, searching and highlighting text segments, and tracking the active heading in a host-provided container. The active-heading utility SHALL be optional and SHALL not attach listeners until the host provides a container.

#### Scenario: Custom TOC
- **WHEN** a host renders TOC items from the headless API
- **THEN** item identifiers link to the corresponding document headings and the active item updates while scrolling

#### Scenario: Search segments
- **WHEN** a host provides a search query to the headless API
- **THEN** text nodes expose match segments that the host can render without breaking surrounding markup

### Requirement: Mermaid composable

The library SHALL provide a composable for Mermaid rendering that exposes the current status, rendered SVG nodes, last successful nodes, error, and render/cancel actions. It SHALL load the Mermaid runtime lazily, serialize renders, preserve the last good result, and support a host-provided renderer. The composable SHALL NOT expose raw SVG as an injectable HTML string by default; nodes SHALL be parsed and sanitized before use.

#### Scenario: Headless Mermaid preview
- **WHEN** a host uses the Mermaid composable with valid source
- **THEN** it receives a ready status and SVG nodes and can render them in its own markup

#### Scenario: Invalid update
- **WHEN** an update produces invalid source after a successful render
- **THEN** the status reports the error while the last successful nodes remain available

### Requirement: Interaction composables

The library SHALL provide headless composables for clipboard copy, fullscreen, resizable split layout, and reduced-motion detection. Each composable SHALL expose state and actions, SHALL clean up listeners and body state, and SHALL report failures through state rather than throwing into render.

#### Scenario: Clipboard failure
- **WHEN** a clipboard write is denied
- **THEN** the composable returns a failure state and the host can display feedback

#### Scenario: Fullscreen cleanup
- **WHEN** a component using the fullscreen composable unmounts while fullscreen is active
- **THEN** fullscreen is exited and page scrolling is restored

### Requirement: Static HTML export

The headless API SHALL provide an explicit export helper that runs the same pipeline and serializes the result with `rehype-stringify`. The normal render path SHALL NOT use `rehype-stringify`. Export SHALL apply the same sanitization and URL rules as rendering.

#### Scenario: Export
- **WHEN** a headless host exports a document to HTML
- **THEN** the output reflects the same sanitized document that would be rendered

#### Scenario: No stringify in render
- **WHEN** a host renders through the document composable
- **THEN** no HTML string serialization step runs

### Requirement: Server rendering safety

Headless composables SHALL be safe to call during server rendering. They SHALL NOT access `window`, `document`, storage, or browser-only APIs during setup or initial computation, and SHALL return deterministic initial state. Browser-dependent behavior SHALL activate only in mount lifecycle hooks or explicit client-only actions.

#### Scenario: Server render
- **WHEN** a host renders a component that uses the document composable on the server
- **THEN** it produces the document model without throwing and without touching browser globals

#### Scenario: Client-only actions
- **WHEN** a fullscreen or clipboard action is invoked on the server
- **THEN** it returns an unavailable state instead of throwing

### Requirement: Plugin support in headless mode

The headless API SHALL accept the same plugin inputs and ordering semantics as the preset components. Plugins that only use core hooks SHALL work without Vue, and plugins that contribute Vue components SHALL be ignored with a reported notice when used in a non-Vue headless context.

#### Scenario: Core-only plugin
- **WHEN** a headless host registers a pipeline or transform plugin
- **THEN** the document model reflects the plugin without requiring any Vue component

#### Scenario: Vue-only contribution
- **WHEN** a plugin registers only Vue components in a non-Vue context
- **THEN** the core pipeline still runs and the unused contribution is reported

### Requirement: Typed headless surface

All headless composables, options, return values, document nodes, diagnostics, and plugin contexts SHALL have exported TypeScript types. Types SHALL be usable without importing preset components or styles.

#### Scenario: Headless type import
- **WHEN** a consumer imports headless types
- **THEN** no preset component or CSS module is required to resolve the types
