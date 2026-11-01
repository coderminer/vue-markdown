---
description: 服务端渲染和确定性的静态 HTML 导出。
---

# SSR 与静态导出

`@coderminer/vue-markdown` 对 SSR 安全：模块作用域不访问浏览器全局，标题 ID 确定性生成，并且
当所有插件同步时，渲染器优先使用同步路径。

## 服务端渲染

```vue [App.vue]
<script setup lang="ts">
import { MarkdownRenderer } from '@coderminer/vue-markdown'
import '@coderminer/vue-markdown/style.css'

defineProps<{ source: string }>()
</script>

<template>
  <MarkdownRenderer :source="source" />
</template>
```

```ts [server.ts]
import { createSSRApp } from 'vue'
import { renderToString } from '@vue/server-renderer'
import App from './App.vue'

const app = createSSRApp(App, { source: '# 你好' })
const html = await renderToString(app)
```

在服务端，`scrollToHeading` 是无操作，`useActiveHeading` 不会创建 observer。

## 同步与异步

- 如果配置的插件全部同步，渲染器使用 `processSync`，输出完整的静态内容。
- 如果某个插件只能异步执行，服务端会渲染 loading 区域，客户端在水合后补全文档。

保持 SSR 输出确定性：避免在插件里使用 `Date.now()`、随机 ID 或请求相关状态。

## 静态 HTML 导出

```ts
import { exportMarkdownHtml, exportMarkdownHtmlSync } from '@coderminer/vue-markdown'

const html = await exportMarkdownHtml('# 你好')
const sync = exportMarkdownHtmlSync('# 你好')
```

两个辅助函数都会运行与渲染器相同的管线和收尾流程，再用 `rehype-stringify` 字符串化
归一化文档。因此导出应用了相同的净化、元素过滤、URL 策略、`baseUrl`、
标题 ID 和插件文档变换。渲染路径从不调用 `rehype-stringify`；导出是显式的独立辅助
函数。

选项与渲染器影响解析的选项相同：

```ts
exportMarkdownHtmlSync(source, {
  plugins: [gfmPlugin],
  idPrefix: 'doc-',
  baseUrl: 'https://example.com/',
})
```

`exportMarkdownHtmlSync` 在配置的管线没有同步路径时抛错。`exportMarkdownHtml` 在运行
产生 error 级诊断时抛错，而不是返回一份不完整的文档。

插件节点会在输出中保留身份：它们序列化为 `span` 包装，带
`data-vmd-part="plugin"`、`data-plugin-type` 和 `data-plugin-key`，客户端可以据此找到
并水合它们。如果插件节点只能通过宿主组件渲染，它没有可序列化的内容，导出也无法凭空
生成。此时导出不会丢弃节点，而是写入一个带 `data-plugin-unrendered` 的空占位符。静态
HTML 必须包含内容时，请给插件节点提供子节点，或在客户端挂载组件。

## 水合

客户端和服务端必须使用相同的 source、plugins 和影响解析的选项。纯展示选项——令牌、文案、
当前标题——可以不同，不会改变文档结构。

`htmlPlugin()` 会影响解析：它加入的 `rehype-raw` 会重新解析整棵 hast。即使文档中没有原始
HTML，服务端和客户端也必须同样包含或同样省略它。

## 下一步

- [官方管线](./pipeline.md)
- [安全](./security.md)
