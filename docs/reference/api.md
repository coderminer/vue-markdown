---
description: Complete public API index for @coderminer/vue-markdown, including the renderer, TOC, components, configuration, plugins, pipelines, headless helpers, adapters, export, and design-system contracts.
---

# Public API

This page is the index of the public contract. Every item below is exported from
one of the package entries. Use it as the starting point; the linked pages cover
the detailed behavior.

## Entry points

| Import | Contents |
| --- | --- |
| `@coderminer/vue-markdown` | Renderer, components, composables, core helpers, plugin/pipeline helpers, export helpers, and `version` |
| `@coderminer/vue-markdown/headless` | Types, model helpers, composables; no preset components or CSS |
| `@coderminer/vue-markdown/pipeline` | Official pipeline, custom pipeline contract, identity helpers |
| `@coderminer/vue-markdown/plugins` | Plugin definition, registry, built-in plugins |
| `@coderminer/vue-markdown/presets` | Preset helpers and configuration types |
| `@coderminer/vue-markdown/node-components` | The node component catalog |
| `@coderminer/vue-markdown/highlight` | highlight.js adapter and normalization helpers |
| `@coderminer/vue-markdown/highlight/shiki` | Optional Shiki adapter |
| `@coderminer/vue-markdown/math` | `mathPlugin`, `katexEngine`, math types |
| `@coderminer/vue-markdown/mermaid` | `mermaidPlugin`, lazy Mermaid runtime, SVG sanitizer |
| `@coderminer/vue-markdown/editor` | Lazy CodeMirror Mermaid editor |
| `@coderminer/vue-markdown/html` | `htmlPlugin`, sanitized raw HTML, schema extension |
| `@coderminer/vue-markdown/components/*` | One entry per public component |
| `@coderminer/vue-markdown/style.css` | Full optional stylesheet |
| `@coderminer/vue-markdown/styles/*.css` | Token, component, and math styles |

```ts
import { MarkdownRenderer, exportMarkdownHtmlSync } from '@coderminer/vue-markdown'
import { useMarkdownDocument, walkNodes } from '@coderminer/vue-markdown/headless'
import { defineMarkdownPlugin, gfmPlugin } from '@coderminer/vue-markdown/plugins'
import { mathPlugin } from '@coderminer/vue-markdown/math'
import { mermaidPlugin } from '@coderminer/vue-markdown/mermaid'
import { htmlPlugin } from '@coderminer/vue-markdown/html'
import { shiki } from '@coderminer/vue-markdown/highlight/shiki'
```

## Quick start

```vue
<script setup lang="ts">
import { MarkdownRenderer } from '@coderminer/vue-markdown'
import '@coderminer/vue-markdown/style.css'

const source = '# Hello\n\nA **bold** paragraph.'
</script>

<template>
  <MarkdownRenderer :source="source" toc />
</template>
```

## MarkdownRenderer

The preset component that parses Markdown, resolves plugins, builds the TOC, and
renders the normalized document.

### Props

