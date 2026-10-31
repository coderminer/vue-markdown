## Purpose

Renders Markdown source into a navigable, safely filtered document view with stable heading anchors, a table of contents, and composable extension points, while remaining DOM-free at its core and fully customizable at its surface.

## ADDED Requirements

### Requirement: Markdown source rendering

The renderer SHALL accept a Markdown `source` string and render CommonMark block and inline syntax, including headings, lists, blockquotes, links, images, emphasis, and fenced code. GFM tables and strikethrough render when the GFM plugin is enabled. Soft line breaks SHALL follow CommonMark and render as whitespace, not `<br>`; hosts that want hard breaks add `remark-breaks`. Empty or whitespace-only input SHALL render an empty region without throwing.

#### Scenario: Render a mixed document
- **WHEN** the renderer receives Markdown containing headings, a table, a list, a link, and a fenced code block
- **THEN** every construct appears in the rendered output with its semantic structure preserved

#### Scenario: Render empty input
- **WHEN** the renderer receives an empty string or only whitespace
- **THEN** it renders an empty state and emits no error

### Requirement: Source input

The renderer SHALL accept Markdown through a `source` prop or the default slot. When both are present, `source` SHALL win. The default slot SHALL be treated as raw Markdown text, not as pre-rendered VNodes. The renderer SHALL support `v-model:source`, emitting `update:source` when the host requests a source change through an exposed action. Empty input SHALL render the empty state without throwing.

#### Scenario: Source prop
- **WHEN** a host passes Markdown through the `source` prop
- **THEN** the renderer parses and renders that string

#### Scenario: Default slot
- **WHEN** a host passes Markdown as the default slot content
- **THEN** the renderer treats the slot text as raw Markdown

#### Scenario: Both inputs
- **WHEN** a host supplies both `source` and default slot content
- **THEN** `source` is rendered and the slot is ignored

#### Scenario: Two-way binding
- **WHEN** a host binds `v-model:source` and calls an exposed source action
- **THEN** the renderer emits `update:source` with the new source

### Requirement: Tag component mapping

The renderer SHALL accept a `components` map keyed by HTML tag name, aligned with react-markdown's component override model. Values SHALL be components or tag-name strings. Supported keys SHALL include `p`, `h1`–`h6`, `em`, `strong`, `del`, `a`, `img`, `ul`, `ol`, `li`, `blockquote`, `hr`, `table`, `thead`, `tbody`, `tr`, `th`, `td`, `pre`, `code`, `br`, `input`, and tags introduced by plugins. A tag override SHALL apply to every node with that tag. `components.pre` SHALL replace the fenced-code wrapper and receive the rendered `code` element as its child. `components.code` SHALL apply to both inline and fenced code; fenced code SHALL receive a `language-*` `className` and the source text as children. In v1.0, `components` is the only public override map. In v1.x, `nodeComponents` at the same key SHALL take precedence over `components`; otherwise a tag override SHALL take precedence over a semantic node-kind override, except for fenced code where the semantic `nodeComponents.code` override wins over `components.code` while `components.pre` remains the wrapper.

#### Scenario: Replace a heading tag
- **WHEN** a host maps `h1` to `h2` through `components`
- **THEN** level-one headings render as `h2` elements while other headings keep their defaults

#### Scenario: Replace a link component
- **WHEN** a host maps `a` to a custom component
- **THEN** every link uses that component and receives the normalized link props and node

#### Scenario: Replace fenced code wrapper and element
- **WHEN** a host maps `pre` to a custom wrapper and `code` to a custom code component
- **THEN** the wrapper receives the custom code element as its child and the code component receives the `language-*` class and source text

#### Scenario: Tag beats kind
- **WHEN** a host supplies `components.a` and `nodeComponents.link`
- **THEN** links use `components.a` because the exact tag override is more specific

#### Scenario: Explicit catalog wins
- **WHEN** a host supplies `components.a` and `nodeComponents.a`
- **THEN** `nodeComponents.a` wins because the typed catalog map is explicit

### Requirement: Element filtering

