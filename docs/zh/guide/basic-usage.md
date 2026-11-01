---
description: 渲染器的输入方式、样式、事件、插槽和实例方法。
---

# 基础用法

渲染器接受三种输入：`source` 属性、`v-model:source` 双向绑定，或默认插槽。它把文档
模型渲染成 Vue 组件，并向外提供目录、链接、任务项和诊断相关事件。

## 输入

::: code-group

```vue [属性]
<MarkdownRenderer source="# 来自属性" />
```

```vue [双向绑定]
<MarkdownRenderer v-model:source="source" />
```

```vue [默认插槽]
<MarkdownRenderer># 来自插槽</MarkdownRenderer>
```

:::

`source` 是受控值，优先级高于插槽。插槽只接受纯文本，其文本内容变化后会被重新读取。
传入非字符串的 `source` 会产生一条诊断信息并渲染空状态，而不是抛错。

::: tip 插槽文本的响应性
插槽适合简单的静态内容。对于编辑器或任何频繁变化的来源，请绑定 `source`，让父组件
持有该值。
:::

## 在线试一试

<ClientOnly>
  <LivePlayground locale="zh" />
</ClientOnly>

## 样式

可以引入完整样式表、只引入令牌，或者完全不引入：

::: code-group

```ts [完整样式表]
import 'vue-markdown-suite/style.css'
```

```ts [令牌 + 组件样式]
import 'vue-markdown-suite/styles/tokens.css'
import 'vue-markdown-suite/styles/components.css'
```

```ts [无样式]
// 不引入任何样式表。
```

:::

在任意祖先元素上覆盖令牌，或通过 `tokens` 属性传入：

```vue
<MarkdownRenderer
  :source="source"
  theme="auto"
  :tokens="{ '--vmd-color-accent': '#7c3aed' }"
/>
```

每个视觉部件都有稳定类名和 `data-vmd-part` 属性：

```css
[data-vmd-part='heading'] {
  letter-spacing: -0.01em;
}

[data-vmd-part='code'] {
  --vmd-code-bg: #0d1117;
  color: #e6edf3;
}
```

完整的令牌与部件范围见[样式与主题](./styling.md)。

## 目录

```vue
<MarkdownRenderer :source="source" toc />
```

目录渲染为带可访问标签的 `nav`，用 `aria-current` 标记当前项，标题 ID 由确定性算法
生成。`tocDepth` 控制目录包含到哪一级标题：`0` 表示全部层级，`1`–`6` 表示最大层级。
例如 `:toc-depth="3"` 只包含 `h1`–`h3`。

替换 `h1`–`h6` 后，锚点行为由替换后的组件自行负责。

## 事件

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { MarkdownRenderer } from 'vue-markdown-suite'
import type { MarkdownDiagnostic, TocItem } from 'vue-markdown-suite'

const renderer = ref<InstanceType<typeof MarkdownRenderer>>()

function onToc(toc: TocItem[]) {
  console.log('标题', toc)
}

function onError(diagnostic: MarkdownDiagnostic) {
  console.warn(diagnostic.code, diagnostic.message)
}
</script>

<template>
  <MarkdownRenderer
    ref="renderer"
    :source="source"
    toc
    @toc-change="onToc"
    @link-click="onLink"
    @task-change="onTask"
    @render-error="onError"
    @ready="onReady"
  />
</template>
```

| 事件 | 负载 |
| --- | --- |
| `update:source` | `source: string` |
| `toc-change` | `TocItem[]` |
| `link-click` | `{ url, target, node, event }` |
| `custom-tag-click` | `{ tag, props, node, event }` |
| `task-change` | `{ checked, node }` |
| `render-error` | `MarkdownDiagnostic` |
| `ready` | `MarkdownDocument` |

`toc-change` 带有签名判断：只有序列化后的目录真正变化时才会触发。`ready` 在第一次成功
生成文档时触发一次。

## 实例方法

```ts
renderer.value?.scrollToHeading('install')
renderer.value?.getToc()
renderer.value?.getDocument()
await renderer.value?.refresh()
renderer.value?.updateSource('# 新的源码')
```

| 方法 | 签名 |
| --- | --- |
| `scrollToHeading` | `(id: string, options?: ScrollIntoViewOptions) => void` |
| `getDocument` | `() => MarkdownDocument \| undefined` |
| `getToc` | `() => TocItem[]` |
| `refresh` | `() => Promise<void>` |
| `updateSource` | `(source: string) => void` |

## 插槽

具名区域插槽会完全替换对应区域的默认渲染：

```vue
<MarkdownRenderer :source="source" toc>
  <template #toc="{ items, activeId, navigate }">
    <nav class="my-toc">
      <a
        v-for="item in items"
        :key="item.id"
        :href="`#${item.id}`"
        :aria-current="item.id === activeId ? 'location' : undefined"
        @click.prevent="navigate(item.id)"
      >
        {{ item.text }}
      </a>
    </nav>
  </template>
</MarkdownRenderer>
```

可用插槽：`root`、`toc`、`toc-item`、`content`、`error`、`empty`、`loading`。代码、
数学、Mermaid 和编辑器组件还各自提供专属插槽，见[组件](../reference/components.md)。

## 下一步

- [进阶用法](./advanced-usage.md)
- [定制](./customization.md)
- [渲染器参考](../reference/renderer.md)
