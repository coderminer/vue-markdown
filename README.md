# vue-markdown-suite

[![npm version](https://img.shields.io/npm/v/vue-markdown-suite.svg)](https://www.npmjs.com/package/vue-markdown-suite)
[![CI](https://github.com/coderminer/vue-markdown/actions/workflows/ci.yml/badge.svg)](https://github.com/coderminer/vue-markdown/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Docs](https://img.shields.io/badge/docs-live-8250df)](https://coderminer.github.io/vue-markdown/)

A general-purpose, customizable, plugin-driven **Vue 3 Markdown component suite**.

`vue-markdown-suite` renders Markdown directly into Vue VNodes with the official
`unified` pipeline (`remark-parse` + `remark-rehype`). There is no HTML string
round-trip and no `v-html`. The parsed document is a serializable, DOM-free model,
so the same run can drive the styled renderer, a headless host, or static HTML
export.

- **Vue-native** — `shallowRef` documents, stable keys, a text fast path, and
  parse memoization keep re-renders cheap.
- **Customizable** — replace any tag, address every visual part through
  `data-vmd-part` and stable `vmd-*` classes, and theme with `--vmd-*` tokens.
- **Plugin-driven** — plugins contribute remark/rehype plugins, source and
  document transforms, components, labels, tokens, and lifecycle hooks.
- **Safe by default** — raw HTML is dropped, URLs are validated, and the
  sanitizer runs immediately after `rehype-raw` when the host opts in.
- **SSR-ready** — deterministic heading IDs, a synchronous path, and static HTML
  export that applies the same sanitization, filtering, and URL policy.
- **Optional engines** — highlight.js, Shiki, KaTeX, Mermaid, and CodeMirror
  stay behind their own entries and lazy chunks.

**Live documentation:** <https://coderminer.github.io/vue-markdown/>

## Install

```bash
npm install vue-markdown-suite
```

Requires Node 20+ and Vue 3.5+.

Optional engines are peer dependencies. Install only the ones you use:

```bash
# Syntax highlighting
npm install highlight.js
# or
npm install shiki

# Math
npm install katex

# Diagrams
npm install mermaid

# Mermaid live editor
npm install @codemirror/state @codemirror/view @codemirror/language @codemirror/commands
```

## Quick start

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { MarkdownRenderer } from 'vue-markdown-suite'
import 'vue-markdown-suite/style.css'

const source = ref(`
# Hello, Markdown

A **bold** paragraph with a [link](https://example.com).

- Vue components
- Safe by default
- SSR ready
`)
</script>

<template>
  <MarkdownRenderer v-model:source="source" toc />
</template>
```

The stylesheet is optional. Every component is semantic and works unstyled.

## Basic usage

### Input

Pass Markdown through `source`, bind it with `v-model:source`, or use the default
slot:

```vue
<MarkdownRenderer source="# From the prop" />
<MarkdownRenderer v-model:source="source" />
<MarkdownRenderer># From the slot</MarkdownRenderer>
```

`source` is controlled and wins over the slot. The slot is text-only and is
re-read when its text content changes. A non-string `source` reports a diagnostic
and renders the empty state instead of throwing.

### Styling

```ts
import 'vue-markdown-suite/style.css'
// or import the pieces separately
import 'vue-markdown-suite/styles/tokens.css'
import 'vue-markdown-suite/styles/components.css'
```

Override tokens on any ancestor or through the `tokens` prop:

```vue
<MarkdownRenderer
  :source="source"
  theme="auto"
  :tokens="{ '--vmd-color-accent': '#8250df' }"
/>
```

Every visual part exposes both a stable class and a `data-vmd-part` attribute:

```css
[data-vmd-part='heading'] {
  letter-spacing: -0.01em;
}

[data-vmd-part='code'] {
  --vmd-code-bg: #0d1117;
  color: #e6edf3;
}
```

### Events and actions

```vue
<script setup lang="ts">
const renderer = ref<InstanceType<typeof MarkdownRenderer>>()

function onToc(toc) {
  console.log(toc)
}
</script>

<template>
  <MarkdownRenderer
    ref="renderer"
    :source="source"
    @toc-change="onToc"
    @link-click="onLink"
    @render-error="onError"
  />
</template>
```

Exposed actions: `scrollToHeading(id)`, `getDocument()`, `getToc()`, `refresh()`,
and `updateSource(source)`.

## Customization

Customization is layered and stable: target tags, semantic nodes, regions, design
tokens, or documented CSS parts. The full guide with a live preview is in the
[live customization section](https://coderminer.github.io/vue-markdown/guide/customization.html).

### Customize your own elements

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

```vue [App.vue]
<script setup lang="ts">
import { MarkdownRenderer } from 'vue-markdown-suite'
import BadgeLink from './BadgeLink.vue'
import Callout from './Callout.vue'

const components = {
  h1: 'h2',
  a: BadgeLink,
}

const nodeComponents = {
  blockquote: Callout,
}

const regions = {
  toc: MyToc,
  empty: MyEmpty,
}
</script>

<template>
  <MarkdownRenderer
    :source="source"
    :components="components"
    :node-components="nodeComponents"
    :regions="regions"
  />
</template>
```

`components` is the tag-keyed map. `nodeComponents` targets the semantic model
(`code`, `math`, `mermaid`, `custom`, and element tags) and also accepts function
renderers. `regions` replaces structural areas such as the TOC, content, error,
empty, and loading states. Named slots are the last layer and receive scoped data
plus actions. For custom syntax, `customTagsPlugin({ tags: ['x-note'] })` turns
selected elements into custom nodes that map to your own components. Fenced code
always wraps through `components.pre`; its inner element resolves through
`components.code` or `nodeComponents.code`.

For a full component-based customization walkthrough, including a
`CodeBlock`-powered custom element, see the
[Rich components guide](docs/guide/rich-components.md#build-a-custom-code-block-with-codeblock).

### Customize the theme

```vue
<!-- Preset: light | dark | auto | custom -->
<MarkdownRenderer theme="auto" :source="source" toc />

<!-- Per-instance tokens -->
<MarkdownRenderer
  theme="auto"
  :source="source"
  :tokens="{
    '--vmd-color-accent': '#8250df',
    '--vmd-radius-md': '12px',
  }"
/>

<!-- App-wide defaults -->
<MarkdownConfigProvider theme="auto" :tokens="brandTokens">
  <MarkdownRenderer :source="source" toc />
</MarkdownConfigProvider>
```

The renderer writes `data-vmd-theme` on its own root and never touches the host
page. `auto` follows `prefers-color-scheme`, while `custom` applies no preset
colors so your token overrides win unchanged. Tokens cascade from any ancestor,
so a scoped theme is just a class with `--vmd-*` properties.

### Customize CSS

```ts
import 'vue-markdown-suite/style.css'
```

```css
.my-docs {
  --vmd-font-size: 1.0625rem;
  --vmd-line-height: 1.8;
  --vmd-color-accent: #8250df;
}

[data-vmd-part='heading'] {
  letter-spacing: -0.01em;
}

[data-vmd-part='code'] {
  --vmd-code-bg: #0d1117;
  color: #e6edf3;
}
```

The stylesheet is optional and split into `styles/tokens.css` and
`styles/components.css`. Target the documented `data-vmd-part` / `vmd-*` parts
and `--vmd-*` tokens, never internal DOM structure, because a host may replace
any tag component. Unstyled usage keeps the same behavior and accessibility.

See [Styled usage](docs/guide/styling.md) and
[Customization](docs/guide/customization.md) for the full contract.

## Advanced usage

### Plugins and presets

```ts
import { defineMarkdownPlugin } from 'vue-markdown-suite/plugins'
import { defineMarkdownPreset, composePresets } from 'vue-markdown-suite/presets'

export const docsPlugin = defineMarkdownPlugin({
  name: 'docs',
  phase: 'normal',
  remarkPlugins: [],
  rehypePlugins: [],
  components: { h2: 'h3' },
  labels: { toc: 'On this page' },
  tokens: { '--vmd-color-accent': '#8250df' },
  transformDocument(document) {
    return { ...document, frontmatter: { ...document.frontmatter, docs: true } }
  },
  setup() {
    // Runs once per resolved plugin set inside an effectScope.
    return () => {
      // Cleanup on reconfiguration and unmount.
    }
  },
})

export const docsPreset = composePresets(
  defineMarkdownPreset({ name: 'base', theme: 'auto' }),
  defineMarkdownPreset({ name: 'docs', tokens: { '--vmd-radius-md': '10px' } }),
)
```

```vue
<script setup lang="ts">
const plugins = [docsPlugin]
</script>

<template>
  <MarkdownRenderer :source="source" :plugins="plugins" :preset="docsPreset" toc />
</template>
```

Order is `pre` → `normal` → `post`, then registration order. Duplicate names
replace deterministically. Keep the plugin array stable: plugin identity is part
of the parse memo key, so `:plugins="[docsPlugin]"` created inline in a template
re-parses on every parent render. A failing plugin is isolated and never corrupts
the last good document.

### Headless rendering

```ts
import { useMarkdownDocument } from 'vue-markdown-suite/headless'

const { document, toc, status, diagnostics, refresh } = useMarkdownDocument(source, {
  plugins: [docsPlugin],
})
```

The composable owns parsing, memoization, plugin lifecycle, status, and
diagnostics. It renders nothing, so a host can map the serializable model to its
own markup.

### Syntax highlighting, math, and diagrams

```ts
import { highlightjs } from 'vue-markdown-suite/highlight'
import { shiki } from 'vue-markdown-suite/highlight/shiki'
import { fullPlugins } from 'vue-markdown-suite/plugins'
import { mathPlugin, katexEngine } from 'vue-markdown-suite/math'
import { mermaidPlugin, renderMermaid } from 'vue-markdown-suite/mermaid'
import 'vue-markdown-suite/styles/math-full.css'

const plugins = [...fullPlugins, mathPlugin(), mermaidPlugin()]
```

```vue
<MarkdownRenderer
  :source="source"
  :highlighter="shiki"
  :math-engine="katexEngine"
  :plugins="plugins"
/>
```

Each engine is a small adapter with an `id` and one method, so a host can provide
its own highlighter, math renderer, or Mermaid renderer. See the
[highlighting](docs/guide/highlighting.md), [math](docs/guide/math.md), and
[Mermaid](docs/guide/mermaid.md) guides, or the
[rich components guide](docs/guide/rich-components.md) for standalone
`CodeBlock`, `VueSyntaxHighlighter`, `MermaidBlock`, and `MermaidLiveEditor`
usage.

### Server rendering and static export

```ts
import { exportMarkdownHtml, exportMarkdownHtmlSync } from 'vue-markdown-suite'

const html = exportMarkdownHtmlSync(source)
const asyncHtml = await exportMarkdownHtml(source, { plugins: [docsPlugin] })
```

Export uses the same pipeline, plugins, sanitizer, URL policy, transforms, and
heading IDs as rendering. `exportMarkdownHtmlSync` requires a synchronous
pipeline; the official pipeline supports both paths.

## Complete example

The live docs include a complete docs-portal example that combines:

- frontmatter, GFM, search, and TOC
- presets, plugins, and custom blockquote/link node components
- KaTeX math and a lazy Mermaid diagram
- theme switching and static HTML export
- the same public API used by the rest of the documentation

Open the [complete example](https://coderminer.github.io/vue-markdown/guide/complete-example.html),
or browse [`docs/.vitepress/theme/components/CompleteExample.vue`](docs/.vitepress/theme/components/CompleteExample.vue)
in the repository.

## API reference

The full reference, including every slot, region, adapter contract, and
component manifest, lives in the
[live API reference](https://coderminer.github.io/vue-markdown/reference/renderer.html).

### `MarkdownRenderer` props

| Prop | Type | Default | Notes |
| --- | --- | --- | --- |
| `source` | `string` | `''` | Controlled Markdown input. Wins over the default slot. Supports `v-model:source`. |
| `components` | `Record<string, Component \| string>` | `{}` | Tag-keyed overrides. |
| `regions` | `Partial<Record<string, Component \| string>>` | `{}` | Root, content, TOC, TOC item, code block, Mermaid block, error, empty, and loading region overrides. |
| `nodeComponents` | `Record<string, Component \| string \| NodeRenderer>` | `{}` | Semantic node overrides and function renderers. |
| `labels` | `Partial<MarkdownLabels>` | `{}` | String or function labels for built-in text. |
| `preset` | `MarkdownPreset \| MarkdownPreset[]` | — | Applies one or more presets. |
| `plugins` | `PluginInput[]` | `defaultPlugins` | Replaces the default plugin set when provided. |
| `disablePlugins` | `string[]` | `[]` | Removes named plugins from the resolved set. |
| `remarkPlugins` | `PluggableList` | `[]` | Runs after library remark plugins. |
| `rehypePlugins` | `PluggableList` | `[]` | Runs after library rehype plugins. Adding `rehype-raw` enables raw HTML. |
| `remarkRehypeOptions` | `Record<string, unknown>` | `{}` | Merged into the conversion step. |
| `pipeline` | `MarkdownPipeline` | official | Advanced escape hatch; must return hast. |
| `slugger` | `MarkdownSlugger` | `github-slugger` | Heading ID generator. |
| `highlighter` | `MarkdownHighlighter` | — | Syntax highlighting adapter. |
| `mathEngine` | `MathEngine` | — | Math rendering adapter. |
| `mermaidRenderer` | `MermaidRenderer` | — | Mermaid rendering adapter. |
| `diagnosticsFormatter` | `DiagnosticFormatter` | — | Formats render errors. |
| `allowedElements` | `string[]` | — | Mutually exclusive with `disallowedElements`; wins on conflict. |
| `disallowedElements` | `string[]` | — | Deny list. |
| `unwrapDisallowed` | `boolean` | `false` | Keeps the children of removed elements. |
| `allowElement` | `(node, index, parent) => boolean \| null \| undefined` | — | Runs after the allow/deny lists; any falsy result rejects the element. |
| `urlTransform` | `(url, key, node) => string \| null \| undefined` | `defaultUrlTransform` | Applies to every URL-bearing attribute; `null` removes it and the result is revalidated. |
| `linkTarget` | `string` | `'_self'` | Applied to links. |
| `externalLinkTarget` | `'_self' \| '_blank'` | `'_self'` | `_blank` adds `rel="noopener noreferrer"`. |
| `baseUrl` | `string` | — | Resolves relative URLs before `urlTransform`. |
| `idPrefix` | `string` | `''` | Prefixes generated heading IDs. Use a unique prefix for multiple renderers on one page. |
| `syncHash` | `boolean` | `false` | Updates the URL hash on heading activation. |
| `skipHtml` | `boolean` | `false` | Removes raw HTML nodes. |
| `toc` | `boolean` | `false` | Renders the TOC region. |
| `showError` | `boolean` | `false` | Renders the error region on failure. |
| `tokens` | `Record<string, string>` | `{}` | Inline `--vmd-*` custom properties on the root. |
| `theme` | `'light' \| 'dark' \| 'auto' \| 'custom'` | `'light'` | Sets `data-vmd-theme` on the root. |
| `as` | `string \| Component` | `'div'` | Root element or component. |

### Events

| Event | Payload |
| --- | --- |
| `update:source` | `source: string` |
| `toc-change` | `toc: TocItem[]` |
| `link-click` | `{ url, target, node, event }` |
| `custom-tag-click` | `{ tag, props, node, event }` |
| `task-change` | `{ checked, node }` |
| `render-error` | `MarkdownDiagnostic` |
| `ready` | `MarkdownDocument` |

`toc-change` is signature-gated: it only fires when the serialized TOC changes.
`ready` fires once for the first successful document.

### Slots

The `default` slot is raw Markdown text. Named region slots fully replace their
default region and receive scoped context: `root`, `toc`, `toc-item`, `content`,
`error`, `empty`, and `loading`. An absent or empty slot keeps the default
rendering. See the [customization guide](docs/guide/customization.md#slots).

### Entry points

| Entry | Contents |
| --- | --- |
| `vue-markdown-suite` | Renderer, preset components, composables, core helpers |
| `vue-markdown-suite/headless` | Types, model helpers, composables; no preset components or CSS |
| `vue-markdown-suite/pipeline` | Official pipeline, custom pipeline validation, identity |
| `vue-markdown-suite/plugins` | `defineMarkdownPlugin`, registry, built-in plugins |
| `vue-markdown-suite/presets` | `defineMarkdownPreset`, `composePresets`, configuration types |
| `vue-markdown-suite/highlight` | highlight.js adapter and normalization helpers |
| `vue-markdown-suite/highlight/shiki` | Optional Shiki adapter |
| `vue-markdown-suite/math` | `mathPlugin`, `katexEngine`, math types |
| `vue-markdown-suite/mermaid` | Lazy Mermaid runtime and SVG sanitizer |
| `vue-markdown-suite/editor` | Lazy CodeMirror integration |
| `vue-markdown-suite/node-components` | The node component catalog only |
| `vue-markdown-suite/components/*` | One entry per public component |
| `vue-markdown-suite/style.css` | Full stylesheet |
| `vue-markdown-suite/styles/tokens.css` | Design tokens only |
| `vue-markdown-suite/styles/components.css` | Part-based component styles |
| `vue-markdown-suite/styles/math.css` | Math container styles; import KaTeX CSS separately |
| `vue-markdown-suite/styles/math-full.css` | KaTeX CSS plus math container styles |

## Security defaults

- Raw HTML is dropped. Add `rehype-raw` to `rehypePlugins` to enable it; the
  sanitizer then runs immediately after raw parsing.
- URL protocols are limited to `http`, `https`, `irc`, `ircs`, `mailto`,
  `xmpp`, and relative URLs.
- Image `data:` URLs are raster-only; `data:image/svg+xml` is rejected.
- Event handler attributes and `style` are stripped from raw HTML and custom
  tags.
- The render path uses no `v-html`, no `eval`, and no inline script.
- Mermaid is rendered with strict security and its SVG is sanitized before it
  becomes nodes.

See [docs/guide/security.md](docs/guide/security.md) for the full policy.

## Documentation

| Guide | What it covers |
| --- | --- |
| [Rich components](docs/guide/rich-components.md) | `CodeBlock`, `VueSyntaxHighlighter`, `MermaidBlock`, and `MermaidLiveEditor` usage |
| [Styling and themes](docs/guide/styling.md) | Tokens, themes, parts, and unstyled mode |
| [Customization](docs/guide/customization.md) | Precedence, regions, node components, slots, manifests |
| [Cookbook](docs/guide/cookbook.md) | Copy-paste recipes for common tasks |
| [Headless usage](docs/guide/headless.md) | `useMarkdownDocument`, the model, and helper APIs |
| [Pipeline](docs/guide/pipeline.md) | The official unified pipeline and stage order |
| [Custom pipeline](docs/guide/custom-pipeline.md) | Authoring and validating a replacement pipeline |
| [Plugins](docs/guide/plugins.md) | Plugin contracts, ordering, lifecycle, and remark/rehype |
| [CommonMark and GFM](docs/guide/commonmark-gfm.md) | Syntax coverage and conformance |
| [Raw HTML and security](docs/guide/security.md) | Sanitization, URL policy, CSP, and custom tags |
| [Syntax highlighting](docs/guide/highlighting.md) | Adapters, Shiki, caching, and server rendering |
| [Math](docs/guide/math.md) | `mathPlugin`, delimiters, engines, and fallbacks |
| [Mermaid](docs/guide/mermaid.md) | Lazy runtime, sanitizer, block states, and editor |
| [SSR and static export](docs/guide/ssr.md) | Server rendering and static HTML helpers |
| [Audits](docs/guide/audits.md) | Accessibility, reduced motion, RTL, and cleanup |

## Development

```bash
npm install
npm run docs:dev     # documentation site (VitePress)
npm run docs:build   # static documentation site
npm run dev          # interactive demo
npm run build:lib    # library, declarations, styles
npm test             # node + happy-dom projects
npm run typecheck
npm run lint
npm run size         # bundle entry guard
npm run bench        # parse/render budget gate
```

The documentation site is deployed to GitHub Pages by
`.github/workflows/pages.yml`. The repository also contains `AGENTS.md`, which
documents the layered architecture and the rules that keep the core DOM-free and
the dependency direction one-way.

## License

[MIT](LICENSE) © CoderMiner
