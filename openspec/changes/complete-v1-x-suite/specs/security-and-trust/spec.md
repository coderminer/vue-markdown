## ADDED Requirements

### Requirement: Static export trust boundary

Static HTML export SHALL be subject to the same trust boundaries as rendering. Export SHALL NOT serialize raw pipeline hast before sanitization. It SHALL apply the URL policy and image data-URL policy to every URL-bearing attribute, drop raw HTML unless `rehype-raw` is enabled, sanitize immediately after raw parsing, and revalidate output produced by a host `urlTransform`. A host pipeline, plugin, or custom serializer SHALL NOT be able to bypass these rules through an export-only path.

#### Scenario: JavaScript URL in export
- **WHEN** an exported link or image uses `javascript:`, `vbscript:`, or `data:text/html`
- **THEN** the exported HTML removes or neutralizes the URL

#### Scenario: Raw HTML in export
- **WHEN** an export contains raw HTML without `rehype-raw`
- **THEN** the raw HTML is absent from the output, and `skipHtml` removes it explicitly

#### Scenario: Sanitized raw HTML in export
- **WHEN** `rehype-raw` is enabled for an export
- **THEN** scripts, iframes, `object`, `embed`, style, and event-handler attributes are absent from the exported HTML

#### Scenario: Custom URL transform in export
- **WHEN** a host `urlTransform` returns an unsafe protocol
- **THEN** export revalidates the result and does not serialize the unsafe URL

#### Scenario: SVG data image in export
- **WHEN** an exported image uses a `data:image/svg+xml` URL
- **THEN** the URL is rejected under the same image policy as rendering

#### Scenario: Plugin bypass attempt
- **WHEN** a host plugin tries to inject an unsafe element or attribute into the exported document
- **THEN** the export trust boundary removes it before serialization
