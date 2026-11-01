# security-and-trust Specification

## Purpose
Defines the security model for rendering untrusted Markdown. The library is safe by default: user content is never injected as HTML, raw HTML is opt-in and sanitized, URLs and attributes are filtered, trusted engines are isolated, and plugin trust boundaries are explicit. Security is a core invariant, not a customization option that can be disabled by accident.

## Requirements

### Requirement: Threat model and trust boundaries

The library SHALL document its threat model: Markdown source and raw HTML are untrusted; host configuration, plugins, components, adapters, and presets are trusted code. The documentation SHALL identify each trust boundary and the option that crosses it.

#### Scenario: Untrusted input
- **WHEN** a host renders Markdown supplied by an end user
- **THEN** the default configuration treats the source, raw HTML, links, and image URLs as untrusted

#### Scenario: Trusted configuration
- **WHEN** a host supplies a plugin, custom component, highlighter, or pipeline
- **THEN** the documentation states that this code is trusted and runs with host privileges

### Requirement: No HTML injection for untrusted content

The library SHALL render untrusted Markdown as Vue nodes and SHALL NOT use `v-html`, `innerHTML`, or an equivalent HTML injection API for document content, raw HTML, or trusted-engine output. Raw HTML SHALL be represented as nodes after sanitization, not as an HTML string.

#### Scenario: Script in Markdown
- **WHEN** Markdown contains `<script>alert(1)</script>` and raw HTML is not enabled
- **THEN** no script element or executable content reaches the DOM

#### Scenario: Node rendering
- **WHEN** a document is rendered
- **THEN** content is produced as VNodes and no untrusted HTML string is injected

### Requirement: Raw HTML is opt-in and sanitized

Raw HTML SHALL be dropped by default. It SHALL be enabled only through the official optional `vue-markdown-suite/html` entry, whose `htmlPlugin()` contributes `rehype-raw`. When the plugin is present, `rehype-sanitize` SHALL run immediately after `rehype-raw` and before any trusted transform or host rehype plugin. The default schema SHALL block `script`, `style`, `iframe`, `object`, and `embed`, strip event-handler attributes, and restrict URLs and attributes. A manual `rehype-raw` in `rehypePlugins` SHALL be ignored with a warning.

#### Scenario: Default drop
- **WHEN** raw HTML is not enabled
- **THEN** raw HTML nodes are removed from the document model

#### Scenario: Sanitizer ordering
- **WHEN** the html plugin is enabled
- **THEN** sanitization runs before host rehype plugins and before model construction

#### Scenario: Dangerous element
- **WHEN** enabled raw HTML contains an `iframe` or an `onclick` attribute
- **THEN** the element or attribute is removed by the sanitizer

#### Scenario: Manual parser ignored
- **WHEN** a host adds `rehype-raw` to `rehypePlugins` instead of using `htmlPlugin()`
- **THEN** the pipeline ignores the manual parser, reports a warning, and raw HTML remains dropped

### Requirement: URL policy

The library SHALL apply a URL transform to every URL-bearing attribute, including `href`, `src`, `srcset`, `poster`, and `action`. The default transform SHALL allow `http`, `https`, `irc`, `ircs`, `mailto`, `xmpp`, and relative URLs, and SHALL reject unknown or dangerous protocols. A host-provided `urlTransform` SHALL replace the default and SHALL be documented as a trust decision.

#### Scenario: JavaScript URL
- **WHEN** a link uses `javascript:alert(1)`
- **THEN** the URL is removed or neutralized before rendering

#### Scenario: Relative URL
- **WHEN** a link or image uses a relative path
- **THEN** it is preserved

#### Scenario: Custom transform
- **WHEN** a host supplies `urlTransform`
- **THEN** it is applied to every URL-bearing attribute and its result is validated again

### Requirement: Image data URL policy

