---
description: Authoring and validating a replacement Markdown pipeline.
---

# Authoring a custom pipeline

A custom pipeline replaces the official parse path. It must return a hast root;
the suite still builds the model, applies filtering, and renders Vue components.

## Contract

```ts
import type {
  MarkdownPipeline,
  PipelineContext,
  PipelineResult,
} from '@coderminer/vue-markdown/pipeline'
import { defineMarkdownPipeline } from '@coderminer/vue-markdown/pipeline'

export const myPipeline = defineMarkdownPipeline({
  name: 'my-pipeline',
  capabilities: { sync: true },
  process(source: string, ctx: PipelineContext): Promise<PipelineResult> {
    // ...
  },
  processSync(source: string, ctx: PipelineContext): PipelineResult {
    // Optional. Required for synchronous SSR and static export.
  },
  dispose() {
    // Optional. Called when the pipeline is replaced or unmounted.
  },
})
```

`PipelineResult` is `{ hast: Root; frontmatter?: Record<string, unknown> }`.

## Rules

- Return a hast `root`. Any other shape throws and the host reports a
  diagnostic.
- Declare capabilities honestly. `sync: true` means `processSync` exists and is
  safe on the server.
- Do not mutate host options. `ctx` is per run.
- If you parse raw HTML, sanitize before returning. The suite's sanitizer only
  runs on the official path.
- `dispose` is the only place to release resources.

## Example: a pre-processing wrapper

```ts
import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkRehype from 'remark-rehype'
import type { Root } from 'hast'
import { defineMarkdownPipeline } from '@coderminer/vue-markdown/pipeline'

const processor = unified().use(remarkParse).use(remarkRehype, {
  allowDangerousHtml: true,
})

function run(source: string): Root {
  const mdast = processor.parse(source)
  return processor.runSync(mdast) as Root
}

export const wrappedPipeline = defineMarkdownPipeline({
  name: 'wrapped',
  capabilities: { sync: true },
  async process(source) {
    return { hast: run(source) }
  },
  processSync(source) {
    return { hast: run(source) }
  },
})
```

## Fallback behavior

An invalid pipeline — missing `name`, missing `process`, or a bad result — is
reported with a diagnostic and replaced by the official pipeline. A failing
pipeline keeps the last good document.

```ts
import { validatePipeline, resolvePipeline } from '@coderminer/vue-markdown/pipeline'
```

## Choosing a pipeline at runtime

```vue
<MarkdownRenderer :source="source" :pipeline="useCustom ? myPipeline : undefined" />
```

Switching pipelines invalidates the memo key and re-parses.

## Next

- [The official pipeline](pipeline.md)
- [SSR and static export](ssr.md)
