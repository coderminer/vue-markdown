---
description: 编辑 Markdown 并检查真实渲染器的输出，包括 GFM 和数学公式。
---

# 在线演练场

演练场使用真实渲染器，以及你在应用中会导入的同一批公共入口。默认的「全部元素」示例
覆盖标题、段落、强调、链接、图片、列表、任务列表、引用、表格、代码、数学、Mermaid、
脚注、原始 HTML、换行和分隔线。

<ClientOnly>
  <LivePlayground locale="zh" />
</ClientOnly>

## 可以试什么

- 在「全部元素」「基础」「GFM」「数学」之间切换。
- 编辑任意示例，观察预览实时更新。
- 添加一个标题，观察目录更新。
- 切到「GFM」查看表格、任务列表和脚注。
- 切到「数学」查看行内和块级 KaTeX。
- 在「全部元素」里查看 Mermaid 块的默认头部、标签和图标操作。
- 在[定制](../guide/customization.md)页的实验室里替换段落和引用块，观察 callout。

## 背后的组件

```vue
<script setup lang="ts">
import { computed, ref } from 'vue'
import { MarkdownRenderer } from '@coderminer/vue-markdown'
import { fullPlugins } from '@coderminer/vue-markdown/plugins'
import { mathPlugin } from '@coderminer/vue-markdown/math'
import { mermaidPlugin } from '@coderminer/vue-markdown/mermaid'
import { htmlPlugin } from '@coderminer/vue-markdown/html'

const source = ref(samples['全部元素'])
const theme = computed(() => (isDark.value ? 'dark' : 'light'))
const plugins = [...fullPlugins, mathPlugin(), mermaidPlugin(), htmlPlugin()]
</script>

<template>
  <MarkdownRenderer
    v-model:source="source"
    :plugins="plugins"
    :theme="theme"
    toc
    show-error
  />
</template>
```

演示组件的界面文案支持 `locale="zh"`，示例内容也已本地化。

## 下一步

- [完整示例](../guide/complete-example.md)
- [基础用法](../guide/basic-usage.md)
- [定制](../guide/customization.md)
