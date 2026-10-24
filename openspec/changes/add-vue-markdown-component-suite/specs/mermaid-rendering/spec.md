## Purpose

Renders Mermaid diagram source into an interactive preview that tolerates incomplete or invalid source updates, with injectable rendering, view switching, navigation controls, fullscreen, copy, and image export, all customizable without forking the component. Ships in v1.x.

## ADDED Requirements

### Requirement: Diagram rendering

A Mermaid block SHALL render valid diagram source into an SVG preview using the configured theme, with `securityLevel: 'strict'`. Rendering SHALL occur in the browser and SHALL NOT execute scripts or arbitrary HTML embedded in diagram labels. Rendered SVG SHALL be parsed into nodes and sanitized; it SHALL NOT be injected with `v-html`. The Mermaid runtime SHALL be loaded lazily, only when a diagram actually needs rendering. Concurrent renders SHALL be serialized, SHALL use unique IDs, and SHALL discard stale results.

#### Scenario: Valid diagram renders
- **WHEN** a block receives valid flowchart source
- **THEN** an SVG preview of the diagram is displayed with the configured theme

#### Scenario: Runtime is lazy
- **WHEN** a page imports the library but contains no Mermaid blocks
- **THEN** the Mermaid runtime is not requested

#### Scenario: Multiple diagrams
- **WHEN** a document contains several diagrams rendering at once
- **THEN** each render uses a unique ID, results do not collide, and stale updates are discarded

#### Scenario: SVG safety
- **WHEN** a diagram label contains script-like content
- **THEN** the rendered SVG is sanitized and no script executes

### Requirement: Injectable diagram renderer

The block SHALL accept a renderer function or adapter that replaces the default Mermaid runtime. The injected renderer SHALL receive the source, theme, and a render identifier, and SHALL return SVG nodes or a structured result. The block SHALL NOT inject raw SVG markup returned as a string. Invalid results SHALL be reported as render errors without replacing the last good preview.

#### Scenario: Custom renderer
- **WHEN** a host injects a renderer backed by a different Mermaid build or a remote service
- **THEN** the block displays the returned SVG nodes and does not load the default Mermaid runtime

#### Scenario: Invalid renderer output
- **WHEN** the injected renderer returns no usable SVG nodes
- **THEN** the failure is reported and the previous preview remains visible

#### Scenario: Unsafe renderer output
- **WHEN** an injected renderer returns nodes containing a script or event-handler attribute
- **THEN** the unsafe node or attribute is removed before rendering

### Requirement: Last-good rendering for incomplete or invalid source

While the source is incomplete or invalid, the block SHALL keep displaying the last successfully rendered diagram instead of blanking the preview. A pending state SHALL be shown while a source update is being applied. Once the source settles as complete and invalid, the block SHALL report a render error and SHALL show an error message only when error display is enabled.

#### Scenario: Incomplete source update
- **WHEN** an update temporarily produces an incomplete diagram
- **THEN** the previous valid diagram remains visible with a pending indication and no error message

#### Scenario: Completed invalid source
- **WHEN** an update settles and the final source is invalid
- **THEN** the last valid diagram remains visible and a render error is reported

### Requirement: Preview and source views

The block SHALL offer a toggle between a rendered preview and the original Mermaid source when view switching is enabled. Source view SHALL display the exact current source and SHALL remain available when rendering fails. The active view and the toggle control SHALL expose their state to assistive technology.

#### Scenario: Switch to source view
- **WHEN** the user switches a rendered block to source view
- **THEN** the exact Mermaid source text is displayed

#### Scenario: Toggle state
- **WHEN** the view changes
- **THEN** the control exposes the selected view through ARIA state

### Requirement: Zoom and pan

The preview SHALL support zoom within documented minimum and maximum bounds and SHALL allow panning when the diagram overflows the viewport. Reset SHALL restore the initial zoom and position. Zoom and pan SHALL NOT modify the diagram source, and controls SHALL expose current zoom.

#### Scenario: Zoom bounds
- **WHEN** the user zooms beyond the maximum or minimum
- **THEN** the zoom stops at the bound and the diagram remains rendered

#### Scenario: Pan overflowing diagram
- **WHEN** a zoomed diagram overflows its container and the user drags
- **THEN** the visible portion moves while the document layout remains stable

