## Why

v1.0 is functionally complete, but a few closeout gaps still make the public contract inconsistent: the default slot is read only once even though it is documented as Markdown input, heading-anchor parts and styles exist without a rendered anchor, `MarkdownHtml` is ambiguous between a standalone export and a raw-HTML path, and the optional stylesheet still requires newer browsers than the runtime. These gaps are small individually but they undermine the v1.0 promise that documented behavior, styles, and tasks all describe the same shipped library.

## What Changes

- Make the default slot reactive: re-read it when its rendered content changes, while keeping `source` as the controlled prop that wins over the slot.
- Render heading anchor links for headings with generated IDs, using the existing `heading-anchor` part, `headingAnchor` label, keyboard focus behavior, and print hiding.
- Keep `MarkdownHtml` as a standalone component. Raw HTML enabled through `rehype-raw` continues to render through normal element components; add explicit tests and docs so the two paths cannot be confused.
- Add CSS compatibility fallbacks for the runtime baseline: physical property fallbacks for logical properties, `:root` instead of `:where(:root)`, `:focus` alongside `:focus-visible`, `-webkit-sticky` fallback, and a `left` fallback for `text-align: start`.
- Pin the library stylesheet target to the same browser baseline as the runtime (Chrome 54+, Edge 15+, Firefox 52+, Safari 10.1+, iOS 10.3+) and update the compatibility docs and checks.
- Add closeout tests and align README, docs, and OpenSpec tasks with the shipped behavior.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `markdown-rendering`: source input becomes reactive for the default slot, `source` remains controlled, and heading anchors become a v1.0 accessibility feature instead of a v1.x note.
- `node-components`: `MarkdownHeading` gains the anchor-link behavior and `MarkdownHtml` is explicitly a standalone component, not the raw-HTML render path.
- `library-packaging`: the optional stylesheet baseline is aligned with the runtime baseline instead of remaining at Chrome/Edge 87+, Firefox 78+, Safari 14.1+, iOS 14.5+.

## Impact

- Renderer and components: `src/components/MarkdownRenderer.vue`, `src/components/MarkdownHeading.vue`.
- Styles: `src/styles/tokens.css`, `src/styles/components.css`, `src/styles/math.css`, and the library `cssTarget`.
- Packaging/docs: `vite.lib.config.ts`, `README.md`, `docs/migration.md`, `docs/styled.md`, and the OpenSpec closeout tasks.
- Tests: renderer slot reactivity, heading anchors, `MarkdownHtml` separation, and CSS fallback assertions.
- No new runtime dependencies. No v1.x customization surface is introduced.
