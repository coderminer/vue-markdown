---
description: Compose plugins, presets, adapters, headless rendering, math, highlighting, and static export.
---

# Advanced usage

The renderer is the default composition of smaller layers. Once the basics work,
you can add behavior with plugins, share configuration with presets, swap engines,
or bypass the renderer entirely.

## Composition recipe

```vue
<script setup lang="ts">
import {
  MarkdownConfigProvider,
  MarkdownRenderer,
  defineMarkdownPreset,
  defineMarkdownPlugin,
} from 'vue-markdown-suite'
import { gfmPlugin, searchPlugin } from 'vue-markdown-suite/plugins'
import { mathPlugin } from 'vue-markdown-suite/math'
import 'vue-markdown-suite/style.css'
import 'katex/dist/katex.min.css'
import 'vue-markdown-suite/styles/math.css'

const docsPlugin = defineMarkdownPlugin({
  name: 'docs',
  labels: { toc: 'On this page' },
  transformDocument: (document) => ({
    ...document,
    frontmatter: { ...document.frontmatter, enhanced: true },
  }),
})

const docsPreset = defineMarkdownPreset({
  name: 'docs',
  theme: 'auto',
  tokens: {
    '--vmd-color-accent': '#7c3aed',
    '--vmd-radius-md': '12px',
  },
})

const plugins = [gfmPlugin, mathPlugin(), docsPlugin, searchPlugin({ query: '' })]
</script>

<template>
  <MarkdownConfigProvider :preset="docsPreset">
    <MarkdownRenderer :source="source" :plugins="plugins" toc />
  </MarkdownConfigProvider>
</template>
```

## Plugins

A plugin can contribute remark/rehype plugins, conversion options, source and
document transforms, components, labels, tokens, and lifecycle hooks:

```ts
import { defineMarkdownPlugin } from 'vue-markdown-suite/plugins'

export const brandPlugin = defineMarkdownPlugin({
  name: 'brand',
  phase: 'normal',
  components: { h2: 'h3' },
  labels: { toc: 'Contents' },
  tokens: { '--vmd-color-accent': '#7c3aed' },
  setup() {
    return () => {
      // Cleanup on reconfiguration and unmount.
    }
  },
})
```

Order is `pre` → `normal` → `post`, then registration order. Duplicate names
replace deterministically. A failing plugin is isolated and never corrupts the
last good document.

::: tip Plugin invariants
`toc`, `code`, and `link` are core invariant markers. They stay in the resolved
set even when named in `disablePlugins`, and the attempt is reported as a
diagnostic.
:::

Read [Plugins](./plugins.md) for ordering, lifecycle, and remark/rehype interop.

## Presets

Presets bundle configuration under a name. Later presets override earlier ones,
and their plugin lists are appended:

```ts
import { composePresets, defineMarkdownPreset } from 'vue-markdown-suite/presets'

const brand = defineMarkdownPreset({
  name: 'brand',
  theme: 'dark',
  labels: { toc: 'Contents' },
})

const docs = defineMarkdownPreset({
  name: 'docs',
  tokens: { '--vmd-radius-md': '12px' },
})

const preset = composePresets(brand, docs)
```

Precedence is local props → nearest provider → preset → plugin defaults →
built-ins. Applying a preset never mutates global state.

## Syntax highlighting

```ts
import { highlightjs } from 'vue-markdown-suite/highlight'
import { shiki } from 'vue-markdown-suite/highlight/shiki'
```

```vue
<MarkdownRenderer :source="source" :highlighter="shiki" />
```

`CodeBlock` lazily imports highlight.js when no adapter is configured. Shiki is a
separate entry and preloads its themes and languages. Unknown languages and
adapter failures fall back to plain source.

Read [Syntax highlighting](./highlighting.md).

## Math

```ts
import { mathPlugin, katexEngine } from 'vue-markdown-suite/math'
import 'katex/dist/katex.min.css'
import 'vue-markdown-suite/styles/math.css'
```

```vue
<MarkdownRenderer
  :source="source"
  :plugins="[mathPlugin()]"
  :math-engine="katexEngine"
/>
```

`mathPlugin` composes `remark-math` and `rehype-katex`. Inline `$...$` and
display `$$...$$` are enabled by default; custom delimiters and macros are
supported.

Read [Math](./math.md).

## Mermaid

```ts
import { renderMermaid, sanitizeSvg } from 'vue-markdown-suite/mermaid'
```

```vue
<script setup lang="ts">
import { MermaidBlock } from 'vue-markdown-suite'

const diagram = `flowchart LR
  Markdown --> Pipeline
  Pipeline --> Vue
`
</script>

<template>
  <MermaidBlock :source="diagram" />
</template>
```

The runtime is lazy, uses Mermaid's strict security mode, and sanitizes the SVG
before it becomes nodes. `MermaidBlock` provides preview/source tabs, zoom,
fullscreen, copy, SVG download, PNG export, and retry.

Read [Mermaid](./mermaid.md).

## Headless rendering

When the preset markup does not fit, own the output:

```ts
import { useMarkdownDocument } from 'vue-markdown-suite/headless'

const {
  document,
  toc,
  status,
  diagnostics,
  pipeline,
  plugins,
  refresh,
} = useMarkdownDocument(source, {
  plugins: [gfmPlugin],
})
```

The composable owns parsing, memoization, plugin lifecycle, status, and
diagnostics. It renders nothing. The model is serializable and contains no Vue,
DOM, mdast, hast, or processor objects.

Read [Headless rendering](./headless.md).

## SSR and static export

```ts
import { exportMarkdownHtml, exportMarkdownHtmlSync } from 'vue-markdown-suite'

const html = exportMarkdownHtmlSync(source)
const asyncHtml = await exportMarkdownHtml(source, { plugins })
```

Export uses the same pipeline, plugins, sanitizer, URL policy, transforms, and
heading IDs as rendering. `exportMarkdownHtmlSync` requires a synchronous
pipeline; the official pipeline supports both paths.

Read [SSR and export](./ssr.md).

## Next

- [Customization](./customization.md)
- [Complete example](./complete-example.md)
- [Adapters](../reference/adapters.md)
