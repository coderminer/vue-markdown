---
description: Complete API for MarkdownRenderer props, events, exposed actions, slots, and region overrides.
---

# Renderer reference

`MarkdownRenderer` is the preset component. It owns parsing, plugin resolution,
TOC state, events, regions, and slots, and renders the normalized document through
the component catalog.

```vue
<script setup lang="ts">
import { MarkdownRenderer } from 'vue-markdown-suite'
import 'vue-markdown-suite/style.css'
</script>

<template>
  <MarkdownRenderer :source="source" toc />
</template>
```

## Props

| Prop | Type | Default and notes |
| --- | --- | --- |
| `source` | `string` | Default `''`. Controlled Markdown input. Wins over the default slot. Supports `v-model:source`. |
| `components` | `Record<string, Component \| string>` | Default `{}`. Tag-keyed overrides. |
| `regions` | `Partial<Record<string, Component \| string>>` | Default `{}`. Root, content, TOC, TOC item, code block, Mermaid block, error, empty, and loading region overrides. |
| `nodeComponents` | `Record<string, Component \| string \| NodeRenderer>` | Default `{}`. Semantic node overrides and function renderers. |
| `labels` | `Partial<MarkdownLabels>` | Default `{}`. String or function labels for built-in text. |
| `preset` | `MarkdownPreset \| MarkdownPreset[]` | Applies one or more presets. |
| `plugins` | `PluginInput[]` | Default `defaultPlugins`. Replaces the default plugin set when provided. Add `htmlPlugin()` from `vue-markdown-suite/html` for sanitized raw HTML. |
| `disablePlugins` | `string[]` | Default `[]`. Removes named plugins from the resolved set. |
| `remarkPlugins` | `PluggableList` | Default `[]`. Runs after library remark plugins. |
| `rehypePlugins` | `PluggableList` | Default `[]`. Runs after library rehype plugins and the built-in sanitizer. |
| `remarkRehypeOptions` | `Record<string, unknown>` | Default `{}`. Merged into the conversion step. |
| `pipeline` | `MarkdownPipeline` | Default `official`. Advanced escape hatch; must return hast. |
| `slugger` | `MarkdownSlugger` | Default `github-slugger`. Heading ID generator. |
| `highlighter` | `MarkdownHighlighter` | Syntax highlighting adapter. |
| `mathEngine` | `MathEngine` | Math rendering adapter. |
| `mermaidRenderer` | `MermaidRenderer` | Mermaid rendering adapter. |
| `diagnosticsFormatter` | `DiagnosticFormatter` | Formats render errors. |
| `allowedElements` | `string[]` | Mutually exclusive with `disallowedElements`; wins on conflict. |
| `disallowedElements` | `string[]` | Deny list. |
| `unwrapDisallowed` | `boolean` | Default `false`. Keeps the children of removed elements. |
| `allowElement` | `(node, index, parent) => boolean \| null \| undefined` | Runs after the allow/deny lists; any falsy result rejects the element. |
| `urlTransform` | `(url, key, node) => string \| null \| undefined` | Default `defaultUrlTransform`. Applies to every URL-bearing attribute; `null` removes it and the result is revalidated. |
| `linkTarget` | `string` | Default `'_self'`. Applied to links. |
| `externalLinkTarget` | `'_self' \| '_blank'` | Default `'_self'`. `_blank` adds `rel="noopener noreferrer"`. |
| `baseUrl` | `string` | Resolves relative URLs before `urlTransform`. |
| `idPrefix` | `string` | Default `''`. Prefixes generated heading IDs. Use a unique prefix when one page contains multiple renderers. |
| `syncHash` | `boolean` | Default `false`. Updates the URL hash on heading activation. |
| `toc` | `boolean` | Default `false`. Renders the TOC region. |
| `tocDepth` | `number` | Default `0` (all levels). Maximum heading level to include, from `1` to `6`. |
| `showError` | `boolean` | Default `false`. Renders the error region on failure. |
| `tokens` | `Record<string, string>` | Default `{}`. Inline `--vmd-*` custom properties on the root. |
| `theme` | `'light' \| 'dark' \| 'auto' \| 'custom'` | Default `'light'`. Sets `data-vmd-theme` on the root. |
| `as` | `string \| Component` | Default `'div'`. Root element or component. |

::: tip Multiple renderers on one page
Heading slugs are only unique inside one document. Give each renderer a distinct
`idPrefix` (`doc-`, `sidebar-`, …) so anchors, `syncHash`, and deep links remain
unambiguous. TOC navigation and active-heading tracking are already scoped to
the renderer's own root when markup is scoped this way.
:::

Keep plugin arrays stable as well. Inline factory calls create new plugin
objects on every parent render and invalidate the parse memo.