The renderer SHALL support `allowedElements`, `disallowedElements`, `unwrapDisallowed`, and an `allowElement` predicate. `allowedElements` and `disallowedElements` SHALL be mutually exclusive; supplying both SHALL produce a reported configuration diagnostic and `allowedElements` SHALL win. Filtering SHALL run after sanitization and before rendering. A disallowed element SHALL be removed with its children by default and replaced by its children when `unwrapDisallowed` is true. `allowElement` SHALL receive a normalized element view, its index, and its parent, and SHALL be able to reject an otherwise allowed element. A falsy return value SHALL reject the element, matching react-markdown. Filtering SHALL NOT weaken URL or attribute safety.

#### Scenario: Allow list
- **WHEN** `allowedElements` contains only `p`, `a`, and `strong`
- **THEN** other elements are removed while allowed elements keep their content and safety attributes

#### Scenario: Unwrap disallowed
- **WHEN** `disallowedElements` contains `strong` and `unwrapDisallowed` is true
- **THEN** strong elements are replaced by their children instead of dropping the text

#### Scenario: Element predicate
- **WHEN** `allowElement` rejects an image with an empty source
- **THEN** that image is filtered while other images remain

#### Scenario: Conflicting lists
- **WHEN** both `allowedElements` and `disallowedElements` are supplied
- **THEN** a configuration diagnostic is reported and the allow list is applied

### Requirement: URL transformation

The renderer SHALL apply a `urlTransform` function to every URL-bearing attribute, including link destinations and image sources. The function SHALL receive the URL, the attribute name, and the normalized node. Returning a string SHALL replace the URL; returning `null` SHALL remove the attribute; returning `undefined` or throwing SHALL keep the sanitized URL and report a diagnostic. The library SHALL export `defaultUrlTransform`, which allows `http`, `https`, `irc`, `ircs`, `mailto`, `xmpp`, and relative URLs. The transformed result SHALL be validated again before rendering.

#### Scenario: Rewrite an image source
- **WHEN** `urlTransform` returns a CDN URL for an image `src`
- **THEN** the rendered image uses the CDN URL and other URL attributes are unchanged

#### Scenario: Remove an unsafe attribute
- **WHEN** `urlTransform` returns `null` for a `javascript:` link
- **THEN** the link is rendered without an active destination

#### Scenario: Default transform
- **WHEN** a host uses the exported `defaultUrlTransform`
- **THEN** safe protocols and relative URLs pass through and unsafe protocols are neutralized

### Requirement: HTML handling modes

Raw HTML SHALL be dropped by default. `skipHtml` SHALL remove raw HTML nodes explicitly. Raw HTML SHALL be rendered only when the host adds `rehype-raw` to `rehypePlugins`; the renderer SHALL NOT expose an `enableHtml` prop. When `rehype-raw` is present, `rehype-sanitize` SHALL run immediately after it and before any trusted transform. A host that enables raw HTML is making an explicit trust decision documented by the library.

#### Scenario: Default drop
- **WHEN** the source contains a raw HTML block and `rehype-raw` is not configured
- **THEN** the block does not render

#### Scenario: `skipHtml`
- **WHEN** `skipHtml` is true and the source contains a raw HTML block
- **THEN** the block is removed from the output

#### Scenario: Sanitized HTML
- **WHEN** `rehype-raw` is configured and the source contains a script element
- **THEN** the script element is removed before rendering

### Requirement: CommonMark and GFM conformance

The official pipeline SHALL pass 100% of the official CommonMark test suite through `remark-parse`. GFM tables, strikethrough, task lists, autolinks, and footnotes SHALL be available through the official `gfmPlugin` (`remark-gfm`) and SHALL pass 100% of the official GFM fixtures when enabled. Footnotes SHALL be documented as a GitHub extension beyond the formal GFM specification. The repository SHALL include conformance fixtures and SHALL document any intentional difference.

#### Scenario: CommonMark conformance
- **WHEN** the CommonMark conformance fixtures run against the default pipeline
- **THEN** every official example passes

