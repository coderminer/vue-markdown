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
`externalLinkTarget`, `baseUrl`, `idPrefix`, `skipHtml`.

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

```vue
<script setup lang="ts">
import { defineComponent, h } from 'vue'
import { useMarkdownDocument, type MarkdownNode } from 'vue-markdown-suite/headless'

const { document } = useMarkdownDocument(source)

function render(node: MarkdownNode) {
  if (node.kind === 'text') return node.value
  if (node.kind === 'code') return h('pre', [h('code', node.code)])
  if (node.kind === 'element') {
    return h(
      node.tag,
      node.attrs,
      node.children.map((child) => h(NodeView, { node: child, key: child.key })),
    )
  }
  return h('span', { 'data-kind': node.kind }, node.kind)
}

const NodeView = defineComponent({
  props: { node: { type: Object as () => MarkdownNode, required: true } },
  setup(props) {
    return () => render(props.node)
  },
})
</script>

<template>
  <article>
    <NodeView v-for="node in document?.nodes ?? []" :key="node.key" :node="node" />
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

`useActiveHeading(ids, enabled?)` creates its observer on mount and disconnects
on unmount. It is a no-op during SSR or when `enabled` is `false`.

## Status handling

- `idle` — no run yet.
- `pending` — an async run is in flight; the previous document is retained.
- `ready` — the current source produced a document.
- `error` — the run failed; the previous document is retained and diagnostics
  explain why.

## Next

- [The official pipeline](pipeline.md)
- [Plugins](plugins.md)
