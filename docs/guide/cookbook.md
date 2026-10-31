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
import { defaultPlugins } from 'vue-markdown-suite/plugins'
import { mathPlugin } from 'vue-markdown-suite/math'
import 'vue-markdown-suite/styles/math-full.css'

const plugins = [...defaultPlugins, mathPlugin()]
```

## Add Mermaid

```vue
<script setup lang="ts">
import { MarkdownRenderer } from 'vue-markdown-suite'
import { defaultPlugins } from 'vue-markdown-suite/plugins'
import { mermaidPlugin } from 'vue-markdown-suite/mermaid'

const plugins = [...defaultPlugins, mermaidPlugin()]
</script>

<template>
  <MarkdownRenderer :source="source" :plugins="plugins" />
</template>
```

Mermaid fences now render as diagrams. For a standalone diagram, import
`MermaidBlock` from `vue-markdown-suite` and pass `source` directly.

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

```vue [DecoratedLink.vue]
<script setup lang="ts">
import type { MarkdownNode } from 'vue-markdown-suite'

defineOptions({ inheritAttrs: false })
defineProps<{ node?: MarkdownNode }>()
</script>

<template>
  <span class="decorated-link">
    <a v-bind="$attrs"><slot /></a> ↗
  </span>
</template>
```

```vue [App.vue]
<script setup lang="ts">
import { MarkdownRenderer } from 'vue-markdown-suite'
import DecoratedLink from './DecoratedLink.vue'

const nodeComponents = { a: DecoratedLink }
</script>

<template>
  <MarkdownRenderer :source="source" :node-components="nodeComponents" />
</template>
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
