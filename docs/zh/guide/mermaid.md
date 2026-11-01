---
description: 按需加载的 Mermaid 渲染、SVG 净化、块状态和可视化编辑器。
---

# Mermaid 图表

Mermaid 支持按需加载，且只在客户端运行。只有 Mermaid 块或可视化编辑器渲染时，才会请求
运行时。

```ts
import { mermaidPlugin, renderMermaid, sanitizeSvg } from 'vue-markdown-suite/mermaid'
```

`MermaidBlock` 从包根导出。它在 SSR 期间渲染确定性占位符，挂载后再加载运行时。

## 围栏图表

把 `mermaidPlugin()` 加入渲染器插件集合，就能把 ` ```mermaid `（以及 ` ```mmd `）围栏
转成 Mermaid 节点：

```vue
<script setup lang="ts">
import { MarkdownRenderer } from 'vue-markdown-suite'
import { defaultPlugins } from 'vue-markdown-suite/plugins'
import { mermaidPlugin } from 'vue-markdown-suite/mermaid'

const plugins = [...defaultPlugins, mermaidPlugin()]
</script>

<template>
  <MarkdownRenderer :source="source" :plugins="plugins" />
</template>
```

插件默认识别 `mermaid` 和 `mmd`，匹配不区分大小写，也可以用
`mermaidPlugin({ languages: ['mermaid', 'diagram'] })` 自定义。插件必须显式引入，因为
Mermaid 是可选 peer。没有插件时，Mermaid 围栏保持普通代码块；没有 `mermaid` 包或自定义
渲染器时，块会保留源码并报告 `mermaid-unavailable`，而不是塌缩成空白区域。

<script setup>
import { MermaidBlock } from 'vue-markdown-suite'

const diagram = `flowchart LR
  Markdown --> Pipeline
  Pipeline --> Model
  Model --> Vue
  Model --> Search
  Model --> Export`
</script>

<ClientOnly>
  <MermaidBlock :source="diagram" />
</ClientOnly>

## 安全与 CSP

运行时使用 Mermaid 的 `securityLevel: 'strict'` 和 `htmlLabels: false`，图表标签输出为
SVG `<text>`/`<tspan>`，而不是 `foreignObject` 里的 HTML。渲染出的 SVG 在变成节点之前会
被解析和净化：脚本、事件处理器、外部链接和不安全元素都会被移除。净化 SVG 标记时，剩余
的 `foreignObject` 标签文本会转成 SVG 文本；注入渲染器产生的节点输出则直接丢弃
`foreignObject` 元素。

Mermaid 生成的主题样式表会作为作用域内的 `<style>` 元素保留，节点填充、描边、字体和
标记样式因此能继续工作。保留条件是：根 SVG 有 id，且每条规则的选择器都以该 id 为前缀
（允许后代和子组合器；兄弟组合器和未限定选择器会导致该样式元素被丢弃）。外部 CSS
import/URL 和主动型 CSS 构造会被剥离。SVG 元素和属性的大小写会在渲染前归一化，因此
`linearGradient`、`viewBox`、`stroke-width`、`marker-end` 和 `aria-*` 能保留下来。

宿主 CSP 应允许 Mermaid 运行时的脚本分块，并允许净化后的 `<style>` 元素，例如
`style-src 'unsafe-inline'`（只允许 nonce 或 hash 的 `style-src` 会阻止它，图表将不带
主题样式渲染）。运行时不需要 `unsafe-eval`；SSR 期间不会使用 Mermaid。净化后的 SVG 永远
不会经过 `v-html`。

## 块行为

`MermaidBlock` 提供预览/源码标签、pending 状态、保留最后一次成功结果、可选的错误展示、
缩放、全屏、复制、SVG 下载、PNG 导出和重试。首次渲染失败时始终显示轻量回退；
`showErrors` 展开详细诊断。`theme` 覆盖 Mermaid 主题和块的 `data-vmd-theme`，
`compact` 隐藏工具栏，适合嵌入预览。

它提供 `mermaid` 和 `mermaid-error` 插槽，以及 `mermaidRenderer` 注入点。自定义渲染器的
SVG 和节点输出仍会被净化；非法输出会被报告，同时保留上一次成功预览。

```vue
<MermaidBlock :source="diagram" theme="dark" show-errors @error="onDiagramError" />
```

## 可视化编辑器

`MermaidLiveEditor` 绑定 `v-model`，同步外部值，对预览做防抖（默认 300 ms），并且只在
挂载后加载 CodeMirror 6。它的 `theme` 同时作用于 CodeMirror 和 `MermaidBlock` 预览，
`compact` 隐藏预览块重复的工具栏。

```vue
<MermaidLiveEditor v-model="source" theme="dark" :renderer="renderer" compact />
```

分栏布局会强制最小面板尺寸，支持键盘调整（ArrowLeft/ArrowRight，Home 重置），全屏带
CSS 回退。`editor` 插槽收到 `{ value, update, diagnostics, status, actions }`；
`editor-diagnostics` 插槽收到 `{ diagnostics, focusLine }`。可选的 `./editor` 入口暴露
CodeMirror 创建辅助函数。

## 下一步

- [富组件](./rich-components.md)
- [安全](./security.md)
