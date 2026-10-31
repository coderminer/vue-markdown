---
description: Edit Markdown and inspect the real renderer output, including GFM and math.
---

# Live playground

The playground uses the real renderer and the same public entries you import in
your app. Switch samples, toggle the TOC, and edit the source.

<ClientOnly>
  <LivePlayground />
</ClientOnly>

## What to try

- Add a heading and watch the TOC update.
- Switch to **GFM** for tables, task lists, and footnotes.
- Switch to **Math** for inline and display KaTeX.
- Replace a paragraph with a blockquote and see the callout in the
  [customization lab](../guide/customization.md#try-the-layers).

## The component behind it

```vue
<script setup lang="ts">
import { computed, ref } from 'vue'
import { MarkdownRenderer } from 'vue-markdown-suite'
import { fullPlugins } from 'vue-markdown-suite/plugins'
import { mathPlugin } from 'vue-markdown-suite/math'

const source = ref('# Live playground')
const theme = computed(() => (isDark.value ? 'dark' : 'light'))
const plugins = [...fullPlugins, mathPlugin()]
</script>

<template>
  <MarkdownRenderer
    v-model:source="source"
    :plugins="plugins"
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
