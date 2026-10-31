# node-components Specification

## Purpose
Defines a complete, exported component catalog for every renderable Markdown node so hosts can replace any construct — paragraph, heading, link, image, table, code, math, Mermaid, footnote, task item, raw HTML, or custom tag — through components rather than brittle renderer patches. The core catalog ships in v1.0; specialized math, Mermaid, footnote, and task-list components ship in v1.x.

## Requirements

### Requirement: Complete node component catalog

Every renderable Markdown construct SHALL have a named, exported node component with a documented default implementation. The catalog SHALL cover at least: text, paragraph, heading, emphasis, strong, strikethrough, link, image, unordered list, ordered list, list item, task list item, blockquote, horizontal rule, break, table, table head, table body, table row, table header cell, table data cell, inline code, code block, inline math, block math, Mermaid, footnote reference, footnote section, raw HTML, and custom tag. Text nodes SHALL be rendered through a fast path and SHALL NOT instantiate one component per character sequence.

#### Scenario: Every construct has a component
- **WHEN** a document contains every supported Markdown construct
- **THEN** each construct is rendered by its documented node component or fast path

#### Scenario: Catalog is inspectable
- **WHEN** a host reads the exported node component catalog
- **THEN** it can map every node kind and supported element tag to the component that renders it

### Requirement: Default implementations

Default node components SHALL be small, functional, SSR-safe, and independent of library CSS. They SHALL preserve semantic HTML, accessible names, heading hierarchy, list structure, table structure, image alternative text, and link destinations. They SHALL NOT contain business logic or make network requests.

#### Scenario: Semantic output
- **WHEN** a document contains headings, lists, a table, and an image with alt text
- **THEN** the output preserves heading levels, list nesting, table sections, and image alternative text

#### Scenario: No CSS dependency
- **WHEN** the library stylesheet is not imported
- **THEN** node components still render correct semantics and remain keyboard and screen-reader usable

### Requirement: Node component resolution

The renderer SHALL resolve a node in a documented order: function value in `nodeComponents`, `nodeComponents[tag]`, `components[tag]`, `nodeComponents[kind]`, plugin node component, preset node component, then built-in node component. Resolution SHALL support overrides by node kind and by element tag, with an exact tag override taking precedence over a kind override at the same layer. At the same key, `nodeComponents` SHALL win over `components`. For fenced code, `components.pre` SHALL remain the wrapper and the semantic `nodeComponents.code` override SHALL replace the inner `code` element. The resolved component SHALL receive the node, attributes, children renderer, default renderer, and render context.

#### Scenario: Override by tag
- **WHEN** a host overrides the `a` tag through `components`
- **THEN** all links use the override while headings, images, and other elements keep their defaults

#### Scenario: Override by kind
- **WHEN** a host overrides the `inlineCode` node kind
- **THEN** inline code uses the override while fenced code keeps its default component

#### Scenario: Tag and kind conflict
- **WHEN** a host supplies `components.a` and `nodeComponents.link`
- **THEN** `components.a` wins because the exact tag override is more specific

#### Scenario: Local override wins
- **WHEN** a plugin and a host both provide a component for the same node
- **THEN** the host component is used

#### Scenario: Preset then built-in
- **WHEN** a preset provides a node component and the host provides none
- **THEN** the preset component is used instead of the built-in component

### Requirement: Renderer functions as an advanced escape hatch

The library SHALL support function-based node renderers as values of `nodeComponents` for decoration and performance-sensitive cases. A node renderer SHALL receive a `defaultRender` function so it can wrap or decorate the default component without reimplementing safety, heading IDs, or TOC behavior. A node renderer SHALL take precedence over a component for the same key and SHALL be documented as an advanced API. There SHALL NOT be a separate `renderers` map.

#### Scenario: Decorate an image
- **WHEN** a node renderer wraps the default image component to add a caption
- **THEN** the default image safety and alt behavior remain intact and the caption appears in the expected position

#### Scenario: Decorate a heading
- **WHEN** a node renderer wraps a heading
- **THEN** heading IDs and TOC entries remain stable

### Requirement: Specialized node components

The catalog SHALL include specialized components with documented behavior beyond plain element rendering:

- `MarkdownHeading`: stable ID and a heading anchor link by default. The anchor SHALL target the heading ID, use the `heading-anchor` part and the `headingAnchor` label, and SHALL be omitted when the heading has no ID or the host replaces the heading component.
- `MarkdownLink`: target, rel, external-link indication, and safe URL handling.
- `MarkdownImage`: alt text, preserved dimensions, async decoding and lazy loading defaults, and a broken-image fallback slot.
- `MarkdownTable`: semantic table sections, alignment attributes, and an optional overflow wrapper.
- `MarkdownList` / `MarkdownListItem`: nested lists.
- `MarkdownTaskItem`: task-list checkbox state provided by `remark-gfm`.
- `MarkdownCode`: delegates to the code block component and highlighter adapter.
- `MarkdownMath`: delegates to the math component and math engine.
- `MarkdownMermaid`: delegates to the Mermaid block.
- `MarkdownFootnoteReference` / `MarkdownFootnotes`: superscript references, ordered notes, and back-links.
- `MarkdownHtml`: standalone component for host use; raw HTML enabled through `rehype-raw` renders as normal element components and is not routed through `MarkdownHtml`.
- `MarkdownCustomTag`: host component mapping with normalized props.

