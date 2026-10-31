# SSR and static export

`vue-markdown-suite` is SSR-safe: no browser globals are touched at module
scope, heading IDs are deterministic, and the renderer prefers the synchronous
path when every plugin is synchronous.

## Server rendering

```ts
import { createSSRApp, h } from 'vue'
import { renderToString } from '@vue/server-renderer'
import { MarkdownRenderer } from 'vue-markdown-suite'

const app = createSSRApp({
  render: () => h(MarkdownRenderer, { source: '# Hello' }),
})

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
import { exportMarkdownHtml, exportMarkdownHtmlSync } from 'vue-markdown-suite'

const html = await exportMarkdownHtml('# Hello')
const sync = exportMarkdownHtmlSync('# Hello')
```

Both helpers run the same pipeline and finalization as the renderer, then
stringify the normalized document with `rehype-stringify`. Export therefore
applies the same sanitization, element filtering, URL policy, `baseUrl`,
`skipHtml`, heading IDs, and plugin document transforms as rendering. The render
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

## Hydration

The client and server must use the same source, plugins, and parse-affecting
options. Presentation-only options — tokens, labels, active heading — can differ
without changing the document structure.

## Next

- [The official pipeline](pipeline.md)
- [Raw HTML and security](security.md)
