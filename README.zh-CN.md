# @coderminer/vue-markdown

[![npm version](https://img.shields.io/npm/v/@coderminer/vue-markdown.svg)](https://www.npmjs.com/package/@coderminer/vue-markdown)
[![CI](https://github.com/coderminer/vue-markdown/workflows/ci.yml/badge.svg)](https://github.com/coderminer/vue-markdown/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Docs](https://img.shields.io/badge/docs-live-8250df)](https://coderminer.github.io/vue-markdown/)

[English](./README.md) | 简体中文 | [更新日志](./CHANGELOG.md)

一个通用、可定制、插件驱动的 **Vue 3 Markdown 组件套件**。

`@coderminer/vue-markdown` 用官方 `unified` 管线（`remark-parse` + `remark-rehype`）把
Markdown 直接渲染成 Vue VNode：不经过 HTML 字符串往返，也不使用 `v-html`。解析结果是
可序列化、与 DOM 无关的文档模型，因此同一份结果既可以交给带样式的渲染器，也可以交给
无头宿主或静态 HTML 导出。

- **Vue 原生** —— 文档存放在 `shallowRef` 中，使用稳定 key 和文本快速路径，并按输入
  缓存解析结果，重复渲染开销很小。
- **处处可定制** —— 可以替换任意标签；每个视觉部件都有稳定的 `data-vmd-part` 和
  `vmd-*` 类名；主题通过 `--vmd-*` 设计令牌控制。
- **插件驱动** —— 插件可以贡献 remark/rehype 插件、源码与文档变换、组件、文案、
  令牌以及生命周期钩子。
- **默认安全** —— 原始 HTML 默认被丢弃，URL 会经过校验；宿主通过 `htmlPlugin()`
  显式开启时，解析器与内置净化器会成对启用。
- **可用于 SSR** —— 标题 ID 确定性生成，提供同步解析路径，静态 HTML 导出复用同一套
  净化、过滤和 URL 策略。
- **可选引擎按需加载** —— highlight.js、Shiki、KaTeX、Mermaid 和 CodeMirror 各自
  位于独立入口或懒加载分块中。

**英文文档：** <https://coderminer.github.io/vue-markdown/>  
**中文文档：** [docs/zh](./docs/zh/index.md)（本地运行 `npm run docs:dev` 后访问 `/zh/`）

## 安装

```bash
npm install @coderminer/vue-markdown
```

需要 Node 20+ 和 Vue 3.5+。

可选引擎都是 peer 依赖，只安装实际用到的部分：

```bash
# 语法高亮
npm install highlight.js
# 或者
npm install shiki

# 数学公式
npm install katex

# 图表
npm install mermaid

# 通过 @coderminer/vue-markdown/html 启用净化后的原始 HTML
npm install rehype-raw

# Mermaid 可视化编辑器
npm install @codemirror/state @codemirror/view @codemirror/language @codemirror/commands
```

## 快速开始

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { MarkdownRenderer } from '@coderminer/vue-markdown'
import '@coderminer/vue-markdown/style.css'

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

就这些。样式表是可选的：不引入样式表时，标记仍然是语义化、可访问的，所有行为也照常
工作。

## 基础用法

### 输入

Markdown 可以通过 `source` 属性、`v-model:source` 或默认插槽传入：

```vue
<MarkdownRenderer source="# 来自属性" />
<MarkdownRenderer v-model:source="source" />
<MarkdownRenderer># 来自插槽</MarkdownRenderer>
```

`source` 是受控值，优先级高于插槽。插槽只接受纯文本，其文本内容变化后会被重新读取。
传入非字符串的 `source` 会产生一条诊断信息并渲染空状态，而不是抛错。

对于编辑器等频繁变化的输入，请绑定 `source`，让父组件持有数据。

### 样式

```ts
import '@coderminer/vue-markdown/style.css'
// 也可以分开引入
import '@coderminer/vue-markdown/styles/tokens.css'
import '@coderminer/vue-markdown/styles/components.css'
```

在任意祖先元素上覆盖令牌，或通过 `tokens` 属性传入：

```vue
<MarkdownRenderer
  :source="source"
  theme="auto"
  :tokens="{ '--vmd-color-accent': '#8250df' }"
/>
```

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

不要用 `h1`、`pre`、`table` 这类元素选择器写样式，因为宿主可以替换任意标签组件。请以
文档中列出的 part 和令牌为准。

### 事件与实例方法

```vue
<script setup lang="ts">
import { ref } from 'vue'
import type { MarkdownRendererInstance, TocItem } from '@coderminer/vue-markdown'

const renderer = ref<MarkdownRendererInstance>()

function onToc(toc: TocItem[]) {
  console.log(toc)
}
</script>

<template>
  <MarkdownRenderer
    ref="renderer"
    :source="source"
    toc
    @toc-change="onToc"
    @link-click="onLink"
    @task-change="onTask"
    @render-error="onError"
    @ready="onReady"
  />
</template>
```

实例暴露的方法：

| 方法 | 签名 |
| --- | --- |
| `scrollToHeading` | `(id: string, options?: ScrollIntoViewOptions) => void` |
| `getDocument` | `() => MarkdownDocument \| undefined` |
| `getToc` | `() => TocItem[]` |
| `refresh` | `() => Promise<void>` |
| `updateSource` | `(source: string) => void` |

## 定制

定制是分层的，优先级固定：

```text
局部属性 > 最近的 Provider > 预设 > 插件默认值 > 内置默认值
```

### 替换元素

```vue
<script setup lang="ts">
import { MarkdownRenderer } from '@coderminer/vue-markdown'
import BadgeLink from './BadgeLink.vue'
import Callout from './Callout.vue'
import MyToc from './MyToc.vue'

const components = {
  h1: 'h2',
  a: BadgeLink,
}

const nodeComponents = {
  blockquote: Callout,
}

const regions = {
  toc: MyToc,
}
</script>

<template>
  <MarkdownRenderer
    :source="source"
    :components="components"
    :node-components="nodeComponents"
    :regions="regions"
  />
</template>
```

- `components` 以标签名为键，值可以是标签名字符串或 Vue 组件。
- `nodeComponents` 面向语义节点（`code`、`math`、`mermaid`、`custom` 以及元素标签），
  也接受函数渲染器。
- `regions` 替换结构性区域：根、内容、目录、目录项、代码块、Mermaid 块、错误、空状态、
  加载状态。
- 具名插槽是最后一层，能拿到作用域数据和可执行动作。

围栏代码块始终由 `components.pre` 包裹，内部元素则通过 `components.code` 或
`nodeComponents.code` 解析。

### 主题

```vue
<!-- 预设：light | dark | auto | custom -->
<MarkdownRenderer theme="auto" :source="source" toc />

<!-- 单实例令牌 -->
<MarkdownRenderer
  theme="auto"
  :source="source"
  :tokens="{
    '--vmd-color-accent': '#8250df',
    '--vmd-radius-md': '12px',
  }"
/>

<!-- 应用级默认值 -->
<MarkdownConfigProvider theme="auto" :tokens="brandTokens">
  <MarkdownRenderer :source="source" toc />
</MarkdownConfigProvider>
```

渲染器只在自己的根元素上写入 `data-vmd-theme`，不会影响宿主页面。`auto` 跟随
`prefers-color-scheme`；`custom` 不应用任何预设颜色，你的令牌覆盖会原样生效。

### CSS

```css
.my-docs {
  --vmd-font-size: 1.0625rem;
  --vmd-line-height: 1.8;
  --vmd-color-accent: #8250df;
}

[data-vmd-part='heading'] {
  letter-spacing: -0.01em;
}
```

完整约定见中文文档的[样式与主题](./docs/zh/guide/styling.md)和
[定制](./docs/zh/guide/customization.md)。

## 进阶用法

### 插件与预设

```ts
import { defineMarkdownPlugin } from '@coderminer/vue-markdown/plugins'
import { composePresets, defineMarkdownPreset } from '@coderminer/vue-markdown/presets'

export const docsPlugin = defineMarkdownPlugin({
  name: 'docs',
  phase: 'normal',
  remarkPlugins: [],
  rehypePlugins: [],
  components: { h2: 'h3' },
  labels: { toc: '本页目录' },
  tokens: { '--vmd-color-accent': '#8250df' },
  transformDocument(document) {
    return { ...document, frontmatter: { ...document.frontmatter, docs: true } }
  },
  setup() {
    // 每个解析后的插件集合执行一次，运行在 effectScope 中。
    return () => {
      // 重新配置或卸载时清理。
    }
  },
})

export const docsPreset = composePresets(
  defineMarkdownPreset({ name: 'base', theme: 'auto' }),
  defineMarkdownPreset({ name: 'docs', tokens: { '--vmd-radius-md': '10px' } }),
)
```

```vue
<script setup lang="ts">
// 在模块作用域或 setup 中创建一次，不要在模板里内联创建。
const plugins = [docsPlugin]
</script>

<template>
  <MarkdownRenderer :source="source" :plugins="plugins" :preset="docsPreset" toc />
</template>
```

排序规则是 `pre` → `normal` → `post`，同阶段内按注册顺序执行。同名插件会确定性地替换
前一个，并产生一条诊断信息。插件身份参与解析缓存 key，因此
`:plugins="[docsPlugin]"` 这种模板内联写法会在每次父组件渲染时重新解析。单个插件失败
会被隔离，不会破坏上一份正常文档。

`toc`、`code`、`link` 是内核不变标记：即使写进 `disablePlugins` 也不会被移除，只会
报告一条 `plugin-core` 诊断。

### 无头渲染

```ts
import { useMarkdownDocument } from '@coderminer/vue-markdown/headless'

const {
  document,
  toc,
  status,
  diagnostics,
  refresh,
} = useMarkdownDocument(source, {
  plugins: [docsPlugin],
})
```

无头组合式函数负责解析、记忆化、插件生命周期、状态和诊断，但不渲染任何内容。你可以
把可序列化的模型映射成自己的标记。

### 语法高亮、数学与图表

```ts
import { highlightjs } from '@coderminer/vue-markdown/highlight'
import { shiki } from '@coderminer/vue-markdown/highlight/shiki'
import { fullPlugins } from '@coderminer/vue-markdown/plugins'
import { mathPlugin, katexEngine } from '@coderminer/vue-markdown/math'
import { mermaidPlugin, renderMermaid } from '@coderminer/vue-markdown/mermaid'
import '@coderminer/vue-markdown/styles/math-full.css'

const plugins = [...fullPlugins, mathPlugin(), mermaidPlugin()]
```

```vue
<MarkdownRenderer
  :source="source"
  :highlighter="shiki"
  :math-engine="katexEngine"
  :plugins="plugins"
/>
```

每个引擎都是一个带 `id` 和单个方法的小适配器，宿主可以接入自己的高亮器、数学渲染器
或 Mermaid 渲染器。详细说明见[语法高亮](./docs/zh/guide/highlighting.md)、
[数学公式](./docs/zh/guide/math.md)、[Mermaid](./docs/zh/guide/mermaid.md)和
[富组件](./docs/zh/guide/rich-components.md)。

### 服务端渲染与静态导出

```ts
import { exportMarkdownHtml, exportMarkdownHtmlSync } from '@coderminer/vue-markdown'

const html = exportMarkdownHtmlSync(source)
const asyncHtml = await exportMarkdownHtml(source, { plugins: [docsPlugin] })
```

导出与渲染共用同一套管线、插件、净化器、URL 策略、变换和标题 ID。
`exportMarkdownHtmlSync` 要求管线支持同步执行；官方管线两条路径都支持。插件节点会以
带 `data-vmd-part="plugin"`、`data-plugin-type`、`data-plugin-key` 的 `span` 保留在
输出中；如果某个插件节点只能由宿主组件渲染，导出会写入带 `data-plugin-unrendered`
的空占位符，而不是直接丢弃。

## 完整示例

中文文档包含一个可运行的完整文档门户示例，组合了：

- frontmatter、GFM、搜索和目录
- 预设、插件，以及自定义引用块与链接节点组件
- KaTeX 数学公式和按需加载的 Mermaid 图表
- 主题切换和静态 HTML 导出
- 与其余文档完全相同的公共 API

打开[完整示例](./docs/zh/guide/complete-example.md)，或查看
[`docs/.vitepress/theme/components/CompleteExample.vue`](./docs/.vitepress/theme/components/CompleteExample.vue)。

## API 速查

完整参考（包括所有插槽、区域、适配器契约和组件清单）见中文
[API 参考](./docs/zh/reference/api.md)。

### `MarkdownRenderer` 属性

| 属性 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `source` | `string` | `''` | 受控 Markdown 输入，优先级高于默认插槽；支持 `v-model:source`。 |
| `components` | `Record<string, Component \| string>` | `{}` | 以标签名为键的组件覆盖。 |
| `regions` | `Partial<Record<string, Component \| string>>` | `{}` | 结构性区域覆盖。 |
| `nodeComponents` | `Record<string, Component \| string \| NodeRenderer>` | `{}` | 语义节点覆盖和函数渲染器。 |
| `labels` | `Partial<MarkdownLabels>` | `{}` | 内置文案，支持字符串或函数。 |
| `preset` | `MarkdownPreset \| MarkdownPreset[]` | — | 应用一个或多个预设。 |
| `plugins` | `PluginInput[]` | `defaultPlugins` | 传入后替换默认插件集合；加入 `htmlPlugin()` 可启用净化后的原始 HTML。 |
| `disablePlugins` | `string[]` | `[]` | 按名称移除解析后的非内核插件。 |
| `remarkPlugins` | `PluggableList` | `[]` | 在库内置 remark 插件之后运行。 |
| `rehypePlugins` | `PluggableList` | `[]` | 在库内置 rehype 插件和内置净化器之后运行。 |
| `remarkRehypeOptions` | `Record<string, unknown>` | `{}` | 合并到 mdast → hast 转换步骤。 |
| `pipeline` | `MarkdownPipeline` | 官方管线 | 高级逃生口，必须返回 hast。 |
| `slugger` | `MarkdownSlugger` | `github-slugger` | 标题 ID 生成器。 |
| `highlighter` | `MarkdownHighlighter` | — | 语法高亮适配器。 |
| `mathEngine` | `MathEngine` | — | 数学渲染适配器。 |
| `mermaidRenderer` | `MermaidRenderer` | — | Mermaid 渲染适配器。 |
| `diagnosticsFormatter` | `DiagnosticFormatter` | — | 格式化渲染错误。 |
| `allowedElements` | `string[]` | — | 允许列表，与 `disallowedElements` 互斥，冲突时优先。 |
| `disallowedElements` | `string[]` | — | 拒绝列表。 |
| `unwrapDisallowed` | `boolean` | `false` | 保留被移除元素的子节点。 |
| `allowElement` | `(node, index, parent) => boolean \| null \| undefined` | — | 在允许/拒绝列表之后逐个判断，返回假值即拒绝。 |
| `urlTransform` | `(url, key, node) => string \| null \| undefined` | `defaultUrlTransform` | 作用于所有携带 URL 的属性；返回 `null` 删除该属性，结果会再次校验。 |
| `linkTarget` | `string` | `'_self'` | 链接目标。 |
| `externalLinkTarget` | `'_self' \| '_blank'` | `'_self'` | `_blank` 会附加 `rel="noopener noreferrer"`。 |
| `baseUrl` | `string` | — | 在 `urlTransform` 之前解析相对 URL。 |
| `idPrefix` | `string` | `''` | 为生成的标题 ID 加前缀；同一页面有多个渲染器时请使用不同前缀。 |
| `syncHash` | `boolean` | `false` | 标题激活时同步更新 URL hash。 |
| `toc` | `boolean` | `false` | 渲染目录区域。 |
| `tocDepth` | `number` | `0` | 目录包含的最大标题层级；`0` 表示全部层级。 |
| `tocPlacement` | `'top' \| 'left' \| 'right' \| 'hidden'` | `'top'` | 目录置顶、放在内容左侧/右侧，或隐藏。 |
| `search` | `string` | `''` | 高亮匹配项并触发 `search-change`。 |
| `searchCaseSensitive` | `boolean` | `false` | 让 `search` 区分大小写。 |
| `showError` | `boolean` | `true` | 失败时渲染错误区域。 |
| `tokens` | `Record<string, string>` | `{}` | 写在根元素上的内联 `--vmd-*` 自定义属性。 |
| `theme` | `'light' \| 'dark' \| 'auto' \| 'custom'` | `'light'` | 设置根元素的 `data-vmd-theme`。 |
| `as` | `string \| Component` | `'div'` | 根元素或根组件。 |

### 事件

| 事件 | 负载 |
| --- | --- |
| `update:source` | `source: string` |
| `toc-change` | `toc: TocItem[]` |
| `link-click` | `{ url, target, node, event }` |
| `custom-tag-click` | `{ tag, props, node, event }` |
| `task-change` | `{ checked, node }` |
| `search-change` | `{ query, caseSensitive, matches }` |
| `math-error` | `MarkdownDiagnostic` |
| `render-error` | `MarkdownDiagnostic` |
| `ready` | `MarkdownDocument` |

`toc-change` 带有签名判断：只有序列化后的目录真正变化时才会触发。`search-change`
跟随 `search` 属性并报告当前匹配数，只有对应查询的文档真正渲染完成后才会触发。`ready`
在第一次成功生成文档时触发一次。

### 插槽

`default` 插槽接收原始 Markdown 文本。具名区域插槽会完全替换默认区域，并接收作用域
上下文：`root`、`toc`、`toc-item`、`content`、`error`、`empty` 和 `loading`。插槽
不存在或内容为空时，保留默认渲染。代码、数学、Mermaid 和编辑器组件还各自提供专属
插槽，见[渲染器参考](./docs/zh/reference/renderer.md#插槽)。

### 入口

| 入口 | 内容 |
| --- | --- |
| `@coderminer/vue-markdown` | 渲染器、预设组件、组合式函数、内核辅助函数 |
| `@coderminer/vue-markdown/headless` | 类型、模型辅助函数、组合式函数；不含预设组件和 CSS |
| `@coderminer/vue-markdown/pipeline` | 官方管线、自定义管线校验、身份工具 |
| `@coderminer/vue-markdown/plugins` | `defineMarkdownPlugin`、注册表、内置插件 |
| `@coderminer/vue-markdown/presets` | `defineMarkdownPreset`、`composePresets`、配置类型 |
| `@coderminer/vue-markdown/highlight` | highlight.js 适配器和归一化辅助函数 |
| `@coderminer/vue-markdown/highlight/shiki` | 可选的 Shiki 适配器 |
| `@coderminer/vue-markdown/math` | `mathPlugin`、`katexEngine`、数学类型 |
| `@coderminer/vue-markdown/mermaid` | 按需加载的 Mermaid 运行时和 SVG 净化器 |
| `@coderminer/vue-markdown/editor` | 按需加载的 CodeMirror 集成 |
| `@coderminer/vue-markdown/html` | `htmlPlugin()` 和净化后的原始 HTML |
| `@coderminer/vue-markdown/node-components` | 仅节点组件目录 |
| `@coderminer/vue-markdown/components/*` | 每个公共组件一个入口 |
| `@coderminer/vue-markdown/style.css` | 完整样式表 |
| `@coderminer/vue-markdown/styles/tokens.css` | 仅设计令牌 |
| `@coderminer/vue-markdown/styles/components.css` | 基于部件的组件样式 |
| `@coderminer/vue-markdown/styles/math.css` | 数学容器样式；需另行引入 KaTeX CSS |
| `@coderminer/vue-markdown/styles/math-full.css` | KaTeX CSS 加数学容器样式 |

## 安全默认值

- 原始 HTML 默认被丢弃。从 `@coderminer/vue-markdown/html` 加入 `htmlPlugin()` 才会启用，
  净化器会在原始 HTML 解析后立即运行。
- URL 协议仅允许 `http`、`https`、`irc`、`ircs`、`mailto`、`xmpp` 以及相对 URL。
- 图片 `data:` URL 只允许光栅格式；`data:image/svg+xml` 会被拒绝。
- 原始 HTML 和自定义标签上的事件处理器属性与 `style` 会被移除。
- 渲染路径不使用 `v-html`、`eval` 或内联脚本。
- Mermaid 以严格安全模式渲染，SVG 在变成节点之前会被净化。

完整策略见[安全](./docs/zh/guide/security.md)。

## 文档

| 指南 | 内容 |
| --- | --- |
| [快速开始](./docs/zh/guide/getting-started.md) | 安装、首个文档、整体结构 |
| [基础用法](./docs/zh/guide/basic-usage.md) | 输入、样式、事件、插槽、实例方法 |
| [进阶用法](./docs/zh/guide/advanced-usage.md) | 插件、预设、引擎、无头、导出 |
| [定制](./docs/zh/guide/customization.md) | 优先级、区域、节点组件、插槽、清单 |
| [富组件](./docs/zh/guide/rich-components.md) | `CodeBlock`、`VueSyntaxHighlighter`、`MermaidBlock`、`MermaidLiveEditor` |
| [样式与主题](./docs/zh/guide/styling.md) | 令牌、主题、部件、无样式模式 |
| [插件](./docs/zh/guide/plugins.md) | 插件契约、排序、生命周期、remark/rehype |
| [无头渲染](./docs/zh/guide/headless.md) | `useMarkdownDocument`、模型和辅助 API |
| [官方管线](./docs/zh/guide/pipeline.md) | 官方 unified 管线和阶段顺序 |
| [自定义管线](./docs/zh/guide/custom-pipeline.md) | 编写和校验替代管线 |
| [CommonMark 与 GFM](./docs/zh/guide/commonmark-gfm.md) | 语法覆盖与一致性测试 |
| [安全](./docs/zh/guide/security.md) | 净化、URL 策略、CSP、自定义标签 |
| [语法高亮](./docs/zh/guide/highlighting.md) | 适配器、Shiki、缓存、服务端渲染 |
| [数学公式](./docs/zh/guide/math.md) | `mathPlugin`、分隔符、引擎、回退 |
| [Mermaid](./docs/zh/guide/mermaid.md) | 按需运行时、净化器、块状态、编辑器 |
| [SSR 与静态导出](./docs/zh/guide/ssr.md) | 服务端渲染和静态 HTML 辅助函数 |
| [可访问性审计](./docs/zh/guide/audits.md) | 可访问性、减少动画、RTL、资源清理 |
| [定制手册](./docs/zh/guide/cookbook.md) | 常见任务的复制粘贴配方 |

## 开发

```bash
npm install
npm run docs:dev     # 文档站（VitePress）
npm run docs:build   # 构建静态文档站
npm run dev          # 交互式示例
npm run build:lib    # 库、类型声明、样式
npm test             # node + happy-dom 两个测试项目
npm run typecheck
npm run lint
npm run size         # 入口体积守卫
npm run bench        # 解析/渲染预算检查
```

文档站由 `.github/workflows/pages.yml` 部署到 GitHub Pages。仓库中的 `AGENTS.md`
记录了分层架构，以及保持内核无 DOM、依赖单向流动的规则。

## 许可证

[MIT](LICENSE) © CoderMiner
