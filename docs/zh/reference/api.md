---
description: vue-markdown-suite 的公共 API 索引，覆盖渲染器、目录、组件、配置、插件、管线、无头辅助、适配器、导出和设计系统契约。
---

# 公共 API

本页是公共契约的索引。下面每一项都从某个包入口导出。可以把它当作起点，具体行为见对应
的专题页面。

## 入口

| 导入 | 内容 |
| --- | --- |
| `vue-markdown-suite` | 渲染器、组件、组合式函数、内核辅助、插件/管线辅助、导出辅助和 `version` |
| `vue-markdown-suite/headless` | 类型、模型辅助、组合式函数；不含预设组件和 CSS |
| `vue-markdown-suite/pipeline` | 官方管线、自定义管线契约、身份辅助 |
| `vue-markdown-suite/plugins` | 插件定义、注册表、内置插件 |
| `vue-markdown-suite/presets` | 预设辅助和配置类型 |
| `vue-markdown-suite/node-components` | 节点组件目录 |
| `vue-markdown-suite/highlight` | highlight.js 适配器和归一化辅助 |
| `vue-markdown-suite/highlight/shiki` | 可选的 Shiki 适配器 |
| `vue-markdown-suite/math` | `mathPlugin`、`katexEngine`、数学类型 |
| `vue-markdown-suite/mermaid` | `mermaidPlugin`、按需加载的 Mermaid 运行时、SVG 净化器 |
| `vue-markdown-suite/editor` | 按需加载的 CodeMirror Mermaid 编辑器 |
| `vue-markdown-suite/html` | `htmlPlugin`、净化后的原始 HTML、schema 扩展 |
| `vue-markdown-suite/components/*` | 每个公共组件一个入口 |
| `vue-markdown-suite/style.css` | 完整可选样式表 |
| `vue-markdown-suite/styles/*.css` | 令牌、组件和数学样式 |

```ts
import { MarkdownRenderer, exportMarkdownHtmlSync } from 'vue-markdown-suite'
import { useMarkdownDocument, walkNodes } from 'vue-markdown-suite/headless'
import { defineMarkdownPlugin, gfmPlugin } from 'vue-markdown-suite/plugins'
import { mathPlugin } from 'vue-markdown-suite/math'
import { mermaidPlugin } from 'vue-markdown-suite/mermaid'
import { htmlPlugin } from 'vue-markdown-suite/html'
import { shiki } from 'vue-markdown-suite/highlight/shiki'
```

## 快速开始

```vue
<script setup lang="ts">
import { MarkdownRenderer } from 'vue-markdown-suite'
import 'vue-markdown-suite/style.css'

const source = '# 你好\n\n一段 **加粗** 文字。'
</script>

<template>
  <MarkdownRenderer :source="source" toc />
</template>
```

## MarkdownRenderer

预设组件：解析 Markdown、解析插件、构建目录，并通过组件目录渲染归一化文档。

### 属性