#### Scenario: GFM conformance
- **WHEN** `gfmPlugin` is enabled
- **THEN** tables, strikethrough, task lists, autolinks, and footnotes pass the GFM fixtures and render through their documented node components

### Requirement: Async rendering

An asynchronous pipeline SHALL expose a pending status while parsing. The renderer SHALL keep the last successful document visible, SHALL coalesce superseded parses, and SHALL ignore stale results. This behavior SHALL cover the use cases served by react-markdown's `MarkdownAsync` and `MarkdownHooks` without requiring separate component families. Server rendering SHALL use the synchronous path or await the pipeline result.

#### Scenario: Pending update
- **WHEN** an asynchronous pipeline is processing new source
- **THEN** the previous document remains visible and the status reports pending

#### Scenario: Out-of-order completion
- **WHEN** two asynchronous parses complete out of order
- **THEN** only the result for the latest source is applied

### Requirement: DOM-free document model and server rendering

The renderer SHALL build a serializable document model without requiring a browser DOM. Server rendering SHALL produce the same document structure and heading identifiers as client rendering for the same input, and hydration SHALL NOT produce identifier or structure mismatches. Browser-only integrations SHALL defer their work until mount.

#### Scenario: Server and client agree
- **WHEN** the same Markdown is rendered on the server and again on the client
- **THEN** heading identifiers, TOC entries, and document node structure are identical

#### Scenario: No browser globals in core
- **WHEN** the core pipeline runs in a Node.js environment without `window` or `document`
- **THEN** it builds the document model successfully

### Requirement: Pipeline injection

The renderer SHALL use the official `unified`/`remark` pipeline by default and SHALL accept a custom `MarkdownPipeline` as an advanced escape hatch. Pipeline selection SHALL NOT change the node component catalog, TOC behavior, search behavior, security rules, or accessibility contract. A custom pipeline SHALL return hast and SHALL NOT construct Vue components or bypass core invariants.

#### Scenario: Default pipeline
- **WHEN** a host renders Markdown without selecting a pipeline
- **THEN** the renderer uses `remark-parse` + `remark-rehype` and the default node components

#### Scenario: Custom pipeline
- **WHEN** a host supplies a custom pipeline that returns valid hast
- **THEN** the same Markdown constructs render through the same node components and TOC behavior

### Requirement: Base URL and heading ID policy

The renderer SHALL support a `baseUrl` option that resolves relative link and image destinations without rewriting absolute URLs. Base URL resolution SHALL occur before `urlTransform`, and the transformed result SHALL still be validated. The renderer SHALL support an `idPrefix` option applied to generated heading identifiers, and duplicate handling SHALL remain unique after prefixing. The renderer SHALL expose `scrollToHeading` and SHALL optionally update the URL hash when `syncHash` is enabled. These options SHALL NOT change the document model's text content.

#### Scenario: Relative URL resolution
- **WHEN** `baseUrl` is set and a document contains a relative image source
- **THEN** the rendered image uses the resolved URL and absolute URLs are unchanged

#### Scenario: Heading ID prefix
- **WHEN** `idPrefix` is set to `doc-` and a heading generates the slug `intro`
- **THEN** the heading ID is `doc-intro` and the TOC links to it

#### Scenario: Hash synchronization
- **WHEN** `syncHash` is enabled and a heading is activated
- **THEN** the URL hash updates without reloading the document

### Requirement: Composed renderer structure

`MarkdownRenderer` SHALL be composed from exported subcomponents for the root, content, TOC, TOC item, error, empty, and loading regions. Each subcomponent SHALL be usable independently, and the renderer SHALL allow any region to be replaced through the customization contract without patching the default implementation.

#### Scenario: Use a subcomponent directly
- **WHEN** a host imports the TOC subcomponent and supplies TOC items
- **THEN** the component renders a navigable TOC without mounting the full renderer

#### Scenario: Replace the content region
- **WHEN** a host overrides the content component
- **THEN** the renderer passes it the document model and rendering context while retaining the surrounding layout

### Requirement: Heading anchors and table of contents

