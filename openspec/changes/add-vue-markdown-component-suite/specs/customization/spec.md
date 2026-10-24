## Purpose

Defines customization as a first-class, cross-cutting contract: every visual part, structural region, user-facing string, and behavior of the component suite can be styled, replaced, configured, or extended without forking the library or patching internal components.

## ADDED Requirements

### Requirement: Uniform customization contract

Every public component SHALL expose customization through the same documented layers: design tokens, stable parts, slots, tag/region/node component overrides, behavior injection, and preset/provider configuration. A component SHALL NOT require a different customization mechanism for the same kind of change. v1.0 ships tokens, parts, the `components` map, and the provider; named region slots, `regions`, `nodeComponents`, presets, and manifests ship in v1.x with the same contract.

#### Scenario: Same change works across components
- **WHEN** a host restyles the action toolbar of the code block and the Mermaid block
- **THEN** both toolbars can be targeted through the same token, part, and slot conventions without component-specific CSS hacks

#### Scenario: New component follows the contract
- **WHEN** a new component is added to the suite
- **THEN** it documents its tokens, parts, slots, labels, and behavior hooks in the same format as existing components

### Requirement: Design tokens

The library SHALL define documented CSS custom properties for color, background, border, typography, spacing, radius, shadow, motion, code surfaces, and Mermaid surfaces. Tokens SHALL be inheritable from any ancestor scope, SHALL have safe defaults, and SHALL NOT require global stylesheet overrides.

#### Scenario: Scoped token override
- **WHEN** a host sets token values on a wrapper element
- **THEN** only the components inside that wrapper adopt the overridden values

#### Scenario: Partial override
- **WHEN** a host overrides only the accent color token
- **THEN** all other token values keep their defaults

### Requirement: Theme presets and color modes

Components SHALL support `light`, `dark`, `auto`, and `custom` theme modes. `auto` SHALL follow the user's color-scheme preference without JavaScript requirements. The selected mode SHALL be expressed through a stable `data-vmd-theme` attribute scoped to the component subtree, and SHALL NOT restyle the host page.

#### Scenario: Automatic dark mode
- **WHEN** the theme mode is `auto` and the user prefers a dark color scheme
- **THEN** the component subtree uses dark token values while the host page remains unchanged

#### Scenario: Custom mode
- **WHEN** the theme mode is `custom`
- **THEN** the library applies no preset color values and uses the host's token overrides

### Requirement: Stable parts and state hooks

Every structural element that a host may reasonably style SHALL expose a stable `data-vmd-part="<name>"` attribute and a `vmd-` prefixed class. Interactive elements SHALL expose state through `data-state` or documented ARIA attributes. Part names and classes SHALL be documented, SHALL remain stable within a major version, and SHALL NOT be generated or hashed.

#### Scenario: Style a specific part
- **WHEN** a host targets `[data-vmd-part="code-toolbar"]`
- **THEN** the code block toolbar is styled without wrapping or deep selector chains

#### Scenario: State-based styling
- **WHEN** a copy action succeeds
- **THEN** the action exposes a documented success state that the host can style

### Requirement: Named slots

Each replaceable structural region SHALL provide a named slot with scoped props describing its current data and actions. A slot SHALL fully replace the default rendering for that region, and an empty or absent slot SHALL retain the default. Slot content SHALL receive typed context and SHALL remain functional when the host renders custom markup. Named region slots ship in v1.x.

#### Scenario: Replace the table of contents
- **WHEN** a host provides a TOC slot
- **THEN** the default TOC is not rendered and the slot receives the TOC items, active item, and navigation actions

#### Scenario: Custom code actions
- **WHEN** a host provides a code actions slot
- **THEN** the slot receives the source, language, and built-in copy/download actions and may render any subset

### Requirement: Tag component overrides

The library SHALL accept a `components` map keyed by HTML tag name, aligned with react-markdown. Values SHALL be components or tag-name strings. Supported keys SHALL include `p`, `h1`–`h6`, `em`, `strong`, `del`, `a`, `img`, `ul`, `ol`, `li`, `blockquote`, `hr`, `table`, `thead`, `tbody`, `tr`, `th`, `td`, `pre`, `code`, `br`, and `input`, plus plugin-introduced tags. Tag overrides SHALL be resolvable from local props, the configuration provider, or a preset, and SHALL receive the normalized node, attributes, children renderer, default renderer, and render context.

#### Scenario: React-style heading override
- **WHEN** a host supplies `components: { h1: 'h2' }`
- **THEN** level-one headings render as `h2` while other headings keep their defaults

#### Scenario: React-style link override
- **WHEN** a host supplies `components: { a: MyLink }`
- **THEN** every link uses `MyLink` and receives normalized link props

