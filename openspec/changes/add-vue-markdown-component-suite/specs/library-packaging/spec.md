## Purpose

Defines how the library is packaged and verified so consumers can install it, choose styled or headless usage, import only what they need, apply styles predictably, render on the server, and rely on a documented customization and plugin surface.

## ADDED Requirements

### Requirement: Library build outputs

The project SHALL build a distributable library that exposes ES modules and TypeScript declaration files for every public component, composable, plugin, preset, and type. The build SHALL emit token and aggregate stylesheets as importable CSS artifacts. The build SHALL complete without a running development server.

#### Scenario: Production library build
- **WHEN** the library build command runs
- **THEN** ES module files, declaration files, and CSS artifacts are produced for all public entries

#### Scenario: Type consumers
- **WHEN** a TypeScript consumer imports a component or headless API
- **THEN** props, events, slots, plugin hooks, and exported types are available to the type checker

### Requirement: Public entry points

The package SHALL provide documented entries for the styled root, headless API, pipeline, plugins, presets, node components, the default highlight.js adapter, the optional Shiki adapter, the optional KaTeX math entry, individual components, design tokens, and the aggregate stylesheet. Each entry SHALL be independently importable and SHALL NOT require importing the root entry.

#### Scenario: Root import
- **WHEN** a consumer imports a preset component from the package root
- **THEN** the resolved module provides that component and its public types

#### Scenario: Headless import
- **WHEN** a consumer imports only the headless entry
- **THEN** no preset component styles, highlighter, Mermaid, or editor runtime is loaded, and the official pipeline is loaded only when the document composable runs without an injected pipeline

#### Scenario: Optional adapter import
- **WHEN** a consumer imports the Shiki or KaTeX entry
- **THEN** only that adapter and its declared optional peers are required

#### Scenario: Per-component import
- **WHEN** a consumer imports a single component from its dedicated entry
- **THEN** only that component's module graph and declared dependencies are loaded

### Requirement: Dependency contract

Vue SHALL be a peer dependency and SHALL NOT be bundled into the published output. The official `unified`/`remark` pipeline, `hast-util-*`, and `rehype-sanitize`/`hast-util-sanitize` SHALL be default dependencies. The default highlight.js adapter SHALL be isolated behind its documented entry, and the optional Shiki, KaTeX, Mermaid, and CodeMirror ecosystems SHALL be optional peers or dynamic imports so they are installed only by consumers who select them. The package SHALL NOT depend on `markdown-it`, `htmlparser2`, or an icon library.

#### Scenario: Single Vue instance
- **WHEN** a Vue application installs the package
- **THEN** the package uses the host application's Vue instance

#### Scenario: Omit default highlighter
- **WHEN** a consumer imports a component entry without the highlight.js adapter and supplies its own highlighter
- **THEN** highlight.js is not included in that consumer's bundle

#### Scenario: Optional peers not installed
- **WHEN** a consumer does not install the Shiki or KaTeX peers
- **THEN** the default renderer still works and the optional entry reports a clear missing-peer error only when imported

### Requirement: Tree-shaking and lazy loading

The build SHALL preserve tree-shakability. Importing the headless entry SHALL NOT load any preset component, CSS, highlighter, Mermaid, or CodeMirror. The official pipeline SHALL load only when the document composable is used without an injected pipeline. Importing a preset component SHALL load only its own graph, the pipeline and highlighter it uses, and shared core. Shiki, KaTeX, Mermaid, and CodeMirror SHALL remain in optional or lazy chunks requested only when the corresponding feature is used.

#### Scenario: Headless bundle
- **WHEN** a consumer builds only with the headless entry
- **THEN** the output contains no preset component, highlighter, or editor runtime, and contains no pipeline unless the host uses the default document pipeline

#### Scenario: Heavy features stay lazy
- **WHEN** a consumer renders Markdown without Mermaid blocks or the live editor
- **THEN** Mermaid and CodeMirror are not downloaded as part of the initial load

#### Scenario: Optional adapters stay optional
- **WHEN** a consumer uses the default pipeline and highlight.js
- **THEN** Shiki and KaTeX are absent from the bundle

### Requirement: Styling contract

Component styles SHALL be delivered through token and component stylesheets that use the documented `vmd-` class prefix, `data-vmd-part` hooks, and CSS custom properties. Styles SHALL NOT reset global application styles, style bare HTML elements globally, or depend on the demo stylesheet. Importing styles SHALL be optional for functional and accessible use.

#### Scenario: Host isolation
- **WHEN** the library styles are imported into an existing application
- **THEN** the application's global typography and layout outside the components remain unchanged

#### Scenario: Token customization
- **WHEN** a host overrides documented tokens or targets documented parts
- **THEN** the affected components change without editing library source

### Requirement: Server-side rendering compatibility

The root and headless entries SHALL be importable in a Node.js server environment without touching browser globals. The server renderer SHALL produce stable markup for Markdown, code blocks, tables of contents, and static component shells. Client-only features SHALL render placeholders and initialize after hydration.

