---
description: mathPlugin、KaTeX、分隔符、宏，以及优雅的回退行为。
---

# 数学公式

数学位于可选入口，KaTeX 不会进入核心包。

```ts
import { defaultPlugins } from 'vue-markdown-suite/plugins'
import { katexEngine, mathPlugin } from 'vue-markdown-suite/math'
import 'vue-markdown-suite/styles/math-full.css'

const plugins = [...defaultPlugins, mathPlugin()]
```

`styles/math-full.css` 同时引入 `katex/dist/katex.min.css` 和
`styles/math.css`，一次引入即可完整显示块级公式。如果你已经自行加载 KaTeX 样式表，
改用 `vue-markdown-suite/styles/math.css`。没有 KaTeX CSS 时，MathML 回退可能显示两次。

保持插件实例稳定：在模块作用域或 `setup` 中创建一次，不要在响应式渲染中内联创建。

`mathPlugin` 组合 `remark-math` 与 `rehype-katex`。默认启用行内 `$...$` 和块级
`$$...$$`。插件会在每个数学节点上保留精确的 TeX 源码并传给 `MarkdownMath`，因此自定义
引擎可以重新渲染，而不必重新解析。

## 选项

```ts
mathPlugin({
  singleDollarTextMath: true,
  inlineDelimiters: ['\\(', '\\)'],
  displayDelimiters: ['\\[', '\\]'],
  katex: { macros: { '\\RR': '\\mathbb{R}' } },
})
```

自定义分隔符在解析前转换，不会影响围栏代码或行内代码。转义的分隔符保持字面量；未配对
的分隔符按普通文本渲染。

## 引擎

`katexEngine` 使用 `htmlAndMathml`、`throwOnError: false`、`trust: false`、安全的
strictness，并带渲染缓存。非法 TeX 会产生 `math-error` 诊断和可读的回退内容。

```ts
import type { MathEngine } from 'vue-markdown-suite'

const engine: MathEngine = {
  id: 'my-engine',
  render(tex, options) {
    return { nodes: [{ kind: 'text', key: 'x', value: tex }] }
  },
}
```

可以通过 `mathEngine` 局部传入，或从 `MarkdownConfigProvider` 注入。独立的
`MarkdownMath` 也接受自己的 `mathEngine` 属性，并提供 `math` 与 `math-error` 插槽。
既没有引擎也没有预渲染节点时，它会保留 TeX 可见，并报告 `math-engine-unavailable`；
可选样式表让块级公式更易读，不引入样式表时 TeX 仍然作为可访问文本呈现。

## 服务端渲染

KaTeX 渲染是同步且确定性的。服务端输出包含 MathML 和默认 KaTeX HTML，无头入口不会加载
引擎。

## 下一步

- [Mermaid](./mermaid.md)
- [富组件](./rich-components.md)