| 属性 | 类型 | 说明 |
| --- | --- | --- |
| `source` | `string` | 受控 Markdown 输入，支持 `v-model:source`。 |
| `components` | `Record<string, Component \| string>` | 以标签名为键的组件覆盖。 |
| `nodeComponents` | `Record<string, Component \| string \| NodeRenderer>` | 语义节点覆盖和函数渲染器。 |
| `regions` | `Partial<Record<string, Component \| string>>` | 结构性区域覆盖。 |
| `labels` | `Partial<MarkdownLabels>` | 内置文案，支持字符串或函数。 |
| `preset` | `MarkdownPreset \| MarkdownPreset[]` | 一个或多个预设。 |
| `plugins` | `PluginInput[]` | 传入后替换解析后的插件集合；加入 `htmlPlugin()` 启用净化后的原始 HTML。 |
| `disablePlugins` | `string[]` | 按名称移除非内核插件。 |
| `remarkPlugins` | `PluggableList` | 宿主 remark 插件。 |
| `rehypePlugins` | `PluggableList` | 宿主 rehype 插件；在内置净化器之后运行。 |
| `remarkRehypeOptions` | `Record<string, unknown>` | mdast → hast 转换选项。 |
| `pipeline` | `MarkdownPipeline` | 自定义管线，必须返回 hast。 |
| `slugger` | `MarkdownSlugger` | 标题 ID 生成器。 |
| `highlighter` | `MarkdownHighlighter` | 语法高亮适配器。 |
| `mathEngine` | `MathEngine` | 数学渲染适配器。 |
| `mermaidRenderer` | `MermaidRenderer` | Mermaid 渲染适配器。 |
| `diagnosticsFormatter` | `DiagnosticFormatter` | 格式化渲染错误。 |
| `allowedElements` | `string[]` | 允许列表，优先于 `disallowedElements`。 |
| `disallowedElements` | `string[]` | 拒绝列表。 |
| `unwrapDisallowed` | `boolean` | 保留被移除元素的子节点。 |
| `allowElement` | `AllowElement` | 在允许/拒绝列表之后逐个判断。 |
| `urlTransform` | `MarkdownUrlTransform` | URL 改写钩子；返回 `null` 删除属性。 |
| `linkTarget` | `string` | 默认链接目标。 |
| `externalLinkTarget` | `'_self' \| '_blank'` | 外部链接目标策略。 |
| `baseUrl` | `string` | 解析相对 URL。 |
| `idPrefix` | `string` | 为标题 ID 加前缀。 |
| `syncHash` | `boolean` | 标题导航时更新 URL hash。 |
| `toc` | `boolean` | 渲染目录区域。 |
| `tocDepth` | `number` | 目录包含的最大标题层级；`0` 表示全部层级。 |
| `showError` | `boolean` | 失败时渲染错误区域。 |
| `tokens` | `Record<string, string>` | 内联 `--vmd-*` 自定义属性。 |
| `theme` | `'light' \| 'dark' \| 'auto' \| 'custom'` | 设置 `data-vmd-theme`。 |
| `as` | `string \| Component` | 根元素或根组件。 |

### 事件

| 事件 | 负载 |
| --- | --- |
| `update:source` | `source: string` |
| `toc-change` | `TocItem[]` |
| `link-click` | `{ url, target, node, event }` |
| `custom-tag-click` | `{ tag, props, node, event }` |
| `task-change` | `{ checked, node }` |
| `render-error` | `MarkdownDiagnostic` |
| `ready` | `MarkdownDocument` |

### 实例方法

```ts
import { ref } from 'vue'
import type { MarkdownRendererInstance } from 'vue-markdown-suite'

const renderer = ref<MarkdownRendererInstance>()

renderer.value?.getToc()
renderer.value?.getDocument()
renderer.value?.scrollToHeading('install')
await renderer.value?.refresh()
renderer.value?.updateSource('# 新的源码')
```

| 方法 | 签名 |
| --- | --- |
| `getToc` | `() => TocItem[]` |
| `getDocument` | `() => MarkdownDocument \| undefined` |
| `scrollToHeading` | `(id: string, options?: ScrollIntoViewOptions) => void` |
| `refresh` | `() => Promise<void>` |
| `updateSource` | `(source: string) => void` |

### 插槽

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

### 区域

`regions` 替换结构组件。替换组件收到与默认组件相同的 props。

| 区域 | Props | 事件 |
| --- | --- | --- |
| `root` | `as`、`tokens`、`theme` | — |
| `content` | `nodes` | — |
| `toc` | `items`、`activeId`、`label`、`tocItem`、`tocDepth` | `navigate` |
| `tocItem` | `item`、`active` | `navigate` |
| `codeBlock` | `CodeBlock` props 加区域动作 | — |
| `mermaidBlock` | `MermaidBlock` props | — |
| `error` | `diagnostics`、`label` | — |
| `empty` | `label` | — |
| `loading` | `label` | — |

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

### 优先级

