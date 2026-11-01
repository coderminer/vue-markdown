---
description: MarkdownRenderer 的属性、事件、实例方法、插槽和区域覆盖完整参考。
---

# 渲染器参考

`MarkdownRenderer` 是预设组件。它负责解析、插件解析、目录状态、事件、区域和插槽，并通过
组件目录渲染归一化文档。

```vue
<script setup lang="ts">
import { MarkdownRenderer } from 'vue-markdown-suite'
import 'vue-markdown-suite/style.css'
</script>

<template>
  <MarkdownRenderer :source="source" toc />
</template>
```

## 属性

| 属性 | 类型 | 默认值与说明 |
| --- | --- | --- |
| `source` | `string` | 默认 `''`。受控 Markdown 输入，优先级高于默认插槽；支持 `v-model:source`。 |
| `components` | `Record<string, Component \| string>` | 默认 `{}`。以标签名为键的覆盖。 |
| `regions` | `Partial<Record<string, Component \| string>>` | 默认 `{}`。根、内容、目录、目录项、代码块、Mermaid 块、错误、空状态、加载状态的区域覆盖。 |
| `nodeComponents` | `Record<string, Component \| string \| NodeRenderer>` | 默认 `{}`。语义节点覆盖和函数渲染器。 |
| `labels` | `Partial<MarkdownLabels>` | 默认 `{}`。内置文案，支持字符串或函数。 |
| `preset` | `MarkdownPreset \| MarkdownPreset[]` | 应用一个或多个预设。 |
| `plugins` | `PluginInput[]` | 默认 `defaultPlugins`。传入后替换默认插件集合；加入来自 `vue-markdown-suite/html` 的 `htmlPlugin()` 启用净化后的原始 HTML。 |
| `disablePlugins` | `string[]` | 默认 `[]`。按名称从解析后的集合移除插件。 |
| `remarkPlugins` | `PluggableList` | 默认 `[]`。在库内置 remark 插件之后运行。 |
| `rehypePlugins` | `PluggableList` | 默认 `[]`。在库内置 rehype 插件和内置净化器之后运行。 |
| `remarkRehypeOptions` | `Record<string, unknown>` | 默认 `{}`。合并到转换步骤。 |
| `pipeline` | `MarkdownPipeline` | 默认官方管线。高级逃生口，必须返回 hast。 |
| `slugger` | `MarkdownSlugger` | 默认 `github-slugger`。标题 ID 生成器。 |
| `highlighter` | `MarkdownHighlighter` | 语法高亮适配器。 |
| `mathEngine` | `MathEngine` | 数学渲染适配器。 |
| `mermaidRenderer` | `MermaidRenderer` | Mermaid 渲染适配器。 |
| `diagnosticsFormatter` | `DiagnosticFormatter` | 格式化渲染错误。 |
| `allowedElements` | `string[]` | 与 `disallowedElements` 互斥，冲突时优先。 |
| `disallowedElements` | `string[]` | 拒绝列表。 |
| `unwrapDisallowed` | `boolean` | 默认 `false`。保留被移除元素的子节点。 |
| `allowElement` | `(node, index, parent) => boolean \| null \| undefined` | 在允许/拒绝列表之后运行；任何假值都会拒绝该元素。 |
| `urlTransform` | `(url, key, node) => string \| null \| undefined` | 默认 `defaultUrlTransform`。作用于所有携带 URL 的属性；返回 `null` 删除属性，结果会再次校验。 |
| `linkTarget` | `string` | 默认 `'_self'`。应用于链接。 |
| `externalLinkTarget` | `'_self' \| '_blank'` | 默认 `'_self'`。`_blank` 会附加 `rel="noopener noreferrer"`。 |
| `baseUrl` | `string` | 在 `urlTransform` 之前解析相对 URL。 |
| `idPrefix` | `string` | 默认 `''`。为生成的标题 ID 加前缀；同一页面有多个渲染器时请使用唯一前缀。 |
| `syncHash` | `boolean` | 默认 `false`。标题激活时更新 URL hash。 |
| `toc` | `boolean` | 默认 `false`。渲染目录区域。 |
| `tocDepth` | `number` | 默认 `0`（全部层级）。目录包含的最大标题层级，范围 `1` 到 `6`。 |
| `showError` | `boolean` | 默认 `false`。失败时渲染错误区域。 |
| `tokens` | `Record<string, string>` | 默认 `{}`。根元素上的内联 `--vmd-*` 自定义属性。 |
| `theme` | `'light' \| 'dark' \| 'auto' \| 'custom'` | 默认 `'light'`。设置根元素的 `data-vmd-theme`。 |
| `as` | `string \| Component` | 默认 `'div'`。根元素或根组件。 |

::: tip 同一页面有多个渲染器
标题 slug 只在单份文档内唯一。给每个渲染器不同的 `idPrefix`（`doc-`、`sidebar-` 等），
锚点、`syncHash` 和深链接才不会冲突。目录导航和当前标题跟踪本身已经限定在各自的渲染器
根内。
:::

插件数组也要保持稳定。内联工厂调用会在每次父组件渲染时创建新的插件对象，并使解析缓存
失效。

## 事件