#### Scenario: Tag override from a preset
- **WHEN** a preset supplies a tag component and the host does not override it locally
- **THEN** the preset component is used

### Requirement: Region component overrides

The library SHALL accept a typed `regions` map for structural regions such as root, content, TOC, TOC item, code block, Mermaid block, error, empty, and loading states. An override SHALL receive the same documented props and context as the default component. Region overrides SHALL be resolvable from local props, the configuration provider, or a preset.

#### Scenario: Replace the error component
- **WHEN** a host supplies an error region override
- **THEN** render failures are displayed through that component with the error and retry context

#### Scenario: Override inheritance
- **WHEN** a provider defines a TOC item region override and a component defines a different one locally
- **THEN** the local override is used

### Requirement: Node component and renderer overrides

Hosts SHALL be able to override rendering for Markdown constructs by node kind or element tag, including headings, links, images, lists, tables, blockquotes, code, math, Mermaid, footnotes, task items, raw HTML, and custom nodes. The primary override surface SHALL be the exported node component catalog. A function-based node renderer SHALL be available as a value of `nodeComponents`, SHALL take precedence over a component for the same key, and SHALL receive the node, its children renderer, the default renderer, and the render context, allowing both replacement and decoration.

Resolution SHALL be deterministic: function value in `nodeComponents` > `nodeComponents[tag]` > `components[tag]` > `nodeComponents[kind]` > plugin node component > preset > built-in. At the same key, `nodeComponents` SHALL win over `components`. For fenced code, the semantic `nodeComponents.code` override SHALL win over the tag aliases `components.pre` and `components.code`.

#### Scenario: Replace an image component
- **WHEN** a host supplies an image node component
- **THEN** every image is rendered by that component while default alt text, safety, and loading behavior remain available through the documented props

#### Scenario: Decorate links with a renderer
- **WHEN** a host wraps the default link renderer to add an external-link marker
- **THEN** every link is rendered by the custom renderer while retaining default safety and target behavior

#### Scenario: Replace headings
- **WHEN** a host overrides heading rendering
- **THEN** heading IDs and TOC entries remain stable and navigation still works

#### Scenario: Tag and kind conflict
- **WHEN** a host supplies `components.a` and `nodeComponents.link`
- **THEN** `components.a` wins because the exact tag override is more specific

### Requirement: Behavior injection

The library SHALL allow hosts to replace behavior without replacing UI, including the Markdown pipeline, syntax highlighting, math rendering, heading slug generation, URL transformation, Mermaid rendering, and Mermaid diagnostic formatting. Injected behavior SHALL use documented interfaces, SHALL be validated, and SHALL fall back to the default behavior with a reported error when invalid. Sanitization SHALL be customized through a rehype plugin or schema extension rather than a bespoke HTML hook. Highlighting SHALL support the official highlight.js and Shiki adapters as well as custom adapters through the same node-based interface.

#### Scenario: Bring your own highlighter
- **WHEN** a host supplies a highlighter adapter for a different highlighting engine
- **THEN** code blocks and the standalone highlighter use it while retaining copy, labels, and layout behavior

#### Scenario: Choose an official highlighter
- **WHEN** a host selects the Shiki adapter instead of the default highlight.js adapter
- **THEN** the same components render Shiki output without any component changes

#### Scenario: Custom pipeline
- **WHEN** a host supplies a custom `MarkdownPipeline`
- **THEN** the document model and all components continue to work through the normalized contract

#### Scenario: Custom math engine
- **WHEN** a host supplies a math engine instead of KaTeX
- **THEN** math nodes render through that engine while parsing, accessibility metadata, and error fallback stay intact

#### Scenario: Custom slugger
- **WHEN** a host supplies a slug generator
- **THEN** heading IDs and TOC links use the generated slugs and duplicate handling still guarantees uniqueness

### Requirement: Labels and internationalization

Every user-facing string SHALL be overridable through a labels configuration, including action names, status messages, empty states, error text, TOC labels, and fullscreen controls. Labels SHALL support static strings and functions receiving context, SHALL merge with defaults, and SHALL NOT be hardcoded in component templates.

#### Scenario: Localized controls
- **WHEN** a host supplies labels in another language
- **THEN** every built-in control and status message uses the supplied language

#### Scenario: Dynamic label
- **WHEN** a label is a function receiving a count or state
- **THEN** the rendered text reflects the provided context

#### Scenario: CJK text
- **WHEN** a document contains Chinese, Japanese, or Korean text
- **THEN** line breaking, spacing, and heading IDs remain correct without requiring a special locale

### Requirement: Configuration provider and precedence