| Prop | Type | Notes |
| --- | --- | --- |
| `source` | `string` | Controlled Markdown input. Supports `v-model:source`. |
| `components` | `Record<string, Component \| string>` | Tag-keyed component overrides. |
| `nodeComponents` | `Record<string, Component \| string \| NodeRenderer>` | Semantic node overrides and function renderers. |
| `regions` | `Partial<Record<string, Component \| string>>` | Structural region overrides. |
| `labels` | `Partial<MarkdownLabels>` | Built-in text, string or function. |
| `preset` | `MarkdownPreset \| MarkdownPreset[]` | One or more presets. |
| `plugins` | `PluginInput[]` | Replaces the resolved plugin set when provided. Add `htmlPlugin()` for sanitized raw HTML. |
| `disablePlugins` | `string[]` | Removes non-core plugins by name. |
| `remarkPlugins` | `PluggableList` | Host remark plugins. |
| `rehypePlugins` | `PluggableList` | Host rehype plugins; runs after the built-in sanitizer. |
| `remarkRehypeOptions` | `Record<string, unknown>` | Conversion options. |
| `pipeline` | `MarkdownPipeline` | Custom pipeline; must return hast. |
| `slugger` | `MarkdownSlugger` | Heading ID generator. |
| `highlighter` | `MarkdownHighlighter` | Syntax highlighting adapter. |
| `mathEngine` | `MathEngine` | Math rendering adapter. |
| `mermaidRenderer` | `MermaidRenderer` | Mermaid rendering adapter. |
| `diagnosticsFormatter` | `DiagnosticFormatter` | Formats render errors. |
| `allowedElements` | `string[]` | Allow list. Wins over `disallowedElements`. |
| `disallowedElements` | `string[]` | Deny list. |
| `unwrapDisallowed` | `boolean` | Keeps children of removed elements. |
| `allowElement` | `AllowElement` | Per-element decision after allow/deny lists. |
| `urlTransform` | `MarkdownUrlTransform` | URL rewrite hook; return `null` to remove. |
| `linkTarget` | `string` | Default link target. |
| `externalLinkTarget` | `'_self' \| '_blank'` | External link target policy. |
| `baseUrl` | `string` | Resolves relative URLs. |
| `idPrefix` | `string` | Prefixes heading IDs. |
| `syncHash` | `boolean` | Updates the URL hash on heading navigation. |
| `toc` | `boolean` | Renders the TOC region. |
| `tocDepth` | `number` | Maximum heading level in the TOC. `0` means every level. |
| `tocPlacement` | `'top' \| 'left' \| 'right' \| 'hidden'` | Stacks, sides, or hides the TOC. Default `'top'`. |
| `search` | `string` | Highlights matches and emits `search-change`. |
| `searchCaseSensitive` | `boolean` | Makes `search` case-sensitive. |
| `showError` | `boolean` | Renders the error region on failure. Default `true`. |
| `tokens` | `Record<string, string>` | Inline `--vmd-*` custom properties. |
| `theme` | `'light' \| 'dark' \| 'auto' \| 'custom'` | Sets `data-vmd-theme`. |
| `as` | `string \| Component` | Root element or component. |

### Events

| Event | Payload |
| --- | --- |
| `update:source` | `source: string` |
| `toc-change` | `TocItem[]` |
| `link-click` | `{ url, target, node, event }` |
| `custom-tag-click` | `{ tag, props, node, event }` |
| `task-change` | `{ checked, node }` |
| `search-change` | `{ query, caseSensitive, matches }` |
| `math-error` | `MarkdownDiagnostic` |
| `render-error` | `MarkdownDiagnostic` |
| `ready` | `MarkdownDocument` |

`search-change` reflects the document currently rendered; pending or failed
runs do not emit a stale match count.

### Exposed actions

```ts
import { ref } from 'vue'
import type { MarkdownRendererInstance } from '@coderminer/vue-markdown'

const renderer = ref<MarkdownRendererInstance>()

renderer.value?.getToc()
renderer.value?.getDocument()
renderer.value?.scrollToHeading('install')
await renderer.value?.refresh()
renderer.value?.updateSource('# New source')
```

| Action | Signature |
| --- | --- |
| `getToc` | `() => TocItem[]` |
| `getDocument` | `() => MarkdownDocument \| undefined` |
| `scrollToHeading` | `(id: string, options?: ScrollIntoViewOptions) => void` |
| `refresh` | `() => Promise<void>` |
| `updateSource` | `(source: string) => void` |

### Slots