#### Scenario: Server import
- **WHEN** the package is imported during server rendering
- **THEN** no `window`, `document`, storage, or browser-only API is accessed at module scope

#### Scenario: Hydration
- **WHEN** server-rendered output hydrates on the client
- **THEN** heading IDs and static structure match and no hydration mismatch is reported

### Requirement: Compatibility

The library SHALL support Vue 3.5 and later, Vite 7 and later for development, Node 20 and later for building and SSR, and evergreen browsers: Chrome/Edge 87+, Firefox 78+, Safari 14.1+, and iOS 14.5+. Runtime code SHALL stay within ES2020 and SHALL NOT depend on Node.js built-in modules or server-only APIs. CSS SHALL avoid features outside that baseline, including `:has()`, container queries, CSS nesting, `color-mix()`, `oklch()`, `dvh`, and `text-wrap: balance`. The package SHALL declare its supported Vue, Vite, Node, and browser ranges, and the build SHALL pin syntax and CSS targets to the baseline.

#### Scenario: Browser runtime
- **WHEN** the built library is loaded in a current evergreen browser
- **THEN** all components initialize without Node.js polyfills

#### Scenario: Supported toolchain
- **WHEN** a consumer uses Vue 3.5+, Vite 7+, and Node 20+
- **THEN** development, build, and SSR commands run without unsupported-runtime warnings

### Requirement: Demo application

The repository SHALL include a demo application that imports the library through public entries and exercises every preset component, every node component, the headless API, the plugin system, pipeline switching, highlighter switching, math rendering, the react-markdown parity surface, and the customization contract. The demo SHALL include a live customization panel that changes tokens, labels, theme, pipeline, highlighter, tag components, region components, node components, and component overrides without editing source.

#### Scenario: Demo covers the public surface
- **WHEN** the demo application is served
- **THEN** each public component, node component, headless example, pipeline and highlighter choice, math example, plugin example, react-markdown parity example, and customization layer is reachable and interactive

#### Scenario: Customization panel
- **WHEN** the user changes a token, label, theme, pipeline, highlighter, tag component, region component, node component, or component override in the demo
- **THEN** the affected component updates without a rebuild

### Requirement: Automated quality gates

The repository SHALL provide a single automated test command that runs unit, component, node-catalog, plugin-contract, pipeline-contract, CommonMark/GFM conformance, highlighter-adapter, math, react-markdown-parity, security, and server-rendering tests without requiring a browser. The tests SHALL cover public props, emitted events, slot behavior, plugin ordering and cleanup, customization precedence, pipeline equivalence, highlighter equivalence, math fallback, catalog coverage, tag component mapping, element filtering, URL transformation, and unsafe-content filtering. Type checking and the library build SHALL be runnable as separate commands, a large-document benchmark SHALL report render time and component counts as a sanity check, and a size guard SHALL fail the build if Mermaid, CodeMirror, Shiki, or KaTeX enter entries that do not use them.

#### Scenario: Test command
- **WHEN** the automated test command runs on a clean checkout after dependency installation
- **THEN** all unit, component, node-catalog, plugin, pipeline, conformance, highlighter, math, parity, security, and SSR tests pass without launching a browser or development server

#### Scenario: react-markdown parity
- **WHEN** the parity fixture suite renders the documented react-markdown examples
- **THEN** tag overrides, allow/deny filtering, unwrap behavior, URL transformation, skipHtml, and source input produce the documented equivalent output

#### Scenario: Unsafe content regression
- **WHEN** a test renders Markdown containing unsafe links or event-handler attributes
- **THEN** the test fails if the unsafe content reaches the DOM

#### Scenario: Size guard
- **WHEN** an initial entry contains Mermaid, CodeMirror, Shiki, or KaTeX without using it
- **THEN** the size guard fails with a message identifying the offending import

### Requirement: Documentation and API stability

The repository SHALL document installation, styled and headless usage, all public props/events/slots, the node component catalog, pipeline selection and custom pipeline authoring, remark/rehype plugin usage, highlighter selection and adapter authoring, math setup and engine authoring, plugin hooks, preset composition, customization tokens and parts, the plugin authoring guide, the customization cookbook, SSR behavior, raw-HTML security limits, CommonMark/GFM conformance, and a migration guide from react-markdown. Documented `vmd-` parts and class names SHALL remain stable within a major version.

#### Scenario: react-markdown migration
- **WHEN** a React user maps `components`, `allowedElements`, `urlTransform`, `skipHtml`, and `remarkPlugins` to this library
- **THEN** the guide provides an equivalent Vue example for each concept and identifies the deliberate differences

#### Scenario: Customization cookbook
- **WHEN** a host wants to replace the TOC, restyle code actions, switch to Shiki, supply a custom pipeline, add a custom node component, add a plugin, and enable math
- **THEN** each task has a documented example that works against the published entries

#### Scenario: Existing export check
- **WHEN** documentation references a component, composable, plugin, preset, token, or part
- **THEN** the referenced API exists in the built output and is covered by a test or type check
