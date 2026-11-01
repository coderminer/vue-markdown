## MODIFIED Requirements

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

#### Scenario: Sanitizer extension
- **WHEN** `htmlPlugin({ schema })` adds an extra tag or property
- **THEN** the tag renders while the strip list, event-handler removal, and unsafe-URL rejection remain active