| Slot | Context |
| --- | --- |
| `root` | `{ document, toc, status, diagnostics, tokens, theme, actions }` |
| `toc` | `{ items, activeId, label, tocDepth, navigate }` |
| `toc-item` | `{ item, active, navigate }` |
| `content` | `{ nodes, document }` |
| `error` | `{ diagnostics, label, retry }` |
| `empty` | Renderer: `{ label }`; MermaidLiveEditor: `{ source, actions: { focus, refresh } }` |
| `loading` | `{ label }` |
| `code` | `{ node, source, language, highlighted, nodes, lines, visibleLines, actions: { copy, download } }` |
| `code-actions` | `{ source, language, fileName, title, highlighted, nodes, actions: { copy, download } }` |
| `header` | CodeBlock: `{ source, language, label, fileName, title, highlighted, nodes, actions }`; MermaidBlock: `{ source, label, view, status, copied, fullscreen, compact, actions, showPreview, showSource }`; VueSyntaxHighlighter: `{ source, language, highlighted, nodes, lines, actions: { copy } }` |
| `toolbar` | CodeBlock: `{ source, language, fileName, title, highlighted, nodes, actions: { copy, download } }`; MermaidLiveEditor: `{ ratio, fullscreen, compact, actions: { toggleFullscreen, resetRatio, setRatio } }` |
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
| `preview` | MermaidLiveEditor: `{ source, status, error, nodes, actions: { refresh, fullscreen, focus } }` |
| `fullscreen` | MermaidLiveEditor: `{ fullscreen, label, toggle }` |

An absent or empty slot keeps the default rendering.

### Regions

`regions` replaces structural components. The replacement receives the same
props as the default component.

| Region | Props | Emits |
| --- | --- | --- |
| `root` | `as`, `tokens`, `theme` | — |
| `content` | `nodes` | — |
| `toc` | `items`, `activeId`, `label`, `tocItem`, `tocDepth` | `navigate` |
| `tocItem` | `item`, `active` | `navigate` |
| `codeBlock` | `CodeBlock` props plus region actions | — |
| `mermaidBlock` | `MermaidBlock` props | — |
| `error` | `diagnostics`, `label` | — |
| `empty` | `label` | — |
| `loading` | `label` | — |

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

### Precedence

```text
Configuration:
  local props > nearest provider > preset > plugin defaults > built-in defaults

Regions:
  slot > regions override > plugin contribution > preset > built-in

Node rendering:
  nodeComponents function > nodeComponents[tag] > components[tag]
    > nodeComponents[kind] > plugin component > preset > built-in
```

## TOC

The TOC is opt-in. It is built from headings in the rendered document.

```ts
interface TocItem {
  id: string
  text: string
  level: number
}
```

### Enable and read it

```vue
<MarkdownRenderer
  :source="source"
  toc
  :toc-depth="3"
  @toc-change="onTocChange"
/>
```

```ts
import { ref } from 'vue'
import type { MarkdownRendererInstance, TocItem } from '@coderminer/vue-markdown'

const renderer = ref<MarkdownRendererInstance>()
const toc = ref<TocItem[]>([])

function onTocChange(items: TocItem[]) {
  toc.value = items
}

function goTo(id: string) {
  renderer.value?.scrollToHeading(id, { behavior: 'smooth', block: 'start' })
}
```

`tocDepth` is a maximum level, not a count. `3` includes `h1`–`h3` and excludes
`h4`–`h6`. `0` or an omitted value includes every level. `tocPlacement` selects
`top` (default), `left`, `right`, or `hidden`.

| API | Purpose |
| --- | --- |
| `toc` | Shows the TOC region. |
| `tocDepth` | Includes headings up to this level; `0` means every level. |
| `tocPlacement` | `top`, `left`, `right`, or `hidden` layout for the TOC. |
| `toc-change` | Emits the filtered `TocItem[]` when its signature changes. |
| `getToc()` | Reads the current TOC imperatively. |
| `scrollToHeading(id, options?)` | Scrolls to a heading inside the renderer root. |
| `syncHash` | Writes the navigated heading ID to the URL hash. |
| `idPrefix` | Keeps heading IDs unique across multiple renderers. |
| `labels.toc` | Accessible TOC label. |

### Replace the whole TOC

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

### Replace one item

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

### Replace with region components

`MyToc` receives `items`, `activeId`, `label`, and optional `tocItem`; it emits
`navigate(id)`. `MyTocItem` receives `item` and `active`; it also emits
`navigate(id)`.

```ts
const regions = {
  toc: MyToc,
  tocItem: MyTocItem,
}
```

### Standalone TOC components

`MarkdownToc` and `MarkdownTocItem` are public components when you want to build
your own layout around the document model.

