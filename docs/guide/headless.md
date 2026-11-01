---
description: Use useMarkdownDocument, the serializable model, and custom markup.
---

# Headless usage

The headless entry exposes the document model and composables without preset
components or CSS.

```ts
import {
  useMarkdownDocument,
  useActiveHeading,
  walkNodes,
} from 'vue-markdown-suite/headless'
```

## The composable

```ts
import { ref } from 'vue'
import { useMarkdownDocument } from 'vue-markdown-suite/headless'

const source = ref('# Hello\n\nA **bold** paragraph.')
const {
  document,     // ShallowRef<MarkdownDocument | undefined>
  toc,          // ComputedRef<TocItem[]>
  status,       // ShallowRef<'idle' | 'pending' | 'ready' | 'error'>
  diagnostics,  // ShallowRef<MarkdownDiagnostic[]>
  pipeline,     // ComputedRef<string>
  plugins,      // ComputedRef<string[]>
  refresh,      // () => Promise<void>
} = useMarkdownDocument(source)
```

`source` accepts `MaybeRefOrGetter<string>`. `options` accepts the
parse-affecting subset of the renderer props: `components`, `plugins`,
`disablePlugins`, `remarkPlugins`, `rehypePlugins`, `remarkRehypeOptions`,
`pipeline`, `slugger`, `allowedElements`, `disallowedElements`,
`unwrapDisallowed`, `allowElement`, `urlTransform`, `linkTarget`,
`externalLinkTarget`, `baseUrl`, and `idPrefix`.

The composable also exposes plugin contributions for hosts that render their own
markup:

```ts
const {
  resolvedComponents,
  resolvedNodeComponents,
  resolvedRegions,
  resolvedLabels,
  resolvedTokens,
} = useMarkdownDocument(source)
```

Local overrides should win over these values.

## The document model

The model is plain, serializable data. It contains no Vue, DOM, mdast, hast, or
processor objects.

```ts
interface MarkdownDocument {
  nodes: MarkdownNode[]
  toc: TocItem[]
  customTags: CustomTagInstance[]
  frontmatter?: Record<string, unknown>
  plugins: string[]
  pipeline: string
}

type MarkdownNode =
  | { kind: 'text'; key: string; value: string; segments?: SearchSegment[]; source?: SourceRange }
  | { kind: 'element'; key: string; tag: string; attrs: Record<string, string>; children: MarkdownNode[]; source?: SourceRange }
  | { kind: 'code'; key: string; code: string; language: string; highlighted?: MarkdownNode[]; source?: SourceRange }
  | { kind: 'math'; key: string; tex: string; displayMode: boolean; rendered?: MarkdownNode[]; source?: SourceRange }
  | { kind: 'mermaid'; key: string; code: string; complete: boolean; index: number; source?: SourceRange }
  | { kind: 'custom'; key: string; tag: string; props: Record<string, unknown>; attrs: Record<string, string>; children: MarkdownNode[]; source?: SourceRange }
  | { kind: 'plugin'; key: string; type: string; payload: unknown; children?: MarkdownNode[]; source?: SourceRange }
```

## Render the model yourself

```vue [NodeView.vue]
<script setup lang="ts">
import type { MarkdownNode } from 'vue-markdown-suite/headless'

defineProps<{ node: MarkdownNode }>()
</script>

<template>
  <template v-if="node.kind === 'text'">{{ node.value }}</template>
  <pre v-else-if="node.kind === 'code'"><code>{{ node.code }}</code></pre>
  <component
    :is="node.tag"
    v-else-if="node.kind === 'element'"
    v-bind="node.attrs"
  >
    <NodeView v-for="child in node.children" :key="child.key" :node="child" />
  </component>
  <span v-else>{{ node.kind }}</span>
</template>
```

```vue [App.vue]
<script setup lang="ts">
import { useMarkdownDocument } from 'vue-markdown-suite/headless'
import NodeView from './NodeView.vue'

const { document } = useMarkdownDocument(source)
</script>

<template>
  <article>
    <NodeView
      v-for="node in document?.nodes ?? []"
      :key="node.key"
      :node="node"
    />
  </article>
</template>
```

## Model helpers

```ts
import { walkNodes } from 'vue-markdown-suite/headless'

walkNodes(document.nodes, (node, parent) => {
  // Visit every node depth-first.
})
```

## TOC and active heading

```ts
import { computed } from 'vue'
import { useActiveHeading } from 'vue-markdown-suite/headless'

const activeId = useActiveHeading(
  computed(() => toc.value.map((item) => item.id)),
)
```

`useActiveHeading(ids, enabled?, options?)` creates its observer on mount and
disconnects on unmount. It is a no-op during SSR or when `enabled` is `false`.
Pass `{ root }` to scope lookups to one document root when multiple renderers
share heading IDs:

```ts
const activeId = useActiveHeading(ids, true, { root: documentElement })
```

## Status handling

- `idle` — no run yet.
- `pending` — an async run is in flight; the previous document is retained.
- `ready` — the current source produced a document.
- `error` — the run failed; the previous document is retained and diagnostics
  explain why.

## Next

- [The official pipeline](pipeline.md)
- [Plugins](plugins.md)
