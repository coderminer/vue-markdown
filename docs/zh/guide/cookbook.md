---
description: 常见 Markdown 渲染任务的复制粘贴配方。
---

# 定制手册

每个配方都只使用已发布的入口。

## 替换目录

```vue
<MarkdownRenderer :source="source" toc>
  <template #toc="{ items, activeId, navigate }">
    <nav aria-label="目录">
      <button
        v-for="item in items"
        :key="item.id"
        :aria-current="item.id === activeId ? 'location' : undefined"
        @click="navigate(item.id)"
      >{{ item.text }}</button>
    </nav>
  </template>
</MarkdownRenderer>
```

## 重写代码操作区

```vue
<MarkdownRenderer :source="source">
  <template #code-actions="{ source: code, language, actions }">
    <button type="button" @click="actions.copy">{{ language }}</button>
    <button type="button" @click="actions.download">下载</button>
  </template>
</MarkdownRenderer>
```

## 切换到 Shiki

```ts
import { shiki } from '@coderminer/vue-markdown/highlight/shiki'
```

```vue
<MarkdownRenderer :source="source" :highlighter="shiki" />
```

## 启用数学

```ts
import { defaultPlugins } from '@coderminer/vue-markdown/plugins'
import { mathPlugin } from '@coderminer/vue-markdown/math'
import '@coderminer/vue-markdown/styles/math-full.css'

const plugins = [...defaultPlugins, mathPlugin()]
```

## 添加 Mermaid

```vue
<script setup lang="ts">
import { MarkdownRenderer } from '@coderminer/vue-markdown'
import { defaultPlugins } from '@coderminer/vue-markdown/plugins'
import { mermaidPlugin } from '@coderminer/vue-markdown/mermaid'

const plugins = [...defaultPlugins, mermaidPlugin()]
</script>

<template>
  <MarkdownRenderer :source="source" :plugins="plugins" />
</template>
```

Mermaid 围栏现在会渲染成图表。独立图表可以从 `@coderminer/vue-markdown` 引入
`MermaidBlock`，直接传 `source`。

## 提供自定义管线

```ts
import type { MarkdownPipeline } from '@coderminer/vue-markdown'
import { createOfficialPipeline } from '@coderminer/vue-markdown/pipeline'

const official = createOfficialPipeline()

const pipeline: MarkdownPipeline = {
  name: 'my-pipeline',
  process: (source, ctx) => official.process(source, ctx),
  processSync: (source, ctx) => official.processSync!(source, ctx),
}
```

## 装饰链接

```vue [DecoratedLink.vue]
<script setup lang="ts">
import type { MarkdownNode } from '@coderminer/vue-markdown'

defineOptions({ inheritAttrs: false })
defineProps<{ node?: MarkdownNode }>()
</script>

<template>
  <span class="decorated-link">
    <a v-bind="$attrs"><slot /></a> ↗
  </span>
</template>
```

```vue [App.vue]
<script setup lang="ts">
import { MarkdownRenderer } from '@coderminer/vue-markdown'
import DecoratedLink from './DecoratedLink.vue'

const nodeComponents = { a: DecoratedLink }
</script>

<template>
  <MarkdownRenderer :source="source" :node-components="nodeComponents" />
</template>
```

## 添加插件

```ts
import { defineMarkdownPlugin } from '@coderminer/vue-markdown/plugins'

const stamp = defineMarkdownPlugin({
  name: 'stamp',
  transformDocument(document) {
    return document
  },
})
```

## Provider 与预设

```vue
<MarkdownConfigProvider :preset="brand" theme="auto">
  <MarkdownRenderer :source="source" />
</MarkdownConfigProvider>
```

局部属性仍然优先于 Provider、预设、插件和内置默认值。

## 下一步

- [定制](./customization.md)
- [富组件](./rich-components.md)
