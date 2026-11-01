---
description: 设计令牌、主题、稳定部件和无样式用法。
---

# 样式与主题

`@coderminer/vue-markdown` 的组件本身是语义化、无样式的。可选样式表通过设计令牌和稳定部件
提供布局、间距和颜色。

## 引入样式表

```ts
import '@coderminer/vue-markdown/style.css'
```

也可以分开引入：

```ts
import '@coderminer/vue-markdown/styles/tokens.css'
import '@coderminer/vue-markdown/styles/components.css'
```

`tokens.css` 在 `:root` 和 `[data-vmd-theme='light']` 上定义默认值，因此宿主覆盖会按
正常的层叠顺序获胜，普通的类选择器或属性选择器也优先于它们。请先加载样式表，再加载你
自己的覆盖。`components.css` 只面向 `vmd-*` 类和 `data-vmd-part` 属性；内容区域额外
重置首尾子元素的 margin，除此之外不使用元素选择器。

## 用令牌定制

所有令牌都带 `--vmd-*` 前缀。可以在任意祖先元素上覆盖：

```css
.my-docs {
  --vmd-font-size: 1.0625rem;
  --vmd-line-height: 1.8;
  --vmd-color-accent: #8250df;
  --vmd-space-4: 1.25rem;
}
```

也可以通过 `tokens` 属性内联传入：

```vue
<MarkdownRenderer
  :source="source"
  :tokens="{ '--vmd-color-accent': 'rgb(130, 80, 223)' }"
/>
```

内联令牌落在根元素上，并向所有嵌套部件继承。

令牌分为几组：

| 组 | 令牌 |
| --- | --- |
| 字体 | `--vmd-font-family`、`--vmd-font-mono`、`--vmd-font-size`、`--vmd-line-height` |
| 颜色 | `--vmd-color-text`、`--vmd-color-muted`、`--vmd-color-bg`、`--vmd-color-surface`、`--vmd-color-border`、`--vmd-color-accent`、`--vmd-color-accent-contrast`、`--vmd-color-danger`、`--vmd-color-success` |
| 间距 | `--vmd-space-1` 到 `--vmd-space-6` |
| 圆角与阴影 | `--vmd-radius-sm`、`--vmd-radius-md`、`--vmd-radius-lg`、`--vmd-shadow-sm`、`--vmd-shadow-md` |
| 动效 | `--vmd-motion-duration`、`--vmd-motion-easing` |
| 代码 | `--vmd-code-bg`、`--vmd-code-text`、`--vmd-code-border`、`--vmd-code-toolbar-bg` |
| 数学与图表 | `--vmd-math-color`、`--vmd-math-bg`、`--vmd-mermaid-bg`、`--vmd-mermaid-border` |
| 层级 | `--vmd-z-fullscreen` |

## 主题

把 `theme` 设为 `light`、`dark`、`auto` 或 `custom`。渲染器只把值写到自身根元素的
`data-vmd-theme` 上，不会影响宿主页面。`auto` 不依赖 JavaScript，跟随
`prefers-color-scheme`。`custom` 不应用任何预设颜色值，宿主的令牌覆盖会原样生效。

```vue
<MarkdownRenderer :source="source" theme="auto" />
```

在主题子树内，作用域令牌覆盖仍然优先：

```css
.my-docs {
  --vmd-color-accent: #8250df;
}
```

## 富组件的默认外观

样式表为 `CodeBlock` 和 `MermaidBlock` 提供可直接使用的头部和工具栏，包括内联 SVG
图标操作、hover/focus 状态、活动标签样式和复制反馈。两个头部保持一致：强调色图标加
标题、相同的高度、内边距、背景、排版和右对齐操作区。Mermaid 只额外提供
Preview/Source 分段标签。不需要图标包或额外标记；即使可见文字被隐藏，每个操作也保留
可访问标签。

默认图标尺寸由 `.vmd-icon` 控制；按钮间距和颜色使用标准令牌，覆盖令牌即可同时改变这些
外观。

