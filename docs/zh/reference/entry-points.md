---
description: 公共包入口、可选引擎和 CSS 分层。
---

# 入口

包暴露多个小入口，让没有用到的可选引擎和预设组件不进入打包结果。完整导出索引见
[公共 API](./api.md)。

| 入口 | 内容 |
| --- | --- |
| `vue-markdown-suite` | 渲染器、预设组件、组合式函数、内核辅助和导出辅助 |
| `vue-markdown-suite/headless` | 类型、模型辅助、组合式函数；不含预设组件和 CSS |
| `vue-markdown-suite/pipeline` | 官方管线、自定义管线校验、身份辅助 |
| `vue-markdown-suite/plugins` | `defineMarkdownPlugin`、注册表、内置插件 |
| `vue-markdown-suite/presets` | `defineMarkdownPreset`、`composePresets`、配置类型 |
| `vue-markdown-suite/node-components` | 仅节点组件目录 |
| `vue-markdown-suite/highlight` | highlight.js 适配器和归一化辅助 |
| `vue-markdown-suite/highlight/shiki` | 可选的 Shiki 适配器 |
| `vue-markdown-suite/math` | `mathPlugin`、`katexEngine`、数学类型 |
| `vue-markdown-suite/mermaid` | `mermaidPlugin`、按需加载的 Mermaid 运行时和 SVG 净化器 |
| `vue-markdown-suite/editor` | 按需加载的 CodeMirror 集成 |
| `vue-markdown-suite/html` | `htmlPlugin()`，用于净化后的原始 HTML |
| `vue-markdown-suite/components/*` | 每个公共组件一个入口 |
| `vue-markdown-suite/style.css` | 完整可选样式表 |
| `vue-markdown-suite/styles/tokens.css` | 仅设计令牌 |
| `vue-markdown-suite/styles/components.css` | 基于部件的组件样式 |
| `vue-markdown-suite/styles/math.css` | 数学容器样式；需另行引入 KaTeX CSS |
| `vue-markdown-suite/styles/math-full.css` | KaTeX CSS 加套件的数学容器样式 |

## 示例

```ts
// 渲染器与辅助函数
import { MarkdownRenderer, exportMarkdownHtmlSync } from 'vue-markdown-suite'

// 无头文档 API
import { useMarkdownDocument, walkNodes } from 'vue-markdown-suite/headless'

// 插件编写
import { defineMarkdownPlugin, gfmPlugin } from 'vue-markdown-suite/plugins'

// 可选引擎
import { shiki } from 'vue-markdown-suite/highlight/shiki'
import { mathPlugin } from 'vue-markdown-suite/math'
import { mermaidPlugin, renderMermaid } from 'vue-markdown-suite/mermaid'
import { htmlPlugin } from 'vue-markdown-suite/html'
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
- HTML 解析器只在导入 `vue-markdown-suite/html` 时加载。
- 内核无 DOM、无 Vue；Vue 适配层单向依赖它。

## 样式

```ts
import 'vue-markdown-suite/style.css'
```

`style.css` 导入令牌和组件样式。请在你的覆盖之前加载。样式表是可选的；无样式用法保持
相同的行为和可访问性。

## 下一步

- [文档模型](./document-model.md)
- [适配器](./adapters.md)
- [SSR 与静态导出](../guide/ssr.md)
