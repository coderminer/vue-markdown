# code-blocks Specification

## Purpose
Presents fenced code output with language identification, pluggable syntax highlighting, and customizable copy and download actions so hosts can match their product's code presentation without forking the component. Ships in v1.x; v1.0 renders fences through `components.code` and `components.pre`.

## Requirements

### Requirement: Code block presentation

A code block SHALL display the fenced language identifier, or a plain-text label when no language is given. The highlighted code nodes SHALL preserve the original whitespace and line structure, and long lines SHALL remain available through horizontal scrolling rather than being truncated.

#### Scenario: Labeled fenced block
- **WHEN** a fenced block declares the language `typescript`
- **THEN** the block shows a `typescript` label and renders syntax-highlighted code preserving indentation

#### Scenario: Unlabeled fenced block
- **WHEN** a fenced block declares no language
- **THEN** the block renders with a plain-text label and unhighlighted source

### Requirement: Header and line presentation

The block SHALL let hosts replace the default header or expose a title and file
name, and SHALL support optional line numbers, highlighted line ranges,
truncation, and virtual scrolling with the same options as the standalone
highlighter. A custom code slot SHALL receive the highlighted result and its
normalized nodes so custom markup does not need to re-run the adapter.

#### Scenario: Custom header
- **WHEN** a host supplies a header slot or a file name
- **THEN** the default language label is replaced or augmented while actions keep working

#### Scenario: Highlighted slot data
- **WHEN** a host renders the code slot
- **THEN** the slot receives the source, language, highlighted result, and normalized nodes

### Requirement: Injectable syntax highlighting

The component SHALL use the shared highlighter adapter contract. The default adapter SHALL use highlight.js through that contract. The library SHALL ship Shiki as an official optional adapter with asynchronous preloading and dual-theme support, and hosts SHALL be able to supply any other adapter. Adapters SHALL return normalized nodes rather than HTML strings. The active adapter SHALL be selectable by local prop, nearest provider, preset, or built-in default, in that order. Asynchronous adapters SHALL show unhighlighted source until ready. An invalid adapter SHALL be reported and SHALL fall back to plain text without breaking the block.

#### Scenario: Default highlighter
- **WHEN** a host does not supply a highlighter
- **THEN** the block uses highlight.js and renders highlighted markup synchronously

#### Scenario: Shiki highlighter
- **WHEN** a host selects the official Shiki adapter
- **THEN** the block renders Shiki output after the adapter is ready and keeps copy, labels, and layout unchanged

#### Scenario: Local override
- **WHEN** a provider configures Shiki and one block passes highlight.js locally
- **THEN** that block uses highlight.js and other blocks keep Shiki

#### Scenario: Asynchronous adapter
- **WHEN** a custom adapter exposes an asynchronous load step
- **THEN** the block displays plain source first and switches to highlighted output when loading completes

#### Scenario: Invalid adapter
- **WHEN** a supplied adapter does not implement the required method
- **THEN** the block reports the problem and renders plain text without throwing

### Requirement: Highlight result and caching

The block SHALL accept content-level highlighted nodes or full block nodes from an adapter. Content-level output SHALL be placed inside the block's own code element; full block output SHALL be rendered inside the block body without duplicating the wrapper. The block SHALL preserve its header, actions, and copy behavior in both cases. Highlighted output SHALL be cached by adapter identity, source, language, theme, and adapter options. Adapter nodes SHALL be structurally validated before rendering.

#### Scenario: Full block output
- **WHEN** an adapter returns full block nodes such as a Shiki `pre` element
- **THEN** the block renders them inside the body while keeping its own header and actions

#### Scenario: Unknown language
- **WHEN** the language is unavailable in the adapter
- **THEN** plain source nodes are rendered and copy still returns the exact source

#### Scenario: Cached snippet
- **WHEN** the same snippet is rendered again with the same adapter, language, and theme
- **THEN** the adapter is not invoked again for that combination

### Requirement: Theme and server behavior

