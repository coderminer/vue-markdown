---
description: Customize elements, themes, and CSS in vue-markdown-suite with stable override layers, design tokens, and documented parts.
---

# Customization

Customization is a layered contract. Local props win over providers, presets,
plugin defaults, and built-ins, and every visual part is addressable without
targeting internal DOM.

```text
local props
  > nearest provider
    > preset
      > plugin defaults
        > built-in defaults
```

## 1. Customize elements

There are four stable seams for replacing output.

### Tag components

`components` maps an HTML tag to another tag name or a Vue component. Keep each
replacement in its own `.vue` file and pass the component reference.

```vue [BadgeLink.vue]
<script setup lang="ts">
import type { MarkdownNode } from 'vue-markdown-suite'

defineProps<{
  node?: MarkdownNode
  href?: string
}>()
</script>

<template>
  <a :href="href" class="badge-link">
    <span class="badge">link</span>
    <slot />
  </a>
</template>
```

```vue [CodeFrame.vue]
<script setup lang="ts">
import type { MarkdownCodeNode } from 'vue-markdown-suite'

defineProps<{ node?: MarkdownCodeNode }>()
</script>

<template>
  <figure class="code-frame">
    <figcaption>{{ node?.language || 'text' }}</figcaption>
    <pre><code><slot /></code></pre>
  </figure>
</template>
```

```vue [App.vue]
<script setup lang="ts">
import { MarkdownRenderer } from 'vue-markdown-suite'
import BadgeLink from './BadgeLink.vue'
import CodeFrame from './CodeFrame.vue'

const components = {
  h1: 'h2',
  a: BadgeLink,
  pre: CodeFrame,
}
</script>

<template>
  <MarkdownRenderer :source="source" :components="components" />
</template>
```

A component receives the normalized node as `node` and renders children through
the default slot. Fenced code always wraps through `components.pre`; its inner
element resolves through `components.code` or `nodeComponents.code`.

### Node components

`nodeComponents` targets semantic nodes (`code`, `math`, `mermaid`, `custom`, and
element tags). A component is the clearest form:

```vue [Callout.vue]
<script setup lang="ts">
import type { MarkdownNode } from 'vue-markdown-suite'

defineProps<{ node?: MarkdownNode }>()
</script>

<template>
  <aside class="callout">
    <slot />
  </aside>
</template>
```

```vue [ArticleLink.vue]
<script setup lang="ts">
import type { MarkdownNode } from 'vue-markdown-suite'

defineProps<{ node?: MarkdownNode }>()
</script>

<template>
  <a class="article-link">
    <slot />
  </a>
</template>
```

```vue [App.vue]
<script setup lang="ts">
import { MarkdownRenderer } from 'vue-markdown-suite'
import ArticleLink from './ArticleLink.vue'
import Callout from './Callout.vue'

const nodeComponents = {
  blockquote: Callout,
  a: ArticleLink,
}
</script>

<template>
  <MarkdownRenderer :source="source" :node-components="nodeComponents" />
</template>
```

`node` is declared so it is not forwarded as a DOM attribute; every other safe
attribute, such as `href`, falls through to the root element. Function renderers
remain available for advanced cases and receive
`{ node, kind, tag, attrs, key, children, defaultRender, context }`.
`defaultRender()` keeps built-in safety, heading IDs, and TOC behavior.

### Complete example: custom code and Mermaid nodes

This example registers a custom fenced-code node and a custom Mermaid node, then
renders a Markdown string with both.

`nodeComponents.code` replaces the inner `<code>` element of a fenced block. The
outer `<pre>` is still rendered by `MarkdownCode`. `nodeComponents.mermaid` only
runs when `mermaidPlugin()` has converted a Mermaid fence into a `mermaid` node,
so the plugin is required in this example.

```vue [CustomCode.vue]
<script setup lang="ts">
import type { MarkdownCodeNode } from 'vue-markdown-suite'

defineProps<{
  node?: MarkdownCodeNode
  code?: string
  language?: string
  className?: string
}>()
</script>

<template>
  <code
    :class="['custom-code', className]"
    :data-language="language || 'text'"
  >{{ code ?? node?.code }}</code>
</template>
```

```vue [CustomMermaid.vue]
<script setup lang="ts">
import { MermaidBlock } from 'vue-markdown-suite'
import type { MarkdownMermaidNode } from 'vue-markdown-suite'

defineProps<{
  node?: MarkdownMermaidNode
  code?: string
}>()
</script>

<template>
  <MermaidBlock :source="code ?? node?.code ?? ''" show-errors />
</template>
```