```text
配置：
  局部属性 > 最近的 Provider > 预设 > 插件默认值 > 内置默认值

区域：
  插槽 > regions 覆盖 > 插件贡献 > 预设 > 内置

节点渲染：
  nodeComponents 函数 > nodeComponents[tag] > components[tag]
    > nodeComponents[kind] > 插件组件 > 预设 > 内置
```

## 目录

目录需要显式开启，从渲染文档中的标题构建。

```ts
interface TocItem {
  id: string
  text: string
  level: number
}
```

### 启用与读取

```vue
<MarkdownRenderer
  :source="source"
  toc
  :toc-depth="3"
  @toc-change="onTocChange"
/>
```

```ts
import { ref } from 'vue'
import type { MarkdownRendererInstance, TocItem } from 'vue-markdown-suite'

const renderer = ref<MarkdownRendererInstance>()
const toc = ref<TocItem[]>([])

function onTocChange(items: TocItem[]) {
  toc.value = items
}

function goTo(id: string) {
  renderer.value?.scrollToHeading(id, { behavior: 'smooth', block: 'start' })
}
```

`tocDepth` 是最大层级，不是数量。`3` 包含 `h1`–`h3`，排除 `h4`–`h6`；`0` 或省略表示
包含全部层级。

| API | 作用 |
| --- | --- |
| `toc` | 显示目录区域。 |
| `tocDepth` | 包含到这一层级的标题；`0` 表示全部。 |
| `toc-change` | 目录签名变化时触发过滤后的 `TocItem[]`。 |
| `getToc()` | 命令式读取当前目录。 |
| `scrollToHeading(id, options?)` | 滚动到渲染器根内的标题。 |
| `syncHash` | 把导航到的标题 ID 写入 URL hash。 |
| `idPrefix` | 让同一页面的多个渲染器标题 ID 保持唯一。 |
| `labels.toc` | 目录的可访问标签。 |

### 替换整个目录

```vue
<MarkdownRenderer :source="source" toc>
  <template #toc="{ items, activeId, label, navigate }">
    <nav class="my-toc" :aria-label="label">
      <button
        v-for="item in items"
        :key="item.id"
        :data-active="item.id === activeId"
        @click="navigate(item.id)"
      >
        {{ item.text }}
      </button>
    </nav>
  </template>
</MarkdownRenderer>
```

### 替换单项

```vue
<MarkdownRenderer :source="source" toc>
  <template #toc-item="{ item, active, navigate }">
    <a
      :href="`#${item.id}`"
      :aria-current="active ? 'location' : undefined"
      @click.prevent="navigate(item.id)"
    >
      {{ item.level }}. {{ item.text }}
    </a>
  </template>
</MarkdownRenderer>
```

### 用区域组件替换

`MyToc` 收到 `items`、`activeId`、`label` 和可选的 `tocItem`，并触发 `navigate(id)`；
`MyTocItem` 收到 `item` 和 `active`，同样触发 `navigate(id)`。

```ts
const regions = {
  toc: MyToc,
  tocItem: MyTocItem,
}
```

### 独立目录组件

想围绕文档模型自己搭布局时，`MarkdownToc` 和 `MarkdownTocItem` 都是公共组件。

```vue
<script setup lang="ts">
import { MarkdownToc } from 'vue-markdown-suite'
import type { TocItem } from 'vue-markdown-suite'

const items: TocItem[] = [
  { id: 'install', text: '安装', level: 1 },
  { id: 'usage', text: '用法', level: 2 },
]

function navigate(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
}
</script>

<template>
  <MarkdownToc
    :items="items"
    :active-id="items[0]?.id"
    label="目录"
    @navigate="navigate"
  />
</template>
```

| 组件 | Props | 事件 | 插槽 |
| --- | --- | --- | --- |
| `MarkdownToc` | `items`、`activeId`、`label`、`tocItem`、`tocDepth` | `navigate` | `toc-item` |
| `MarkdownTocItem` | `item`、`active` | `navigate` | — |

### 在渲染器外跟踪当前标题

```ts
import { useActiveHeading } from 'vue-markdown-suite'

