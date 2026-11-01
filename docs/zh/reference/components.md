---
description: 公共组件、区域、富节点，以及组件清单注册表。
---

# 组件

所有组件都从 `@coderminer/vue-markdown` 导出，也可以从 `@coderminer/vue-markdown/components/*`
单独引入。完整导出索引见[公共 API](./api.md)。

## 渲染器与区域

| 组件 | 作用 |
| --- | --- |
| `MarkdownRenderer` | 带解析、目录、事件和插槽的预设渲染器 |
| `MarkdownConfigProvider` | 主题、令牌、文案、组件和适配器的应用级默认值 |
| `MarkdownRoot` | 应用主题和令牌的根外壳 |
| `MarkdownContent` | 内容容器 |
| `MarkdownToc` | 面向 `TocItem[]` 的带标签导航 |
| `MarkdownTocItem` | 单个目录项 |
| `MarkdownError` | 带重试的错误区域 |
| `MarkdownEmpty` | 空状态 |
| `MarkdownLoading` | 等待状态 |

## 核心目录

| 组件 | 节点 |
| --- | --- |
| `MarkdownParagraph` | `p` |
| `MarkdownHeading` | 带确定性 ID 和锚点的 `h1`–`h6` |
| `MarkdownEmphasis` | `em` |
| `MarkdownStrong` | `strong` |
| `MarkdownStrikethrough` | `del` |
| `MarkdownLink` | 带目标策略和点击事件的 `a` |
| `MarkdownImage` | 带 alt 回退的 `img` |
| `MarkdownList` | `ul` / `ol` |
| `MarkdownListItem` | `li` |
| `MarkdownBlockquote` | `blockquote` |
| `MarkdownHorizontalRule` | `hr` |
| `MarkdownTable` | `table` |
| `MarkdownTableSection` | `thead` / `tbody` |
| `MarkdownTableRow` | `tr` |
| `MarkdownTableCell` | `th` / `td` |
| `MarkdownInlineCode` | 行内 `code` |
| `MarkdownCode` | 围栏代码包装 |
| `MarkdownBreak` | `br` |
| `MarkdownHtml` | 转义的宿主文本；不是原始 HTML 渲染路径 |
| `MarkdownCustomTag` | 插件/自定义标签节点 |
| `MarkdownTaskItem` | GFM 任务项和复选框 |
| `MarkdownFootnoteReference` | 脚注引用 |
| `MarkdownFootnotes` | 脚注区域 |
| `MarkdownMath` | 带插槽的数学节点 |
| `MarkdownMermaid` | Mermaid 节点包装 |
| `MarkdownChildren` | 区域使用的内部递归渲染器 |

## 富组件

| 组件 | 入口 | 作用 |
| --- | --- | --- |
| `CodeBlock` | 默认 | 代码头部、语言、复制/下载、按需高亮 |
| `VueSyntaxHighlighter` | 默认 | 带行号的独立高亮片段 |
| `MermaidBlock` | 默认 | 预览/源码标签、缩放、全屏、复制、SVG/PNG 导出 |
| `MermaidLiveEditor` | 默认 | 基于 CodeMirror 的 Mermaid 编辑器 |

可选引擎位于各自入口：

```ts
import { highlightjs } from '@coderminer/vue-markdown/highlight'
import { shiki } from '@coderminer/vue-markdown/highlight/shiki'
import { katexEngine, mathPlugin } from '@coderminer/vue-markdown/math'
import {
  mermaidPlugin,
  renderMermaid,
  sanitizeSvg,
} from '@coderminer/vue-markdown/mermaid'
import { createMermaidEditor } from '@coderminer/vue-markdown/editor'
```

`MarkdownMermaid` 把 `renderer`、`theme`、`showErrors`、`enableZoom`、`allowFullscreen`
和 `compact` 转发给 `MermaidBlock`。`MarkdownMath` 接受独立的 `mathEngine` 属性。
`MarkdownRenderer` 暴露 `MarkdownRendererInstance` 类型。

独立用法见[富组件](../guide/rich-components.md)。

## 组件属性

标签组件会收到归一化后的 `node` 以及解析后的属性。渲染后的子节点通过默认插槽传入。
只有当组件声明了 `children` 时，才会把原始子节点作为 `children` 属性传入；这样可以避免
Vue 把 `children` 泄漏成元素属性。`defineAsyncComponent` 包装器不会暴露被解析组件的
props，因此请使用默认插槽，或先解析组件再传入。

## 部件、插槽与文案

每个视觉部件都有稳定类名和 `data-vmd-part` 属性。新的公共组件必须同时提供部件、令牌、
文案、插槽和清单条目。

```css
[data-vmd-part='code'] {
  --vmd-code-bg: #0d1117;
}

[data-vmd-part='heading-anchor'] {
  opacity: 0;
}

[data-vmd-part='heading']:hover [data-vmd-part='heading-anchor'] {
  opacity: 1;
}
```

清单注册表不依赖 Vue：

```ts
import {
  COMPONENT_MANIFESTS,
  getComponentManifest,
  validateManifest,
} from '@coderminer/vue-markdown'

const code = getComponentManifest('CodeBlock')

validateManifest(code, {
  parts: ['code'],
  labels: ['copy', 'download'],
  slots: ['code'],
  mode: 'observed',
})
```

每个清单声明 `name`、`parts`、`tokens`、`slots`、`labels`、`overrideKeys` 和
`behaviors`。覆盖层说明见[定制指南](../guide/customization.md)。

## 下一步

- [渲染器参考](./renderer.md)
- [适配器](./adapters.md)
- [样式与主题](../guide/styling.md)
