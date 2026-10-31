## MODIFIED Requirements

### Requirement: Named slots

Each replaceable structural region SHALL provide a named slot with scoped props describing its current data and actions. A slot SHALL fully replace the default rendering for that region, and an empty or absent slot SHALL retain the default. Slot content SHALL receive typed context and SHALL remain functional when the host renders custom markup. Named region slots ship in v1.x. At minimum the renderer SHALL expose `root`, `toc`, `toc-item`, `content`, `error`, `empty`, and `loading`; the code block SHALL expose `code` and `code-actions`; the standalone highlighter SHALL expose `highlighter`; math SHALL expose `math` and `math-error`; the Mermaid block SHALL expose `mermaid` and `mermaid-error`; and the live editor SHALL expose `editor` and `editor-diagnostics`. Each slot's context SHALL include the region's current data and the same functional actions the default rendering uses, such as navigation, copy, download, retry, export, fullscreen, focus, or update actions.

#### Scenario: Replace the table of contents
- **WHEN** a host provides a TOC slot
- **THEN** the default TOC is not rendered and the slot receives the TOC items, active item, and navigation actions

#### Scenario: Custom code actions
- **WHEN** a host provides a code actions slot
- **THEN** the slot receives the source, language, and built-in copy/download actions and may render any subset

#### Scenario: Replace code content
- **WHEN** a host provides the code slot
- **THEN** the default code element is replaced while the wrapper, language metadata, and actions remain available through the slot context

#### Scenario: Replace math output
- **WHEN** a host provides the math slot
- **THEN** the default rendered math is not rendered and the slot receives the TeX source, display mode, rendered nodes, and error state

#### Scenario: Replace Mermaid output
- **WHEN** a host provides the Mermaid slot
- **THEN** the default preview is replaced and the slot receives the source, render status, last-good output, error, and actions

#### Scenario: Replace the live editor
- **WHEN** a host provides the editor slot
- **THEN** the default CodeMirror editor is replaced and the slot receives the current value, update action, diagnostics, status, and focus action

#### Scenario: Absent slot keeps the default
- **WHEN** a region slot is not provided or renders no content
- **THEN** the documented default rendering for that region is used