const ids = computed(() => toc.value.map((item) => item.id))
const activeId = useActiveHeading(ids, true, { root: myRootElement })
```

`useActiveHeading(ids, enabled?, { root? })` 返回 `Ref<string | undefined>`。
`findElementById(scope, id)` 也作为作用域内标题查找工具导出。

## 组件

每个组件在适用时通过 `node` 接收归一化节点，并通过默认插槽渲染子节点。组件与 CSS 无关，
且 SSR 安全。

### 渲染器与结构组件

| 组件 | 作用 |
| --- | --- |
| `MarkdownRenderer` | 预设渲染器 |
| `MarkdownConfigProvider` | 应用级配置默认值 |
| `MarkdownRoot` | 应用主题和令牌的根外壳 |
| `MarkdownContent` | 内容容器 |
| `MarkdownToc` / `MarkdownTocItem` | 目录导航 |
| `MarkdownError` / `MarkdownEmpty` / `MarkdownLoading` | 状态区域 |

### 节点目录

| 组件 | 节点或作用 |
| --- | --- |
| `MarkdownParagraph` | `p` |
| `MarkdownHeading` | 带 ID 和锚点的 `h1`–`h6` |
| `MarkdownEmphasis` / `MarkdownStrong` / `MarkdownStrikethrough` | `em`、`strong`、`del` |
| `MarkdownLink` / `MarkdownImage` | `a`、`img` |
| `MarkdownList` / `MarkdownListItem` | `ul`、`ol`、`li` |
| `MarkdownBlockquote` / `MarkdownHorizontalRule` | `blockquote`、`hr` |
| `MarkdownTable` / `MarkdownTableSection` / `MarkdownTableRow` / `MarkdownTableCell` | 表格标签 |
| `MarkdownInlineCode` / `MarkdownCode` / `MarkdownBreak` | `code`、`br` |
| `MarkdownHtml` / `MarkdownCustomTag` | 转义 HTML 和自定义标签 |
| `MarkdownTaskItem` / `MarkdownFootnoteReference` / `MarkdownFootnotes` | GFM 任务项和脚注 |
| `MarkdownMath` / `MarkdownMermaid` | 富语义节点 |
| `MarkdownChildren` | 区域使用的递归渲染器 |

### 富组件

| 组件 | Props | 事件 | 插槽 | 暴露 |
| --- | --- | --- | --- | --- |
| `CodeBlock` | `node`、`code`、`language`、`highlighter`、`theme`、`actions`、`showActions`、`showDownload`、`title`、`fileName`、`lineNumbers`、`highlightLines`、`maxLines`、`virtual`、`virtualThreshold`、`lineHeight`、`delay`、`standalone`、`ignoreRegion` | `copy`、`download`、`action`、`error` | `code`、`code-actions`、`header`、`toolbar` | `copy`、`download`、`getHighlighted`、`highlighted` |
| `VueSyntaxHighlighter` | `source`、`language`、`theme`、`highlighter`、`lineNumbers`、`highlightLines`、`maxLines`、`virtual`、`virtualThreshold`、`lineHeight`、`delay` | `copy`、`error` | `header`、`footer`、`empty`、`actions`、`highlighter` | `copy`、`getHighlighted`、`highlighted` |
| `MermaidBlock` | `node`、`source`、`renderer`、`theme`、`showErrors`、`enableZoom`、`allowFullscreen`、`compact`、`actions` | `rendered`、`error`、`copy`、`export`、`fullscreen`、`action` | `header`、`tabs`、`actions`、`mermaid`、`mermaid-error` | `render`、`copy`、`exportPng`、`downloadSvg`、`toggleFullscreen` |
| `MermaidLiveEditor` | `modelValue`、`debounce`、`theme`、`renderer`、`diagnosticsFormatter`、`compact`、`initialRatio`、`minRatio` | `update:modelValue`、`preview`、`error` | `editor`、`editor-diagnostics` | `focus`、`refreshPreview`、`toggleFullscreen`、`getDiagnostics` |
| `MarkdownMath` | `node`、`tex`、`displayMode`、`rendered`、`error`、`mathEngine` | — | `math`、`math-error` | — |

`CodeBlock` 和 `MermaidBlock` 自带样式化头部和内联 SVG 图标操作。图标按钮保留可访问
标签，不引入图标依赖，也能配合可选样式表使用。

完整用法见[富组件](../guide/rich-components.md)，清单注册表见[组件](./components.md)。

## 配置

```ts
interface MarkdownConfig {
  theme?: MarkdownTheme
  tokens?: Record<string, string>
  labels?: Partial<MarkdownLabels>
  components?: MarkdownTagComponents
  regions?: MarkdownRegionComponents
  nodeComponents?: MarkdownNodeComponents
  plugins?: PluginInput[]
  pipeline?: MarkdownPipeline
  highlighter?: MarkdownHighlighter
  mathEngine?: MathEngine
  mermaidRenderer?: MermaidRenderer
  diagnosticsFormatter?: DiagnosticFormatter
  slugger?: MarkdownSlugger
  urlTransform?: MarkdownUrlTransform
}
```

`MarkdownConfigProvider` 接受以上所有字段，另外还有 `config` 和 `preset`。局部渲染器属性
优先于最近的 Provider。

```vue
<MarkdownConfigProvider
  theme="auto"
  :tokens="{ '--vmd-color-accent': '#7c3aed' }"
  :labels="{ toc: '目录' }"
  :highlighter="shiki"