```vue [App.vue]
<script setup lang="ts">
import { MarkdownRenderer } from 'vue-markdown-suite'
import { defaultPlugins } from 'vue-markdown-suite/plugins'
import { mermaidPlugin } from 'vue-markdown-suite/mermaid'
import CustomCode from './CustomCode.vue'
import CustomMermaid from './CustomMermaid.vue'

const source = `# Custom nodes

\`\`\`ts
const answer: number = 42
\`\`\`

\`\`\`mermaid
flowchart LR
  Markdown --> Node
  Node --> Vue
\`\`\`
`

// Keep plugin instances stable. Do not create them inline in the template.
const plugins = [...defaultPlugins, mermaidPlugin()]

const nodeComponents = {
  code: CustomCode,
  mermaid: CustomMermaid,
}
</script>

<template>
  <MarkdownRenderer
    :source="source"
    :plugins="plugins"
    :node-components="nodeComponents"
  />
</template>
```

`nodeComponents.code` receives `{ node, code, language, className }`. It does not
run a highlighter. To keep the built-in `CodeBlock` header, actions, and
highlighting while replacing the whole block, use `regions.codeBlock` and render
`CodeBlock` with `standalone`:

```ts
const regions = {
  codeBlock: MyCodeBlock, // renders <CodeBlock standalone ... />
}
```

`nodeComponents.mermaid` receives `{ node, code }`. Without `mermaidPlugin()`, a
` ```mermaid ` fence stays a normal `code` node and your Mermaid component does
not run.

### Regions

`regions` replaces structural areas:

```ts
const regions = {
  root: MyRoot,
  content: MyContent,
  toc: MyToc,
  tocItem: MyTocItem,
  codeBlock: MyCodeBlock,
  mermaidBlock: MyMermaid,
  error: MyError,
  empty: MyEmpty,
  loading: MyLoading,
}
```

A region override receives the same props as the default component.

### Slots

Named slots are the last layer and receive scoped data plus functional actions.
An absent or empty slot keeps the default rendering.

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

See [Slots](../reference/renderer.md#slots) for every context.

### TOC

The TOC is opt-in through the `toc` prop. It is derived from headings and is
available as `TocItem[]`:

```ts
interface TocItem {
  id: string
  text: string
  level: number
}
```

Customize it at four layers:

| Layer | API |
| --- | --- |
| Whole TOC | `#toc` slot or `regions.toc` |
| One item | `#toc-item` slot or `regions.tocItem` |
| Label | `labels.toc` |
| Depth | `tocDepth` (`0` = all levels, `1`–`6` = maximum level) |
| Behaviour | `toc`, `syncHash`, `idPrefix`, `getToc()`, `scrollToHeading(id)` |

Limit the default TOC to `h1`–`h3`:

```vue
<MarkdownRenderer :source="source" toc :toc-depth="3" />
```

`tocDepth` also filters the `items` passed to `#toc` / `#toc-item`, the list
returned by `getToc()`, and the payload of `toc-change`.

Replace the whole TOC:

```vue
<MarkdownRenderer :source="source" toc>
  <template #toc="{ items, activeId, label, navigate }">
    <nav class="my-toc" :aria-label="label">
      <button
        v-for="item in items"
        :key="item.id"
        :data-active="item.id === activeId"
        @click="navigate(item.id)"
      >
        {{ item.text }}
      </button>
    </nav>
  </template>
</MarkdownRenderer>
```

Replace only one item and keep the default `<nav>`:

```vue
<MarkdownRenderer :source="source" toc>
  <template #toc-item="{ item, active, navigate }">
    <a
      :href="`#${item.id}`"
      :aria-current="active ? 'location' : undefined"
      @click.prevent="navigate(item.id)"
    >
      {{ item.level }}. {{ item.text }}
    </a>
  </template>
</MarkdownRenderer>
```

With region components, `MyToc` receives `items`, `activeId`, `label`, and an
optional `tocItem`; it emits `navigate(id)`. `MyTocItem` receives `item` and
`active`; it also emits `navigate(id)`.

```ts
const regions = {
  toc: MyToc,
  tocItem: MyTocItem,
}
```

Use `idPrefix` when one page contains multiple renderers, `syncHash` to update
the URL hash during navigation, and the exposed `getToc()` /
`scrollToHeading(id)` methods for an external TOC. See the
[Public API](../reference/api.md#toc) for the complete TOC contract.

### Custom tags

`customTagsPlugin` converts selected elements into custom nodes that map to your
own components:

```ts
import { customTagsPlugin } from 'vue-markdown-suite/plugins'

const plugins = [customTagsPlugin({ tags: ['x-note'] })]
```

::: tip Rich components
The same component-first pattern applies to rich components. See
[Build a custom code block](./rich-components.md#build-a-custom-code-block-with-codeblock)
for a `CodeBlock`-powered element that exercises every public feature.
:::

### Override precedence

```text
nodeComponents function
  > nodeComponents[tag]
    > components[tag]
      > nodeComponents[kind]
        > plugin component
          > preset
            > built-in
```

## 2. Customize the theme

Set `theme` to `light`, `dark`, `auto`, or `custom`. The renderer writes
`data-vmd-theme` on its own root and never touches the host page.

```vue
<!-- Presets -->
<MarkdownRenderer theme="light" :source="source" />
<MarkdownRenderer theme="dark" :source="source" />
<MarkdownRenderer theme="auto" :source="source" />
<MarkdownRenderer theme="custom" :source="source" />

<!-- Per-instance tokens -->
<MarkdownRenderer
  theme="auto"
  :source="source"
  :tokens="{
    '--vmd-color-accent': '#7c3aed',
    '--vmd-radius-md': '12px',
  }"
