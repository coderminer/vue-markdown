---
description: The official unified pipeline, stage order, and plugin hand-off.
---

# The official pipeline

The official pipeline is `unified` + `remark-parse` + `remark-rehype`. It parses
Markdown to mdast, converts to hast, sanitizes when needed, and hands the hast
tree to the model builder. There is no HTML string round-trip.

## Stage order

```
plugin transformSource    (in resolved plugin order)
  -> remark-parse
  -> library remark plugins
  -> host remarkPlugins
  -> remark-rehype        (allowDangerousHtml: true)
  -> rehype-raw           (only when the html plugin is enabled)
  -> rehype-sanitize      (immediately after rehype-raw)
  -> core heading IDs
  -> host rehypePlugins
  -> hast captured for the model
```

This order is a contract. Source transforms are applied by `useMarkdownDocument`
and the static export helpers before the pipeline starts; a direct
`createOfficialPipeline` caller is responsible for passing already-transformed
source. A host rehype plugin runs after core heading-ID work. Raw HTML is enabled
by adding `htmlPlugin()` to `plugins`, never by adding `rehype-raw` to
`rehypePlugins`; the pipeline ignores a manual parser and reports a warning.
Without the html plugin, raw nodes are dropped before host rehype plugins run,
so a wrapped or minified manual parser has no effect either.

## Use it directly

```ts
import { createOfficialPipeline } from 'vue-markdown-suite/pipeline'
import GithubSlugger from 'github-slugger'
import { defaultPlugins } from 'vue-markdown-suite/plugins'

const pipeline = createOfficialPipeline()
const result = await pipeline.process('# Hello', {
  source: '# Hello',
  options: {},
  plugins: defaultPlugins,
  remarkPlugins: [],
  rehypePlugins: [],
  remarkRehypeOptions: {},
  slugger: new GithubSlugger(),
  idPrefix: '',
  diagnostics: [],
})

// result.hast is a hast root.
```

`processSync` is available when every plugin is synchronous. The renderer uses
it first and falls back to `process` for async plugins.

A failing remark or rehype plugin is reported as a diagnostic and handed to the
owning `MarkdownPlugin.onError`. The cached processor reads the current run's
context from the vfile, so reusing a processor does not write errors into an
earlier run's diagnostics.

## Why not `markdown-it`

`remark` gives the suite a typed mdast, a mature plugin ecosystem, and an
official path to hast. That is what makes tag-level Vue components, a
serializable model, and host remark/rehype plugins possible without an HTML
string round-trip.

## Identity and memoization

The parse memo key includes the source, pipeline identity, ordered plugin
identities, and parse-affecting options. Presentation-only changes — tokens,
labels, active heading — do not re-parse.

```ts
import { memoClear, memoSize } from 'vue-markdown-suite'
```

`memoClear()` is useful in tests and benchmarks. `memoSize()` reports the
bounded cache size.

## Heading IDs

Heading IDs come from `github-slugger` by default, are unique per document, and
are prefixed by `idPrefix`. Pass a custom `slugger` to change the algorithm:

```ts
const slugger = {
  slug: (value: string) => value.toLowerCase().split(' ').join('-'),
}
```

## Next

- [Authoring a custom pipeline](custom-pipeline.md)
- [Plugins and remark/rehype integration](plugins.md)
