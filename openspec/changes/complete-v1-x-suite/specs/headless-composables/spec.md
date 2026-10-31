## MODIFIED Requirements

### Requirement: Static HTML export

The headless API SHALL provide an explicit export helper that runs the same pipeline and serializes the result with `rehype-stringify`. The normal render path SHALL NOT use `rehype-stringify`. Export SHALL apply the same source transforms, sanitization, normalization, heading-ID policy, element filtering, URL transform, `baseUrl` resolution, `skipHtml` and raw-HTML policy, and plugin document transforms as the rendered document. The headless API SHALL expose synchronous and asynchronous export forms; the synchronous form SHALL be usable when every configured plugin is synchronous and SHALL report a clear error otherwise. Export SHALL reset per-run heading state and SHALL fail rather than return partial output when a diagnostic reports an error.

#### Scenario: Export
- **WHEN** a headless host exports a document to HTML
- **THEN** the output reflects the same sanitized, filtered, and transformed document that would be rendered

#### Scenario: Synchronous export
- **WHEN** every configured plugin and pipeline supports synchronous processing
- **THEN** the synchronous helper returns complete HTML without waiting for a browser or engine

#### Scenario: No stringify in render
- **WHEN** a host renders through the document composable
- **THEN** no HTML string serialization step runs

#### Scenario: Unsafe content
- **WHEN** exported Markdown contains an unsafe URL or disallowed element
- **THEN** the unsafe content is absent from the exported HTML

#### Scenario: Export failure
- **WHEN** a plugin or pipeline error is reported during export
- **THEN** the helper throws with the diagnostic instead of returning a partial document
