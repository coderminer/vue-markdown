## MODIFIED Requirements

### Requirement: Static HTML export

The headless API SHALL provide an explicit static HTML export helper that runs the same pipeline and then serializes the result with `rehype-stringify`. The main render path SHALL NOT use `rehype-stringify`. Export SHALL produce the same document as rendering: it SHALL apply the same source transforms, sanitization, normalization, heading-ID policy, element filtering (`allowedElements`, `disallowedElements`, `unwrapDisallowed`, `allowElement`), `urlTransform` to every URL-bearing attribute, `baseUrl` resolution, `skipHtml` and raw-HTML policy, and plugin document transforms. Export SHALL use the same diagnostics and SHALL fail rather than emit a partial or unsafe document when a pipeline, plugin, or transform reports an error. Serialization SHALL operate on normalized nodes, not raw pipeline hast.

#### Scenario: Export parity
- **WHEN** a host exports a document with the same source and options used for rendering
- **THEN** the exported markup has the same elements, attributes, heading IDs, filtered nodes, and resolved links and images as the rendered document

#### Scenario: Export a document
- **WHEN** a host exports a rendered document to static HTML
- **THEN** the output uses the same sanitized nodes as the rendered view

#### Scenario: Unsafe URL in export
- **WHEN** the source contains a link or image with a `javascript:` URL
- **THEN** the exported HTML contains no executable URL for that attribute

#### Scenario: Raw HTML policy in export
- **WHEN** the source contains raw HTML and the host has not enabled `rehype-raw`
- **THEN** export drops the raw HTML exactly as rendering does, and `skipHtml` drops it explicitly

#### Scenario: Sanitized raw HTML in export
- **WHEN** the host enables `rehype-raw` and the source contains a script, an event handler, or an iframe
- **THEN** the exported HTML is sanitized before serialization and contains none of the blocked elements or attributes

#### Scenario: Filtering and document transforms in export
- **WHEN** the host supplies allowed or disallowed elements, unwrap behavior, an allow predicate, or a plugin document transform
- **THEN** export applies the same decisions to the serialized output

#### Scenario: Render path unchanged
- **WHEN** a document is rendered to Vue nodes
- **THEN** no `rehype-stringify` step runs

#### Scenario: Export failure
- **WHEN** the pipeline, a plugin, or a document transform reports an error during export
- **THEN** export fails with the diagnostic instead of returning partial or unsanitized HTML
