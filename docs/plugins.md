# Plugins and remark/rehype integration

Plugins are the single behavioral extension seam. A plugin can contribute
remark/rehype plugins, `remarkRehypeOptions`, source and document transforms,
components, labels, tokens, and setup/cleanup.

## Define a plugin

```ts
import { defineMarkdownPlugin } from 'vue-markdown-suite/plugins'

export const myPlugin = defineMarkdownPlugin({
  name: 'my-plugin',        // required and unique
  phase: 'normal',          // 'pre' | 'normal' | 'post'
  remarkPlugins: [],
  rehypePlugins: [],
  remarkRehypeOptions: {},
  transformSource(source, ctx) {
    return source
  },
  transformDocument(document, ctx) {
    return document
  },
  components: { h2: 'h3' },
  labels: { toc: 'Contents' },
  tokens: { '--vmd-color-accent': 'rgb(130, 80, 223)' },
  setup(ctx) {
    // Runs once per resolved plugin set inside an effectScope.
    return () => {
      // Cleanup on reconfiguration and unmount.
    }
  },
  onError(error, phase, ctx) {
    // Optional reporting hook.
  },
})
```

Factories are supported too:

```ts
export const search = defineMarkdownPlugin((options: { query: string }) => ({
  name: 'search',
  transformDocument: (document) => searchDocument(document, options),
}))
```

## Ordering and duplicates

Order is `pre` → `normal` → `post`, then registration order. A duplicate name
replaces the earlier registration deterministically and reports a diagnostic.
`disablePlugins` removes names from the resolved set.

```vue
<MarkdownRenderer :source="source" :disable-plugins="['search']" />
```

## Precedence

When several sources provide a component for the same construct:

1. A function value in `nodeComponents`
2. `nodeComponents[tag]`
3. `components[tag]`
4. `nodeComponents[kind]`
5. Plugin contribution
6. Preset
7. Built-in

`nodeComponents.code` beats `components.pre` and `components.code`.

In v1.0 the renderer exposes `components`; plugin contributions for
`nodeComponents`, `regions`, `labels`, and `tokens` are merged underneath local
props, so local overrides always win.

## Lifecycle

`setup` runs once per resolved plugin set inside an `effectScope`. It may return
a cleanup function. Cleanup runs when plugins are reconfigured and when the
renderer unmounts. Never register global listeners outside a cleanup.

## Error isolation

A failing remark plugin, rehype plugin, or transform is reported with the plugin
name and stage. The last good document is preserved, and the same failure is not
reported in a loop.

```ts
onError(error, phase, ctx) {
  ctx.addDiagnostic({
    code: 'my-plugin-failed',
    message: String(error),
    severity: 'warning',
    phase,
    plugin: 'my-plugin',
  })
}
```

## remark and rehype plugins from the host

```vue
<script setup lang="ts">
import remarkGfm from 'remark-gfm'
import rehypeRaw from 'rehype-raw'
import rehypeHighlight from 'rehype-highlight'

const remarkPlugins = [remarkGfm]
const rehypePlugins = [rehypeRaw, rehypeHighlight]
</script>

<template>
  <MarkdownRenderer
    :source="source"
    :remark-plugins="remarkPlugins"
    :rehype-plugins="rehypePlugins"
  />
</template>
```

Host remark plugins run after library remark plugins. Host rehype plugins run
after library rehype plugins. Adding `rehype-raw` is what enables raw HTML.

## Built-in plugins

| Plugin | Purpose |
| --- | --- |
| `tocPlugin` | TOC construction |
| `codePlugin` | Code-node construction |
| `linkPlugin` | Link policy |
| `searchPlugin(options)` | Segment search matches |
| `customTagsPlugin({ tags })` | Convert tags to custom nodes |
| `gfmPlugin` | `remark-gfm` |
| `frontmatterPlugin` | `remark-frontmatter` + YAML capture |

`defaultPlugins` is `[toc, code, link, search, custom-tags]`. `fullPlugins` adds
GFM and frontmatter.

## Conditional composition

```ts
const plugins = [
  gfm,
  isProd && analyticsPlugin,
  options.search ? searchPlugin(options.search) : false,
]
```

`false`, `null`, and `undefined` are ignored.

## Next

- [CommonMark and GFM](commonmark-gfm.md)
- [Raw HTML and security](security.md)