Every heading whose level is included in the configured TOC levels SHALL receive a stable, unique identifier derived from its text content. Duplicate heading text SHALL produce suffixed identifiers. The renderer SHALL build a table of contents in document order, nest entries by heading level, and emit `toc-change` only when the effective TOC changes. TOC placement SHALL support left, right, and hidden, and the entry for the section currently in view SHALL be marked active. Identifier generation SHALL be replaceable through behavior injection.

#### Scenario: Duplicate headings receive unique identifiers
- **WHEN** a document contains two headings with the same text
- **THEN** the rendered headings receive different identifiers and both TOC entries link to the correct section

#### Scenario: TOC respects configured levels
- **WHEN** TOC levels are configured to include only levels 1 and 2
- **THEN** level 3 headings appear in the content but not in the table of contents

#### Scenario: TOC emission is signature gated
- **WHEN** content is re-rendered with an unchanged set of headings
- **THEN** `toc-change` is not emitted a second time

### Requirement: Link and image handling

Rendered links SHALL use the configured link target, defaulting to `_self`. Opening external links in a new context SHALL be opt-in through `externalLinkTarget="_blank"`, and that mode SHALL add `rel="noopener noreferrer"`. Links and images whose destination uses an unsafe protocol, including `javascript:` and `vbscript:`, SHALL NOT be rendered as active navigation. Image sources SHALL accept safe raster image data URLs when raw data URLs are otherwise rejected. A host-provided `urlTransform` SHALL receive each URL and MAY return a replacement; a thrown or non-string result SHALL leave the sanitized URL in place without failing the render.

#### Scenario: Unsafe link protocol is neutralized
- **WHEN** Markdown contains a link to a `javascript:` URL
- **THEN** the output contains no active link to that URL

#### Scenario: Default target
- **WHEN** a link renders without an explicit target configuration
- **THEN** it uses `_self` and does not open a new browsing context

#### Scenario: External links opt in
- **WHEN** `externalLinkTarget` is `_blank`
- **THEN** external links open in a new context with `rel="noopener noreferrer"`

#### Scenario: Host transform rewrites a destination
- **WHEN** `urlTransform` returns a new destination for an existing link
- **THEN** the rendered link uses the returned destination and retains the configured target and safety attributes

### Requirement: Raw HTML safety

Raw HTML SHALL be disabled by default. When a host explicitly enables it through `rehype-raw`, the renderer SHALL sanitize immediately with `rehype-sanitize`, removing script, style, iframe, object, and embed elements, stripping inline event-handler attributes, and dropping URL attributes that use unsafe protocols. A host-supplied sanitizer SHALL be expressed as a rehype plugin or a documented schema extension. The renderer SHALL document that built-in filtering is a guardrail and that enabling raw HTML is a trust decision.

#### Scenario: Raw HTML disabled by default
- **WHEN** Markdown contains an HTML element and the host has not enabled raw HTML
- **THEN** the element is omitted rather than executed as markup

#### Scenario: Enabled raw HTML is filtered
- **WHEN** raw HTML is enabled and the input contains a script element and an image with an inline error handler
- **THEN** the script element and the event-handler attribute are removed from the output

#### Scenario: Custom sanitizer
- **WHEN** a host supplies a sanitizer rehype plugin
- **THEN** raw HTML passes through that plugin in the documented order and core URL and attribute rules still apply

### Requirement: Search highlighting

A host-provided search string SHALL highlight matching text in the rendered content. Matching SHALL be case-insensitive by default and MAY be made case-sensitive. Highlighting SHALL affect text nodes only, SHALL preserve existing markup and link destinations, and SHALL be removed when the search string becomes empty. The match renderer SHALL be replaceable through the customization contract.

#### Scenario: Highlight matches without breaking markup
- **WHEN** the search text matches words inside a paragraph and a link label
- **THEN** the matches are visually highlighted and the surrounding elements and link destinations remain intact

#### Scenario: Custom match rendering
- **WHEN** a host replaces the search match renderer
- **THEN** matches use the host markup while non-matching content remains unchanged

### Requirement: Generic custom tags

