# Migrating from react-markdown

`vue-markdown-suite` follows react-markdown's parse model and prop names for the
core renderer. Most migrations are a template rewrite plus swapping React
components for Vue components.

## Prop map

| react-markdown | vue-markdown-suite | Notes |
| --- | --- | --- |
| `components` | `components` | Same tag-keyed map; values are Vue components or tag-name strings. |
| `allowedElements` | `allowedElements` | Runs on the normalized model. Wins over `disallowedElements`. |
| `disallowedElements` | `disallowedElements` | Deny list. |
| `unwrapDisallowed` | `unwrapDisallowed` | Keeps children of removed elements. |
| `allowElement` | `allowElement` | Runs after the allow/deny lists. |
| `urlTransform` | `urlTransform` | Return `null` to remove the attribute. |
| `skipHtml` | `skipHtml` | Removes raw HTML nodes. |
| `remarkPlugins` | `remarkPlugins` | Runs after library remark plugins. |
| `rehypePlugins` | `rehypePlugins` | Add `rehype-raw` to enable raw HTML. |
| `children` | `source` or default slot | `source` wins over the slot. |
| `MarkdownAsync` | `useMarkdownDocument` | The composable owns async status. |
| `MarkdownHooks` | `useMarkdownDocument` | No separate hooks entry. |

## Basic render

```jsx
// react-markdown
import Markdown from 'react-markdown'

<Markdown>{source}</Markdown>
```

```vue
<!-- vue-markdown-suite -->
<script setup lang="ts">
import { MarkdownRenderer } from 'vue-markdown-suite'
</script>

<template>
  <MarkdownRenderer :source="source" />
</template>
```

## `components`

```jsx
// react-markdown
<Markdown components={{ h1: 'h2', a: MyLink }}>{source}</Markdown>
```

```vue
<script setup lang="ts">
const components = { h1: 'h2', a: MyLink }
</script>

<template>
  <MarkdownRenderer :source="source" :components="components" />
</template>
```

A Vue component receives `node` and renders children through the default slot:

```ts
const MyLink = defineComponent({
  props: { href: String },
  setup(props, { slots }) {
    return () => h('a', { href: props.href, class: 'my-link' }, slots.default?.())
  },
})
```

## Filtering

```jsx
// react-markdown
<Markdown
  disallowedElements={['h1']}
  unwrapDisallowed
  allowElement={(node) => node.tagName !== 'script'}
>
  {source}
</Markdown>
```

```vue
<template>
  <MarkdownRenderer
    :source="source"
    :disallowed-elements="['h1']"
    unwrap-disallowed
    :allow-element="(node) => node.tag !== 'script'"
  />
</template>
```

`allowElement` receives `(node, index, parent)` where `node` is the normalized
model node.

## `urlTransform`

```jsx
// react-markdown
<Markdown urlTransform={(url) => url.replace('/old/', '/new/')}>
  {source}
</Markdown>
```

```vue
<template>
  <MarkdownRenderer :source="source" :url-transform="(url) => url.replace('/old/', '/new/')" />
</template>
```

Return `null` to drop the attribute.

## Raw HTML

```jsx
// react-markdown
import rehypeRaw from 'rehype-raw'

<Markdown rehypePlugins={[rehypeRaw]} skipHtml={false}>
  {source}
</Markdown>
```

```vue
<script setup lang="ts">
import rehypeRaw from 'rehype-raw'
</script>

<template>
  <MarkdownRenderer :source="source" :rehype-plugins="[rehypeRaw]" />
</template>
```

Sanitization runs immediately after `rehype-raw`; see
[Raw HTML and security](security.md).

## Plugins

```jsx
// react-markdown
import remarkGfm from 'remark-gfm'

<Markdown remarkPlugins={[remarkGfm]}>{source}</Markdown>
```

```vue
<script setup lang="ts">
import remarkGfm from 'remark-gfm'
</script>

<template>
  <MarkdownRenderer :source="source" :remark-plugins="[remarkGfm]" />
</template>
```

For reusable behavior, prefer a suite plugin so it can also contribute
components, labels, and lifecycle hooks.

## `children`

react-markdown takes Markdown through children. In Vue, pass `source`; the
default slot is treated as raw Markdown text when `source` is absent.

```vue
<MarkdownRenderer># From the slot</MarkdownRenderer>
<MarkdownRenderer source="# From the prop" />
```

## `MarkdownAsync`

react-markdown's async entry awaits plugins before rendering. Use the composable
and render the model yourself, or pass an async pipeline to the renderer:

```ts
import { useMarkdownDocument } from 'vue-markdown-suite/headless'

const { document, status, diagnostics } = useMarkdownDocument(source, {
  remarkPlugins: [asyncPlugin],
})
```

`status` moves `idle → pending → ready` (or `error`). The previous document is
kept while a run is pending.

## `MarkdownHooks`

There is no separate hooks entry. `useMarkdownDocument` is the single stateful
API and is exported from both the root and `headless` entries.

```ts
import { useMarkdownDocument } from 'vue-markdown-suite'

const { document, toc, status } = useMarkdownDocument(source)
```

## Behavioral differences

- Link targets default to `_self`. Set `externalLinkTarget="_blank"` to open
  external links in a new tab with `rel="noopener noreferrer"`.
- Raw HTML is dropped by default, including block scripts.
- Heading IDs are generated by `github-slugger` and are stable across runs.
- Fenced code resolves `nodeComponents.code` → `components.pre` →
  `components.code` → built-in `MarkdownCode`.

## Next

- [Plugins](plugins.md)
- [Headless usage](headless.md)
