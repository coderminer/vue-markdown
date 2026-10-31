# mermaid-editing Specification

## Purpose
Provides a live Mermaid source editor with debounced preview, injectable diagnostics, a resizable split layout, and fullscreen editing, with every region and message customizable by the host. Ships in v1.x.

## Requirements

### Requirement: Two-way source binding

The editor SHALL accept a Mermaid source value and SHALL emit updates whenever the user edits the source. External value changes SHALL replace the editor content without generating a spurious update event for the same value. Empty source SHALL be allowed and SHALL render a placeholder preview rather than an error.

#### Scenario: User edits source
- **WHEN** the user types into the editor
- **THEN** an update event carries the full new source and the preview updates after the configured delay

#### Scenario: External value change
- **WHEN** the host replaces the bound value with different source
- **THEN** the editor displays the new source and does not emit an update for that replacement

### Requirement: Debounced preview

Preview rendering SHALL be debounced by a configurable delay, defaulting to 300 milliseconds. A delay of zero SHALL render on the next tick. Rapid edits SHALL result in at most one preview render for the settled source.

#### Scenario: Rapid edits coalesce
- **WHEN** the user makes several edits within the debounce window
- **THEN** only the final source is rendered to the preview

### Requirement: Injectable diagnostics

The editor SHALL accept a diagnostics formatter that converts parser failures into a structured diagnostic with message, line, column, and optional raw details. The default formatter SHALL provide a friendly explanation. When no position is available, the diagnostic SHALL still be shown without a line marker. Invalid formatter output SHALL fall back to the default formatter.

#### Scenario: Custom diagnostic format
- **WHEN** a host supplies a diagnostics formatter
- **THEN** the editor displays the formatted message and mapped position for syntax errors

#### Scenario: No position
- **WHEN** the parser reports an error without a usable line
- **THEN** the diagnostic is shown without highlighting a line and the editor remains usable

### Requirement: Diagnostic presentation and navigation

The editor SHALL show a diagnostic panel, SHALL mark the affected line when a position is known, SHALL preserve the last successful preview, and SHALL allow the host to enable raw parser details, automatic scrolling to the error, and a compact diagnostic mode. All user-facing diagnostics text SHALL be overridable through labels.

#### Scenario: Syntax error is located
- **WHEN** the source contains a syntax error with a determinable line
- **THEN** the diagnostic identifies the line and the editor highlights it

#### Scenario: Raw details hidden
- **WHEN** raw parser details are disabled and a syntax error occurs
- **THEN** only the friendly explanation is shown

### Requirement: Preview resilience

An invalid edit SHALL NOT remove the last successful preview. Once the source becomes valid again, the preview SHALL update to the new diagram. Clearing the source SHALL show the empty-state placeholder instead of a stale diagram.

#### Scenario: Invalid edit keeps preview
- **WHEN** the user introduces a syntax error
- **THEN** the previous valid diagram remains visible alongside the diagnostic

### Requirement: Resizable split layout

The editor and preview SHALL be separated by a draggable divider. Dragging SHALL change the split within documented minimum sizes and SHALL keep both panes usable. The split SHALL support a configurable initial ratio, keyboard adjustment, and a reset action. Split state SHALL NOT be persisted unless the host chooses to.

#### Scenario: Drag divider
- **WHEN** the user drags the divider within the allowed bounds
- **THEN** both panes resize and neither collapses below its minimum size

#### Scenario: Keyboard adjustment
- **WHEN** the divider has focus and the user presses an arrow key
- **THEN** the split moves by a documented increment and remains within bounds

#### Scenario: Reset split
- **WHEN** the user activates reset
- **THEN** the split returns to its configured initial ratio

### Requirement: Fullscreen editing

The editor SHALL support a fullscreen mode that shows the editor and preview together, using the native Fullscreen API when available and a fixed-position fallback otherwise. Escape SHALL exit fullscreen, focus SHALL be contained, and page scrolling SHALL return to its previous state.

#### Scenario: Fullscreen fallback
- **WHEN** the native Fullscreen API is unavailable
- **THEN** the fixed-position fullscreen layout opens with the editor and preview usable

#### Scenario: Exit fullscreen
- **WHEN** fullscreen is active and Escape is pressed
- **THEN** the editor returns to its inline layout

### Requirement: Customization and parts

The editor SHALL expose documented tokens, stable parts for the root, editor pane, divider, preview pane, diagnostics, toolbar, and fullscreen surface, slots for the toolbar, editor, preview, diagnostics, empty state, and fullscreen controls, and labels for all controls and status messages. The editor SHALL accept the same highlighter and Mermaid renderer injection as the standalone Mermaid block.

#### Scenario: Replace the preview pane
- **WHEN** a host provides a preview slot
- **THEN** the slot receives the rendered SVG nodes, status, and error and can render a custom preview without losing editing behavior

#### Scenario: Shared renderer
- **WHEN** a host injects a custom Mermaid renderer
- **THEN** the editor preview uses the same renderer as the standalone block

### Requirement: Server rendering and client-only editor

The editor SHALL render a stable placeholder during server rendering and SHALL NOT load CodeMirror or Mermaid before mount. Hydration SHALL initialize the editor without layout shift or hydration mismatch.

#### Scenario: Server placeholder
- **WHEN** the editor is rendered on the server
- **THEN** a placeholder containing the current source is emitted without importing editor dependencies

#### Scenario: Client initialization
- **WHEN** the editor hydrates
- **THEN** the source, preview, and split layout initialize without replacing surrounding content

### Requirement: Accessibility

The editor SHALL expose an accessible name, keyboard editing and navigation, a labeled divider with separator semantics and value information, labeled diagnostics, and focus-visible styling. Fullscreen and split changes SHALL NOT trap focus outside the intended surface.

#### Scenario: Divider semantics
- **WHEN** a screen reader focuses the split divider
- **THEN** it announces the separator role, orientation, and current split value

#### Scenario: Diagnostic announcement
- **WHEN** a new diagnostic appears
- **THEN** it is announced without moving focus away from the editor
