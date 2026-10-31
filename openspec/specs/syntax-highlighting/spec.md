# syntax-highlighting Specification

## Purpose
Provides a standalone, themeable source-code viewer for file previews and snippets, with pluggable highlighting through the same rehype-based adapters used by the Markdown pipeline, line numbers, highlighted lines, truncation, and scalable rendering for large inputs. Ships in v1.x.

## Requirements

### Requirement: Source rendering and language selection

The highlighter SHALL render a source string using the requested language grammar. When the language is unknown or empty, it SHALL render the source as plain text without throwing. Whitespace and line breaks SHALL be preserved exactly.

#### Scenario: Known language
- **WHEN** source is rendered with the language `javascript`
- **THEN** keywords, strings, and comments receive syntax highlighting

#### Scenario: Unknown language
- **WHEN** source is rendered with an unrecognized language name
- **THEN** the original source is displayed as plain text and no error is raised

### Requirement: Injectable highlighting

The highlighter SHALL accept the same highlighter adapter as the code block component. The default adapter SHALL use highlight.js and `rehype-highlight`. A custom adapter SHALL control tokenization and node generation while the component retains line numbers, highlight lines, truncation, virtualization, and copy behavior. Adapters SHALL return normalized nodes rather than HTML strings. Asynchronous adapters SHALL show plain source until ready.

#### Scenario: Shared custom adapter
- **WHEN** a host supplies one adapter to both the code block and the standalone highlighter
- **THEN** both produce consistent language classes and theme behavior

#### Scenario: Async adapter readiness
- **WHEN** the adapter is still loading
- **THEN** the component shows plain source and switches to highlighted output when ready without losing scroll position

### Requirement: Official highlighter adapters

The library SHALL ship highlight.js as the default adapter and Shiki as an official optional adapter. The in-document path SHALL use `rehype-highlight` for highlight.js and `@shikijs/rehype` for Shiki. highlight.js SHALL work synchronously after import, with an explicitly registered default language set. Shiki SHALL preload its highlighter, themes, and requested languages asynchronously before producing output and SHALL support light and dark theme output. Both adapters SHALL be distributed through separate entries so neither is loaded by the headless path or by consumers using a different adapter. Hosts SHALL be able to provide a completely custom adapter.

#### Scenario: Default adapter
- **WHEN** a host does not supply a highlighter
- **THEN** the preset components use the highlight.js adapter and render synchronously

#### Scenario: Shiki adapter
- **WHEN** a host selects the official Shiki adapter and its optional peers are installed
- **THEN** code renders with Shiki themes and language grammars after the adapter reports ready

#### Scenario: Custom adapter
- **WHEN** a host supplies another engine through the adapter contract
- **THEN** both the code block and standalone highlighter use it without component changes

#### Scenario: Adapter isolation
- **WHEN** a consumer imports only the headless entry
- **THEN** neither highlight.js nor Shiki is loaded

### Requirement: Adapter selection and precedence

The active highlighter SHALL be selectable by local prop, nearest configuration provider, preset, or built-in default, in that order. The resolved adapter identity SHALL be inspectable. Changing the adapter SHALL re-render highlighted output without changing source text, copy behavior, line numbers, or layout.

#### Scenario: Local override
- **WHEN** a provider configures Shiki and one code block passes highlight.js locally
- **THEN** that block uses highlight.js and other blocks keep Shiki

#### Scenario: Adapter switch
- **WHEN** the active adapter changes
- **THEN** the source and scroll position remain stable while the highlighted markup updates

### Requirement: Highlight result contract

The adapter SHALL return the highlighted language and normalized nodes suitable for a code element, with optional class metadata. An adapter MAY instead return full block nodes for engines that require their own wrapper, in which case the component SHALL preserve its header, actions, and source copy behavior around those nodes. Built-in adapters SHALL escape source text. An unknown language SHALL produce plain source nodes. An invalid adapter result SHALL be reported and fall back to plain text.

