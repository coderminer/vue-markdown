## MODIFIED Requirements

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
