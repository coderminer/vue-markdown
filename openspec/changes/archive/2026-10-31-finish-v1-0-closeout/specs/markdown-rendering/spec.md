## MODIFIED Requirements

### Requirement: Source input

The renderer SHALL accept Markdown through a `source` prop or the default slot. When both are present, `source` SHALL win. The default slot SHALL be treated as raw Markdown text, not as pre-rendered VNodes, and SHALL be re-read when its text content changes so reactive slot content updates the document. The `source` prop SHALL remain controlled: the renderer SHALL NOT keep a private source copy, and `update:source` SHALL be emitted only when the host requests a source change through an exposed action. `v-model:source` SHALL work through the bound prop. Empty input SHALL render the empty state without throwing.

#### Scenario: Source prop
- **WHEN** a host passes Markdown through the `source` prop
- **THEN** the renderer parses and renders that string

#### Scenario: Default slot
- **WHEN** a host passes Markdown as the default slot content
- **THEN** the renderer treats the slot text as raw Markdown

#### Scenario: Reactive default slot
- **WHEN** the parent changes the default slot's text content after mount
- **THEN** the renderer re-parses and renders the new Markdown

#### Scenario: Both inputs
- **WHEN** a host supplies both `source` and default slot content
- **THEN** `source` is rendered and the slot is ignored

#### Scenario: Controlled source
- **WHEN** the `source` prop is bound and the default slot changes
- **THEN** the bound `source` value continues to render and no private source copy replaces it

#### Scenario: Two-way binding
- **WHEN** a host binds `v-model:source` and calls an exposed source action
- **THEN** the renderer emits `update:source` with the new source

### Requirement: Accessibility

The renderer SHALL preserve heading hierarchy, expose the TOC as a labeled navigation landmark, mark the active TOC entry with `aria-current`, keep heading IDs stable for in-page navigation, and expose render errors as status messages. Reading order and focus order SHALL follow the visual document order. Every heading with an ID SHALL render a heading anchor link unless the host replaces the heading component. The anchor SHALL use the `heading-anchor` part, the `headingAnchor` label as its accessible name, SHALL be keyboard reachable, and SHALL be hidden in print.

#### Scenario: Accessible TOC
- **WHEN** a screen reader navigates the TOC
- **THEN** it encounters a labeled navigation region and the current section is announced as current

#### Scenario: Heading anchor
- **WHEN** a heading with an ID is rendered through the default heading component
- **THEN** it contains a keyboard-reachable link to that ID with the `headingAnchor` accessible label and the `heading-anchor` part

#### Scenario: Print heading anchors
- **WHEN** the document is printed
- **THEN** heading anchor links are hidden

#### Scenario: Error announcement
- **WHEN** a render failure is displayed
- **THEN** the error is exposed as a status message without stealing focus
