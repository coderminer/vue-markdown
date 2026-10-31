---
description: A complete documentation portal built with the public vue-markdown-suite API, including search, TOC, frontmatter, plugins, math, and static export.
---

# Complete example

This page is a working documentation portal built with the public API only. It
combines frontmatter, GFM, search, a TOC, custom node components, math, and static
HTML export.

Try the search box, scroll the TOC, and export the article as standalone HTML.

<ClientOnly>
  <CompleteExample />
</ClientOnly>

## What this example uses

| Layer | Contribution |
| --- | --- |
| `MarkdownRenderer` | Parsing, TOC, events, regions, and theming |
| `searchPlugin` | Highlights matches without changing the document shape |
| `gfmPlugin` | Tables, task lists, strikethrough, and footnotes |
| `frontmatterPlugin` | Reads the YAML block into document metadata |
| `mathPlugin` | Inline and display KaTeX rendering |
| `nodeComponents` | Custom blockquote callout and link renderer |
| `preset` | Shared labels and tokens |
| `exportMarkdownHtmlSync` | Static export with the same pipeline and policy |

## Composition

```ts
import {
  composePresets,
  defineMarkdownPreset,
  defineMarkdownPlugin,
} from 'vue-markdown-suite'
import {
  codePlugin,
  frontmatterPlugin,
  gfmPlugin,
  linkPlugin,
  searchPlugin,
  tocPlugin,
} from 'vue-markdown-suite/plugins'
import { mathPlugin } from 'vue-markdown-suite/math'

const docsPlugin = defineMarkdownPlugin({
  name: 'docs-enhancements',
  labels: { toc: 'On this page' },
  transformDocument: (document) => ({
    ...document,
    frontmatter: { ...document.frontmatter, enhanced: true },
  }),
})

const preset = composePresets(
  defineMarkdownPreset({ name: 'base', labels: { toc: 'On this page' } }),
  defineMarkdownPreset({
    name: 'accent',
    tokens: { '--vmd-color-accent': '#7c3aed' },
  }),
)

const plugins = computed(() => [
  tocPlugin,
  codePlugin,
  linkPlugin,
  searchPlugin({ query: query.value }),
  gfmPlugin,
  frontmatterPlugin,
  mathPlugin(),
  docsPlugin,
])
```

## Node components

```ts
const nodeComponents = {
  blockquote: (ctx) =>
    h(Callout, null, { default: () => ctx.defaultRender() }),
  a: (ctx) =>
    h(
      'a',
      {
        ...(ctx.node.kind === 'element' ? ctx.node.attrs : {}),
        class: 'article-link',
      },
      ctx.defaultRender(),
    ),
}
```

`defaultRender()` keeps the built-in safety, heading IDs, and TOC behavior while
letting the host wrap the result.

## Search and TOC

```vue
<MarkdownRenderer
  v-model:source="source"
  :plugins="plugins"
  :preset="preset"
  :node-components="nodeComponents"
  :theme="theme"
  toc
  show-error
  @toc-change="toc = $event"
  @ready="onReady"
  @render-error="onError"
/>
```

`toc-change` is signature-gated, so the sidebar updates only when the heading
structure changes. `useActiveHeading` tracks the heading currently in view.

## Theme

The live example follows the site appearance through VitePress `useData().isDark`
and passes `theme` to the renderer. In your own app, use the `theme` prop or a
`MarkdownConfigProvider` and override `--vmd-*` tokens.

## Static export

```ts
const html = exportMarkdownHtmlSync(source.value, {
  plugins: plugins.value,
})
```

The export applies the same plugins, sanitizer, URL policy, transforms, and
heading IDs. The **Export HTML** button downloads the result.

## Next

- [Customization](./customization.md)
- [Renderer reference](../reference/renderer.md)
- [Live playground](../examples/playground.md)
