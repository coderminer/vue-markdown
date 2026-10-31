---
description: Install vue-markdown-suite and render your first Markdown document in Vue 3.
---

# Getting started

`vue-markdown-suite` renders Markdown directly into Vue VNodes through the
official `unified` pipeline. It ships a styled renderer, a headless document API,
typed plugins, and optional engines for code, math, and diagrams.

## Requirements

- Node.js 20 or newer
- Vue 3.5 or newer
- A Vite-based build, or any bundler that understands standard ESM

## Install

::: code-group

```bash [npm]
npm install vue-markdown-suite
```

```bash [pnpm]
pnpm add vue-markdown-suite
```

```bash [yarn]
yarn add vue-markdown-suite
```

```bash [bun]
bun add vue-markdown-suite
```

:::

Optional engines are peer dependencies. Install only what you use:

::: code-group

```bash [highlight.js]
npm install highlight.js
```

```bash [Shiki]
npm install shiki
```

```bash [KaTeX]
npm install katex
```

```bash [Mermaid]
npm install mermaid
```

:::

The Mermaid live editor also needs CodeMirror:

```bash
npm install @codemirror/state @codemirror/view @codemirror/language @codemirror/commands
```

## Render your first document

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { MarkdownRenderer } from 'vue-markdown-suite'
import 'vue-markdown-suite/style.css'

const source = ref(`
# Hello, Markdown

A **bold** paragraph with a [link](https://example.com).

- Vue components
- Safe by default
- SSR ready
`)
</script>

<template>
  <MarkdownRenderer v-model:source="source" toc />
</template>
```

That is the whole setup. The stylesheet is optional; without it the markup stays
semantic and accessible, and every behavior still works.

## How it fits together

```text
Markdown source
  → plugin source transforms
  → remark-parse
  → remark plugins
  → remark-rehype
  → optional rehype-raw + sanitizer
  → rehype plugins
  → normalized document model
  → Vue VNodes
```

The public document model is plain, serializable data. It contains no Vue, DOM,
mdast, hast, or processor objects, so the same run can drive the renderer, a
headless host, or static HTML export.

## Pick your path

| I want to… | Go to |
| --- | --- |
| Render Markdown with the default components | [Basic usage](./basic-usage.md) |
| Replace tags, nodes, themes, or CSS | [Customization](./customization.md) |
| Add GFM, math, highlighting, or Mermaid | [Advanced usage](./advanced-usage.md) |
| Build a complete docs portal | [Complete example](./complete-example.md) |
| Own the markup entirely | [Headless rendering](./headless.md) |
| Look up every prop and event | [Renderer reference](../reference/renderer.md) |

## Next

- [Basic usage](./basic-usage.md)
- [Customization](./customization.md)
- [Complete example](./complete-example.md)