## Events

| Event | Payload | Notes |
| --- | --- | --- |
| `update:source` | `source: string` | Emitted by `updateSource` and `v-model:source`. |
| `toc-change` | `TocItem[]` | Signature-gated; fires only when the serialized TOC changes. |
| `link-click` | `{ url, target, node, event }` | Fires after a rendered link is activated. |
| `custom-tag-click` | `{ tag, props, node, event }` | Props are normalized and safe. |
| `task-change` | `{ checked, node }` | Fires when a GFM task checkbox changes. |
| `render-error` | `MarkdownDiagnostic` | Parse, plugin, adapter, and configuration failures. |
| `ready` | `MarkdownDocument` | Fires once for the first successful document. |

## Exposed actions

```ts
import { ref } from 'vue'
import type { MarkdownRendererInstance } from 'vue-markdown-suite'

const renderer = ref<MarkdownRendererInstance>()

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

The same shape is exported as `MarkdownRendererInstance`, so hosts do not need
`InstanceType<typeof MarkdownRenderer>`.

## Slots

The default slot is raw Markdown text. Named region slots fully replace their
default region and receive scoped data and actions.

| Slot | Context |
| --- | --- |
| `root` | `{ document, toc, status, diagnostics, tokens, theme, actions }` |
| `toc` | `{ items, activeId, label, tocDepth, navigate }` |
| `toc-item` | `{ item, active, navigate }` |
| `content` | `{ nodes, document }` |
| `error` | `{ diagnostics, label, retry }` |
| `empty` | `{ label }` |
| `loading` | `{ label }` |
| `code` | `{ node, source, language, highlighted, nodes, lines, visibleLines, actions: { copy, download } }` |
| `code-actions` | `{ source, language, fileName, title, highlighted, nodes, actions: { copy, download } }` |
| `header` | CodeBlock: `{ source, language, label, fileName, title, highlighted, nodes, actions }`; MermaidBlock: `{ source, label, view, status, copied, fullscreen, compact, actions, showPreview, showSource }`; VueSyntaxHighlighter: `{ source, language, highlighted, nodes, lines, actions: { copy } }` |
| `toolbar` | `{ source, language, fileName, title, highlighted, nodes, actions: { copy, download } }` |
| `tabs` | `{ view, status, actions: { preview, source } }` |
| `actions` | `{ source, status, copied, fullscreen, enableZoom, allowFullscreen, compact, actions }` |
| `footer` | `{ source, language, highlighted, nodes, lines, actions: { copy } }` |
| `highlighter` | `{ source, language, nodes, lines, highlighted, actions: { copy } }` |
| `math` | `{ tex, displayMode, rendered, error }` |
| `math-error` | `{ tex, error, retry }` |
| `mermaid` | `{ source, svg, status, error, actions: { copy, exportPng, fullscreen, retry } }` |
| `mermaid-error` | `{ source, error, retry, focusSource }` |
| `editor` | `{ value, update, diagnostics, status, actions: { focus, reset, fullscreen } }` |
| `editor-diagnostics` | `{ diagnostics, focusLine }` |

An absent or empty slot keeps the default rendering.

```vue
<MarkdownRenderer :source="source" toc>
  <template #empty="{ label }">
    <p class="my-empty">{{ label }} — add some Markdown.</p>
  </template>
</MarkdownRenderer>
```

## TOC

The TOC is opt-in with `toc`. Use `tocDepth` to include headings up to a
maximum level (`0` means every level), `#toc` to replace the whole navigation,
`#toc-item` to replace one entry, `labels.toc` for the accessible label, and
`getToc()` / `scrollToHeading(id)` for an external TOC. `getToc()`, `toc-change`,
the slot contexts, the default TOC, and the active-heading tracker all use the
filtered list. Custom region components receive `items`, `activeId`, `label`,
`tocDepth`, and optional `tocItem`; item components receive `item` and `active`
and emit `navigate`.

```vue
<MarkdownRenderer :source="source" toc :toc-depth="3" />
```

See [Public API § TOC](./api.md#toc) for the complete API and examples.

## Regions

`regions` replaces structural components with the same props as the default:

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

Region resolution is `slot > regions override > plugin contribution > preset >
built-in`.

## Precedence

```text
Configuration:
  local props > nearest provider > preset > plugin defaults > built-in defaults

Regions:
  slot > regions override > plugin contribution > preset > built-in

Node rendering:
  nodeComponents function > nodeComponents[tag] > components[tag]
    > nodeComponents[kind] > plugin component > preset > built-in
```

## Next

- [Components](./components.md)
- [Adapters](./adapters.md)
- [Customization guide](../guide/customization.md)