/>

<!-- App-wide defaults -->
<MarkdownConfigProvider theme="auto" :tokens="brandTokens">
  <MarkdownRenderer :source="source" toc />
</MarkdownConfigProvider>
```

- `auto` follows `prefers-color-scheme` without JavaScript.
- `custom` applies no preset colors, so your overrides win unchanged.
- Tokens cascade from any ancestor, so a scoped theme is just a class with
  `--vmd-*` properties.

```css
.theme-brand {
  --vmd-color-accent: #7c3aed;
  --vmd-radius-md: 12px;
  --vmd-font-size: 1.0625rem;
}
```

Read [Styling and themes](./styling.md) for the token surface.

## 3. Customize CSS

The stylesheet is optional and split into two layers:

```ts
import 'vue-markdown-suite/style.css'
// or
import 'vue-markdown-suite/styles/tokens.css'
import 'vue-markdown-suite/styles/components.css'
```

Target documented parts and tokens, never internal element structure:

```css
.my-docs {
  --vmd-font-size: 1.0625rem;
  --vmd-line-height: 1.8;
  --vmd-color-accent: #7c3aed;
}

[data-vmd-part='heading'] {
  letter-spacing: -0.01em;
}

[data-vmd-part='code'] {
  --vmd-code-bg: #0d1117;
  color: #e6edf3;
}

[data-vmd-part='blockquote'] {
  font-style: italic;
}
```

Every visual part exposes both `class="vmd-<part>"` and
`data-vmd-part="<part>"`. Parts and classes are stable within a major version.

::: tip Unstyled mode
Do not import a stylesheet. The markup stays semantic, accessible, and fully
functional; heading IDs, TOC, filtering, URL policy, plugins, and SSR are
unchanged.
:::

::: warning Avoid element selectors
A host may replace any tag component. Style `[data-vmd-part='...']` or
`.vmd-*` classes instead of `h1`, `pre`, or `table`.
:::

## Try the layers

<ClientOnly>
  <CustomizationLab />
</ClientOnly>

## Labels and manifests

Every user-facing string is a label. A label is a string or a context-aware
function:

```vue
<MarkdownRenderer
  :source="source"
  toc
  :labels="{
    toc: 'On this page',
    headingAnchor: ({ id }) => `Link to ${id}`,
    empty: 'Nothing to show',
  }"
/>
```

`COMPONENT_MANIFESTS` and `getComponentManifest(name)` expose each component's
tokens, parts, slots, labels, override keys, and behavior hooks. The registry is
Vue-free, so tooling and docs can read it without importing component code.

## Presets

Presets bundle configuration under a name. They are declarative but not
JSON-serializable because they contain components and functions:

```ts
import { composePresets, defineMarkdownPreset } from 'vue-markdown-suite/presets'

const brand = defineMarkdownPreset({
  name: 'brand',
  theme: 'dark',
  labels: { toc: 'Contents' },
  components: { h1: 'h2' },
})

const preset = composePresets(brand, docsPreset)
```

Pass a preset to the renderer or provider. Applying a preset never mutates global
state.

## Behavior injection

The renderer accepts `pipeline`, `slugger`, `urlTransform`, `highlighter`,
`mathEngine`, `mermaidRenderer`, and `diagnosticsFormatter`. Invalid adapters are
reported through `render-error` and the documented fallback is used. Custom
sluggers are wrapped so duplicate headings still receive unique IDs.

## Next

- [Styling and themes](./styling.md)
- [Renderer reference](../reference/renderer.md)
- [Complete example](./complete-example.md)