>
  <MarkdownRenderer :source="source" toc />
</MarkdownConfigProvider>
```

### 预设

| API | 作用 |
| --- | --- |
| `MarkdownPreset` | 命名的 `MarkdownConfig` 包 |
| `defineMarkdownPreset(preset)` | 校验并返回预设 |
| `composePresets(...presets)` | 组合预设，后值优先 |
| `resolvePreset(input)` | 解析单个预设或预设数组 |
| `mergeMarkdownConfig(base, next)` | 合并配置映射 |
| `mergeMarkdownPreset(base, next)` | 合并预设并追加插件 |

```ts
import { composePresets, defineMarkdownPreset } from 'vue-markdown-suite/presets'

const docs = defineMarkdownPreset({
  name: 'docs',
  theme: 'auto',
  labels: { toc: '本页目录' },
})

const brand = defineMarkdownPreset({
  name: 'brand',
  tokens: { '--vmd-color-accent': '#7c3aed' },
})

const preset = composePresets(docs, brand)
```

## 节点与覆盖

公共模型可序列化，不包含 Vue、DOM、mdast、hast 或 processor 对象。

| 节点 | 形状 |
| --- | --- |
| `text` | `{ kind, key, value, segments?, source? }` |
| `element` | `{ kind, key, tag, attrs, children, source? }` |
| `code` | `{ kind, key, code, language, highlighted?, source? }` |
| `math` | `{ kind, key, tex, displayMode, rendered?, source? }` |
| `mermaid` | `{ kind, key, code, complete, index, source? }` |
| `custom` | `{ kind, key, tag, props, attrs, children, source? }` |
| `plugin` | `{ kind, key, type, payload, children?, source? }` |

```ts
const nodeComponents = {
  code: MyCodeNode,
  mermaid: MyMermaidNode,
  blockquote: MyCallout,
}
```

```vue
<MarkdownRenderer
  :source="source"
  :plugins="plugins"
  :node-components="nodeComponents"
