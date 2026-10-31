# math-rendering Specification

## Purpose
Adds first-class KaTeX support for inline and display mathematics through the official `remark-math` + `rehype-katex` integration, with an injectable math engine, accessible MathML output, graceful error fallback, caching, and the same node-component and plugin customization rules as every other construct. Math ships in v1.x.

## Requirements

### Requirement: Inline and display math parsing

The math plugin SHALL compose `remark-math` for parsing. Inline math delimited by `$...$` and display math delimited by `$$...$$` SHALL be supported by default. Delimiters SHALL be configurable through the documented plugin options. Escaped delimiters SHALL remain literal text, math inside fenced or inline code SHALL NOT be parsed, and unmatched delimiters SHALL fall back to literal text. The parsed node SHALL carry the exact TeX source and display mode. The library SHALL NOT implement its own math tokenizer.

#### Scenario: Inline math
- **WHEN** a paragraph contains `$E = mc^2$`
- **THEN** the math node carries `E = mc^2` with display mode disabled and the surrounding text remains intact

#### Scenario: Display math
- **WHEN** a block contains `$$\\int_0^1 x^2 dx$$`
- **THEN** the math node carries the integral expression with display mode enabled

#### Scenario: Code is not math
- **WHEN** `$not math$` appears inside a fenced code block or inline code
- **THEN** it is rendered as code and not parsed as math

#### Scenario: Unmatched delimiter
- **WHEN** a document contains a single unmatched `$`
- **THEN** the dollar sign renders as literal text without an error

### Requirement: Default KaTeX engine

The default math engine SHALL use KaTeX through `rehype-katex`. Rendering SHALL produce both visual HTML and MathML by default, SHALL support display mode, and SHALL NOT throw into the document render path when TeX is invalid. KaTeX output SHALL be normalized into nodes. KaTeX options SHALL be configurable, including strictness, trust, macros, and output format.

#### Scenario: Valid formula
- **WHEN** a valid formula is rendered with the default engine
- **THEN** the output contains KaTeX markup for the formula in the requested display mode

#### Scenario: Invalid formula
- **WHEN** a formula contains an unknown command or malformed group
- **THEN** the node renders a readable error fallback and reports a math diagnostic without breaking the document

### Requirement: Injectable math engine

Hosts SHALL be able to replace KaTeX with another engine through a documented adapter interface. The adapter SHALL receive the TeX source and options and return normalized nodes or MathML plus an optional error. An invalid adapter SHALL be reported and the default engine or readable TeX fallback SHALL be used.

#### Scenario: Custom engine
- **WHEN** a host supplies a math engine adapter
- **THEN** all math nodes use that engine while expression parsing and display mode remain unchanged

#### Scenario: Invalid engine
- **WHEN** a supplied adapter does not implement the required method
- **THEN** the node reports the problem and falls back without crashing

### Requirement: Math node component

Math SHALL render through the exported `MarkdownMath` node component. The component SHALL receive the TeX source, display mode, rendered nodes, error state, and math context, and SHALL support host replacement, a custom math slot, and a custom error slot. Replacing the component SHALL NOT change parsing, caching, or accessibility metadata.

#### Scenario: Replace math rendering
- **WHEN** a host replaces `MarkdownMath` with a component backed by a different renderer
- **THEN** inline and display math use the replacement while the document model remains unchanged

#### Scenario: Custom error slot
- **WHEN** rendering fails and a host provides an error slot
- **THEN** the slot receives the TeX source and diagnostic and replaces the default fallback

### Requirement: Accessibility

The default output SHALL include MathML alongside visual markup or an equivalent accessible representation. Display math SHALL be exposed as a math region with an accessible name or label, inline math SHALL remain readable in sentence flow, and the visual formula SHALL NOT be duplicated in the accessibility tree when MathML is present.

#### Scenario: Screen reader formula
- **WHEN** a screen reader encounters a display formula
- **THEN** it announces a math region and reads the MathML expression

#### Scenario: Inline flow
- **WHEN** inline math appears inside a sentence
- **THEN** the surrounding sentence remains readable without duplicate formula announcements

### Requirement: Security

