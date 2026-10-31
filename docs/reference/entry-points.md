---
description: Public package entry points, optional engines, and CSS layers.
---

# Entry points

The package exposes small entries so optional engines and preset components stay
out of bundles that do not use them.

| Entry | Contents |
| --- | --- |
| `vue-markdown-suite` | Renderer, preset components, composables, core helpers, and export helpers |
| `vue-markdown-suite/headless` | Types, model helpers, composables; no preset components or CSS |
| `vue-markdown-suite/pipeline` | Official pipeline, custom pipeline validation, identity helpers |
| `vue-markdown-suite/plugins` | `defineMarkdownPlugin`, registry, built-in plugins |
| `vue-markdown-suite/presets` | `defineMarkdownPreset`, `composePresets`, configuration types |
| `vue-markdown-suite/node-components` | The node component catalog only |
| `vue-markdown-suite/highlight` | highlight.js adapter and normalization helpers |
| `vue-markdown-suite/highlight/shiki` | Optional Shiki adapter |
| `vue-markdown-suite/math` | `mathPlugin`, `katexEngine`, math types |
| `vue-markdown-suite/mermaid` | Lazy Mermaid runtime and SVG sanitizer |
| `vue-markdown-suite/editor` | Lazy CodeMirror integration |
| `vue-markdown-suite/components/*` | One entry per public component |
| `vue-markdown-suite/style.css` | Full optional stylesheet |
| `vue-markdown-suite/styles/tokens.css` | Design tokens only |
| `vue-markdown-suite/styles/components.css` | Part-based component styles |
| `vue-markdown-suite/styles/math.css` | Optional math styles |

## Examples

```ts
// Renderer and helpers
import { MarkdownRenderer, exportMarkdownHtmlSync } from 'vue-markdown-suite'

// Headless document API
import { useMarkdownDocument, walkNodes } from 'vue-markdown-suite/headless'

// Plugin authoring
import { defineMarkdownPlugin, gfmPlugin } from 'vue-markdown-suite/plugins'

// Optional engines
import { shiki } from 'vue-markdown-suite/highlight/shiki'
import { mathPlugin } from 'vue-markdown-suite/math'
import { renderMermaid } from 'vue-markdown-suite/mermaid'
```

## Bundle boundaries

::: warning Keep engines optional
The headless, pipeline, and plugins entries must not import highlight.js, Shiki,
KaTeX, Mermaid, or CodeMirror. Optional engines stay behind their own entries or
dynamic chunks.
:::

- A document without code never loads the highlighter.
- A document without math never loads KaTeX.
- Mermaid loads only when a Mermaid component renders.
- The Mermaid editor loads CodeMirror only when mounted.
- The core is DOM-free and Vue-free; the Vue adapter depends downward on it.

## Styles

```ts
import 'vue-markdown-suite/style.css'
```

`style.css` imports tokens and component styles. Load it before your own
overrides. The stylesheet is optional; unstyled usage keeps the same behavior and
accessibility.

## Next

- [Document model](./document-model.md)
- [Adapters](./adapters.md)
- [SSR and export](../guide/ssr.md)
