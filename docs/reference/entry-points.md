---
description: Public package entry points, optional engines, and CSS layers.
---

# Entry points

The package exposes small entries so optional engines and preset components stay
out of bundles that do not use them. See the [Public API](./api.md) for the
complete export index.

| Entry | Contents |
| --- | --- |
| `@coderminer/vue-markdown` | Renderer, preset components, composables, core helpers, and export helpers |
| `@coderminer/vue-markdown/headless` | Types, model helpers, composables; no preset components or CSS |
| `@coderminer/vue-markdown/pipeline` | Official pipeline, custom pipeline validation, identity helpers |
| `@coderminer/vue-markdown/plugins` | `defineMarkdownPlugin`, registry, built-in plugins |
| `@coderminer/vue-markdown/presets` | `defineMarkdownPreset`, `composePresets`, configuration types |
| `@coderminer/vue-markdown/node-components` | The node component catalog only |
| `@coderminer/vue-markdown/highlight` | highlight.js adapter and normalization helpers |
| `@coderminer/vue-markdown/highlight/shiki` | Optional Shiki adapter |
| `@coderminer/vue-markdown/math` | `mathPlugin`, `katexEngine`, math types |
| `@coderminer/vue-markdown/mermaid` | `mermaidPlugin`, lazy Mermaid runtime, and SVG sanitizer |
| `@coderminer/vue-markdown/editor` | Lazy CodeMirror integration |
| `@coderminer/vue-markdown/html` | `htmlPlugin()` for sanitized raw HTML |
| `@coderminer/vue-markdown/components/*` | One entry per public component |
| `@coderminer/vue-markdown/style.css` | Full optional stylesheet |
| `@coderminer/vue-markdown/styles/tokens.css` | Design tokens only |
| `@coderminer/vue-markdown/styles/components.css` | Part-based component styles |
| `@coderminer/vue-markdown/styles/math.css` | Math container styles; import KaTeX CSS separately |
| `@coderminer/vue-markdown/styles/math-full.css` | KaTeX CSS plus the suite's math container styles |

## Examples

```ts
// Renderer and helpers
import { MarkdownRenderer, exportMarkdownHtmlSync } from '@coderminer/vue-markdown'

// Headless document API
import { useMarkdownDocument, walkNodes } from '@coderminer/vue-markdown/headless'

// Plugin authoring
import { defineMarkdownPlugin, gfmPlugin } from '@coderminer/vue-markdown/plugins'

// Optional engines
import { shiki } from '@coderminer/vue-markdown/highlight/shiki'
import { mathPlugin } from '@coderminer/vue-markdown/math'
import { mermaidPlugin, renderMermaid } from '@coderminer/vue-markdown/mermaid'
import { htmlPlugin } from '@coderminer/vue-markdown/html'
```

The Mermaid entry also exports `resetMermaidRuntime()`. It clears the lazily
loaded module reference and configuration key for tests or an explicit
reinitialization. It cannot unload the browser's module cache, and it must not
run in a component lifecycle: Mermaid keeps process-wide configuration, and one
block unmounting must not reset the runtime that another block is still using.
The cache holds no per-block data, so unmounting a block does not leak it.

## Bundle boundaries

::: warning Keep engines optional
The headless, pipeline, and plugins entries must not import highlight.js, Shiki,
KaTeX, Mermaid, CodeMirror, or `rehype-raw`. Optional engines stay behind their
own entries or dynamic chunks.
:::

- A document without code never loads the highlighter.
- A document without math never loads KaTeX.
- Mermaid loads only when a Mermaid component renders. Its SVG sanitizer loads
  the HTML parser only after a diagram has rendered.
- The Mermaid editor loads CodeMirror only when mounted.
- Converting math or Mermaid output loads the HTML parser only in the optional
  `math` or `mermaid` entry. The `highlight` entry produces hast through
  `lowlight`; the base renderer does not include the parser.
- The raw HTML parser loads only when `@coderminer/vue-markdown/html` is
  imported.
- The core is DOM-free and Vue-free; the Vue adapter depends downward on it.

## Styles

```ts
import '@coderminer/vue-markdown/style.css'
```

`style.css` imports tokens and component styles. Load it before your own
overrides. The stylesheet is optional; unstyled usage keeps the same behavior and
accessibility.

## Next

- [Document model](./document-model.md)
- [Adapters](./adapters.md)
- [SSR and export](../guide/ssr.md)