The library SHALL allow only raster image data URLs by default. `data:image/svg+xml` and other executable or script-capable data URLs SHALL be rejected unless the host explicitly opts into a documented trusted mode.

#### Scenario: PNG data URL
- **WHEN** an image uses `data:image/png;base64,...`
- **THEN** it is allowed

#### Scenario: SVG data URL
- **WHEN** an image uses `data:image/svg+xml,...`
- **THEN** it is rejected by default

### Requirement: Attribute policy

The library SHALL allow only documented attributes per element and SHALL strip event-handler attributes (`on*`), unsafe `style` values, and attributes that can execute script or navigate unexpectedly. Filtering SHALL occur before the document model is rendered.

#### Scenario: Event handler
- **WHEN** an element carries `onmouseover`
- **THEN** the attribute is removed

#### Scenario: Unknown attribute
- **WHEN** an element carries an attribute outside the allowed set
- **THEN** it is removed or reported according to the documented policy

### Requirement: Trusted engine output

KaTeX, highlighter, and Mermaid output SHALL be treated as trusted engine output but SHALL still be validated structurally before rendering. Highlighter and math adapters SHALL return normalized nodes rather than HTML strings. Mermaid SVG SHALL be parsed into nodes and sanitized; it SHALL NOT be injected with `v-html`. KaTeX `trust` SHALL default to `false`. Mermaid `securityLevel` SHALL default to `strict`.

#### Scenario: Highlighter output
- **WHEN** a highlighter adapter returns nodes containing an event-handler attribute
- **THEN** the attribute is removed before rendering

#### Scenario: Mermaid SVG
- **WHEN** a Mermaid diagram renders
- **THEN** its SVG is parsed into nodes and sanitized rather than injected as an HTML string

#### Scenario: KaTeX trust
- **WHEN** TeX contains a command that would inject HTML or a URL
- **THEN** it is rejected unless the host explicitly enables trust

### Requirement: Sanitizer customization

A host SHALL be able to customize raw-HTML sanitization through the add-only `htmlPlugin({ schema })` extension. The extension SHALL be able to add tags and properties and SHALL NOT remove the built-in strip list, change the URL policy, or bypass attribute safety. A custom pipeline SHALL run its own sanitizer inside the documented pipeline order.

#### Scenario: Custom schema
- **WHEN** a host extends the sanitizer schema to allow an additional safe element
- **THEN** that element renders while the default dangerous-element and URL rules remain active

### Requirement: CSP and Trusted Types guidance

The documentation SHALL describe how to use the library with a Content Security Policy and Trusted Types. The library SHALL NOT require inline script, `eval`, or `new Function`. Style injection SHALL be limited to documented custom properties and stylesheet imports.

#### Scenario: Strict CSP
- **WHEN** a host applies a CSP without `unsafe-inline` or `unsafe-eval`
- **THEN** the library's default rendering path works without requiring either

### Requirement: Plugin trust boundaries

Plugins SHALL be documented as trusted code. A plugin SHALL NOT be able to silently disable core URL, attribute, or raw-HTML safety. Bypassing a core invariant SHALL require an explicit documented trusted-content option. Plugin errors SHALL be reported without exposing raw untrusted HTML in user-facing messages.

#### Scenario: Plugin bypass attempt
- **WHEN** a plugin attempts to render an unsafe URL or event handler
- **THEN** the core safety checks still apply

#### Scenario: Plugin error message
- **WHEN** a plugin throws while processing untrusted content
- **THEN** the reported diagnostic does not embed the raw untrusted HTML

### Requirement: Security tests

The repository SHALL include automated security tests covering unsafe protocols, event handlers, raw HTML, sanitizer ordering, `data:` URLs including SVG, custom tags, plugin bypass attempts, Mermaid output, KaTeX trust, and a fuzz corpus of malformed HTML and Markdown.

#### Scenario: Security suite
- **WHEN** the security test suite runs
- **THEN** every known attack fixture is neutralized and no test renders executable content
