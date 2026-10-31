## Purpose

Establishes a stable extension contract so parsing, document transformations, renderers, labels, presets, and plugin-contributed built-ins can be added, replaced, reordered, or disabled without patching the library or forking components. Core TOC, code, link, and safety invariants are not disableable.

## ADDED Requirements

### Requirement: Plugin contract

The library SHALL define a typed plugin contract with a unique name, optional ordering hint, optional remark and rehype plugin contributions, optional `remarkRehypeOptions`, optional source and document transforms, optional node/tag/region component contributions, optional labels, optional tokens, and optional setup/cleanup hooks. Plugins SHALL be authorable as plain objects and through a typed helper that infers options.

#### Scenario: Minimal plugin
- **WHEN** a host defines a plugin with only a name and a document transform
- **THEN** the plugin is accepted and participates in the pipeline without requiring other hooks

#### Scenario: Source transform
- **WHEN** a plugin provides `transformSource`
- **THEN** it runs in resolved plugin order before parsing, and the transformed source is parsed and memoized

#### Scenario: Source transform failure
- **WHEN** `transformSource` throws or returns a non-string
- **THEN** the previous source is kept, a `plugin-source` diagnostic is reported, and the owning plugin's `onError` receives the `source` phase

#### Scenario: Typed options
- **WHEN** a plugin is created through the typed helper with an options type
- **THEN** registering the plugin with invalid options is rejected by the type checker

### Requirement: Plugin registration and ordering

Plugins SHALL be registered per renderer or provider instance, not globally. Registration SHALL accept plugin objects and ordered options tuples, SHALL preserve deterministic execution order, and SHALL support pre, normal, and post phases. Duplicate plugin names SHALL be detected and reported. The effective plugin order SHALL be inspectable. `disablePlugins` SHALL remove non-core plugins. Core invariant markers (`toc`, `code`, `link`) SHALL remain in the resolved set and SHALL report a `plugin-core` diagnostic when a host attempts to disable them.

#### Scenario: Ordered execution
- **WHEN** a pre-phase, normal-phase, and post-phase plugin are registered
- **THEN** their transforms run in that phase order and preserve registration order within a phase

#### Scenario: Duplicate plugin
- **WHEN** the same plugin name is registered twice
- **THEN** the duplicate is reported and the library applies a documented resolution instead of running both silently

#### Scenario: Disable a core invariant
- **WHEN** a host passes `disablePlugins: ['toc']`
- **THEN** TOC construction remains active and a `plugin-core` diagnostic is reported

### Requirement: Pipeline extension

Plugins SHALL extend Markdown by contributing remark plugins, rehype plugins, and `remarkRehypeOptions`. Contributions SHALL run in the documented pipeline order, after source transforms and the parser and before model construction. A plugin SHALL NOT configure a parser object directly. Pipeline configuration SHALL preserve core safety rules and SHALL report failures without breaking unrelated plugins. A failing contribution SHALL be reported with the plugin name and stage and SHALL be passed to the owning plugin's `onError`. A cached processor SHALL use the current run's diagnostics rather than a previous run's context.

#### Scenario: remark syntax plugin
- **WHEN** a plugin contributes a remark plugin that adds custom syntax
- **THEN** documents containing that syntax render the plugin's output while standard Markdown remains unchanged

#### Scenario: rehype transform
- **WHEN** a plugin contributes a rehype plugin that rewrites links
- **THEN** the transformed hast is normalized into the same core model

#### Scenario: Pipeline failure isolation
- **WHEN** a plugin's remark or rehype plugin throws
- **THEN** the error is reported with the plugin name and stage, the owning plugin's `onError` receives the phase, and the remaining plugins still run

### Requirement: Document model transforms

Plugins SHALL be able to inspect and transform the document model between parsing and rendering. Transforms SHALL receive the current document and a context with helpers for visiting, replacing, and adding nodes and for accessing options and diagnostics. Transform order SHALL be deterministic, and a transform SHALL be able to return a replacement document or leave the current one unchanged.

#### Scenario: Transform headings
- **WHEN** a plugin adds a prefix to heading text during the document transform
- **THEN** the rendered headings and TOC titles reflect the prefix and heading IDs remain consistent

#### Scenario: Add a custom node
- **WHEN** a plugin adds a custom node kind along with a renderer for it
- **THEN** the renderer receives the node and can render it alongside standard content

### Requirement: Renderer and UI contributions

Plugins SHALL be able to contribute node components, tag components, region components, slot defaults, labels, theme defaults, and other customization defaults. Contributions SHALL participate in the documented customization precedence and SHALL NOT override an explicit local host choice. In v1.0, plugin-contributed `nodeComponents` and `regions` are supported; host-level `nodeComponents`/`regions` props and function renderers are v1.x.

