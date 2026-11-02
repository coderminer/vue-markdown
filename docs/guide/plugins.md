---
description: Plugin contracts, ordering, lifecycle, and remark/rehype integration.
---

# Plugins and remark/rehype integration

Plugins are the primary behavioral extension seam outside the core parsing,
safety, TOC, code, and link invariants. A plugin can contribute remark/rehype
plugins, `remarkRehypeOptions`, source and document transforms, components,
labels, tokens, and setup/cleanup.

## Define a plugin

```ts
import { defineMarkdownPlugin } from '@coderminer/vue-markdown/plugins'

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

## Complete example: a sample plugin

The demo ships [`demo/plugins/samplePlugin.ts`](https://github.com/coderminer/vue-markdown/blob/main/demo/plugins/samplePlugin.ts).
It exercises every public hook: a source transform, a remark plugin, a rehype
plugin, a component contribution, a document transform, labels, tokens, setup,
cleanup, and `onError`.

```ts
// sample-plugin.ts
import { defineComponent, h } from 'vue'
import { visit } from 'unist-util-visit'
import type { MarkdownNodeRenderContext } from '@coderminer/vue-markdown'
import { defineMarkdownPlugin } from '@coderminer/vue-markdown/plugins'

const SampleCallout = defineComponent({
  setup(_, { slots }) {
    return () => h('aside', { class: 'sample-callout' }, slots.default?.())
  },
})

const uppercaseKeyword = () => (tree) => {
  visit(tree, 'text', (node) => {
    node.value = node.value.split('plugin').join('PLUGIN')
  })
}

const markHeadings = () => (tree) => {
  visit(tree, 'element', (node) => {
    if (/^h[1-6]$/.test(node.tagName)) {
      node.properties = { ...node.properties, 'data-sample-heading': 'yes' }
    }
  })
}

export const samplePlugin = defineMarkdownPlugin({
  name: 'sample-plugin',
  phase: 'normal',
  // Runs before parsing. Returning a non-string keeps the previous source.
  transformSource(source) {
    return source.replace('[[sample]]', '> Injected before parsing.')
  },
  // Runs inside the official pipeline after remark-parse / remark-rehype.
  remarkPlugins: [uppercaseKeyword],
  rehypePlugins: [markHeadings],
  // Replaces blockquote rendering; use ctx.defaultRender() for normal children.
  nodeComponents: {
    blockquote: (ctx: MarkdownNodeRenderContext) =>
      h(SampleCallout, null, { default: () => ctx.defaultRender() }),
  },
  // Runs after sanitization and model construction.
  transformDocument(document) {
    return {
      ...document,
      frontmatter: { ...(document.frontmatter ?? {}), samplePlugin: true },
    }
  },
  labels: { toc: 'Sample contents' },
  tokens: { '--vmd-color-accent': '#8250df' },
  setup(ctx) {
    // Runs once per resolved plugin set; register listeners only if you return
    // a cleanup that removes them.
    return () => {
      // Runs on reconfiguration and unmount.
    }
  },
  onError(error, phase, ctx) {
    ctx.addDiagnostic({
      code: 'sample-plugin-failed',
      message: String(error),
      severity: 'warning',
      phase,
      plugin: 'sample-plugin',
    })
  },
})
```

Register it exactly like a built-in plugin. Create the instance once; returning a
new plugin from the template re-parses the document on every parent render.

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { MarkdownRenderer } from '@coderminer/vue-markdown'
import { samplePlugin } from './sample-plugin'

const source = ref('# Plugin demo\n\n[[sample]]\n\nThis paragraph mentions plugin.')
</script>

<template>
  <MarkdownRenderer :source="source" :plugins="[samplePlugin]" toc />
</template>
```

Remove `samplePlugin` from the array to disable every contribution at once. The
demo adds `setups` and `cleanups` counters so you can see the lifecycle run when
the plugin array changes.

`transformSource` runs in resolved plugin order before parsing. A transform that
throws or returns a non-string keeps the previous source and reports
`plugin-source`; `onError` receives the `source` phase.

Create plugin instances once. The parse memo key includes plugin identity, so
`:plugins="[mathPlugin()]"` inside a template re-creates the plugin on every
parent render, re-parses the document, and may rerun `setup` and cleanup. Hoist
the array to module scope or a `setup` constant:

```ts
const plugins = [mathPlugin(), mermaidPlugin()]
```

Duplicate names still resolve deterministically, but they do not make the
instance identity stable.

## Ordering and duplicates

