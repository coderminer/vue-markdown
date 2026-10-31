---
description: The serializable document model, useMarkdownDocument, search segments, and helper APIs.
---

# Document model

The public model is plain, serializable data. It contains no Vue, DOM, mdast,
hast, or processor objects.

## Shape

```ts
interface MarkdownDocument {
  nodes: MarkdownNode[]
  toc: TocItem[]
  customTags: CustomTagInstance[]
  frontmatter?: Record<string, unknown>
  plugins: string[]
  pipeline: string
}

interface TocItem {
  id: string
  text: string
  level: number
}

type MarkdownNode =
  | { kind: 'text'; key: string; value: string; segments?: MarkdownTextSegment[]; source?: SourceRange }
  | { kind: 'element'; key: string; tag: string; attrs: Record<string, string>; children: MarkdownNode[]; source?: SourceRange }
  | { kind: 'code'; key: string; code: string; language: string; highlighted?: MarkdownNode[]; source?: SourceRange }
  | { kind: 'math'; key: string; tex: string; displayMode: boolean; rendered?: MarkdownNode[]; source?: SourceRange }
  | { kind: 'mermaid'; key: string; code: string; complete: boolean; index: number; source?: SourceRange }
  | { kind: 'custom'; key: string; tag: string; props: Record<string, unknown>; attrs: Record<string, string>; children: MarkdownNode[]; source?: SourceRange }
  | { kind: 'plugin'; key: string; type: string; payload: unknown; children?: MarkdownNode[]; source?: SourceRange }
```

## Composable

```ts
import { computed, ref } from 'vue'
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

`source` accepts `MaybeRefOrGetter<string>`. `options` accepts the parse-affecting
subset of renderer props: `components`, `plugins`, `disablePlugins`,
`remarkPlugins`, `rehypePlugins`, `remarkRehypeOptions`, `pipeline`, `slugger`,
`allowedElements`, `disallowedElements`, `unwrapDisallowed`, `allowElement`,
`urlTransform`, `baseUrl`, `idPrefix`, and `skipHtml`.

The composable also exposes plugin contributions:

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

## Render the model yourself

```vue
<script setup lang="ts">
import { defineComponent, h } from 'vue'
import {
  useMarkdownDocument,
  type MarkdownNode,
} from 'vue-markdown-suite/headless'

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

## Status

| Status | Meaning |
| --- | --- |
| `idle` | No run yet |
| `pending` | An async run is in flight; the previous document is retained |
| `ready` | The current source produced a document |
| `error` | The run failed; the previous document is retained and diagnostics explain why |

## Helpers

```ts
import {
  countSearchMatches,
  defaultUrlTransform,
  walkNodes,
} from 'vue-markdown-suite/headless'

walkNodes(document.value?.nodes ?? [], (node, parent) => {
  // Visit every node depth-first.
})
```

| Helper | Purpose |
| --- | --- |
| `walkNodes` | Depth-first traversal |
| `countSearchMatches` | Count highlighted text segments |
| `defaultUrlTransform` | The package URL policy |
| `createDiagnostic` | Build a normalized diagnostic |
| `getComponentManifest` | Read a component manifest |
| `exportMarkdownHtml` | Async static HTML export |
| `exportMarkdownHtmlSync` | Sync static HTML export |

## Next

- [Headless rendering](../guide/headless.md)
- [Renderer reference](./renderer.md)
- [Adapters](./adapters.md)
