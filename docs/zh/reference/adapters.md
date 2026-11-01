---
description: 高亮器、数学、Mermaid、slugger、URL 变换、诊断、插件和管线契约。
---

# 适配器与扩展契约

适配器是带 `id` 和单个方法的小对象。非法适配器会通过 `render-error` 报告，并使用
文档化的回退。

## 高亮器

```ts
import type { MarkdownHighlighter } from '@coderminer/vue-markdown'

const highlighter: MarkdownHighlighter = {
  id: 'my-highlighter',
  languages: ['ts'],
  async load() {
    await loadGrammar()
  },
  highlight(code, language, options) {
    return {
      language,
      nodes: [{ kind: 'text', key: 'code', value: code }],
    }
  },
}
```

`highlight` 返回归一化节点，永远不返回 HTML 字符串。抛错、未知语言和非法结果都会回退为
纯源码。结果按适配器身份、源码、语言、主题和选项缓存。

内置适配器：`@coderminer/vue-markdown/highlight` 的 `highlightjs`，以及
`@coderminer/vue-markdown/highlight/shiki` 的 `shiki`。

## 数学引擎

```ts
import type { MathEngine } from '@coderminer/vue-markdown'

const engine: MathEngine = {
  id: 'my-math',
  render(tex, options) {
    return {
      nodes: [{ kind: 'text', key: 'math', value: tex }],
    }
  },
}
```

返回 `{ nodes, error? }`。非法 TeX 可以返回 `error` 字符串；渲染器通过 `math-error`
部件和插槽呈现它。

内置引擎：`@coderminer/vue-markdown/math` 的 `katexEngine`。

## Mermaid 渲染器

```ts
import type { MermaidRenderer } from '@coderminer/vue-markdown'

const renderer: MermaidRenderer = {
  id: 'my-mermaid',
  async render(source, options) {
    return {
      svg: await render(source, options),
      nodes: [],
    }
  },
}
```

自定义输出会被净化。渲染器可以直接返回节点或 SVG 标记；非法输出会保留上一次成功预览，
并报告诊断。

内置渲染器：`@coderminer/vue-markdown/mermaid` 的 `renderMermaid`。

## Slugger 与 URL 变换

```ts
import type { MarkdownSlugger, MarkdownUrlTransform } from '@coderminer/vue-markdown'

const slugger: MarkdownSlugger = {
  slug(value) {
    return value.toLowerCase().replace(/\s+/g, '-')
  },
  reset() {},
}

const urlTransform: MarkdownUrlTransform = (url, key, node) => {
  if (key === 'href' && url.startsWith('/old/')) {
    return url.replace('/old/', '/new/')
  }
  return url
}
```

`urlTransform` 返回 `null` 会删除属性。变换后的值会再次校验，永远不能绕过 URL 策略。

## 诊断格式化器

```ts
import type { DiagnosticFormatter } from '@coderminer/vue-markdown'

const formatter: DiagnosticFormatter = {
  id: 'my-formatter',
  format(error, source) {
    return {
      code: 'render-failed',
      message: String(error),
      severity: 'error',
      phase: 'render',
    }
  },
}
```

## 插件契约

```ts
import { defineMarkdownPlugin } from '@coderminer/vue-markdown/plugins'

const plugin = defineMarkdownPlugin({
  name: 'my-plugin',
  phase: 'normal',
  remarkPlugins: [],
  rehypePlugins: [],
  remarkRehypeOptions: {},
  components: { h2: 'h3' },
  nodeComponents: {},
  regions: {},
  labels: { toc: '目录' },
  tokens: { '--vmd-color-accent': '#7c3aed' },
  transformSource(source, ctx) {
    return source
  },
  transformDocument(document, ctx) {
    return document
  },
  setup(ctx) {
    return () => {}
  },
  onError(error, phase, ctx) {},
})
```

插件的 setup 对每个解析后的插件集合在 `effectScope` 内执行一次。重新配置和卸载时执行
清理。失败插件会被隔离，不会破坏上一份正常文档。

排序和错误隔离见[插件](../guide/plugins.md)。

## 管线契约

```ts
import type { MarkdownPipeline } from '@coderminer/vue-markdown/pipeline'

const pipeline: MarkdownPipeline = {
  name: 'my-pipeline',
  capabilities: { sync: true },
  process(source, ctx) {
    return Promise.resolve({
      hast: { type: 'root', children: [] },
      frontmatter: {},
    })
  },
  processSync(source, ctx) {
    return {
      hast: { type: 'root', children: [] },
    }
  },
  dispose() {},
}
```

自定义管线必须返回 hast root。非法管线会带着诊断回退到官方管线。详见
[自定义管线](../guide/custom-pipeline.md)。

## 下一步

- [入口](./entry-points.md)
- [文档模型](./document-model.md)
- [插件指南](../guide/plugins.md)