Order is `pre` → `normal` → `post`, then registration order. A duplicate name
replaces the earlier registration deterministically and reports a diagnostic.
`disablePlugins` removes non-core plugins from the resolved set. Core invariant
markers (`toc`, `code`, `link`) cannot be disabled; requesting it reports a
`plugin-core` diagnostic and keeps the marker in place. A name that is not in
the resolved set is ignored and reports a `plugin-unknown` warning. See
[disable names](#disableplugins-names) for the complete built-in list.

```vue
<MarkdownRenderer :source="source" :disable-plugins="['search']" />
```

## Precedence

For element tags:

1. Local `components[tag]`
2. Plugin-contributed `nodeComponents[tag]`
3. Plugin-contributed `components[tag]`
4. Built-in component

For semantic nodes (`code`, `math`, `mermaid`, `custom`, and plugin nodes), the
renderer consults `nodeComponents[kind]` after any local `components` key for
the same name. In particular, a local `components.code` beats a plugin
`nodeComponents.code`. A tag key such as `nodeComponents.paragraph` does not
apply to element nodes.

Fenced code is the exception: `components.pre` always wraps the block, while the
inner element resolves as local `components.code` > plugin
`nodeComponents.code` > plugin `components.code` > built-in.

Host-level `nodeComponents` and `regions` props are part of the renderer
contract. Plugins may also contribute `nodeComponents`, `regions`, `labels`,
and `tokens`; the renderer merges those contributions. Local `components` and
`tokens` props still win over plugin contributions. Function values in
`nodeComponents` are supported alongside component objects and tag-name
strings.

## Lifecycle

`setup` runs once per resolved plugin set inside an `effectScope`. It may return
a cleanup function. Cleanup runs when plugins are reconfigured and when the
renderer unmounts. Never register global listeners outside a cleanup.

## Error isolation

A failing remark plugin, rehype plugin, or transform is reported with the plugin
name and stage. The last good document is preserved, and the same failure is not
reported in a loop. The owning plugin's `onError` receives the `remark` or
`rehype` phase; cached processors read the current run's diagnostics, so errors
do not leak into an earlier run.

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
import rehypeHighlight from 'rehype-highlight'

const remarkPlugins = [remarkGfm]
const rehypePlugins = [rehypeHighlight]
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
after library rehype plugins and after the built-in sanitizer. Raw HTML is not
enabled through `rehypePlugins`: use `htmlPlugin()` from
`@coderminer/vue-markdown/html` so the parser and sanitizer stay paired.

## Built-in plugins

| Plugin | Purpose |
| --- | --- |
| `tocPlugin` | Core invariant marker; TOC construction is built in and cannot be disabled. |
| `codePlugin` | Core invariant marker; code-node construction is built in and cannot be disabled. |
| `linkPlugin` | Core invariant marker; link policy is built in and cannot be disabled. |
| `searchPlugin(options)` | Segment search matches; a real document transform. |
| `customTagsPlugin({ tags })` | Convert tags to custom nodes; a real document transform. |
| `gfmPlugin` | `remark-gfm`. |
| `frontmatterPlugin` | `remark-frontmatter` + YAML capture. |
| `htmlPlugin()` | Optional `@coderminer/vue-markdown/html` entry; sanitized raw HTML. |

`defaultPlugins` is `[toc, code, link, search, custom-tags]`; `fullPlugins` adds
`gfm` and `frontmatter`.

### `disablePlugins` names

`disablePlugins` matches the plugin `name`, not the exported factory name. This
is the complete built-in name list:

| Name | Factory | Included by | Can disable |
| --- | --- | --- | --- |
| `toc` | `tocPlugin` | `defaultPlugins` | No, core invariant |
| `code` | `codePlugin` | `defaultPlugins` | No, core invariant |
| `link` | `linkPlugin` | `defaultPlugins` | No, core invariant |
| `search` | `searchPlugin()` | `defaultPlugins` | Yes |
| `custom-tags` | `customTagsPlugin()` | `defaultPlugins` | Yes |
| `gfm` | `gfmPlugin` | `fullPlugins` | Yes |
| `frontmatter` | `frontmatterPlugin` | `fullPlugins` | Yes |
| `html` | `htmlPlugin()` | opt-in | Yes |
| `math` | `mathPlugin()` | opt-in | Yes |
| `mermaid` | `mermaidPlugin()` | opt-in | Yes |

`customTagsPlugin` registers as `custom-tags`, not `customTags`. If you pass a
custom `plugins` array, only names in that array are recognized; the others
report `plugin-unknown`.

The first three are core invariant markers: they remain in the resolved set for
ordering and diagnostics, but `disablePlugins` reports `plugin-core` instead of
removing them.

The renderer-level `search` prop is a core convenience in addition to
`searchPlugin()`. When both are present, the explicit prop wins; disabling the
`search` plugin does not disable the explicit prop.

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