/>
```

完整的自定义 `code` 和 `mermaid` 示例见[定制](../guide/customization.md)。

## 插件

```ts
interface MarkdownPlugin {
  name: string
  core?: boolean
  phase?: 'pre' | 'normal' | 'post'
  html?: boolean
  htmlSchema?: HtmlSchemaExtension
  remarkPlugins?: PluggableList
  rehypePlugins?: PluggableList
  remarkRehypeOptions?: Record<string, unknown>
  transformSource?(source: string, ctx: PluginContext): string
  transformDocument?(
    document: MarkdownDocument,
    ctx: PluginContext,
  ): MarkdownDocument | void
  nodeComponents?: MarkdownNodeComponents
  components?: MarkdownTagComponents
  regions?: MarkdownRegionComponents
  labels?: Partial<MarkdownLabels>
  tokens?: Record<string, string>
  setup?(ctx: PluginContext): void | (() => void)
  onError?(error: unknown, phase: DiagnosticPhase, ctx: PluginContext): void
}
```

来自 `vue-markdown-suite/html` 的 `htmlPlugin()` 会设置 `html: true`；它的
`HtmlSchemaExtension` 可以为原始 HTML 净化器增加 `tags` 和 `attributes`。

```ts
import { defineMarkdownPlugin } from 'vue-markdown-suite/plugins'

export const myPlugin = defineMarkdownPlugin({
  name: 'my-plugin',
  phase: 'normal',
  remarkPlugins: [],
  rehypePlugins: [],
  transformSource(source) {
    return source
  },
  transformDocument(document) {
    return document
  },
  labels: { toc: '目录' },
})
```

| API | 作用 |
| --- | --- |
| `defineMarkdownPlugin` | 定义插件或插件工厂 |
| `validatePlugin` | 校验并归一化单个插件 |
| `createPluginContext` | 构建传给插件钩子的上下文 |
| `resolvePlugins` | 排序、去重并合并插件贡献 |
| `tocPlugin`、`codePlugin`、`linkPlugin` | 内核不变标记 |
| `searchPlugin(options)` | 搜索匹配片段 |
| `customTagsPlugin({ tags })` | 把标签转换成自定义节点 |
| `gfmPlugin` | GFM remark 插件 |
| `frontmatterPlugin` | frontmatter 捕获 |
| `defaultPlugins` / `fullPlugins` | 内置插件集合 |

排序是 `pre` → `normal` → `post`，然后按注册顺序。内核不变标记不能被禁用。详见
[插件](../guide/plugins.md)。

## 管线

```ts
interface MarkdownPipeline {
  name: string
  capabilities?: PipelineCapabilities
  process(source: string, ctx: PipelineContext): Promise<PipelineResult>
  processSync?(source: string, ctx: PipelineContext): PipelineResult
  dispose?(): void
}
```

```ts
import {
  createOfficialPipeline,
  defineMarkdownPipeline,
} from 'vue-markdown-suite/pipeline'

const official = createOfficialPipeline()

const pipeline = defineMarkdownPipeline({
  name: 'my-pipeline',
  process(source, ctx) {
    return official.process(source, ctx)
  },
  processSync(source, ctx) {
    if (!official.processSync) {
      throw new Error('官方管线不支持同步执行。')
    }
    return official.processSync(source, ctx)
  },
})
```

| API | 作用 |
| --- | --- |
| `createOfficialPipeline(options?)` | 创建官方 unified 管线 |
| `defineMarkdownPipeline(pipeline)` | 校验并返回管线 |
| `validatePipeline(pipeline)` | 返回诊断而不是抛错 |
| `resolvePipeline(pipeline?)` | 非法输入时回退官方管线 |
| `assertPipelineResult(result)` | 校验 `{ hast }` 结果 |
| `createMemoKey(...)` / `createPipelineIdentity(...)` | 构建稳定的解析 key |

详见[自定义管线](../guide/custom-pipeline.md)。

## 无头

```ts
import { useMarkdownDocument } from 'vue-markdown-suite/headless'

