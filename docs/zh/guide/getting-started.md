---
description: 在 Vue 3 中安装 vue-markdown-suite，并渲染第一份 Markdown 文档。
---

# 快速开始

`vue-markdown-suite` 通过官方 `unified` 管线把 Markdown 直接渲染成 Vue VNode。
它同时提供带样式的渲染器、无头文档 API、类型化插件，以及可选的代码、数学和图表引擎。

## 环境要求

- Node.js 20 或更高版本
- Vue 3.5 或更高版本
- 基于 Vite 的构建，或任何支持标准 ESM 的打包器

## 安装

::: code-group

```bash [npm]
npm install vue-markdown-suite
```

```bash [pnpm]
pnpm add vue-markdown-suite
```

```bash [yarn]
yarn add vue-markdown-suite
```

```bash [bun]
bun add vue-markdown-suite
```

:::

可选引擎是 peer 依赖，只安装你实际用到的部分：

::: code-group

```bash [highlight.js]
npm install highlight.js
```

```bash [Shiki]
npm install shiki
```

```bash [KaTeX]
npm install katex
```

```bash [Mermaid]
npm install mermaid
```

```bash [原始 HTML]
npm install rehype-raw
```

:::

Mermaid 可视化编辑器还需要 CodeMirror：

```bash
npm install @codemirror/state @codemirror/view @codemirror/language @codemirror/commands
```

原始 HTML 只在从 `vue-markdown-suite/html` 导入 `htmlPlugin()` 时需要 `rehype-raw`。

## 渲染第一份文档

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { MarkdownRenderer } from 'vue-markdown-suite'
import 'vue-markdown-suite/style.css'

const source = ref(`
# 你好，Markdown

一段带 **加粗** 和 [链接](https://example.com) 的文字。

- Vue 组件
- 默认安全
- 支持 SSR
`)
</script>

<template>
  <MarkdownRenderer v-model:source="source" toc />
</template>
```

配置到此结束。样式表是可选的：不引入时，标记仍然是语义化、可访问的，所有行为也都
正常。

## 各部分如何协作

```text
Markdown 源码
  → 插件 transformSource
  → remark-parse
  → remark 插件
  → remark-rehype
  → 可选的 htmlPlugin() + 净化器
  → rehype 插件
  → 归一化文档模型
  → Vue VNode
```

公共文档模型是纯数据、可序列化，不包含 Vue、DOM、mdast、hast 或 processor 对象。
因此同一次解析可以同时驱动渲染器、无头宿主和静态 HTML 导出。

## 选择你的路径

| 我想…… | 去看 |
| --- | --- |
| 用默认组件渲染 Markdown | [基础用法](./basic-usage.md) |
| 替换标签、节点、主题或 CSS | [定制](./customization.md) |
| 加入 GFM、数学、高亮或 Mermaid | [进阶用法](./advanced-usage.md) |
| 搭一个完整的文档门户 | [完整示例](./complete-example.md) |
| 完全接管标记输出 | [无头渲染](./headless.md) |
| 查询每个属性和事件 | [渲染器参考](../reference/renderer.md) |

## 下一步

- [基础用法](./basic-usage.md)
- [定制](./customization.md)
- [完整示例](./complete-example.md)
