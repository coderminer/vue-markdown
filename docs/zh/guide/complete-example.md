---
description: 只用公共 API 构建的完整文档门户，包含搜索、目录、frontmatter、插件、数学和静态导出。
---

# 完整示例

本页是一个可运行的文档门户，只使用公共 API。它组合了 frontmatter、GFM、搜索、目录、
自定义节点组件、数学公式和静态 HTML 导出。

可以试试搜索框、滚动目录，以及把文章导出为独立 HTML。

<ClientOnly>
  <CompleteExample locale="zh" />
</ClientOnly>

## 这个示例用了什么

| 层 | 贡献 |
| --- | --- |
| `MarkdownRenderer` | 解析、目录、事件、区域和主题 |
| `searchPlugin` | 高亮匹配项，不改变文档形状 |
| `gfmPlugin` | 表格、任务列表、删除线和脚注 |
| `frontmatterPlugin` | 把 YAML 块读入文档元数据 |
| `mathPlugin` | 行内和块级 KaTeX 渲染 |
| `nodeComponents` | 自定义引用块 callout 和链接渲染器 |
| `preset` | 共享文案和令牌 |
| `exportMarkdownHtmlSync` | 使用相同管线和策略的静态导出 |

## 组合方式

```ts
import {
  composePresets,
  defineMarkdownPlugin,
  defineMarkdownPreset,
} from 'vue-markdown-suite'
import {
  codePlugin,
  frontmatterPlugin,
  gfmPlugin,
  linkPlugin,
  searchPlugin,
  tocPlugin,
} from 'vue-markdown-suite/plugins'
import { mathPlugin } from 'vue-markdown-suite/math'

const docsPlugin = defineMarkdownPlugin({
  name: 'docs-enhancements',
  labels: { toc: '本页目录' },
  transformDocument: (document) => ({
    ...document,
    frontmatter: { ...document.frontmatter, enhanced: true },
  }),
})

const preset = composePresets(
  defineMarkdownPreset({ name: 'base', labels: { toc: '本页目录' } }),
  defineMarkdownPreset({
    name: 'accent',
    tokens: { '--vmd-color-accent': '#7c3aed' },
  }),
)

const plugins = computed(() => [
  tocPlugin,
  codePlugin,
  linkPlugin,
  searchPlugin({ query: query.value }),
  gfmPlugin,
  frontmatterPlugin,
  mathPlugin(),
  docsPlugin,
])
```

## 节点组件

```vue [Callout.vue]
<script setup lang="ts">
import type { MarkdownNode } from 'vue-markdown-suite'

defineProps<{ node?: MarkdownNode }>()
</script>

<template>
  <aside class="callout">
    <slot />
  </aside>
</template>
```

```vue [ArticleLink.vue]
<script setup lang="ts">
import type { MarkdownNode } from 'vue-markdown-suite'

defineProps<{ node?: MarkdownNode }>()
</script>

<template>
  <a class="article-link">
    <slot />
  </a>
</template>
```

```ts [App.vue]
import ArticleLink from './ArticleLink.vue'
import Callout from './Callout.vue'

const nodeComponents = {
  blockquote: Callout,
  a: ArticleLink,
}
```

函数渲染器仍然可以使用 `defaultRender()`，但这个示例保持模板优先。声明 `node` 会阻止
它被当作 DOM 属性透传；`href` 和其他安全属性会落到根元素上。

## 搜索与目录

```vue
<MarkdownRenderer
  v-model:source="source"
  :plugins="plugins"
  :preset="preset"
  :node-components="nodeComponents"
  :theme="theme"
  toc
  show-error
  @toc-change="toc = $event"
  @ready="onReady"
  @render-error="onError"
/>
```

`toc-change` 带有签名判断，侧边栏只在标题结构变化时更新。`useActiveHeading` 跟踪当前
进入视口的标题。

## 主题

在线示例通过 VitePress 的 `useData().isDark` 跟随站点外观，并把 `theme` 传给渲染器。
在你自己的应用中，可以使用 `theme` 属性或 `MarkdownConfigProvider`，再覆盖 `--vmd-*`
令牌。

## 静态导出

```ts
const html = exportMarkdownHtmlSync(source.value, {
  plugins: plugins.value,
})
```

导出应用相同的插件、净化器、URL 策略、变换和标题 ID。**导出 HTML** 按钮会下载结果。

## 下一步

- [定制](./customization.md)
- [渲染器参考](../reference/renderer.md)
- [在线演练场](../examples/playground.md)
