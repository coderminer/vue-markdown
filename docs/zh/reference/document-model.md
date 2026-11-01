---
description: 可序列化文档模型、useMarkdownDocument、搜索片段和辅助 API。
---

# 文档模型

公共模型是纯数据、可序列化，不包含 Vue、DOM、mdast、hast 或 processor 对象。

## 形状

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

## 组合式函数

```ts
import { computed, ref } from 'vue'
import { useMarkdownDocument } from 'vue-markdown-suite/headless'

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
`disallowedElements`、`unwrapDisallowed`、`allowElement`、`urlTransform`、`baseUrl`、
`idPrefix`。

组合式函数还会暴露插件贡献：

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

## 自己渲染模型

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

## 状态

| 状态 | 含义 |
| --- | --- |
| `idle` | 还没有运行 |
| `pending` | 异步运行进行中，保留上一份文档 |
| `ready` | 当前源码成功生成文档 |
| `error` | 运行失败，保留上一份文档，诊断信息说明原因 |

## 辅助函数

```ts
import {
  countSearchMatches,
  defaultUrlTransform,
  walkNodes,
} from 'vue-markdown-suite/headless'

walkNodes(document.value?.nodes ?? [], (node, parent) => {
  // 深度优先访问每个节点。
})
```

| 辅助函数 | 作用 |
| --- | --- |
| `walkNodes` | 深度优先遍历 |
| `countSearchMatches` | 统计高亮文本片段 |
| `defaultUrlTransform` | 包的 URL 策略 |
| `createDiagnostic` | 构建归一化诊断 |
| `getComponentManifest` | 读取组件清单 |
| `exportMarkdownHtml` | 异步静态 HTML 导出 |
| `exportMarkdownHtmlSync` | 同步静态 HTML 导出 |

## 下一步

- [无头渲染](../guide/headless.md)
- [渲染器参考](./renderer.md)
- [适配器](./adapters.md)