## 定位部件

每个视觉部件同时暴露稳定类名和 `data-vmd-part` 属性：

```css
[data-vmd-part='heading'] {
  letter-spacing: -0.01em;
}

[data-vmd-part='code'] {
  --vmd-code-bg: #0d1117;
  color: #e6edf3;
}
```

用部件而不是元素选择器。宿主可能替换任意标签组件，因此基于元素的 CSS 不是稳定契约。
内置围栏代码的内部元素还带有 `vmd-code-element` 类，用于字体继承。

完整部件名可以在 `PARTS` / `PART_NAMES` 中读取，常用的有：

| 区域 | 部件 |
| --- | --- |
| 结构 | `root`、`body`、`content`、`error`、`empty`、`loading`、`search-match` |
| 目录 | `toc`、`toc-column`、`toc-nav`、`toc-item` |
| 基础元素 | `paragraph`、`heading`、`heading-anchor`、`emphasis`、`strong`、`strikethrough`、`link`、`image`、`list`、`list-item`、`blockquote`、`hr`、`break` |
| 表格 | `table`、`table-section`、`table-row`、`table-cell` |
| 代码 | `inline-code`、`code`、`code-header`、`code-heading`、`code-title`、`code-file-name`、`code-lang`、`code-toolbar`、`code-actions`、`code-action`、`code-body`、`code-feedback` |
| 独立高亮器 | `highlighter`、`highlighter-header`、`highlighter-actions`、`highlighter-footer`、`highlighter-body`、`highlighter-gutter`、`highlighter-line`、`highlighter-hidden`、`highlighter-empty`、`highlighter-toggle` |
| 数学 | `math`、`math-error` |
| Mermaid | `mermaid`、`mermaid-header`、`mermaid-tabs`、`mermaid-actions`、`mermaid-action`、`mermaid-preview`、`mermaid-source`、`mermaid-pending`、`mermaid-error`、`mermaid-fallback`、`mermaid-fullscreen` |
| 编辑器 | `editor`、`editor-pane`、`editor-divider`、`editor-preview`、`editor-diagnostics`、`editor-empty`、`editor-toolbar`、`editor-fullscreen` |
| 扩展节点 | `html`、`custom-tag`、`task-item`、`task-checkbox`、`footnote-reference`、`footnotes` |

全屏状态使用 `data-fullscreen`；Mermaid 还使用 `data-status`、`data-view` 和
`data-renderer`。目录侧栏布局在根元素上使用 `data-vmd-toc-placement` 和
`data-vmd-toc-layout`。

## 替换组件

标签覆盖接受标签名或 Vue 组件：

```vue
<script setup lang="ts">
import { MarkdownRenderer } from '@coderminer/vue-markdown'

const components = {
  h1: 'h2',
  a: MyLink,
  pre: MyCodeBlock,
}
</script>

<template>
  <MarkdownRenderer :source="source" :components="components" />
</template>
```

组件通过 `node` 接收归一化节点，并通过默认插槽渲染子节点。覆盖组件应保持 CSS 无关和
SSR 安全。

## 无样式模式

不引入样式表即可。标记仍然是语义化、可访问的，所有行为——标题 ID、目录、过滤、链接
策略、插件生命周期——都不会改变。

## 可访问性

- 标题保留确定性 ID，页内导航可用。
- 带 ID 的标题会渲染可键盘聚焦的锚点链接，使用 `heading-anchor` 部件和
  `headingAnchor` 文案；打印时隐藏锚点，没有 ID 的标题不渲染锚点。
- 目录渲染为带标签的 `nav`，当前项带有 `aria-current`。
- 在新标签页打开的链接会附加 `rel="noopener noreferrer"`。
- 图片加载失败时回退到 alt 文本。
- 错误区域使用 `role="alert"`。

## 下一步

- [无头渲染](./headless.md)：完全自定义标记。
- [安全](./security.md)：启用原始 HTML 之前先读这一篇。