#### Scenario: Content-level result
- **WHEN** an adapter returns highlighted content nodes
- **THEN** the component places them inside its own code element and keeps its layout and actions

#### Scenario: Full block result
- **WHEN** an adapter returns full block nodes
- **THEN** the component renders them inside its body without duplicating the code wrapper

#### Scenario: Unknown language
- **WHEN** the requested language is not available in the adapter
- **THEN** plain source nodes are rendered and no error is thrown

#### Scenario: Unsafe attribute
- **WHEN** an adapter returns a node with an event-handler attribute or unsafe URL
- **THEN** the attribute is removed before rendering

### Requirement: Highlight caching

Highlighted output SHALL be cached by adapter identity, source text, language, theme, and relevant adapter options. The cache SHALL be bounded, SHALL be invalidated when any key component changes, and SHALL NOT be shared between different engine configurations.

#### Scenario: Repeated snippet
- **WHEN** the same snippet appears in multiple blocks with the same adapter, language, and theme
- **THEN** the adapter highlights it once and later blocks reuse the cached result

#### Scenario: Theme change
- **WHEN** the theme changes
- **THEN** cached output for the previous theme is not reused

### Requirement: Language loading and fallback

Adapters SHALL be able to declare supported languages and load additional grammars on demand. While a grammar is loading, the component SHALL show escaped plain source. A failed grammar load SHALL fall back to plain source, report the failure through the adapter, and leave the rest of the document unaffected.

#### Scenario: Lazy grammar
- **WHEN** a Shiki grammar is loaded on demand for a language
- **THEN** plain source appears first and highlighted output replaces it when the grammar is ready

#### Scenario: Grammar failure
- **WHEN** a grammar fails to load
- **THEN** the block shows escaped plain source and other blocks continue to highlight

### Requirement: Highlighter theme mapping

The component theme SHALL be passed to the adapter, which SHALL map it to its own theme set. Container surfaces SHALL continue to use library tokens regardless of adapter theme names. Shiki dual-theme output SHALL follow the component's light, dark, or auto mode. An unknown adapter theme SHALL fall back to the adapter default.

#### Scenario: Shiki dual theme
- **WHEN** the component is in auto mode with a dual-theme Shiki adapter
- **THEN** code colors follow the active color scheme without a manual theme switch

#### Scenario: Token surface
- **WHEN** a host overrides the code background token
- **THEN** the container background changes even though the adapter controls token colors

### Requirement: Server rendering and trust boundary

Synchronous adapters SHALL produce highlighted nodes during server rendering. Asynchronous adapters SHALL produce plain source nodes on the server and upgrade after hydration unless the host supplies precomputed nodes. Adapter output SHALL be treated as trusted host code but SHALL still be structurally validated: only element and text nodes are accepted, and attributes pass the same URL and event-handler rules as document content. Built-in adapters escape source text, and custom adapters SHALL be documented as responsible for safe node output.

#### Scenario: Server highlight
- **WHEN** the highlight.js adapter renders on the server
- **THEN** highlighted static markup is produced without browser APIs

#### Scenario: Async server fallback
- **WHEN** an asynchronous adapter is used during server rendering without precomputed output
- **THEN** plain source nodes are emitted and highlighting upgrades on the client

#### Scenario: Custom adapter responsibility
- **WHEN** a host supplies a custom adapter
- **THEN** the documentation states that the adapter must escape source text and return safe nodes

### Requirement: Themes and tokens

The highlighter SHALL support named themes plus token-based customization. Theme selection SHALL apply to highlighted markup and container surfaces. Changing the theme SHALL update appearance without changing source text. An unknown theme name SHALL fall back to the default theme, and host token overrides SHALL take precedence over theme values.

#### Scenario: Theme switch
- **WHEN** the theme changes from one supported theme to another
- **THEN** the same source is displayed with the new theme's colors

#### Scenario: Token override
- **WHEN** a host overrides the code background token
- **THEN** the override wins over the selected theme's background value

### Requirement: Line numbers

