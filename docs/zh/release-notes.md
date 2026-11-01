---
description: '@coderminer/vue-markdown 1.0 发布说明与升级指南。'
---

# 发布说明

## 1.0.0 — 2026-11-01

`@coderminer/vue-markdown` 首个稳定版本。

### 亮点

- 通过 `unified`、`remark-parse` 和 `remark-rehype` 进行 Vue 原生 Markdown
  渲染，没有 HTML 字符串往返，也不使用 `v-html`。
- 可序列化文档模型同时服务于渲染器、无头组合式函数和静态 HTML 导出。
- 支持标签组件、节点组件、函数渲染器、区域、具名插槽、文案、令牌、预设和可检查清单。
- 支持目录生成与位置、搜索、自定义标签、GFM、frontmatter、脚注、任务项、过滤、URL
  策略和静态导出。
- 可选的 highlight.js / Shiki 高亮、`CodeBlock`、`VueSyntaxHighlighter`、KaTeX
  数学、Mermaid 渲染和 CodeMirror Mermaid 编辑器，均位于独立入口或按需分块。
- 通过 `@coderminer/vue-markdown/html` 启用净化后的原始 HTML。

### 升级说明

#### 原始 HTML

`skipHtml` 已移除。原始 HTML 默认丢弃，需要显式启用：

```ts
import { htmlPlugin } from '@coderminer/vue-markdown/html'

const plugins = [...defaultPlugins, htmlPlugin()]
```

使用时安装可选解析器：

```bash
npm install rehype-raw
```

#### 错误区域默认值

`showError` 现在默认 `true`。如果需要旧行为：

```vue
<MarkdownRenderer :source="source" :show-error="false" />
```

#### 渲染器结构

渲染器新增 `[data-vmd-part="body"]` 和 `[data-vmd-part="toc-column"]` 包装层。
宿主 CSS 应使用稳定部件，而不是直接子元素结构：

```css
[data-vmd-part='content'] {
  /* 内容 */
}

[data-vmd-part='toc-column'] {
  /* 目录布局列 */
}
```

#### 搜索

渲染器支持 `search` 和 `searchCaseSensitive`；`search-change` 报告
`{ query, caseSensitive, matches }`。该事件反映当前实际渲染的文档，等待中或失败的
运行不会报告旧匹配数。空查询挂载时不会发事件。搜索会参与解析 memo key，大文档的即时
搜索建议防抖。

#### Mermaid 编辑器

`MermaidLiveEditor` 现在提供 `toolbar`、`editor`、`preview`、
`editor-diagnostics`、`empty` 和 `fullscreen` 插槽，以及 `rawDetails` 和
`autoFocus`。空 `editor` 插槽会回退到 CodeMirror；多个全屏编辑器退出或卸载时会恢复
共享的页面滚动状态。

### 完整变更

完整历史见
[CHANGELOG.md](https://github.com/coderminer/vue-markdown/blob/main/CHANGELOG.md)。
