---
description: Edit Markdown and inspect the real renderer output, including GFM and math.
---

# Live playground

The playground uses the real renderer and the same public entries you import in
your app. The default **All elements** sample covers headings, paragraphs,
emphasis, links, images, lists, task lists, blockquotes, tables, code, math,
Mermaid, footnotes, raw HTML, line breaks, and horizontal rules.

<ClientOnly>
  <LivePlayground />
</ClientOnly>

## What to try

- Switch between **All elements**, **Essentials**, **GFM**, and **Math**.
- Edit any sample and watch the preview update.
- Add a heading and watch the TOC update.
- Switch to **GFM** for tables, task lists, and footnotes.
- Switch to **Math** for inline and display KaTeX.
- Inspect the **Mermaid** block in **All elements** for the default diagram
  header, tabs, and icon actions.
- Replace a paragraph with a blockquote and see the callout in the
  [customization lab](../guide/customization.md#try-the-layers).

## The component behind it

```vue
<script setup lang="ts">
import { computed, ref } from 'vue'
import { MarkdownRenderer } from 'vue-markdown-suite'
import { fullPlugins } from 'vue-markdown-suite/plugins'
import { mathPlugin } from 'vue-markdown-suite/math'
import { mermaidPlugin } from 'vue-markdown-suite/mermaid'
import rehypeRaw from 'rehype-raw'

const source = ref(samples['All elements'])
const theme = computed(() => (isDark.value ? 'dark' : 'light'))
const plugins = [...fullPlugins, mathPlugin(), mermaidPlugin()]
const rehypePlugins = [rehypeRaw]
</script>

<template>
  <MarkdownRenderer
    v-model:source="source"
    :plugins="plugins"
    :rehype-plugins="rehypePlugins"
    :theme="theme"
    toc
    show-error
  />
</template>
```

## Next

- [Complete example](../guide/complete-example.md)
- [Basic usage](../guide/basic-usage.md)
- [Customization](../guide/customization.md)