const {
  document,
  toc,
  status,
  diagnostics,
  pipeline,
  plugins,
  refresh,
  resolvedComponents,
  resolvedNodeComponents,
  resolvedRegions,
  resolvedLabels,
  resolvedTokens,
} = useMarkdownDocument(source, options)
```

| 返回 | 类型 |
| --- | --- |
| `document` | `ShallowRef<MarkdownDocument \| undefined>` |
| `toc` | `ComputedRef<TocItem[]>` |
| `status` | `ShallowRef<'idle' \| 'pending' \| 'ready' \| 'error'>` |
| `diagnostics` | `ShallowRef<MarkdownDiagnostic[]>` |
| `pipeline` | `ComputedRef<string>` |
| `plugins` | `ComputedRef<string[]>` |
| `refresh` | `() => Promise<void>` |
| `resolvedComponents` | `ComputedRef<MarkdownTagComponents>` |
| `resolvedNodeComponents` | `ComputedRef<MarkdownNodeComponents>` |
| `resolvedRegions` | `ComputedRef<MarkdownRegionComponents>` |
| `resolvedLabels` | `ComputedRef<Partial<MarkdownLabels>>` |
| `resolvedTokens` | `ComputedRef<Record<string, string>>` |

### 内核辅助函数

| 分组 | 导出 |
| --- | --- |
| 模型 | `buildDocument`、`withDerivedDocument` |
| 归一化 | `normalizeHast`、`extractToc`、`filterTocByDepth`、`collectCustomTags`、`walkNodes` |
| 搜索 | `searchDocument`、`segmentSearch`、`countSearchMatches` |
| URL | `defaultUrlTransform`、`isExternalUrl`、`resolveUrl` |
| 诊断 | `createDiagnostic`、`errorMessage` |
| 记忆化 | `memoGet`、`memoSet`、`memoClear`、`memoSize` |
| Slug | `withUniqueSlugs` |
| 清单 | `COMPONENT_MANIFESTS`、`getComponentManifest`、`validateManifest`、`validateManifestRegistry` |
| 配置/预设 | `mergeMarkdownConfig`、`mergeMarkdownPreset`、`defineMarkdownPreset`、`composePresets`、`resolvePreset` |
| 适配器守卫 | `isValidHighlighter`、`isValidMathEngine`、`isValidMermaidRenderer`、`isValidDiagnosticFormatter`、`isValidSlugger`、`isValidUrlTransform` |
| 导出 | `exportMarkdownHtml`、`exportMarkdownHtmlSync` |
| 管线 | `createOfficialPipeline`、`defineMarkdownPipeline`、`validatePipeline`、`resolvePipeline`、`assertPipelineResult` |

```ts
import { walkNodes } from 'vue-markdown-suite/headless'

walkNodes(document.value?.nodes ?? [], (node, parent) => {
  // 深度优先访问每个节点。
})
```

## 适配器

| 契约 | 必需形状 |
| --- | --- |
| `MarkdownHighlighter` | `{ id, highlight(code, language, options), load?, languages?, loadLanguage? }` |
| `MathEngine` | `{ id, render(tex, options), load? }` |
| `MermaidRenderer` | `{ id, render(source, options) }` |
| `DiagnosticFormatter` | `{ id?, format(error, source) }` |
| `MarkdownSlugger` | `{ slug(value), reset? }` |
| `MarkdownUrlTransform` | `(url, key, node) => string \| null \| undefined` |

```ts
import type { MarkdownHighlighter } from 'vue-markdown-suite'

const highlighter: MarkdownHighlighter = {
  id: 'my-highlighter',
  highlight(code, language) {
    return {
      language,
      nodes: [{ kind: 'text', key: 'code', value: code }],
    }
  },
}
```

每个契约和内置适配器见[适配器](./adapters.md)。

## 静态导出

```ts
import {
  exportMarkdownHtml,
  exportMarkdownHtmlSync,
} from 'vue-markdown-suite'

