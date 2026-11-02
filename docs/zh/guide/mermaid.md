---
description: 按需加载的 Mermaid 渲染、SVG 净化、块状态和可视化编辑器。
---

# Mermaid 图表

Mermaid 支持按需加载，且只在客户端运行。只有 Mermaid 块或可视化编辑器渲染时，才会请求
运行时。

```ts
import { mermaidPlugin, renderMermaid, sanitizeSvg } from '@coderminer/vue-markdown/mermaid'
```

`renderMermaid()` 是异步的：Mermaid 运行时按需加载，渲染本身也是异步操作。使用结果前
需要先 await：

```ts
const result = await renderMermaid('graph TD; A-->B')
```

如果把未 await 的 Promise 传给 `MermaidBlock` 的 `source` 属性（或直接传给
`renderMermaid()`），会报告清晰的错误，而不是抛出异常。

`MermaidBlock` 从包根导出。它在 SSR 期间渲染确定性占位符，挂载后再加载运行时。

## 围栏图表

把 `mermaidPlugin()` 加入渲染器插件集合，就能把 ` ```mermaid `（以及 ` ```mmd `）围栏
转成 Mermaid 节点：

```vue
<script setup lang="ts">
import { MarkdownRenderer } from '@coderminer/vue-markdown'
import { defaultPlugins } from '@coderminer/vue-markdown/plugins'
import { mermaidPlugin } from '@coderminer/vue-markdown/mermaid'

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

`mermaidPlugin()` 只读取 `languages` 选项。渲染器和主题通过 `MarkdownRenderer` 的
`mermaidRenderer` 和 `theme` 配置，它们不是插件参数。

## 选择渲染器

Mermaid 只有一条渲染管线，配置分为三层。只在需要覆盖下一层时才使用上一层：

1. **内置运行时（默认）。** 没有配置渲染器时，`MermaidBlock` 会按需调用
   `renderMermaid()`。这是常规用法。
2. **应用级适配器。** 在 `MarkdownRenderer`、`MarkdownConfigProvider` 或预设中设置
   `mermaidRenderer`。适合替换 Mermaid 构建、使用远程服务或预渲染结果。
3. **单块适配器。** 在 `MermaidBlock` 或 `MarkdownMermaid` 上设置 `renderer`。它的优先级
   高于 provider、预设和内置运行时。

优先级为：本地属性 > 最近的 provider > 预设 > 内置。`mermaidPlugin()` 不是渲染器，
它只把围栏代码转换成 Mermaid 节点。`renderMermaid()` 是内置运行时背后的异步函数，
不是 `MermaidRenderer` 对象；它没有 `id`，不要直接传给 `mermaidRenderer` 或
`renderer`。需要显式适配器时请包装它：

```ts
const renderer = {
  id: 'mermaid',
  render: (source, options) => renderMermaid(source, options),
}
```

大多数应用不需要配置渲染器：添加 `mermaidPlugin()`、设置主题，然后让内置运行时按需加载即可。

## 运行时生命周期

Mermaid 运行时是进程级单例。所有块共享同一份懒加载模块、配置和渲染队列。卸载块不会
重置或卸载它：缓存不保存任何单块状态，而且其他块可能仍在渲染。`resetMermaidRuntime()`
用于测试或显式重新初始化，不是组件生命周期钩子，也无法卸载浏览器的模块缓存。

<script setup>
import { MermaidBlock } from '@coderminer/vue-markdown'

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
`compact` 隐藏预览块重复的工具栏，并收紧诊断面板。

```vue
<MermaidLiveEditor v-model="source" theme="dark" :renderer="renderer" compact />
```

分栏布局会强制最小面板尺寸，支持键盘调整（ArrowLeft/ArrowRight，Home 重置），全屏带
CSS 回退。全屏会锁定页面滚动、限制焦点范围，并在退出或卸载时恢复之前的滚动和全屏状态。`rawDetails` 在友好诊断旁显示原始解析器消息，`autoFocus` 聚焦映射到的错误行。
插槽：`toolbar`、`editor`、`preview`、`editor-diagnostics`、`empty` 和 `fullscreen`。
`editor` 收到 `{ value, update, diagnostics, status, actions }`；`preview` 收到
`{ source, status, error, nodes, actions }`；`editor-diagnostics` 收到
`{ diagnostics, focusLine }`。源码为空时显示 `empty` 占位，而不是旧图表。可选的
`./editor` 入口暴露 CodeMirror 创建辅助函数。

## 下一步

- [富组件](./rich-components.md)
- [安全](./security.md)
