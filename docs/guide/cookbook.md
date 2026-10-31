---
description: Copy-paste recipes for common Markdown rendering tasks.
---

# Customization cookbook

Each recipe uses a published entry.

## Replace the TOC

```vue
<MarkdownRenderer :source="source" toc>
  <template #toc="{ items, activeId, navigate }">
    <nav aria-label="Contents">
      <button
        v-for="item in items"
        :key="item.id"
        :aria-current="item.id === activeId ? 'location' : undefined"
        @click="navigate(item.id)"
      >{{ item.text }}</button>
    </nav>
  </template>
</MarkdownRenderer>
```

## Restyle code actions

```vue
<MarkdownRenderer :source="source">
  <template #code-actions="{ source: code, language, actions }">
    <button type="button" @click="actions.copy">{{ language }}</button>
    <button type="button" @click="actions.download">Download</button>
  </template>
</MarkdownRenderer>
```

## Switch to Shiki

```ts
import { shiki } from 'vue-markdown-suite/highlight/shiki'
```

```vue
<MarkdownRenderer :source="source" :highlighter="shiki" />
```

## Enable math

```ts
import { mathPlugin } from 'vue-markdown-suite/math'
import 'vue-markdown-suite/styles/math.css'

const plugins = [mathPlugin()]
```

## Add Mermaid

```vue
<script setup lang="ts">
import { MermaidBlock, MarkdownRenderer } from 'vue-markdown-suite'
</script>

<template>
  <MarkdownRenderer :source="source" />
  <MermaidBlock :source="diagram" />
</template>
```

## Supply a custom pipeline

```ts
import type { MarkdownPipeline } from 'vue-markdown-suite'

const pipeline: MarkdownPipeline = {
  name: 'my-pipeline',
  process: async (source, ctx) => official.process(source, ctx),
  processSync: (source, ctx) => official.processSync!(source, ctx),
}
```

## Decorate links

```ts
import { h } from 'vue'
import type { MarkdownNodeRenderer } from 'vue-markdown-suite'

const decorate: MarkdownNodeRenderer = (ctx) =>
  h('span', [ctx.defaultRender(), ' ↗'])
```

```vue
<MarkdownRenderer :source="source" :nodeComponents="{ a: decorate }" />
```

## Add a plugin

```ts
import { defineMarkdownPlugin } from 'vue-markdown-suite/plugins'

const stamp = defineMarkdownPlugin({
  name: 'stamp',
  transformDocument(document) {
    return document
  },
})
```

## Provider and presets

```vue
<MarkdownConfigProvider :preset="brand" theme="auto">
  <MarkdownRenderer :source="source" />
</MarkdownConfigProvider>
```

Local props still win over provider, preset, plugin, and built-in defaults.