Line numbers SHALL be optional. When enabled, every visible line SHALL show a number aligned with its source line, and the numbers SHALL NOT be included when text is selected or copied from the source area.

#### Scenario: Line numbers enabled
- **WHEN** line numbers are enabled for a ten-line snippet
- **THEN** each displayed line shows a corresponding number from 1 through 10

### Requirement: Highlighted lines

Hosts SHALL be able to mark one or more lines as highlighted using individual numbers, ranges, or an array combining both. Invalid or out-of-range entries SHALL be ignored, and highlighting SHALL NOT alter the source text.

#### Scenario: Range highlighting
- **WHEN** lines `2` and `5-7` are requested for a ten-line snippet
- **THEN** lines 2, 5, 6, and 7 receive the highlighted style and other lines do not

#### Scenario: Out-of-range entry
- **WHEN** a highlight range extends beyond the available lines
- **THEN** the existing lines in the range are highlighted and no error occurs

### Requirement: Truncation

When a positive maximum line count is configured, the highlighter SHALL display only that many lines and SHALL indicate that additional lines are hidden, including the hidden count when available. A zero or negative limit SHALL mean no truncation.

#### Scenario: Truncated output
- **WHEN** a 100-line source is rendered with a maximum of 20 lines
- **THEN** 20 lines are displayed with an indicator that 80 lines are hidden

### Requirement: Virtual scrolling

When virtual scrolling is enabled for a source that exceeds the visible area, only the visible lines plus a small overscan buffer SHALL be mounted in the DOM. The scroll container SHALL preserve the full content height and maintain a stable scroll position while scrolling. Virtualization SHALL activate only after client-side measurement; server rendering SHALL produce stable non-virtualized markup.

#### Scenario: Large source uses a windowed DOM
- **WHEN** a large source is rendered with virtual scrolling enabled on the client
- **THEN** the number of mounted line elements stays bounded while the scrollbar reflects the full content length

#### Scenario: Server fallback
- **WHEN** the component is rendered on the server with virtual scrolling enabled
- **THEN** the output contains stable line markup without measurement-dependent windowing

### Requirement: Delayed highlighting

Delayed highlighting SHALL be opt-in. When enabled, the source SHALL be displayed immediately in an unhighlighted state and highlighting SHALL be applied after the browser is idle or on a subsequent tick. The final highlighted output SHALL match a non-delayed render of the same source.

#### Scenario: Delayed render completes
- **WHEN** delayed highlighting is enabled for a large snippet
- **THEN** plain source appears first and the highlighted result replaces it without changing the scroll position

### Requirement: Empty input

An empty source string SHALL render an empty code area with stable dimensions and no error. A custom empty slot SHALL be able to replace the default empty content.

#### Scenario: Empty source
- **WHEN** the highlighter receives an empty string
- **THEN** it renders an empty code region without throwing

#### Scenario: Custom empty state
- **WHEN** a host provides an empty slot
- **THEN** the slot content is rendered instead of the default empty content

### Requirement: Customization and parts

The highlighter SHALL expose tokens, documented parts, labels for hidden-line and copy text when present, and slots for the header, footer, empty state, and actions. Structural parts SHALL include the root, header, code area, gutter, line, hidden-lines indicator, and empty state.

#### Scenario: Custom header
- **WHEN** a host provides a header slot
- **THEN** the default header is replaced while the code area and line behavior remain intact

#### Scenario: Stable part styling
- **WHEN** a host targets the gutter part
- **THEN** only the line-number gutter is affected

### Requirement: Accessibility

The source area SHALL expose a readable label, line numbers SHALL be hidden from assistive technology, and highlighted lines SHALL NOT rely on color alone to convey meaning. Keyboard scrolling and text selection SHALL remain available.

#### Scenario: Screen reader source
- **WHEN** a screen reader enters the source area
- **THEN** it announces the source region label and reads code without interleaved line numbers

#### Scenario: Non-color highlighting
- **WHEN** a line is highlighted
- **THEN** the highlight is conveyed through more than color, such as a marker or accessible description
