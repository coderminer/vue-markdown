# The official pipeline

The official pipeline is `unified` + `remark-parse` + `remark-rehype`. It parses
Markdown to mdast, converts to hast, sanitizes when needed, and hands the hast
tree to the model builder. There is no HTML string round-trip.

## Stage order

```
remark-parse
  -> library remark plugins
  -> host remarkPlugins
  -> remark-rehype        (allowDangerousHtml: true)
  -> rehype-raw           (only when the host adds it)
  -> rehype-sanitize      (immediately after rehype-raw)
  -> library rehype plugins (heading IDs)
  -> host rehypePlugins
  -> hast captured for the model
```

This order is a contract. A host rehype plugin runs after library heading-ID
work, and sanitization always runs immediately after raw parsing.

## Use it directly

```ts
import { createOfficialPipeline } from 'vue-markdown-suite/pipeline'
import GithubSlugger from 'github-slugger'
import { defaultPlugins } from 'vue-markdown-suite/plugins'

const pipeline = createOfficialPipeline()
const result = await pipeline.process('# Hello', {
  source: '# Hello',
  plugins: defaultPlugins,
  remarkPlugins: [],
  rehypePlugins: [],
  remarkRehypeOptions: {},
  slugger: new GithubSlugger(),
  idPrefix: '',
  allowHtml: false,
  diagnostics: [],
})

// result.hast is a hast root.
```

`processSync` is available when every plugin is synchronous. The renderer uses
it first and falls back to `process` for async plugins.

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
import { memoClear, memoSize } from 'vue-markdown-suite/pipeline'
```

`memoClear()` is useful in tests and benchmarks. `memoSize()` reports the
bounded cache size.

## Heading IDs

Heading IDs come from `github-slugger` by default, are unique per document, and
are prefixed by `idPrefix`. Pass a custom `slugger` to change the algorithm:

```ts
const slugger = {
  slug: (value: string) => value.toLowerCase().replaceAll(' ', '-'),
}
```

## Next

- [Authoring a custom pipeline](custom-pipeline.md)
- [Plugins and remark/rehype integration](plugins.md)