```vue
<script setup lang="ts">
import { MarkdownToc } from '@coderminer/vue-markdown'
import type { TocItem } from '@coderminer/vue-markdown'

const items: TocItem[] = [
  { id: 'install', text: 'Install', level: 1 },
  { id: 'usage', text: 'Usage', level: 2 },
]

function navigate(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
}
</script>

<template>
  <MarkdownToc
    :items="items"
    :active-id="items[0]?.id"
    label="Contents"
    @navigate="navigate"
  />
</template>
```

| Component | Props | Events | Slots |
| --- | --- | --- | --- |
| `MarkdownToc` | `items`, `activeId`, `label`, `tocItem`, `tocDepth` | `navigate` | `toc-item` |
| `MarkdownTocItem` | `item`, `active` | `navigate` | — |

### Track the active heading outside the renderer

```ts
import { useActiveHeading } from '@coderminer/vue-markdown'

const ids = computed(() => toc.value.map((item) => item.id))
const activeId = useActiveHeading(ids, true, { root: myRootElement })
```

`useActiveHeading(ids, enabled?, { root? })` returns `Ref<string | undefined>`.
`findElementById(scope, id)` is exported for scoped heading lookup.

## Components

Every component receives the normalized node as `node` where applicable and
renders children through its default slot. Components are CSS-independent and
SSR-safe.

### Renderer and structural components

| Component | Role |
| --- | --- |
| `MarkdownRenderer` | Preset renderer |
| `MarkdownConfigProvider` | App-wide configuration defaults |
| `MarkdownRoot` | Root shell with theme and tokens |
| `MarkdownContent` | Content container |
| `MarkdownToc` / `MarkdownTocItem` | TOC navigation |
| `MarkdownError` / `MarkdownEmpty` / `MarkdownLoading` | Status regions |

### Node catalog

| Component | Node or role |
| --- | --- |
| `MarkdownParagraph` | `p` |
| `MarkdownHeading` | `h1`–`h6` with IDs and anchors |
| `MarkdownEmphasis` / `MarkdownStrong` / `MarkdownStrikethrough` | `em`, `strong`, `del` |
| `MarkdownLink` / `MarkdownImage` | `a`, `img` |
| `MarkdownList` / `MarkdownListItem` | `ul`, `ol`, `li` |
| `MarkdownBlockquote` / `MarkdownHorizontalRule` | `blockquote`, `hr` |
| `MarkdownTable` / `MarkdownTableSection` / `MarkdownTableRow` / `MarkdownTableCell` | Table tags |
| `MarkdownInlineCode` / `MarkdownCode` / `MarkdownBreak` | `code`, `br` |
| `MarkdownHtml` / `MarkdownCustomTag` | Escaped HTML and custom tags |
| `MarkdownTaskItem` / `MarkdownFootnoteReference` / `MarkdownFootnotes` | GFM task and footnotes |
| `MarkdownMath` / `MarkdownMermaid` | Rich semantic nodes |
| `MarkdownChildren` | Recursive renderer used by regions |

### Rich components

| Component | Props | Events | Slots | Exposed |
| --- | --- | --- | --- | --- |
| `CodeBlock` | `node`, `code`, `language`, `highlighter`, `theme`, `actions`, `showActions`, `showDownload`, `title`, `fileName`, `lineNumbers`, `highlightLines`, `maxLines`, `virtual`, `virtualThreshold`, `lineHeight`, `delay`, `standalone`, `ignoreRegion` | `copy`, `download`, `action`, `error` | `code`, `code-actions`, `header`, `toolbar` | `copy`, `download`, `getHighlighted`, `highlighted` |
| `VueSyntaxHighlighter` | `source`, `language`, `theme`, `highlighter`, `lineNumbers`, `highlightLines`, `maxLines`, `virtual`, `virtualThreshold`, `lineHeight`, `delay` | `copy`, `error` | `header`, `footer`, `empty`, `actions`, `highlighter` | `copy`, `getHighlighted`, `highlighted` |
| `MermaidBlock` | `node`, `source`, `renderer`, `theme`, `showErrors`, `enableZoom`, `allowFullscreen`, `compact`, `actions` | `rendered`, `error`, `copy`, `export`, `fullscreen`, `action` | `header`, `tabs`, `actions`, `mermaid`, `mermaid-error` | `render`, `copy`, `exportPng`, `downloadSvg`, `toggleFullscreen` |
| `MermaidLiveEditor` | `modelValue`, `debounce`, `theme`, `renderer`, `diagnosticsFormatter`, `compact`, `rawDetails`, `autoFocus`, `initialRatio`, `minRatio` | `update:modelValue`, `preview`, `error` | `toolbar`, `editor`, `preview`, `editor-diagnostics`, `empty`, `fullscreen` | `focus`, `refreshPreview`, `toggleFullscreen`, `getDiagnostics` |
| `MarkdownMath` | `node`, `tex`, `displayMode`, `rendered`, `error`, `mathEngine` | — | `math`, `math-error` | — |