| 事件 | 负载 | 说明 |
| --- | --- | --- |
| `update:source` | `source: string` | 由 `updateSource` 和 `v-model:source` 触发。 |
| `toc-change` | `TocItem[]` | 签名判断；只有序列化目录变化时才触发。 |
| `link-click` | `{ url, target, node, event }` | 渲染后的链接被激活后触发。 |
| `custom-tag-click` | `{ tag, props, node, event }` | props 已归一化且安全。 |
| `task-change` | `{ checked, node }` | GFM 任务复选框变化时触发。 |
| `render-error` | `MarkdownDiagnostic` | 解析、插件、适配器和配置失败。 |
| `ready` | `MarkdownDocument` | 第一次成功生成文档时触发一次。 |

## 实例方法

```ts
import { ref } from 'vue'
import type { MarkdownRendererInstance } from 'vue-markdown-suite'

const renderer = ref<MarkdownRendererInstance>()

renderer.value?.scrollToHeading('install')
renderer.value?.getToc()
renderer.value?.getDocument()
await renderer.value?.refresh()
renderer.value?.updateSource('# 新的源码')
```

| 方法 | 签名 |
| --- | --- |
| `scrollToHeading` | `(id: string, options?: ScrollIntoViewOptions) => void` |
| `getDocument` | `() => MarkdownDocument \| undefined` |
| `getToc` | `() => TocItem[]` |
| `refresh` | `() => Promise<void>` |
| `updateSource` | `(source: string) => void` |

同样的形状以 `MarkdownRendererInstance` 导出，宿主不必写
`InstanceType<typeof MarkdownRenderer>`。

## 插槽

默认插槽是原始 Markdown 文本。具名区域插槽会完全替换默认区域，并接收作用域数据和动作。

| 插槽 | 上下文 |
| --- | --- |
| `root` | `{ document, toc, status, diagnostics, tokens, theme, actions }` |
| `toc` | `{ items, activeId, label, tocDepth, navigate }` |
| `toc-item` | `{ item, active, navigate }` |
| `content` | `{ nodes, document }` |
| `error` | `{ diagnostics, label, retry }` |
| `empty` | `{ label }` |
| `loading` | `{ label }` |
| `code` | `{ node, source, language, highlighted, nodes, lines, visibleLines, actions: { copy, download } }` |
| `code-actions` | `{ source, language, fileName, title, highlighted, nodes, actions: { copy, download } }` |
| `header` | CodeBlock：`{ source, language, label, fileName, title, highlighted, nodes, actions }`；MermaidBlock：`{ source, label, view, status, copied, fullscreen, compact, actions, showPreview, showSource }`；VueSyntaxHighlighter：`{ source, language, highlighted, nodes, lines, actions: { copy } }` |
| `toolbar` | `{ source, language, fileName, title, highlighted, nodes, actions: { copy, download } }` |
| `tabs` | `{ view, status, actions: { preview, source } }` |
| `actions` | `{ source, status, copied, fullscreen, enableZoom, allowFullscreen, compact, actions }` |
| `footer` | `{ source, language, highlighted, nodes, lines, actions: { copy } }` |
| `highlighter` | `{ source, language, nodes, lines, highlighted, actions: { copy } }` |
| `math` | `{ tex, displayMode, rendered, error }` |
| `math-error` | `{ tex, error, retry }` |
| `mermaid` | `{ source, svg, status, error, actions: { copy, exportPng, fullscreen, retry } }` |
| `mermaid-error` | `{ source, error, retry, focusSource }` |
| `editor` | `{ value, update, diagnostics, status, actions: { focus, reset, fullscreen } }` |
| `editor-diagnostics` | `{ diagnostics, focusLine }` |

插槽不存在或内容为空时保留默认渲染。

```vue
<MarkdownRenderer :source="source" toc>
  <template #empty="{ label }">
    <p class="my-empty">{{ label }} —— 添加一些 Markdown。</p>
  </template>
</MarkdownRenderer>
```

## 目录

目录通过 `toc` 开启。用 `tocDepth` 限制最大层级（`0` 表示全部），用 `#toc` 替换整个
导航，用 `#toc-item` 替换单项，用 `labels.toc` 设置可访问标签，用 `getToc()` /
`scrollToHeading(id)` 驱动外部目录。`getToc()`、`toc-change`、插槽上下文、默认目录和
当前标题跟踪器都使用过滤后的列表。自定义区域组件收到 `items`、`activeId`、`label`、
`tocDepth` 和可选的 `tocItem`；目录项组件收到 `item` 和 `active`，并触发 `navigate`。

```vue
<MarkdownRenderer :source="source" toc :toc-depth="3" />
```

完整目录 API 与示例见[公共 API](./api.md)。

## 区域

`regions` 用与默认组件相同的 props 替换结构组件：

```ts
const regions = {
  root: MyRoot,
  content: MyContent,
  toc: MyToc,
  tocItem: MyTocItem,
  codeBlock: MyCodeBlock,
  mermaidBlock: MyMermaid,
  error: MyError,
  empty: MyEmpty,
  loading: MyLoading,
}
```

区域解析顺序是“插槽 > regions 覆盖 > 插件贡献 > 预设 > 内置”。

## 优先级

```text
配置：
  局部属性 > 最近的 Provider > 预设 > 插件默认值 > 内置默认值

区域：
  插槽 > regions 覆盖 > 插件贡献 > 预设 > 内置

节点渲染：
  nodeComponents 函数 > nodeComponents[tag] > components[tag]
    > nodeComponents[kind] > 插件组件 > 预设 > 内置
```

## 下一步

- [组件](./components.md)
- [适配器](./adapters.md)
- [定制指南](../guide/customization.md)