Async components SHALL be supported through Vue `Suspense` or the renderer's pending state without changing the catalog contract.

#### Scenario: Heading anchor
- **WHEN** a heading with an ID is rendered through the default heading component
- **THEN** it includes a link to `#id` using the documented `heading-anchor` part and `headingAnchor` label

#### Scenario: Raw HTML path
- **WHEN** `rehype-raw` is configured and raw HTML is rendered
- **THEN** the HTML becomes normal element nodes rendered through the element components, and `MarkdownHtml` is not used

#### Scenario: Standalone MarkdownHtml
- **WHEN** a host mounts `MarkdownHtml` directly with text
- **THEN** it renders that text in the documented `html` part without parsing it as Markdown

#### Scenario: Image fallback
- **WHEN** an image fails to load
- **THEN** the image component renders its fallback slot or accessible fallback content instead of an empty broken image

#### Scenario: Table overflow
- **WHEN** a table is wider than its container
- **THEN** the table component provides the documented overflow region without breaking the page layout

#### Scenario: Inline versus block code
- **WHEN** a document contains inline code and a fenced code block
- **THEN** inline code uses the inline component and the fenced block uses the code block component with highlighting actions

#### Scenario: Task item
- **WHEN** GFM task-list syntax is rendered
- **THEN** each item renders through `MarkdownTaskItem` with its checked state and an accessible checkbox

#### Scenario: Footnote
- **WHEN** a document contains footnote references
- **THEN** references render through `MarkdownFootnoteReference` and notes render through `MarkdownFootnotes` with back-links

### Requirement: Math node support

The catalog SHALL include `MarkdownMath` for inline and display math. The math node SHALL carry the TeX source, display mode, rendered nodes, and error state. The component SHALL support replacing the engine, replacing the rendered output, and falling back to readable TeX when rendering fails.

#### Scenario: Inline math component
- **WHEN** a document contains inline math and the math plugin is enabled
- **THEN** the inline math node renders through `MarkdownMath` with display mode disabled

#### Scenario: Block math override
- **WHEN** a host replaces the math node component
- **THEN** both inline and display math use the replacement unless a more specific override is supplied

### Requirement: Plugin-defined nodes

Plugins SHALL be able to add node kinds and register their default components, including function renderers. Plugin-defined nodes SHALL participate in the same catalog, resolution, manifest, SSR, and styling rules as built-in nodes. An unregistered plugin node SHALL render a documented fallback instead of crashing.

#### Scenario: Plugin adds a node
- **WHEN** a plugin adds a callout node and registers its component
- **THEN** callouts render through that component and can be overridden by the host

#### Scenario: Missing renderer
- **WHEN** a plugin adds a node kind without registering a component or function renderer
- **THEN** the renderer emits a fallback and reports the missing contribution without breaking the document

### Requirement: Catalog metadata and documentation

The library SHALL export a node catalog manifest describing every node kind, supported element tags, default component name, part names, and override key. The manifest SHALL be validated against rendered fixtures and SHALL power the documentation and demo inspector.

#### Scenario: Manifest coverage
- **WHEN** a fixture document exercises every catalog entry
- **THEN** every declared entry is rendered by its declared component and no undeclared node kind appears

#### Scenario: Documentation lookup
- **WHEN** a host looks up how to replace images
- **THEN** the catalog documentation identifies the default component, override key, props, parts, and a working example

### Requirement: Rendering performance

The component-based catalog SHALL NOT introduce per-text-node component instances. Default node components SHALL be functional, component resolution SHALL be cached per node type, and the library SHALL include a benchmark for a large document that reports render time and component counts. Hosts SHALL be able to bypass component instantiation through function values in `nodeComponents` for performance-critical cases.

#### Scenario: Large document
- **WHEN** a document with ten thousand nodes is rendered
- **THEN** render time stays reasonable and text-heavy content does not create one component instance per text node

#### Scenario: Function renderer fast path
- **WHEN** a host supplies function renderers for hot node kinds
- **THEN** those kinds render without instantiating component instances

### Requirement: Styling and parts for nodes

Every node component SHALL expose documented parts and classes for its semantic elements, including headings, links, images, lists, list items, blockquotes, tables, table cells, inline code, math, and custom tags. Node styling SHALL use tokens and parts and SHALL NOT depend on global element selectors.

#### Scenario: Style a table cell
- **WHEN** a host targets the table cell part
- **THEN** only table cells are affected

#### Scenario: Token inheritance
- **WHEN** a host overrides typography tokens on a wrapper
- **THEN** headings, paragraphs, lists, and tables inside inherit the overridden values

### Requirement: Server rendering and accessibility

Node components SHALL render stable static markup on the server and SHALL NOT access browser APIs during setup. The catalog SHALL preserve document order, heading levels, list semantics, table headers, link purposes, image alternatives, and math accessibility metadata.

#### Scenario: Server output
- **WHEN** a full document is rendered on the server
- **THEN** the static markup preserves semantics and matches the client structure

#### Scenario: Math accessibility
- **WHEN** math is rendered with the default engine
- **THEN** the output includes MathML or equivalent accessible text alongside the visual formula