`CodeBlock` and `MermaidBlock` ship styled headers and inline-SVG icon actions.
The icon buttons keep accessible labels and work with the optional stylesheet
without adding an icon dependency.

See [Rich components](../guide/rich-components.md) for complete usage and
[Components](./components.md) for the manifest registry.

## Configuration

```ts
interface MarkdownConfig {
  theme?: MarkdownTheme
  tokens?: Record<string, string>
  labels?: Partial<MarkdownLabels>
  components?: MarkdownTagComponents
  regions?: MarkdownRegionComponents
  nodeComponents?: MarkdownNodeComponents
  plugins?: PluginInput[]
  pipeline?: MarkdownPipeline
  highlighter?: MarkdownHighlighter
  mathEngine?: MathEngine
  mermaidRenderer?: MermaidRenderer
  diagnosticsFormatter?: DiagnosticFormatter
  slugger?: MarkdownSlugger
  urlTransform?: MarkdownUrlTransform
}
```

`MarkdownConfigProvider` accepts every field above plus `config` and `preset`.
Local renderer props beat the nearest provider.

```vue
<MarkdownConfigProvider
  theme="auto"
  :tokens="{ '--vmd-color-accent': '#7c3aed' }"
  :labels="{ toc: 'Contents' }"
  :highlighter="shiki"
>
  <MarkdownRenderer :source="source" toc />
</MarkdownConfigProvider>
```

### Presets

| API | Purpose |
| --- | --- |
| `MarkdownPreset` | Named `MarkdownConfig` bundle |
| `defineMarkdownPreset(preset)` | Validates and returns a preset |
| `composePresets(...presets)` | Composes presets; later values win |
| `resolvePreset(input)` | Resolves one preset or a preset array |
| `mergeMarkdownConfig(base, next)` | Merges configuration maps |
| `mergeMarkdownPreset(base, next)` | Merges presets and appends plugins |

```ts
import { composePresets, defineMarkdownPreset } from '@coderminer/vue-markdown/presets'

const docs = defineMarkdownPreset({
  name: 'docs',
  theme: 'auto',
  labels: { toc: 'On this page' },
})

const brand = defineMarkdownPreset({
  name: 'brand',
  tokens: { '--vmd-color-accent': '#7c3aed' },
})

const preset = composePresets(docs, brand)
```

## Nodes and overrides

The public model is serializable and has no Vue, DOM, mdast, hast, or processor
objects.

| Node | Shape |
| --- | --- |
| `text` | `{ kind, key, value, segments?, source? }` |
| `element` | `{ kind, key, tag, attrs, children, source? }` |
| `code` | `{ kind, key, code, language, highlighted?, source? }` |
| `math` | `{ kind, key, tex, displayMode, rendered?, source? }` |
| `mermaid` | `{ kind, key, code, complete, index, source? }` |
| `custom` | `{ kind, key, tag, props, attrs, children, source? }` |
| `plugin` | `{ kind, key, type, payload, children?, source? }` |

```ts
const nodeComponents = {
  code: MyCodeNode,
  mermaid: MyMermaidNode,
  blockquote: MyCallout,
}
```

```vue
<MarkdownRenderer
  :source="source"
  :plugins="plugins"
  :node-components="nodeComponents"
/>
```

