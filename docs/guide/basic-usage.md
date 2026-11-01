---
description: Source input, styling, events, slots, and exposed actions for the Markdown renderer.
---

# Basic usage

The renderer accepts Markdown through `source`, `v-model:source`, or the default
slot. It renders a document model as Vue components and exposes events for TOC,
links, tasks, and diagnostics.

## Input

::: code-group

```vue [Prop]
<MarkdownRenderer source="# From the prop" />
```

```vue [Two-way binding]
<MarkdownRenderer v-model:source="source" />
```

```vue [Default slot]
<MarkdownRenderer># From the slot</MarkdownRenderer>
```

:::

`source` is controlled and wins over the slot. The slot is text-only and is
re-read when its text content changes. A non-string `source` reports a diagnostic
and renders the empty state instead of throwing.

::: tip Reactive slot text
The slot is useful for simple static content. For editors or any source that
changes frequently, bind `source` so the parent owns the value.
:::

## Try it live

<ClientOnly>
  <LivePlayground />
</ClientOnly>

## Styling

Import the full stylesheet, the tokens only, or nothing at all:

::: code-group

```ts [Full stylesheet]
import '@coderminer/vue-markdown/style.css'
```

```ts [Tokens + components]
import '@coderminer/vue-markdown/styles/tokens.css'
import '@coderminer/vue-markdown/styles/components.css'
```

```ts [Unstyled]
// Do not import a stylesheet.
```

:::

Override tokens on any ancestor or through the `tokens` prop:

```vue
<MarkdownRenderer
  :source="source"
  theme="auto"
  :tokens="{ '--vmd-color-accent': '#7c3aed' }"
/>
```

Every visual part exposes a stable class and a `data-vmd-part` attribute:

```css
[data-vmd-part='heading'] {
  letter-spacing: -0.01em;
}

[data-vmd-part='code'] {
  --vmd-code-bg: #0d1117;
  color: #e6edf3;
}
```

Read [Styling and themes](./styling.md) for the full token and part surface.

## TOC

```vue
<MarkdownRenderer :source="source" toc />
```

The TOC renders as a labelled `nav`, marks the active item with `aria-current`,
and uses deterministic heading IDs. Replacing `h1`–`h6` makes the replacement own
its anchor behavior.

## Events

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { MarkdownRenderer } from '@coderminer/vue-markdown'

const renderer = ref<InstanceType<typeof MarkdownRenderer>>()

function onToc(toc) {
  console.log('headings', toc)
}

function onError(diagnostic) {
  console.warn(diagnostic.code, diagnostic.message)
}
</script>

<template>
  <MarkdownRenderer
    ref="renderer"
    :source="source"
    toc
    @toc-change="onToc"
    @link-click="onLink"
    @task-change="onTask"
    @render-error="onError"
    @ready="onReady"
  />
</template>
```

| Event | Payload |
| --- | --- |
| `update:source` | `source: string` |
| `toc-change` | `TocItem[]` |
| `link-click` | `{ url, target, node, event }` |
| `custom-tag-click` | `{ tag, props, node, event }` |
| `task-change` | `{ checked, node }` |
| `render-error` | `MarkdownDiagnostic` |
| `ready` | `MarkdownDocument` |

`toc-change` is signature-gated: it only fires when the serialized TOC changes.
`ready` fires once for the first successful document.

## Exposed actions

```ts
renderer.value?.scrollToHeading('install')
renderer.value?.getToc()
renderer.value?.getDocument()
await renderer.value?.refresh()
renderer.value?.updateSource('# New source')
```

| Action | Signature |
| --- | --- |
| `scrollToHeading` | `(id: string, options?: ScrollIntoViewOptions) => void` |
| `getDocument` | `() => MarkdownDocument \| undefined` |
| `getToc` | `() => TocItem[]` |
| `refresh` | `() => Promise<void>` |
| `updateSource` | `(source: string) => void` |

## Slots

Named region slots fully replace their default region:

```vue
<MarkdownRenderer :source="source" toc>
  <template #toc="{ items, activeId, navigate }">
    <nav class="my-toc">
      <a
        v-for="item in items"
        :key="item.id"
        :href="`#${item.id}`"
        :aria-current="item.id === activeId ? 'location' : undefined"
        @click.prevent="navigate(item.id)"
      >
        {{ item.text }}
      </a>
    </nav>
  </template>
</MarkdownRenderer>
```

Available slots: `root`, `toc`, `toc-item`, `content`, `error`, `empty`, and
`loading`. Code, math, Mermaid, and editor components also expose their own
slots; see [Components](../reference/components.md).

## Next

- [Advanced usage](./advanced-usage.md)
- [Customization](./customization.md)
- [Renderer reference](../reference/renderer.md)
