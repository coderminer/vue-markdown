---
description: 使用 useMarkdownDocument、可序列化模型和自定义标记。
---

# 无头渲染

无头入口暴露文档模型和组合式函数，不包含预设组件或 CSS。

```ts
import {
  useActiveHeading,
  useMarkdownDocument,
  walkNodes,
} from '@coderminer/vue-markdown/headless'
```

## 组合式函数

```ts
import { ref } from 'vue'
import { useMarkdownDocument } from '@coderminer/vue-markdown/headless'

const source = ref('# 你好\n\n一段 **加粗** 文字。')
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

`source` 接受 `MaybeRefOrGetter<string>`。`options` 接受渲染器属性中影响解析的子集：
`components`、`plugins`、`disablePlugins`、`remarkPlugins`、`rehypePlugins`、
`remarkRehypeOptions`、`pipeline`、`slugger`、`allowedElements`、
`disallowedElements`、`unwrapDisallowed`、`allowElement`、`urlTransform`、
`linkTarget`、`externalLinkTarget`、`baseUrl`、`idPrefix`、`search`。

组合式函数还会暴露插件贡献，方便自己渲染标记的宿主：

```ts
const {
  resolvedComponents,
  resolvedNodeComponents,
  resolvedRegions,
  resolvedLabels,
  resolvedTokens,
} = useMarkdownDocument(source)
```

局部覆盖应当优先于这些值。

## 文档模型

模型是纯数据、可序列化，不包含 Vue、DOM、mdast、hast 或 processor 对象。

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
  | { kind: 'text'; key: string; value: string; segments?: MarkdownTextSegment[]; source?: SourceRange }
  | { kind: 'element'; key: string; tag: string; attrs: Record<string, string>; children: MarkdownNode[]; source?: SourceRange }
  | { kind: 'code'; key: string; code: string; language: string; highlighted?: MarkdownNode[]; source?: SourceRange }
  | { kind: 'math'; key: string; tex: string; displayMode: boolean; rendered?: MarkdownNode[]; source?: SourceRange }
  | { kind: 'mermaid'; key: string; code: string; complete: boolean; index: number; source?: SourceRange }
  | { kind: 'custom'; key: string; tag: string; props: Record<string, unknown>; attrs: Record<string, string>; children: MarkdownNode[]; source?: SourceRange }
  | { kind: 'plugin'; key: string; type: string; payload: unknown; children?: MarkdownNode[]; source?: SourceRange }
```

## 自己渲染模型

```vue [NodeView.vue]
<script setup lang="ts">
import type { MarkdownNode } from '@coderminer/vue-markdown/headless'

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
import { useMarkdownDocument } from '@coderminer/vue-markdown/headless'
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

## 模型辅助函数

```ts
import { walkNodes } from '@coderminer/vue-markdown/headless'

walkNodes(document.value?.nodes ?? [], (node, parent) => {
  // 深度优先访问每个节点。
})
```

## 目录与当前标题

```ts
import { computed } from 'vue'
import { useActiveHeading } from '@coderminer/vue-markdown/headless'

const activeId = useActiveHeading(
  computed(() => toc.value.map((item) => item.id)),
)
```

`useActiveHeading(ids, enabled?, options?)` 在挂载时创建 observer，卸载时断开。在 SSR
或 `enabled` 为 `false` 时不做任何事。多个渲染器共享标题 ID 时，传入 `{ root }` 把查找
限定到一个文档根：

```ts
const activeId = useActiveHeading(ids, true, { root: documentElement })
```

## 状态处理

- `idle` —— 还没有运行。
- `pending` —— 异步运行进行中，保留上一份文档。
- `ready` —— 当前源码成功生成了文档。
- `error` —— 运行失败，保留上一份文档，诊断信息说明原因。

## 下一步

- [官方管线](./pipeline.md)
- [插件](./plugins.md)
