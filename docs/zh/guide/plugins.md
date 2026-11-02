---
description: 插件契约、排序、生命周期，以及与 remark/rehype 的协作方式。
---

# 插件与 remark/rehype 集成

插件是核心解析、安全、目录、代码和链接不变式之外的主要行为扩展点。一个插件可以贡献
remark/rehype 插件、`remarkRehypeOptions`、源码和文档变换、组件、文案、令牌，以及
setup/cleanup。

## 定义一个插件

```ts
import { defineMarkdownPlugin } from '@coderminer/vue-markdown/plugins'

export const myPlugin = defineMarkdownPlugin({
  name: 'my-plugin',        // 必填且唯一
  phase: 'normal',          // 'pre' | 'normal' | 'post'
  remarkPlugins: [],
  rehypePlugins: [],
  remarkRehypeOptions: {},
  transformSource(source, ctx) {
    return source
  },
  transformDocument(document, ctx) {
    return document
  },
  components: { h2: 'h3' },
  labels: { toc: '目录' },
  tokens: { '--vmd-color-accent': 'rgb(130, 80, 223)' },
  setup(ctx) {
    // 每个解析后的插件集合在 effectScope 中执行一次。
    return () => {
      // 重新配置和卸载时清理。
    }
  },
  onError(error, phase, ctx) {
    // 可选的上报钩子。
  },
})
```

也支持工厂写法：

```ts
import { searchDocument } from '@coderminer/vue-markdown/headless'
import { defineMarkdownPlugin } from '@coderminer/vue-markdown/plugins'

export const search = defineMarkdownPlugin((options: { query: string }) => ({
  name: 'search',
  transformDocument: (document) => searchDocument(document, options),
}))
```

## 完整示例：示例插件