const html = exportMarkdownHtmlSync('# 你好')
const asyncHtml = await exportMarkdownHtml(source, {
  plugins: fullPlugins,
  highlighter: highlightjs,
})
```

| API | 作用 |
| --- | --- |
| `exportMarkdownHtml(source, options?)` | 异步静态 HTML 导出 |
| `exportMarkdownHtmlSync(source, options?)` | 管线同步时的同步导出 |
| `StaticHtmlOptions` | `MarkdownDocumentOptions` 的别名 |

详见 [SSR 与静态导出](../guide/ssr.md)。

## 设计系统

| API | 作用 |
| --- | --- |
| `PARTS` / `PART_NAMES` | 稳定部件名 |
| `TOKENS` / `TOKEN_NAMES` | 稳定 `--vmd-*` 令牌名 |
| `partAttrs(part)` / `partClass(part, extra?)` | 构建稳定的部件属性/类名 |
| `VMD_CLASS_PREFIX` | `vmd-` |
| `DEFAULT_LABELS` / `resolveLabel(value, context?)` | 内置文案 |
| `COMPONENT_MANIFESTS` / `getComponentManifest(name)` | 组件清单注册表 |
| `validateManifest(entry, snapshot)` / `validateManifestRegistry()` | 清单校验 |

```ts
import { getComponentManifest, partAttrs } from 'vue-markdown-suite'

const manifest = getComponentManifest('CodeBlock')
const attrs = partAttrs('code')
```

详见[样式与主题](../guide/styling.md)和[组件](./components.md)。

## 公共类型

| 分组 | 类型 |
| --- | --- |
| 文档 | `MarkdownDocument`、`MarkdownNode`、`MarkdownTextNode`、`MarkdownElementNode`、`MarkdownCodeNode`、`MarkdownMathNode`、`MarkdownMermaidNode`、`MarkdownCustomTagNode`、`MarkdownPluginNode`、`TocItem`、`MarkdownTextSegment`、`MarkdownElementLike`、`CustomTagInstance`、`SourceRange`、`SourcePosition` |
| 配置 | `MarkdownConfig`、`MarkdownDocumentOptions`、`MarkdownPreset`、`MarkdownTheme`、`MarkdownLabels`、`MarkdownLabelValue`、`MarkdownLabelContext`、`MarkdownComponentValue`、`MarkdownTagComponents`、`MarkdownNodeComponents`、`MarkdownRegionComponents` |
| Vue 适配 | `MarkdownRendererInstance`、`VueMarkdownTagComponents`、`VueMarkdownNodeComponents`、`VueMarkdownRegionComponents`、`MarkdownNodeRenderer`、`MarkdownNodeRenderContext`、`RenderContext`、`LinkClickPayload`、`CustomTagClickPayload`、`TaskChangePayload` |
| 插件 | `MarkdownPlugin`、`PluginInput`、`MarkdownPluginFactory`、`PluginContext`、`ResolvedPlugins` |
| 管线 | `MarkdownPipeline`、`PipelineResult`、`PipelineContext`、`PipelineCapabilities`、`PipelineIdentityInput`、`OfficialPipelineOptions` |
| 适配器 | `MarkdownHighlighter`、`HighlightOptions`、`HighlightResult`、`MathEngine`、`MathRenderOptions`、`MathRenderResult`、`MermaidRenderer`、`MermaidRenderOptions`、`MermaidRenderResult`、`DiagnosticFormatter`、`MarkdownSlugger`、`MarkdownUrlTransform`、`AllowElement` |
| 诊断 | `MarkdownDiagnostic`、`DiagnosticSeverity`、`DiagnosticPhase` |
| 清单 | `MarkdownComponentManifest`、`ManifestIssueCode`、`ManifestValidationIssue`、`ManifestRenderSnapshot` |
| 无头 | `UseMarkdownDocumentReturn`、`MarkdownStatus`、`UseActiveHeadingOptions`、`BuildDocumentOptions`、`NormalizeOptions`、`NormalizeResult`、`SearchOptions` |
| 导出 | `StaticHtmlOptions` |
| 样式 | `MarkdownPart`、`MarkdownToken`、`PartAttributes` |
| 组件 | `CodeBlockAction`、`MermaidAction`、`HighlightLine` |

## 下一步

- [渲染器参考](./renderer.md)
- [组件](./components.md)
- [适配器](./adapters.md)
- [文档模型](./document-model.md)
- [入口](./entry-points.md)
