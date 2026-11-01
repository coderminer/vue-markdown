---
description: Highlighter, math, Mermaid, slugger, URL transform, diagnostics, plugin, and pipeline contracts.
---

# Adapters and extension contracts

Adapters are small objects with an `id` and one method. Invalid adapters are
reported through `render-error` and the documented fallback is used.

## Highlighter

```ts
import type { MarkdownHighlighter } from '@coderminer/vue-markdown'

const highlighter: MarkdownHighlighter = {
  id: 'my-highlighter',
  languages: ['ts'],
  async load() {
    await loadGrammar()
  },
  highlight(code, language, options) {
    return {
      language,
      nodes: [{ kind: 'text', key: 'code', value: code }],
    }
  },
}
```

`highlight` returns normalized nodes, never an HTML string. Thrown errors, unknown
languages, and invalid results fall back to plain source. Results are cached by
adapter identity, source, language, theme, and options.

Built-ins: `highlightjs` from `@coderminer/vue-markdown/highlight` and `shiki` from
`@coderminer/vue-markdown/highlight/shiki`.

## Math engine

```ts
import type { MathEngine } from '@coderminer/vue-markdown'

const engine: MathEngine = {
  id: 'my-math',
  render(tex, options) {
    return {
      nodes: [{ kind: 'text', key: 'math', value: tex }],
    }
  },
}
```

Return `{ nodes, error? }`. Invalid TeX may return an `error` string; the
renderer surfaces it through the `math-error` part and slot.

Built-in: `katexEngine` from `@coderminer/vue-markdown/math`.

## Mermaid renderer

```ts
import type { MermaidRenderer } from '@coderminer/vue-markdown'

const renderer: MermaidRenderer = {
  id: 'my-mermaid',
  async render(source, options) {
    return {
      svg: await render(source, options),
      nodes: [],
    }
  },
}
```

Custom output is sanitized. A renderer may return nodes directly or SVG markup;
invalid output keeps the last good preview and reports a diagnostic.

Built-in: `renderMermaid` from `@coderminer/vue-markdown/mermaid`.

## Slugger and URL transform

```ts
import type { MarkdownSlugger, MarkdownUrlTransform } from '@coderminer/vue-markdown'

const slugger: MarkdownSlugger = {
  slug(value) {
    return value.toLowerCase().replace(/\s+/g, '-')
  },
  reset() {},
}

const urlTransform: MarkdownUrlTransform = (url, key, node) => {
  if (key === 'href' && url.startsWith('/old/')) {
    return url.replace('/old/', '/new/')
  }
  return url
}
```

Return `null` from `urlTransform` to remove the attribute. The transformed value
is revalidated and can never bypass the URL policy.

## Diagnostics formatter

```ts
import type { DiagnosticFormatter } from '@coderminer/vue-markdown'

const formatter: DiagnosticFormatter = {
  id: 'my-formatter',
  format(error, source) {
    return {
      code: 'render-failed',
      message: String(error),
      severity: 'error',
      phase: 'render',
    }
  },
}
```

## Plugin contract

```ts
import { defineMarkdownPlugin } from '@coderminer/vue-markdown/plugins'

const plugin = defineMarkdownPlugin({
  name: 'my-plugin',
  phase: 'normal',
  remarkPlugins: [],
  rehypePlugins: [],
  remarkRehypeOptions: {},
  components: { h2: 'h3' },
  nodeComponents: {},
  regions: {},
  labels: { toc: 'Contents' },
  tokens: { '--vmd-color-accent': '#7c3aed' },
  transformSource(source, ctx) {
    return source
  },
  transformDocument(document, ctx) {
    return document
  },
  setup(ctx) {
    return () => {}
  },
  onError(error, phase, ctx) {},
})
```

A plugin's setup runs once per resolved plugin set inside an `effectScope`.
Cleanup runs on reconfiguration and unmount. A failing plugin is isolated and
never corrupts the last good document.

Read [Plugins](../guide/plugins.md) for ordering and error isolation.

## Pipeline contract

```ts
import type { MarkdownPipeline } from '@coderminer/vue-markdown/pipeline'

const pipeline: MarkdownPipeline = {
  name: 'my-pipeline',
  capabilities: { sync: true },
  process(source, ctx) {
    return Promise.resolve({
      hast: { type: 'root', children: [] },
      frontmatter: {},
    })
  },
  processSync(source, ctx) {
    return {
      hast: { type: 'root', children: [] },
    }
  },
  dispose() {},
}
```

A custom pipeline must return a hast root. Invalid pipelines fall back to the
official pipeline with a diagnostic. Read [Custom pipeline](../guide/custom-pipeline.md).

## Next

- [Entry points](./entry-points.md)
- [Document model](./document-model.md)
- [Plugins guide](../guide/plugins.md)