演示站点提供了 [`demo/plugins/samplePlugin.ts`](https://github.com/coderminer/vue-markdown/blob/main/demo/plugins/samplePlugin.ts)，
覆盖全部公开钩子：源码变换、remark 插件、rehype 插件、组件贡献、文档变换、文案、
令牌、setup、cleanup 和 `onError`。

```ts
// sample-plugin.ts
import { defineComponent, h } from 'vue'
import { visit } from 'unist-util-visit'
import type { MarkdownNodeRenderContext } from '@coderminer/vue-markdown'
import { defineMarkdownPlugin } from '@coderminer/vue-markdown/plugins'

const SampleCallout = defineComponent({
  setup(_, { slots }) {
    return () => h('aside', { class: 'sample-callout' }, slots.default?.())
  },
})

const uppercaseKeyword = () => (tree) => {
  visit(tree, 'text', (node) => {
    node.value = node.value.split('plugin').join('PLUGIN')
  })
}

const markHeadings = () => (tree) => {
  visit(tree, 'element', (node) => {
    if (/^h[1-6]$/.test(node.tagName)) {
      node.properties = { ...node.properties, 'data-sample-heading': 'yes' }
    }
  })
}

export const samplePlugin = defineMarkdownPlugin({
  name: 'sample-plugin',
  phase: 'normal',
  // 解析前运行；返回非字符串时保留上一份源码。
  transformSource(source) {
    return source.replace('[[sample]]', '> Injected before parsing.')
  },
  // 在官方管线中、remark-parse / remark-rehype 之后运行。
  remarkPlugins: [uppercaseKeyword],
  rehypePlugins: [markHeadings],
  // 替换 blockquote 渲染；普通子节点用 ctx.defaultRender()。
  nodeComponents: {
    blockquote: (ctx: MarkdownNodeRenderContext) =>
      h(SampleCallout, null, { default: () => ctx.defaultRender() }),
  },
  // 在净化和模型构建之后运行。
  transformDocument(document) {
    return {
      ...document,
      frontmatter: { ...(document.frontmatter ?? {}), samplePlugin: true },
    }
  },
  labels: { toc: '示例目录' },
  tokens: { '--vmd-color-accent': '#8250df' },
  setup(ctx) {
    // 每个解析后的插件集合执行一次；注册监听器时必须返回清理函数。
    return () => {
      // 重新配置和卸载时运行。
    }
  },
  onError(error, phase, ctx) {
    ctx.addDiagnostic({
      code: 'sample-plugin-failed',
      message: String(error),
      severity: 'warning',
      phase,
      plugin: 'sample-plugin',
    })
  },
})
```

像内置插件一样注册即可。插件实例只创建一次；在模板中返回新插件会导致父组件每次
渲染都重新解析文档。

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { MarkdownRenderer } from '@coderminer/vue-markdown'
import { samplePlugin } from './sample-plugin'

const source = ref('# 插件演示\n\n[[sample]]\n\n这段文字包含 plugin。')
</script>

<template>
  <MarkdownRenderer :source="source" :plugins="[samplePlugin]" toc />
</template>
```

从数组中移除 `samplePlugin` 就能一次性停用全部贡献。演示站点增加了 `setups` 和
`cleanups` 计数器，插件数组变化时可以看到生命周期执行。

`transformSource` 在解析前按插件解析顺序运行。变换抛错或返回非字符串时，保留上一份
源码并报告 `plugin-source`；`onError` 会收到 `source` 阶段。

插件实例只创建一次。解析缓存 key 包含插件身份，因此模板里的
`:plugins="[mathPlugin()]"` 会在每次父组件渲染时重新创建插件、重新解析文档，甚至重跑
`setup` 和 cleanup。把数组提升到模块作用域或 `setup` 常量：

```ts
const plugins = [mathPlugin(), mermaidPlugin()]
```

同名插件仍然会确定性地解析，但实例身份并不稳定。

## 排序与去重

顺序是 `pre` → `normal` → `post`，同阶段内按注册顺序执行。同名插件会确定性地替换先前
注册，并产生一条诊断。`disablePlugins` 从解析后的集合中移除非内核插件。内核不变标记
（`toc`、`code`、`link`）不能被禁用；请求禁用会报告 `plugin-core` 诊断，并保留该标记。
不在解析后集合中的名称会被忽略，并报告 `plugin-unknown` 警告。完整的内置名称见
[禁用名称](#disableplugins-names)。

```vue
<MarkdownRenderer :source="source" :disable-plugins="['search']" />
```

## 优先级

对元素标签：

1. 局部 `components[tag]`
2. 插件贡献的 `nodeComponents[tag]`
3. 插件贡献的 `components[tag]`
4. 内置组件

对语义节点（`code`、`math`、`mermaid`、`custom` 和插件节点），渲染器会在同名局部
`components` 键之后查询 `nodeComponents[kind]`。也就是说，局部 `components.code` 优先于
插件的 `nodeComponents.code`。`nodeComponents.paragraph` 这样的标签键不适用于元素节点。

围栏代码是例外：`components.pre` 始终包裹代码块，内部元素按“局部 `components.code` >
插件 `nodeComponents.code` > 插件 `components.code` > 内置”解析。

## 生命周期

`setup` 对每个解析后的插件集合在 `effectScope` 内执行一次，可以返回清理函数。插件被
重新配置时和渲染器卸载时都会执行清理。不要在清理逻辑之外注册全局监听器。

## 错误隔离

失败的 remark 插件、rehype 插件或变换会带着插件名和阶段被报告。上一份正常文档会被
保留，同一个失败不会循环上报。所属插件的 `onError` 会收到 `remark` 或 `rehype` 阶段；
缓存 processor 读取当前运行的诊断，因此错误不会泄漏到更早的运行。

```ts
onError(error, phase, ctx) {
  ctx.addDiagnostic({
    code: 'my-plugin-failed',
    message: String(error),
    severity: 'warning',
    phase,
    plugin: 'my-plugin',
  })
}
```

## 宿主提供的 remark 与 rehype 插件

```vue
<script setup lang="ts">
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'

const remarkPlugins = [remarkGfm]
const rehypePlugins = [rehypeHighlight]
</script>

<template>
  <MarkdownRenderer
    :source="source"
    :remark-plugins="remarkPlugins"
    :rehype-plugins="rehypePlugins"
  />
</template>
```

宿主 remark 插件在库内置 remark 插件之后运行，宿主 rehype 插件在库内置 rehype 插件
以及内置净化器之后运行。原始 HTML 不通过 `rehypePlugins` 启用：请使用
`@coderminer/vue-markdown/html` 的 `htmlPlugin()`，让解析器和净化器保持成对。

## 内置插件

| 插件 | 作用 |
| --- | --- |
| `tocPlugin` | 内核不变标记；目录构建内置且不可禁用。 |
| `codePlugin` | 内核不变标记；代码节点构建内置且不可禁用。 |
| `linkPlugin` | 内核不变标记；链接策略内置且不可禁用。 |
| `searchPlugin(options)` | 为搜索匹配切分文本片段；真实文档变换。 |
| `customTagsPlugin({ tags })` | 把指定标签转换为自定义节点；真实文档变换。 |
| `gfmPlugin` | `remark-gfm`。 |
| `frontmatterPlugin` | `remark-frontmatter` + YAML 捕获。 |
| `htmlPlugin()` | 可选的 `@coderminer/vue-markdown/html` 入口；净化后的原始 HTML。 |

`defaultPlugins` 是 `[toc, code, link, search, custom-tags]`；`fullPlugins` 在此之上
加入 `gfm` 和 `frontmatter`。

### `disablePlugins` 名称

`disablePlugins` 匹配插件的 `name`，不是导出的工厂函数名。完整的内置名称如下：

| 名称 | 工厂 | 所属集合 | 可否禁用 |
| --- | --- | --- | --- |
| `toc` | `tocPlugin` | `defaultPlugins` | 否，内核不变标记 |
| `code` | `codePlugin` | `defaultPlugins` | 否，内核不变标记 |
| `link` | `linkPlugin` | `defaultPlugins` | 否，内核不变标记 |
| `search` | `searchPlugin()` | `defaultPlugins` | 是 |
| `custom-tags` | `customTagsPlugin()` | `defaultPlugins` | 是 |
| `gfm` | `gfmPlugin` | `fullPlugins` | 是 |
| `frontmatter` | `frontmatterPlugin` | `fullPlugins` | 是 |
| `html` | `htmlPlugin()` | 按需启用 | 是 |
| `math` | `mathPlugin()` | 按需启用 | 是 |
| `mermaid` | `mermaidPlugin()` | 按需启用 | 是 |

`customTagsPlugin` 注册的名称是 `custom-tags`，不是 `customTags`。如果传入自定义
`plugins` 数组，只有该数组中的名称会被识别，其余名称会报告 `plugin-unknown`。

前三个是内核不变标记：它们会保留在解析后的集合中用于排序和诊断，`disablePlugins`
会报告 `plugin-core` 而不会移除它们。

渲染器级的 `search` 属性是 `searchPlugin()` 之外的内核便利入口。两者同时存在时，显式
属性优先；禁用 `search` 插件不会禁用显式属性。

## 条件组合

```ts
const plugins = [
  gfm,
  isProd && analyticsPlugin,
  options.search ? searchPlugin(options.search) : false,
]
```

`false`、`null` 和 `undefined` 会被忽略。

## 下一步

- [CommonMark 与 GFM](./commonmark-gfm.md)
- [安全](./security.md)