### Requirement: Fullscreen

The block SHALL provide a fullscreen preview. It SHALL use the native Fullscreen API when available and permitted, and SHALL fall back to a fixed-position fullscreen presentation when the API is unavailable or denied. Escape SHALL exit fullscreen, page scrolling SHALL be locked while fullscreen is active, focus SHALL be contained within the fullscreen surface, and the previous state SHALL be restored on exit.

#### Scenario: Native fullscreen unavailable
- **WHEN** the native Fullscreen API is unsupported or rejects the request
- **THEN** the fixed-position fallback opens and remains usable

#### Scenario: Escape exits
- **WHEN** fullscreen is active and the user presses Escape
- **THEN** fullscreen closes and page scrolling returns to its previous state

### Requirement: Copy source

The block SHALL offer a copy action that copies the exact current Mermaid source. A successful copy SHALL show a temporary success state and emit a copy event; a failed copy SHALL emit an error and keep the action available. The copy action SHALL be replaceable through the actions slot.

#### Scenario: Copy diagram source
- **WHEN** the user activates copy
- **THEN** the clipboard receives the exact source and the action shows success feedback

### Requirement: PNG export

The block SHALL export the currently rendered diagram as a PNG when export is available. Export SHALL use the sanitized SVG currently displayed, not an in-flight source update. Export SHALL be unavailable or clearly rejected when no diagram has rendered. A host-provided export function SHALL be able to replace the default export pipeline.

#### Scenario: Export rendered diagram
- **WHEN** the user exports a successfully rendered diagram
- **THEN** a PNG file representing the displayed diagram is downloaded

#### Scenario: Export failure preserves preview
- **WHEN** the export pipeline fails
- **THEN** an error is reported and the diagram preview remains visible

#### Scenario: Export uses sanitized output
- **WHEN** a diagram is exported
- **THEN** only the sanitized rendered nodes are serialized for rasterization

### Requirement: Customization and parts

The block SHALL expose documented tokens for preview background, border, controls, pending, and error states; stable parts for the root, header, tabs, actions, preview viewport, source view, pending overlay, and error region; slots for actions, toolbar, header, pending, error, and preview; and labels for all controls.

#### Scenario: Custom header
- **WHEN** a host provides a header slot
- **THEN** the default header is replaced while preview, zoom, and fullscreen behavior remain available through scoped context

#### Scenario: Custom pending state
- **WHEN** a host provides a pending slot
- **THEN** the custom pending content is shown while the last good diagram remains underneath or hidden according to host markup

### Requirement: Server rendering and client-only behavior

The block SHALL render a stable placeholder during server rendering and SHALL NOT load Mermaid or access browser APIs before mount. Hydration SHALL preserve the placeholder until the client renderer is ready, and SHALL NOT produce a hydration mismatch.

#### Scenario: Server placeholder
- **WHEN** the block is rendered on the server
- **THEN** a placeholder with the source available for later rendering is emitted without importing Mermaid

#### Scenario: Client initialization
- **WHEN** the block hydrates on the client
- **THEN** the diagram renders without replacing the surrounding document structure

### Requirement: CSP compatibility

The Mermaid block SHALL document its CSP requirements. The default renderer SHALL not require `unsafe-eval` beyond what the Mermaid runtime itself documents, and the library SHALL not inject inline scripts. A host that cannot satisfy Mermaid's requirements SHALL be able to supply a remote or pre-rendered renderer.

#### Scenario: Strict host policy
- **WHEN** a host applies a CSP that the default Mermaid runtime cannot satisfy
- **THEN** the documentation identifies the constraint and the host can inject a compatible renderer

### Requirement: Accessibility

The rendered diagram SHALL be exposed as an image with an accessible name and description derived from the source or host-provided labels. Controls SHALL be keyboard operable with accessible names, zoom changes SHALL be announced when appropriate, and the source view SHALL be readable and selectable.

#### Scenario: Diagram description
- **WHEN** a screen reader encounters the rendered diagram
- **THEN** it announces the diagram role, name, and description

#### Scenario: Keyboard controls
- **WHEN** the user navigates the block controls by keyboard
- **THEN** every control is reachable and operable without a pointer
