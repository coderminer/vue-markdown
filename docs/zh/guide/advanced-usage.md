---
description: 组合插件与预设、替换引擎、无头渲染，以及静态导出。
---

# 进阶用法

渲染器只是若干小层的默认组合。基础用法跑通之后，你可以用插件添加行为、用预设共享
配置、替换引擎，或者完全绕开渲染器。

## 组合配方

```vue
<script setup lang="ts">
import {
  MarkdownConfigProvider,
  MarkdownRenderer,
  defineMarkdownPlugin,
  defineMarkdownPreset,
} from '@coderminer/vue-markdown'
import {
  defaultPlugins,
  gfmPlugin,
  searchPlugin,
} from '@coderminer/vue-markdown/plugins'
import { mathPlugin } from '@coderminer/vue-markdown/math'
import '@coderminer/vue-markdown/style.css'
import '@coderminer/vue-markdown/styles/math-full.css'

const docsPlugin = defineMarkdownPlugin({
  name: 'docs',
  labels: { toc: '本页目录' },
  transformDocument: (document) => ({
    ...document,
    frontmatter: { ...document.frontmatter, enhanced: true },
  }),
})

const docsPreset = defineMarkdownPreset({
  name: 'docs',
  theme: 'auto',
  tokens: {
    '--vmd-color-accent': '#7c3aed',
    '--vmd-radius-md': '12px',
  },
})

// 在模块作用域创建一次：插件身份参与解析缓存。
const plugins = [
  ...defaultPlugins,
  gfmPlugin,
  mathPlugin(),
  docsPlugin,
  searchPlugin({ query: '' }),
]
</script>

<template>
  <MarkdownConfigProvider :preset="docsPreset">
    <MarkdownRenderer :source="source" :plugins="plugins" toc />
  </MarkdownConfigProvider>
</template>
```

## 插件

插件可以贡献 remark/rehype 插件、转换选项、源码与文档变换、组件、文案、令牌以及
生命周期钩子：

```ts
import { defineMarkdownPlugin } from '@coderminer/vue-markdown/plugins'

export const brandPlugin = defineMarkdownPlugin({
  name: 'brand',
  phase: 'normal',
  components: { h2: 'h3' },
  labels: { toc: '目录' },
  tokens: { '--vmd-color-accent': '#7c3aed' },
  setup() {
    return () => {
      // 重新配置或卸载时清理。
    }
  },
})
```

排序是 `pre` → `normal` → `post`，同阶段内按注册顺序执行。同名插件会确定性地替换前
一个。单个插件失败会被隔离，不会破坏上一份正常文档。

::: tip 插件不变式
`toc`、`code`、`link` 是内核不变标记。即使写进 `disablePlugins`，它们仍会留在解析后的
插件集合中，同时报告一条诊断。
:::

排序、生命周期和 remark/rehype 互操作的细节见[插件](./plugins.md)。

## 预设

预设把配置打包到一个名字下。后一个预设覆盖前一个，其插件列表会追加：

```ts
import { composePresets, defineMarkdownPreset } from '@coderminer/vue-markdown/presets'

const brand = defineMarkdownPreset({
  name: 'brand',
  theme: 'dark',
  labels: { toc: '目录' },
})

const docs = defineMarkdownPreset({
  name: 'docs',
  tokens: { '--vmd-radius-md': '12px' },
})

const preset = composePresets(brand, docs)
```

优先级是局部属性 → 最近的 Provider → 预设 → 插件默认值 → 内置默认值。应用预设不会
修改全局状态。

## 语法高亮

```ts
import { highlightjs } from '@coderminer/vue-markdown/highlight'
import { shiki } from '@coderminer/vue-markdown/highlight/shiki'
```

```vue
<MarkdownRenderer :source="source" :highlighter="shiki" />
```

没有配置适配器时，`CodeBlock` 会懒加载 highlight.js。Shiki 位于独立入口，会预加载主题
和语言。未知语言和适配器失败都会回退为纯源码。

适配器细节见[语法高亮](./highlighting.md)，独立的 `CodeBlock` 与
`VueSyntaxHighlighter` 示例见[富组件](./rich-components.md)。

## 数学公式

```ts
import { defaultPlugins } from '@coderminer/vue-markdown/plugins'
import { mathPlugin, katexEngine } from '@coderminer/vue-markdown/math'
import '@coderminer/vue-markdown/styles/math-full.css'

const plugins = [...defaultPlugins, mathPlugin()]
```

```vue
<MarkdownRenderer
  :source="source"
  :plugins="plugins"
  :math-engine="katexEngine"
/>
```

`mathPlugin` 组合 `remark-math` 和 `rehype-katex`。默认启用行内 `$...$` 和块级
`$$...$$`，也支持自定义分隔符和宏。

详见[数学公式](./math.md)，或[富组件](./rich-components.md)中的 `MarkdownMath`。

## Mermaid

```ts
import { renderMermaid, sanitizeSvg } from '@coderminer/vue-markdown/mermaid'
```

```vue
<script setup lang="ts">
import { MermaidBlock } from '@coderminer/vue-markdown'

const diagram = `flowchart LR
  Markdown --> Pipeline
  Pipeline --> Vue
`
</script>

<template>
  <MermaidBlock :source="diagram" />
</template>
```

运行时按需加载，使用 Mermaid 的严格安全模式，并在 SVG 变成节点之前进行净化。
`MermaidBlock` 提供预览/源码标签、缩放、全屏、复制、SVG 下载、PNG 导出和重试。

详见 [Mermaid](./mermaid.md)，或[富组件](./rich-components.md)中的 `MermaidBlock` 与
`MermaidLiveEditor`。

## 无头渲染

当预设标记不适合你的场景时，自己接管输出：

```ts
import { useMarkdownDocument } from '@coderminer/vue-markdown/headless'
import { gfmPlugin } from '@coderminer/vue-markdown/plugins'

const {
  document,
  toc,
  status,
  diagnostics,
  pipeline,
  plugins,
  refresh,
} = useMarkdownDocument(source, {
  plugins: [gfmPlugin],
})
```

组合式函数负责解析、记忆化、插件生命周期、状态和诊断，但不渲染任何内容。模型可序列
化，不包含 Vue、DOM、mdast、hast 或 processor 对象。

详见[无头渲染](./headless.md)。

## SSR 与静态导出

```ts
import { exportMarkdownHtml, exportMarkdownHtmlSync } from '@coderminer/vue-markdown'

const html = exportMarkdownHtmlSync(source)
const asyncHtml = await exportMarkdownHtml(source, { plugins })
```

导出与渲染共用同一套管线、插件、净化器、URL 策略、变换和标题 ID。
`exportMarkdownHtmlSync` 要求管线支持同步执行；官方管线两条路径都支持。

详见 [SSR 与静态导出](./ssr.md)。

## 下一步

- [定制](./customization.md)
- [完整示例](./complete-example.md)
- [适配器](../reference/adapters.md)
