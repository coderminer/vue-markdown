---
description: highlight.js 与 Shiki 适配器、缓存和服务端渲染。
---

# 语法高亮

围栏代码默认通过 `CodeBlock` 渲染；独立代码片段用 `VueSyntaxHighlighter`，两者共享同一
套适配器契约。

## 官方适配器

语法高亮需要显式启用。`CodeBlock` 默认直接渲染转义后的源码，不会引入任何高亮引擎。
传入官方 highlight.js 适配器（或任意自定义适配器）才会开启高亮：

```ts
import { highlightjs } from '@coderminer/vue-markdown/highlight'
```

```vue
<MarkdownRenderer :source="source" :highlighter="highlightjs" />
```

引入该入口之前，请把 `highlight.js` 安装为可选 peer。适配器显式注册了一组语言：Bash、C、C++、
C#、CSS、Diff、Go、INI、Java、JavaScript、JSON、Kotlin、Less、Lua、Markdown、PHP、
Python、Ruby、Rust、SCSS、Shell、SQL、Swift、TypeScript、HTML/XML、YAML，以及
`js`/`jsx`、`ts`/`tsx`、`html`/`svg`、`sh`/`zsh` 等别名。它内部使用 `lowlight`
直接生成 hast 节点，不经过 HTML 字符串往返，并同步高亮。

## Shiki

可选的 Shiki 入口会预加载 highlighter、主题和语言。在就绪之前，源码按纯文本渲染。

```ts
import { shiki } from '@coderminer/vue-markdown/highlight/shiki'

const highlighter = shiki
```

引入该入口之前，请把 `shiki` 安装为可选 peer。

## 选择适配器

当前适配器按“局部属性 > `MarkdownConfigProvider` > 预设”解析；都未配置时按纯文本渲染。
`CodeBlock` 和 `VueSyntaxHighlighter` 通过 `data-highlighter` 暴露已解析的身份，切换适配器
不会重新解析文档。

```vue
<MarkdownRenderer
  :source="source"
  :highlighter="shiki"
  :preset="docsPreset"
/>
```

单个代码块可以覆盖 Provider：

```vue
<CodeBlock :node="node" :highlighter="highlightjs" />
```

## 自定义适配器

适配器是一个带唯一 `id` 和 `highlight` 方法的对象，返回归一化节点，而不是 HTML 字符串：

```ts
import type { MarkdownHighlighter } from '@coderminer/vue-markdown'

export const myHighlighter: MarkdownHighlighter = {
  id: 'my-highlighter',
  load: async () => {
    await loadMyGrammar()
  },
  highlight(code, language) {
    return {
      language,
      nodes: [{ kind: 'text', key: 'code', value: code }],
    }
  },
}
```

未知语言、抛出的错误和非法结果都会回退为纯源码，不会让代码块崩溃。结果按适配器身份、
源码、语言、主题和选项缓存。适配器自带包裹结构时，可以返回 `mode: 'block'`。

未配置适配器时，代码块按纯文本渲染，不会报告错误。适配器的 `load()` 或
`loadLanguage()` 失败会报告 `highlighter-load`。复制和自定义操作失败分别报告
`copy-error` 与 `action-error`，下载失败报告 `download-error`。源码始终可读。

## 服务端渲染

在服务端，`CodeBlock` 渲染纯源码，挂载后由配置的适配器负责高亮。highlight.js、Shiki 等
引擎不会进入基础渲染器、无头、管线或插件入口。

## 下一步

- [富组件](./rich-components.md)
- [数学公式](./math.md)