The default engine SHALL disable trust for commands that inject HTML, URLs, or styles. Strictness SHALL default to a safe mode, and enabling trusted commands SHALL require an explicit host option documented as a trust boundary. Rendered math output SHALL be normalized into nodes and validated; it SHALL NOT be injected with `v-html`, and the same URL and event-handler rules SHALL apply.

#### Scenario: Trusted command blocked
- **WHEN** a formula uses a command that would inject HTML and trust is not enabled
- **THEN** the command is rejected or rendered as an error instead of injecting markup

#### Scenario: Explicit trust
- **WHEN** a host explicitly enables trusted math commands
- **THEN** the trust decision is documented and limited to the math rendering path

### Requirement: Plugin integration and configuration

Math SHALL be provided by an official opt-in `mathPlugin`. The plugin SHALL compose `remark-math` and `rehype-katex`, register the math node component, labels, and the optional math stylesheet. It SHALL be disableable, replaceable, and composable with other plugins. The default plugin preset SHALL document whether math is included; if excluded, enabling it SHALL be a one-line plugin addition.

#### Scenario: Enable math
- **WHEN** a host adds `mathPlugin()` to the renderer plugins
- **THEN** inline and display math render through the math node component

#### Scenario: Disable math
- **WHEN** the math plugin is disabled
- **THEN** dollar-delimited content renders as literal text and no KaTeX module is loaded

### Requirement: Lazy loading and server rendering

The math engine SHALL be loaded only when the math plugin is enabled and a math node is present. The plugin SHALL support a synchronously available engine for server rendering and an asynchronously loaded engine for client bundles. When the engine is not yet available, the node SHALL render readable TeX, and SHALL switch to rendered math when ready without layout instability.

#### Scenario: Lazy client engine
- **WHEN** the math plugin is enabled but no math node exists
- **THEN** the math engine is not requested

#### Scenario: Server rendering
- **WHEN** the plugin is configured with an available engine on the server
- **THEN** the server output contains rendered math and stable markup

#### Scenario: Engine still loading
- **WHEN** a math node renders before an asynchronous engine is ready
- **THEN** readable TeX is shown first and replaced when rendering completes

### Requirement: Rendering cache

Rendered math SHALL be cached by TeX source, display mode, engine identifier, and relevant engine options. Cache entries SHALL NOT leak across different engine configurations, and repeated renders of unchanged formulas SHALL reuse the cached output.

#### Scenario: Repeated formula
- **WHEN** the same formula appears multiple times in a document
- **THEN** the engine renders it once and reuses the cached output

#### Scenario: Option change
- **WHEN** engine options change
- **THEN** the cache is invalidated for the affected configuration

### Requirement: Styling and parts

The math component SHALL expose documented tokens and parts for inline math, display math, error fallback, and the math region. KaTeX styles and fonts SHALL be delivered through an optional stylesheet entry and SHALL NOT be required for readable TeX fallback. Host overrides SHALL be scoped and SHALL NOT rely on global KaTeX selectors.

#### Scenario: Optional styles
- **WHEN** the host imports the math stylesheet
- **THEN** formulas use the expected KaTeX layout and fonts

#### Scenario: No math styles
- **WHEN** the host does not import the math stylesheet
- **THEN** formulas remain readable and the error fallback remains usable

### Requirement: Diagnostics and events

Malformed formulas SHALL produce a structured diagnostic containing the TeX source, message, and optional position. The renderer SHALL emit a math error event once per changed formula, SHALL NOT spam repeated identical errors, and SHALL preserve other document content.

#### Scenario: Error event
- **WHEN** a formula fails to render
- **THEN** a math error event carries the TeX source and diagnostic

#### Scenario: Error loop prevention
- **WHEN** the same invalid formula is re-rendered unchanged
- **THEN** the error is not emitted repeatedly in a loop

### Requirement: Tests and fixtures

The repository SHALL include fixture documents and tests covering inline math, display math, nested formatting, escaped delimiters, code exclusion, invalid commands, custom engines, caching, accessibility output, server rendering, and styling without KaTeX CSS.

#### Scenario: Math fixture
- **WHEN** the math fixture suite runs
- **THEN** every documented math behavior is covered by at least one assertion