The library SHALL provide a configuration provider for app-wide defaults covering tokens, theme, labels, tag components, region components, node components, plugins, pipeline, highlighter, math engine, and other injected behavior. Nested providers SHALL merge with outer providers. Override precedence SHALL be deterministic and documented: local props > nearest provider > preset > plugin defaults > built-in defaults. Region rendering SHALL follow: slot > region component override > plugin contribution > preset > built-in. Node rendering SHALL follow: function value in `nodeComponents` > `nodeComponents[tag]` > `components[tag]` > `nodeComponents[kind]` > plugin node component > preset > built-in.

#### Scenario: App-wide defaults with local exception
- **WHEN** a provider sets a label and one component passes a different label locally
- **THEN** the local label wins for that component and other components use the provider value

#### Scenario: Deterministic conflicts
- **WHEN** a slot, component override, and node component target the same region
- **THEN** the documented precedence selects exactly one result and emits no duplicate content

### Requirement: Presets

The library SHALL support shareable presets that bundle plugins, tag components, region components, node components, labels, tokens, theme defaults, and injected behavior including the pipeline, highlighter, math engine, and Mermaid renderer under a unique name. Presets SHALL be composable, SHALL be inspectable, and SHALL NOT mutate global state when applied. Because presets contain components, plugin instances, and functions, they are declarative but not JSON-serializable; the documentation states this explicitly.

#### Scenario: Apply a preset
- **WHEN** a host applies a preset to a renderer
- **THEN** the preset's plugins, components, labels, and defaults are used without affecting other renderer instances

#### Scenario: Compose presets
- **WHEN** two presets are composed
- **THEN** later presets override earlier values deterministically and the resulting configuration can be inspected

### Requirement: Unstyled and headless usage

The library SHALL support two escape hatches: styled components used without importing library CSS, and headless composables that provide no preset markup. In both modes, accessibility, keyboard behavior, state exposure, and documented part attributes SHALL remain available, and behavior SHALL NOT depend on library CSS.

#### Scenario: Unstyled components
- **WHEN** a host imports components but not the library stylesheet
- **THEN** components remain functional and expose parts and state for host styling

#### Scenario: Fully custom UI
- **WHEN** a host uses the headless composables
- **THEN** it can render its own markup while receiving the document model, TOC, search state, and actions

### Requirement: Direction, motion, and focus customization

The library SHALL use direction-aware layout, SHALL respect `prefers-reduced-motion` by disabling non-essential animation, and SHALL preserve visible keyboard focus. Hosts SHALL be able to override motion duration and focus styling through tokens without losing accessibility.

#### Scenario: Right-to-left layout
- **WHEN** a component subtree is rendered in a right-to-left direction
- **THEN** spacing, borders, and toolbar alignment follow the document direction

#### Scenario: Reduced motion
- **WHEN** the user prefers reduced motion
- **THEN** transitions and non-essential animations are disabled or shortened

### Requirement: Inspectable customization manifests

Every public component SHALL publish a machine-readable customization manifest listing its tokens, parts, slots, labels, component override keys, and behavior hooks. Manifests SHALL be exported from the package, SHALL match the actual implementation, and SHALL power documentation and the demo customization inspector.

#### Scenario: Discover customization points
- **WHEN** a host reads a component's manifest
- **THEN** it can enumerate every supported token, part, slot, label, and override without reading source code

#### Scenario: Manifest accuracy
- **WHEN** a customization test compares a manifest with rendered output
- **THEN** every declared part and slot exists and no undeclared part is required for documented styling

### Requirement: Print and forced colors

Components SHALL remain readable in print and in forced-colors mode. Print output SHALL not hide document content behind interactive-only surfaces, and forced-colors output SHALL preserve borders, focus indicators, and state without relying on background color alone.

#### Scenario: Print document
- **WHEN** a page containing rendered Markdown is printed
- **THEN** headings, text, tables, and code remain visible and no interactive control obscures content

#### Scenario: Forced colors
- **WHEN** the user enables a forced-colors mode
- **THEN** parts and states remain distinguishable without relying only on custom colors

### Requirement: No global leakage

Library styles and runtime behavior SHALL NOT reset host elements, style bare HTML tags globally, inject global body classes, or attach document-level listeners that outlive a mounted component. All customization SHALL be scoped to the component subtree or explicitly managed by the host.

#### Scenario: Host isolation
- **WHEN** the library styles are imported into an existing application
- **THEN** host typography, layout, and global element styles remain unchanged

#### Scenario: Unmount cleanup
- **WHEN** a component with document-level behavior is unmounted
- **THEN** its listeners, observers, and body state are restored