For a complete custom `code` and `mermaid` example, see
[Node components](../guide/customization.md#complete-example-custom-code-and-mermaid-nodes).

## Plugins

```ts
interface MarkdownPlugin {
  name: string
  core?: boolean
  phase?: 'pre' | 'normal' | 'post'
  html?: boolean
  htmlSchema?: HtmlSchemaExtension
  remarkPlugins?: PluggableList
  rehypePlugins?: PluggableList
  remarkRehypeOptions?: Record<string, unknown>
  transformSource?(source: string, ctx: PluginContext): string
  transformDocument?(
    document: MarkdownDocument,
    ctx: PluginContext,
  ): MarkdownDocument | void
  nodeComponents?: MarkdownNodeComponents
  components?: MarkdownTagComponents
  regions?: MarkdownRegionComponents
  labels?: Partial<MarkdownLabels>
  tokens?: Record<string, string>
  setup?(ctx: PluginContext): void | (() => void)
  onError?(error: unknown, phase: DiagnosticPhase, ctx: PluginContext): void
}
```

`htmlPlugin()` from `@coderminer/vue-markdown/html` sets `html: true`; its
`HtmlSchemaExtension` adds `tags` and `attributes` for the raw HTML sanitizer.

```ts
import { defineMarkdownPlugin } from '@coderminer/vue-markdown/plugins'

export const myPlugin = defineMarkdownPlugin({
  name: 'my-plugin',
  phase: 'normal',
  remarkPlugins: [],
  rehypePlugins: [],
  transformSource(source) {
    return source
  },
  transformDocument(document) {
    return document
  },
  labels: { toc: 'Contents' },
})
```

| API | Purpose |
| --- | --- |
| `defineMarkdownPlugin` | Defines a plugin or plugin factory |
| `validatePlugin` | Validates and normalizes one plugin |
| `createPluginContext` | Builds the context passed to plugin hooks |
| `resolvePlugins` | Orders, deduplicates, and merges plugin contributions |
| `tocPlugin`, `codePlugin`, `linkPlugin` | Core invariant markers |
| `searchPlugin(options)` | Search segments |
| `customTagsPlugin({ tags })` | Converts tags to custom nodes |
| `gfmPlugin` | GFM remark plugin |
| `frontmatterPlugin` | Frontmatter capture |
| `defaultPlugins` / `fullPlugins` | Built-in plugin sets |

Ordering is `pre` → `normal` → `post`, then registration order. Core invariant
markers cannot be disabled. See [Plugins](../guide/plugins.md).

## Pipeline

```ts
interface MarkdownPipeline {
  name: string
  capabilities?: PipelineCapabilities
  process(source: string, ctx: PipelineContext): Promise<PipelineResult>
  processSync?(source: string, ctx: PipelineContext): PipelineResult
  dispose?(): void
}
```

```ts
import {
  createOfficialPipeline,
  defineMarkdownPipeline,
} from '@coderminer/vue-markdown/pipeline'

const official = createOfficialPipeline()

const pipeline = defineMarkdownPipeline({
  name: 'my-pipeline',
  process(source, ctx) {
    return official.process(source, ctx)
  },
  processSync(source, ctx) {
    if (!official.processSync) {
      throw new Error('The official pipeline is asynchronous.')
    }
    return official.processSync(source, ctx)
  },
})
```

| API | Purpose |
| --- | --- |
| `createOfficialPipeline(options?)` | Creates the official unified pipeline |
| `defineMarkdownPipeline(pipeline)` | Validates and returns a pipeline |
| `validatePipeline(pipeline)` | Returns diagnostics instead of throwing |
| `resolvePipeline(pipeline?)` | Falls back to the official pipeline on invalid input |
| `assertPipelineResult(result)` | Validates a `{ hast }` result |
| `createMemoKey(...)` / `createPipelineIdentity(...)` | Builds stable parse keys |

See [Custom pipeline](../guide/custom-pipeline.md).

## Headless

```ts
import { useMarkdownDocument } from '@coderminer/vue-markdown/headless'

const {
  document,
  toc,
  status,
  diagnostics,
  pipeline,
  plugins,
  refresh,
  resolvedComponents,
  resolvedNodeComponents,
  resolvedRegions,
  resolvedLabels,
  resolvedTokens,
} = useMarkdownDocument(source, options)
```

| Return | Type |
| --- | --- |
| `document` | `ShallowRef<MarkdownDocument \| undefined>` |
| `toc` | `ComputedRef<TocItem[]>` |
| `status` | `ShallowRef<'idle' \| 'pending' \| 'ready' \| 'error'>` |
| `diagnostics` | `ShallowRef<MarkdownDiagnostic[]>` |
| `pipeline` | `ComputedRef<string>` |
| `plugins` | `ComputedRef<string[]>` |
| `refresh` | `() => Promise<void>` |
| `resolvedComponents` | `ComputedRef<MarkdownTagComponents>` |
| `resolvedNodeComponents` | `ComputedRef<MarkdownNodeComponents>` |
| `resolvedRegions` | `ComputedRef<MarkdownRegionComponents>` |
| `resolvedLabels` | `ComputedRef<Partial<MarkdownLabels>>` |
| `resolvedTokens` | `ComputedRef<Record<string, string>>` |

### Core helpers

| Group | Exports |
| --- | --- |
| Model | `buildDocument`, `withDerivedDocument` |
| Normalization | `normalizeHast`, `extractToc`, `filterTocByDepth`, `collectCustomTags`, `walkNodes` |
| Search | `searchDocument`, `segmentSearch`, `countSearchMatches` |
| URL | `defaultUrlTransform`, `isExternalUrl`, `resolveUrl` |
| Diagnostics | `createDiagnostic`, `errorMessage` |
| Memoization | `memoGet`, `memoSet`, `memoClear`, `memoSize` |
| Slugs | `withUniqueSlugs` |
| Manifest | `COMPONENT_MANIFESTS`, `getComponentManifest`, `validateManifest`, `validateManifestRegistry` |
| Config/presets | `mergeMarkdownConfig`, `mergeMarkdownPreset`, `defineMarkdownPreset`, `composePresets`, `resolvePreset` |
| Adapter guards | `isValidHighlighter`, `isValidMathEngine`, `isValidMermaidRenderer`, `isValidDiagnosticFormatter`, `isValidSlugger`, `isValidUrlTransform` |
| Export | `exportMarkdownHtml`, `exportMarkdownHtmlSync` |
| Pipeline | `createOfficialPipeline`, `defineMarkdownPipeline`, `validatePipeline`, `resolvePipeline`, `assertPipelineResult` |

```ts
import { walkNodes } from '@coderminer/vue-markdown/headless'

walkNodes(document.value?.nodes ?? [], (node, parent) => {
  // Visit every node depth-first.
})
```

## Adapters

| Contract | Required shape |
| --- | --- |
| `MarkdownHighlighter` | `{ id, highlight(code, language, options), load?, languages?, loadLanguage? }` |
| `MathEngine` | `{ id, render(tex, options), load? }` |
| `MermaidRenderer` | `{ id, render(source, options) }` |
| `DiagnosticFormatter` | `{ id?, format(error, source) }` |
| `MarkdownSlugger` | `{ slug(value), reset? }` |
| `MarkdownUrlTransform` | `(url, key, node) => string \| null \| undefined` |

```ts
import type { MarkdownHighlighter } from '@coderminer/vue-markdown'

const highlighter: MarkdownHighlighter = {
  id: 'my-highlighter',
  highlight(code, language) {
    return {
      language,
      nodes: [{ kind: 'text', key: 'code', value: code }],
    }
  },
}
```

See [Adapters](./adapters.md) for every contract and built-in adapter.

## Static export

```ts
import {
  exportMarkdownHtml,
  exportMarkdownHtmlSync,
} from '@coderminer/vue-markdown'

const html = exportMarkdownHtmlSync('# Hello')
const asyncHtml = await exportMarkdownHtml(source, {
  plugins: fullPlugins,
  highlighter: highlightjs,
})
```

| API | Purpose |
| --- | --- |
| `exportMarkdownHtml(source, options?)` | Async static HTML export |
| `exportMarkdownHtmlSync(source, options?)` | Sync export when the pipeline is synchronous |
| `StaticHtmlOptions` | Alias of `MarkdownDocumentOptions` |

See [SSR and export](../guide/ssr.md).

## Design system

| API | Purpose |
| --- | --- |
| `PARTS` / `PART_NAMES` | Stable part names |
| `TOKENS` / `TOKEN_NAMES` | Stable `--vmd-*` token names |
| `partAttrs(part)` / `partClass(part, extra?)` | Build stable part attributes/classes |
| `VMD_CLASS_PREFIX` | `vmd-` |
| `DEFAULT_LABELS` / `resolveLabel(value, context?)` | Built-in labels |
| `COMPONENT_MANIFESTS` / `getComponentManifest(name)` | Component manifest registry |
| `validateManifest(entry, snapshot)` / `validateManifestRegistry()` | Manifest validation |

```ts
import { partAttrs, getComponentManifest } from '@coderminer/vue-markdown'

const manifest = getComponentManifest('CodeBlock')
const attrs = partAttrs('code')
```

See [Styling and themes](../guide/styling.md) and
[Components](./components.md#parts-slots-and-labels).

## Public types

| Group | Types |
| --- | --- |
| Document | `MarkdownDocument`, `MarkdownNode`, `MarkdownTextNode`, `MarkdownElementNode`, `MarkdownCodeNode`, `MarkdownMathNode`, `MarkdownMermaidNode`, `MarkdownCustomTagNode`, `MarkdownPluginNode`, `TocItem`, `MarkdownTextSegment`, `MarkdownElementLike`, `CustomTagInstance`, `SourceRange`, `SourcePosition` |
| Configuration | `MarkdownConfig`, `MarkdownDocumentOptions`, `MarkdownPreset`, `MarkdownTheme`, `MarkdownLabels`, `MarkdownLabelValue`, `MarkdownLabelContext`, `MarkdownComponentValue`, `MarkdownTagComponents`, `MarkdownNodeComponents`, `MarkdownRegionComponents` |
| Vue adapter | `MarkdownRendererInstance`, `VueMarkdownTagComponents`, `VueMarkdownNodeComponents`, `VueMarkdownRegionComponents`, `MarkdownNodeRenderer`, `MarkdownNodeRenderContext`, `RenderContext`, `LinkClickPayload`, `CustomTagClickPayload`, `TaskChangePayload`, `SearchChangePayload` |
| Plugins | `MarkdownPlugin`, `PluginInput`, `MarkdownPluginFactory`, `PluginContext`, `ResolvedPlugins` |
| Pipeline | `MarkdownPipeline`, `PipelineResult`, `PipelineContext`, `PipelineCapabilities`, `PipelineIdentityInput`, `OfficialPipelineOptions` |
| Adapters | `MarkdownHighlighter`, `HighlightOptions`, `HighlightResult`, `MathEngine`, `MathRenderOptions`, `MathRenderResult`, `MermaidRenderer`, `MermaidRenderOptions`, `MermaidRenderResult`, `DiagnosticFormatter`, `MarkdownSlugger`, `MarkdownUrlTransform`, `AllowElement` |
| Diagnostics | `MarkdownDiagnostic`, `DiagnosticSeverity`, `DiagnosticPhase` |
| Manifest | `MarkdownComponentManifest`, `ManifestIssueCode`, `ManifestValidationIssue`, `ManifestRenderSnapshot` |
| Headless | `UseMarkdownDocumentReturn`, `MarkdownStatus`, `UseActiveHeadingOptions`, `BuildDocumentOptions`, `NormalizeOptions`, `NormalizeResult`, `SearchOptions` |
| Export | `StaticHtmlOptions` |
| Styling | `MarkdownPart`, `MarkdownToken`, `PartAttributes` |
| Components | `CodeBlockAction`, `MermaidAction`, `HighlightLine` |

## Next

- [Renderer reference](./renderer.md)
- [Components](./components.md)
- [Adapters](./adapters.md)
- [Document model](./document-model.md)
- [Entry points](./entry-points.md)
