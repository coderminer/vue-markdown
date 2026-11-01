---
description: 公共包入口、可选引擎和 CSS 分层。
---

# 入口

包暴露多个小入口，让没有用到的可选引擎和预设组件不进入打包结果。完整导出索引见
[公共 API](./api.md)。

| 入口 | 内容 |
| --- | --- |
| `@coderminer/vue-markdown` | 渲染器、预设组件、组合式函数、内核辅助和导出辅助 |
| `@coderminer/vue-markdown/headless` | 类型、模型辅助、组合式函数；不含预设组件和 CSS |
| `@coderminer/vue-markdown/pipeline` | 官方管线、自定义管线校验、身份辅助 |
| `@coderminer/vue-markdown/plugins` | `defineMarkdownPlugin`、注册表、内置插件 |
| `@coderminer/vue-markdown/presets` | `defineMarkdownPreset`、`composePresets`、配置类型 |
| `@coderminer/vue-markdown/node-components` | 仅节点组件目录 |
| `@coderminer/vue-markdown/highlight` | highlight.js 适配器和归一化辅助 |
| `@coderminer/vue-markdown/highlight/shiki` | 可选的 Shiki 适配器 |
| `@coderminer/vue-markdown/math` | `mathPlugin`、`katexEngine`、数学类型 |
| `@coderminer/vue-markdown/mermaid` | `mermaidPlugin`、按需加载的 Mermaid 运行时和 SVG 净化器 |
| `@coderminer/vue-markdown/editor` | 按需加载的 CodeMirror 集成 |
| `@coderminer/vue-markdown/html` | `htmlPlugin()`，用于净化后的原始 HTML |
| `@coderminer/vue-markdown/components/*` | 每个公共组件一个入口 |
| `@coderminer/vue-markdown/style.css` | 完整可选样式表 |
| `@coderminer/vue-markdown/styles/tokens.css` | 仅设计令牌 |
| `@coderminer/vue-markdown/styles/components.css` | 基于部件的组件样式 |
| `@coderminer/vue-markdown/styles/math.css` | 数学容器样式；需另行引入 KaTeX CSS |
| `@coderminer/vue-markdown/styles/math-full.css` | KaTeX CSS 加套件的数学容器样式 |

## 示例

```ts
// 渲染器与辅助函数
import { MarkdownRenderer, exportMarkdownHtmlSync } from '@coderminer/vue-markdown'

// 无头文档 API
import { useMarkdownDocument, walkNodes } from '@coderminer/vue-markdown/headless'

// 插件编写
import { defineMarkdownPlugin, gfmPlugin } from '@coderminer/vue-markdown/plugins'

// 可选引擎
import { shiki } from '@coderminer/vue-markdown/highlight/shiki'
import { mathPlugin } from '@coderminer/vue-markdown/math'
import { mermaidPlugin, renderMermaid } from '@coderminer/vue-markdown/mermaid'
import { htmlPlugin } from '@coderminer/vue-markdown/html'
```

## 打包边界

::: warning 保持引擎可选
无头、管线和插件入口不得导入 highlight.js、Shiki、KaTeX、Mermaid、CodeMirror 或
`rehype-raw`。可选引擎只能位于自己的入口或动态分块中。
:::

- 没有代码的文档不会加载高亮器。
- 没有数学的文档不会加载 KaTeX。
- Mermaid 只在 Mermaid 组件渲染时加载。
- Mermaid 编辑器只在挂载时加载 CodeMirror。
- HTML 解析器只在导入 `@coderminer/vue-markdown/html` 时加载。
- 内核无 DOM、无 Vue；Vue 适配层单向依赖它。

## 样式

```ts
import '@coderminer/vue-markdown/style.css'
```

`style.css` 导入令牌和组件样式。请在你的覆盖之前加载。样式表是可选的；无样式用法保持
相同的行为和可访问性。

## 下一步

- [文档模型](./document-model.md)
- [适配器](./adapters.md)
- [SSR 与静态导出](../guide/ssr.md)
