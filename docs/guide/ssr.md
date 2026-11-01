---
description: Server rendering and deterministic static HTML export.
---

# SSR and static export

`@coderminer/vue-markdown` is SSR-safe: no browser globals are touched at module
scope, heading IDs are deterministic, and the renderer prefers the synchronous
path when every plugin is synchronous.

## Server rendering

```vue [App.vue]
<script setup lang="ts">
import { MarkdownRenderer } from '@coderminer/vue-markdown'
import '@coderminer/vue-markdown/style.css'

defineProps<{ source: string }>()
</script>

<template>
  <MarkdownRenderer :source="source" />
</template>
```

```ts [server.ts]
import { createSSRApp } from 'vue'
import { renderToString } from '@vue/server-renderer'
import App from './App.vue'

const app = createSSRApp(App, { source: '# Hello' })
const html = await renderToString(app)
```

On the server, `scrollToHeading` is a no-op and `useActiveHeading` does not
create an observer.

## Synchronous vs async

- If every configured plugin is synchronous, the renderer uses `processSync`
  and emits complete static content.
- If a plugin is async-only, the server renders the loading region and the
  client fills in the document after hydration.

Keep SSR output deterministic: avoid `Date.now()`, random IDs, and
request-specific state inside plugins.

## Static HTML export

```ts
import { exportMarkdownHtml, exportMarkdownHtmlSync } from '@coderminer/vue-markdown'

const html = await exportMarkdownHtml('# Hello')
const sync = exportMarkdownHtmlSync('# Hello')
```

Both helpers run the same pipeline and finalization as the renderer, then
stringify the normalized document with `rehype-stringify`. Export therefore
applies the same sanitization, element filtering, URL policy, `baseUrl`,
heading IDs, and plugin document transforms as rendering. The render
path never calls `rehype-stringify`; export is an explicit, separate helper.

Options are the same parse-affecting options as the renderer:

```ts
exportMarkdownHtmlSync(source, {
  plugins: [gfmPlugin],
  idPrefix: 'doc-',
  baseUrl: 'https://example.com/',
})
```

`exportMarkdownHtmlSync` throws if the configured pipeline has no synchronous
path. `exportMarkdownHtml` throws when the run produces an error diagnostic
instead of returning a partial document.

Plugin nodes keep their identity in the output: they serialize as a `span`
wrapper carrying `data-vmd-part="plugin"`, `data-plugin-type`, and
`data-plugin-key`, so a client can find and hydrate them. When a plugin node
renders only through a host component it has no serializable content, and export
cannot invent any. Instead of dropping the node, export writes an empty
placeholder marked `data-plugin-unrendered`. Give the plugin node children, or
mount the component on the client, when the static HTML must contain the
content.

## Hydration

The client and server must use the same source, plugins, and parse-affecting
options. Presentation-only options — tokens, labels, active heading — can differ
without changing the document structure.

`htmlPlugin()` is parse-affecting: it adds `rehype-raw`, which re-parses the
whole hast tree. Include or omit it identically on the server and client, even
for documents that contain no raw HTML.

## Next

- [The official pipeline](pipeline.md)
- [Raw HTML and security](security.md)
