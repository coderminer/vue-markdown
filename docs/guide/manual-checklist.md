---
description: Manual verification checklist for the interactive demo.
---

# Manual demo checklist

The demo imports the library through public entries. Run `npm run dev` and walk
the sections below; `npm run build:demo` must also succeed.

- [x] Markdown rendering: playground and CommonMark sections
- [x] TOC: navigation and active-section state
- [x] Search: match highlighting and custom match rendering
- [x] Custom tags: host component mapping and click payloads
- [x] HTML safety: raw HTML is dropped by default and sanitized with `rehype-raw`
- [x] Pipeline switching: official, custom, and invalid-pipeline fallback
- [x] Headless usage: `useMarkdownDocument` renders without preset components
- [x] Plugin extension: source transforms, document transforms, and diagnostics
- [x] Component overrides: tag, node, region, and function renderers
- [x] Rich nodes: task items and footnotes
- [x] Highlighting: default highlight.js and the standalone highlighter
- [x] Math: inline and display formulas
- [x] Mermaid: block preview/source and the live editor
- [x] Customization inspector: live tokens, labels, themes, slots, presets, and
      component overrides

Automated coverage for the same surfaces lives in `tests/dom` and `tests/node`.
The static demo build is the release check for the navigation and section
reachability.