The block's theme SHALL be passed to the adapter, which SHALL map it to its own theme set; container surfaces SHALL remain controlled by library tokens. Synchronous adapters SHALL produce highlighted nodes during server rendering. Asynchronous adapters SHALL emit plain source nodes on the server and upgrade after hydration unless precomputed output is supplied. Adapter output SHALL be treated as trusted host code but structurally validated, with built-in adapters escaping source text.

#### Scenario: Shiki auto theme
- **WHEN** the block is in auto mode with a dual-theme Shiki adapter
- **THEN** token colors follow the active color scheme while container tokens stay unchanged

#### Scenario: Server rendering
- **WHEN** the block renders on the server with the highlight.js adapter
- **THEN** highlighted static markup is present without browser APIs

### Requirement: Copy action

When actions are enabled, the block SHALL offer a copy action that copies the exact source text, not the highlighted markup. A successful copy SHALL show a temporary success state, emit a copy event, and return to the idle state after a short delay. A failed copy SHALL leave the action available, show a failure indication, and emit an error event.

#### Scenario: Copy source text
- **WHEN** the user activates copy on a block containing indentation and quotes
- **THEN** the clipboard receives the exact source and the button shows a success state

#### Scenario: Clipboard failure
- **WHEN** the clipboard write rejects
- **THEN** a `copy-error` diagnostic is reported through the error event and the copy action remains usable

### Requirement: Download action

When download is explicitly enabled, the block SHALL offer a download action that saves the exact source text as a file. The file name SHALL be derived from the configured file name when provided, otherwise from the language with a reasonable extension, falling back to a generic text extension. Activating the action SHALL emit a download event.

#### Scenario: Download enabled
- **WHEN** the user activates download on a JavaScript block with no configured file name
- **THEN** a `.js` file containing the exact source is saved and a download event is emitted

#### Scenario: Download hidden by default
- **WHEN** download has not been enabled
- **THEN** no download action is rendered

### Requirement: Custom actions

Hosts SHALL be able to add, remove, or replace toolbar actions without rebuilding the component. Custom actions SHALL receive the source, language, and built-in action handles, SHALL participate in the same keyboard and visual layout as built-in actions, and SHALL be renderable through the actions slot.

#### Scenario: Add a custom action
- **WHEN** a host adds a "run" action for JavaScript blocks
- **THEN** the action appears in the toolbar with the same accessibility and state behavior as built-in actions

#### Scenario: Custom action failure
- **WHEN** a custom action throws
- **THEN** an `action-error` diagnostic is reported through the error event and the block keeps rendering

#### Scenario: Remove built-in actions
- **WHEN** a host renders only a custom action through the actions slot
- **THEN** built-in copy and download controls are not rendered

### Requirement: Visibility, theming, and parts

Hosts SHALL be able to hide all actions, select a highlighting theme, and style every structural part. The block SHALL expose documented tokens, stable part attributes for the root, header, language label, toolbar, actions, code area, and feedback state, and SHALL fall back to the default theme for unknown theme names.

#### Scenario: Actions disabled
- **WHEN** a host disables code actions
- **THEN** the block renders the language label and code with no copy or download controls

#### Scenario: Part styling
- **WHEN** a host targets the code toolbar part
- **THEN** the toolbar styling changes without affecting the Mermaid toolbar

### Requirement: Accessible controls

Every action SHALL be a keyboard-operable button with an accessible name that identifies its purpose. Copy success or failure feedback SHALL be exposed to assistive technology without moving focus away from the action.

#### Scenario: Keyboard operation
- **WHEN** the copy button receives keyboard focus and the user activates it
- **THEN** the copy runs and focus remains on the button while feedback is announced

### Requirement: Static rendering

The code block SHALL render usable static markup during server rendering, including the language label and source text, and SHALL NOT require browser APIs to produce its initial output. Copy and download actions MAY be inactive until hydration but SHALL remain present when enabled.

#### Scenario: Server output
- **WHEN** the block is rendered on the server
- **THEN** the language label and code text are present in the output without accessing the clipboard or browser download APIs