#### Scenario: Plugin contributes a node component
- **WHEN** a Mermaid plugin contributes a Mermaid node component
- **THEN** Mermaid nodes render through that component unless the host overrides it locally

#### Scenario: Plugin contributes a tag component
- **WHEN** a plugin contributes a tag component for `a`
- **THEN** links use it unless the host supplies `components.a` or `nodeComponents.a` locally

#### Scenario: Host override wins
- **WHEN** a plugin contributes a code block component and the host supplies a different component
- **THEN** the host component is used

### Requirement: Lifecycle and resource management

Plugins SHALL support setup and cleanup hooks. Setup SHALL run when the owning renderer or provider is created, cleanup SHALL run when it is unmounted or reconfigured, and plugins SHALL NOT leave document listeners, timers, observers, or global state behind. Setup and cleanup SHALL be safe across server and client rendering.

#### Scenario: Cleanup on unmount
- **WHEN** a plugin registers a document listener during setup and the renderer unmounts
- **THEN** the listener is removed and no further plugin callbacks run

#### Scenario: Reconfiguration
- **WHEN** the plugin list changes on an existing renderer
- **THEN** removed plugins are cleaned up and added plugins are set up exactly once

### Requirement: Built-in features and core invariants

TOC generation, code-node construction, and link policy SHALL be documented core invariants in v1.0, exported as non-disableable marker plugins. Search highlighting, custom tag mapping, GFM (`remark-gfm`), frontmatter (`remark-frontmatter`), and footnotes SHALL be implemented as official plugins that can be enabled, disabled, reordered, or replaced individually. Mermaid rendering and math rendering are v1.x official plugins. The preset components SHALL use a documented default plugin set. Disabling a non-core built-in plugin SHALL remove its behavior without producing render errors.

#### Scenario: Disable Mermaid
- **WHEN** the Mermaid plugin is disabled
- **THEN** Mermaid fences render as ordinary code blocks or plain fenced content without loading Mermaid

#### Scenario: Disable math
- **WHEN** the math plugin is disabled
- **THEN** dollar-delimited content renders as literal text without loading a math engine

#### Scenario: Core invariant marker
- **WHEN** a host tries to disable `toc`, `code`, or `link`
- **THEN** the behavior remains active and a `plugin-core` diagnostic explains that the marker cannot be disabled

#### Scenario: Disable search
- **WHEN** the search plugin is disabled
- **THEN** search segments are no longer produced and the rest of the document renders unchanged

### Requirement: Plugin error isolation

A failing plugin SHALL NOT crash the application or corrupt the document for other plugins. The library SHALL report the plugin name and phase, SHALL call the owning plugin's `onError` when a remark or rehype contribution fails, SHALL preserve the last successful document, and SHALL continue with the remaining plugins where safe. Repeated identical failures SHALL NOT produce unbounded error loops. Diagnostics from a cached processor SHALL be written to the current run.

#### Scenario: Transform throws
- **WHEN** a document transform throws
- **THEN** the error is reported with the plugin name and the previous document remains rendered

#### Scenario: Reused processor
- **WHEN** a cached official processor runs again with a different diagnostics sink and a plugin fails
- **THEN** the failure is reported to the current sink, not the sink from the earlier run

#### Scenario: Error loop prevention
- **WHEN** the same plugin fails on every render of unchanged content
- **THEN** the failure is reported without repeatedly re-triggering itself indefinitely

### Requirement: Trust and security boundary

The library SHALL document that plugins are trusted host code. Sanitization SHALL run inside the pipeline before model-level transforms that render content, and plugins SHALL receive sanitized document nodes rather than raw untrusted HTML by default. A plugin that deliberately accepts raw HTML SHALL be documented as a trust boundary chosen by the host.

#### Scenario: Sanitized input
- **WHEN** raw HTML is enabled and a document transform inspects nodes
- **THEN** unsafe elements and attributes have already been removed before the transform runs

#### Scenario: Explicit trust boundary
- **WHEN** a plugin opts into raw HTML access
- **THEN** the documentation and types make that trust decision explicit

### Requirement: Plugin and preset documentation

Every public plugin hook SHALL be documented with a working example, and the repository SHALL include at least one sample plugin that exercises a remark contribution, a rehype contribution, a source transform, a document transform, a component contribution, and cleanup. Plugin contract tests SHALL verify ordering, override precedence, cleanup, source transforms, core-marker disabling, and error isolation.

#### Scenario: Sample plugin
- **WHEN** the sample plugin is registered in the demo
- **THEN** it demonstrates all supported contribution types and can be removed without breaking the demo

#### Scenario: Contract tests
- **WHEN** the plugin test suite runs
- **THEN** it covers ordering, duplicate handling, override precedence, cleanup, and failure isolation
