# Customization

Customization is a layered contract. The same conventions apply to the
renderer, regions, and node components.

## Precedence

Configuration values resolve in this order:

```
local props > nearest provider > preset > plugin defaults > built-in defaults
```

Regions resolve as `slot > regions override > plugin contribution > preset > built-in`.
Node rendering resolves as
`nodeComponents function > nodeComponents[tag] > components[tag] > nodeComponents[kind] > plugin component > preset > built-in`.

## Tokens and themes

Tokens live in `src/styles/tokens.css` with the `--vmd-*` prefix. Override them
on any ancestor or through the `tokens` prop. Set `theme` to `light`, `dark`,
`auto`, or `custom`; the renderer writes `data-vmd-theme` on its root only.
`auto` follows `prefers-color-scheme`; `custom` applies no preset colors.

## Labels

Every user-facing string is a label. A label is a string or a function receiving
context:

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

Labels merge with `DEFAULT_LABELS`; local values win over provider and preset
values.

## Provider

`MarkdownConfigProvider` supplies app-wide defaults. Nested providers merge with
their parent, and local props still win:

```vue
<script setup lang="ts">
import { MarkdownConfigProvider, MarkdownRenderer } from 'vue-markdown-suite'
</script>

<template>
  <MarkdownConfigProvider
    theme="auto"
    :tokens="{ '--vmd-color-accent': '#8250df' }"
    :labels="{ toc: 'Contents' }"
    :components="{ h1: 'h2' }"
  >
    <MarkdownRenderer :source="source" toc />
  </MarkdownConfigProvider>
</template>
```

The provider accepts `theme`, `tokens`, `labels`, `components`, `regions`,
`nodeComponents`, `plugins`, `pipeline`, `highlighter`, `mathEngine`,
`mermaidRenderer`, `diagnosticsFormatter`, `slugger`, `urlTransform`, `config`,
and `preset`.

## Regions

The `regions` map replaces structural regions:

```ts
const regions = {
  root: MyRoot,
  content: MyContent,
  toc: MyToc,
  tocItem: MyTocItem,
  error: MyError,
  empty: MyEmpty,
  loading: MyLoading,
}
```

A region override receives the same props as the default component.

## Node components and renderers

Use `components` for tag overrides and `nodeComponents` for the semantic catalog.
A function value in `nodeComponents` is an advanced renderer and wins over a
component for the same key:

```ts
import { h } from 'vue'
import type { MarkdownNodeRenderer } from 'vue-markdown-suite'

const decorateLink: MarkdownNodeRenderer = (ctx) =>
  h('span', [ctx.defaultRender(), ' ↗'])

const nodeComponents = { a: decorateLink }
```

`defaultRender` keeps built-in safety, heading IDs, and TOC behavior. A function
renderer receives `{ node, key, children, defaultRender, context }`.

For fenced code, `components.pre` remains the wrapper and
`nodeComponents.code` replaces the inner code element. Inline code uses
`nodeComponents.inlineCode` or `components.code`.

## Slots

The renderer exposes named region slots. A provided slot fully replaces the
default region:

| Slot | Context |
| --- | --- |
| `root` | `{ document, toc, status, diagnostics, tokens, theme, actions }` |
| `toc` | `{ items, activeId, label, navigate }` |
| `toc-item` | `{ item, active, navigate }` |
| `content` | `{ nodes, document }` |
| `error` | `{ diagnostics, label, retry }` |
| `empty` | `{ label }` |
| `loading` | `{ label }` |
| `code` | `{ node, source, language, actions: { copy, download } }` |
| `code-actions` | `{ source, language, actions: { copy, download } }` |
| `highlighter` | `{ source, language, nodes, lines, actions: { copy } }` |
| `math` | `{ tex, displayMode, rendered, error }` |
| `math-error` | `{ tex, error, retry }` |
| `mermaid` | `{ source, svg, status, error, actions: { copy, exportPng, fullscreen, retry } }` |
| `mermaid-error` | `{ source, error, retry, focusSource }` |
| `editor` | `{ value, update, diagnostics, status, actions: { focus, reset, fullscreen } }` |
| `editor-diagnostics` | `{ diagnostics, focusLine }` |

A slot receives the same data and functional actions as the default region. An
absent slot, or a slot that renders no meaningful output, keeps the default.

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

const composed = composePresets(brand, docsPreset)
```

Pass a preset to the renderer or provider with the `preset` prop. Applying a
preset never mutates global state.

## Behavior injection

The renderer accepts `pipeline`, `slugger`, `urlTransform`, `highlighter`,
`mathEngine`, `mermaidRenderer`, and `diagnosticsFormatter`. Invalid adapters
are reported through `render-error` and the documented fallback is used.
Custom sluggers are wrapped so duplicate headings still receive unique IDs.

## Manifests

`COMPONENT_MANIFESTS` and `getComponentManifest(name)` expose each component's
tokens, parts, slots, labels, override keys, and behavior hooks. The registry is
Vue-free, so documentation and the demo inspector can read it without importing
component code. `validateManifest(manifest, snapshot)` compares declared parts,
labels, and slots with rendered output.