Hosts SHALL be able to map HTML tag names to Vue components. Mapped tags SHALL render the provided component with normalized attributes converted from kebab-case to camelCase. Activating a mapped tag SHALL emit a `custom-tag-click` event containing the tag name, normalized attributes, and text content. Unmapped tags SHALL follow normal raw-HTML rules. The renderer SHALL NOT assign business meaning to any tag name.

#### Scenario: Mapped tag renders a host component
- **WHEN** a host maps `demo-chip` to a component and the Markdown contains `<demo-chip label="A" data-id="1"></demo-chip>`
- **THEN** the component renders with normalized props and the page does not treat the tag as unknown HTML

#### Scenario: Click payload uses normalized attributes
- **WHEN** a rendered custom tag with `start-line="2"` is activated
- **THEN** the emitted click payload contains `attrs.startLine` equal to `"2"`

### Requirement: Plugin and preset integration

The renderer SHALL use a documented default plugin set and SHALL allow hosts to add plugins, disable built-in plugins, or replace the default set entirely. Plugin contributions SHALL participate in the documented customization precedence, and the effective plugin list SHALL be inspectable. Built-in features SHALL remain individually replaceable.

#### Scenario: Extend the default set
- **WHEN** a host adds a plugin without disabling defaults
- **THEN** the plugin runs alongside the default plugins in the documented order

#### Scenario: Replace the default set
- **WHEN** a host supplies a custom plugin set with defaults disabled
- **THEN** only the host plugins run and the renderer reports no errors for removed built-in behavior

### Requirement: Render failure resilience

When parsing or rendering fails, the renderer SHALL preserve the last successful rendered output and expose the failure through an error event. An inline error message SHALL be shown only when error display is enabled, which SHALL be the default. The error region SHALL be replaceable, and the surrounding application SHALL remain mounted and usable after a render failure.

#### Scenario: Failing plugin preserves previous output
- **WHEN** a plugin throws during a content update
- **THEN** the previously rendered document remains visible and an error event reports the failure

#### Scenario: Custom error region
- **WHEN** a host replaces the error component and a failure occurs
- **THEN** the host component receives the error and retry context

### Requirement: Events and exposed actions

The renderer SHALL emit `toc-change` when the effective TOC changes, `link-click` when a link is activated, `task-change` when a task checkbox changes, `custom-tag-click` when a mapped custom tag is activated, `search-change` when search state changes, `render-error` on failure, `math-error` on math failure, and `ready` when the first document is available. It SHALL expose `scrollToHeading`, `getDocument`, `getToc`, and `refresh` actions.

#### Scenario: Link event
- **WHEN** the user activates a rendered link
- **THEN** `link-click` carries the normalized URL, target, and node

#### Scenario: Task event
- **WHEN** the user toggles a task-list checkbox
- **THEN** `task-change` carries the checked state and the task node

#### Scenario: Ready event
- **WHEN** the first document finishes rendering
- **THEN** `ready` is emitted once with the document model

### Requirement: Static HTML export

The headless API SHALL provide an explicit static HTML export helper that runs the same pipeline and then serializes the result with `rehype-stringify`. The main render path SHALL NOT use `rehype-stringify`. Export SHALL apply the same sanitization and URL rules as rendering.

#### Scenario: Export a document
- **WHEN** a host exports a rendered document to static HTML
- **THEN** the output uses the same sanitized nodes as the rendered view

#### Scenario: Render path unchanged
- **WHEN** a document is rendered to Vue nodes
- **THEN** no `rehype-stringify` step runs

### Requirement: Accessibility

The renderer SHALL preserve heading hierarchy, expose the TOC as a labeled navigation landmark, mark the active TOC entry with `aria-current`, keep heading anchors keyboard reachable, and expose render errors as status messages. Reading order and focus order SHALL follow the visual document order.

#### Scenario: Accessible TOC
- **WHEN** a screen reader navigates the TOC
- **THEN** it encounters a labeled navigation region and the current section is announced as current

#### Scenario: Error announcement
- **WHEN** a render failure is displayed
- **THEN** the error is exposed as a status message without stealing focus
