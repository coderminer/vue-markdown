---
description: 原始 HTML、净化、URL 策略、自定义标签、CSP 和 Trusted Types。
---

# 原始 HTML 与安全

默认配置对不可信的 Markdown 是安全的。除非宿主显式提供 trusted 选项，安全不变式不会
被定制掉。

## 原始 HTML

原始 HTML 默认**被丢弃**。标签之间的行内 HTML 文本会保留为文字。

```vue
<!-- <b>bold</b> 渲染成加粗的文字，而不是 <b> 元素 -->
<MarkdownRenderer source="<b>bold</b>" />
```

### 启用净化后的 HTML

安装 `rehype-raw`，然后从 `vue-markdown-suite/html` 引入 `htmlPlugin()`：

```bash
npm install rehype-raw
```

```vue
<script setup lang="ts">
import { MarkdownRenderer } from 'vue-markdown-suite'
import { defaultPlugins } from 'vue-markdown-suite/plugins'
import { htmlPlugin } from 'vue-markdown-suite/html'

const plugins = [...defaultPlugins, htmlPlugin()]
</script>

<template>
  <MarkdownRenderer :source="source" :plugins="plugins" />
</template>
```

`htmlPlugin()` 是启用原始 HTML 的唯一受支持方式。官方管线会在内置净化器之前运行
`rehype-raw`；手动放进 `rehypePlugins` 的 `rehype-raw` 会被忽略并给出警告。净化不可关闭。

该入口是独立的，因此不渲染原始 HTML 的应用不会打包 HTML 解析器。

### 扩展净化器

`htmlPlugin({ schema })` 可以增加标签和属性，但不能删除内置的 strip 列表，不能改变 URL
策略，也不能绕过属性规则。

```ts
const plugins = [
  htmlPlugin({
    schema: {
      tags: ['video'],
      attributes: { video: ['src', 'controls', 'poster'] },
    },
  }),
]
```

属性名使用 hast 驼峰形式（`srcSet`、`dateTime`）。`script`、`style`、`iframe`、
`object`、`embed` 仍会被删除；即使扩展列出了 `on*`、`style`、`srcdoc` 属性，也会被忽略。
后运行的宿主 rehype 插件也无法绕过 core 对不安全 URL 的过滤。URL 协议策略是内核不变式，
不可扩展。

## URL 策略

`defaultUrlTransform` 实现包的 URL 策略：

- 允许的协议：`http`、`https`、`irc`、`ircs`、`mailto`、`xmpp`。
- 相对 URL、片段和查询字符串直接通过。
- `javascript:`、`vbscript:`、`data:text/html`、`file:`、`ftp:` 会被移除。
- 图片 `data:` URL 只允许光栅格式（`png`、`jpeg`、`gif`、`webp`、`avif`、`bmp`、
  `x-icon`）。
- `data:image/svg+xml` 会被拒绝，因为 SVG 可以携带脚本。

```ts
import { defaultUrlTransform } from 'vue-markdown-suite'

defaultUrlTransform('javascript:alert(1)') // ''
defaultUrlTransform('data:image/png;base64,abc', 'src') // 保留
defaultUrlTransform('data:image/svg+xml,<svg/>', 'src') // ''
```

### 自定义变换

```ts
const urlTransform = (url: string, key: string) => {
  if (key === 'href' && url.startsWith('/docs/')) {
    return url.replace('/docs/', '/guide/')
  }
  return url
}
```

返回 `null` 会删除该属性，返回 `undefined` 会保留净化后的 URL。变换结果会再次校验，
不能绕过 URL 策略。

## 属性允许列表

- `on*` 属性始终移除。
- `style` 和 `srcdoc` 移除。
- 允许 `aria-*` 和 `data-*`。
- 携带 URL 的属性会校验：`href`、`src`、`srcset`、`cite`、`poster`、`action`、
  `data`、`xlink:href`。
- 未知标签（插件标签/自定义标签）接受安全的命名 props，但仍拒绝事件处理器、`style` 和
  不安全 URL。

## 自定义标签

```ts
import { customTagsPlugin } from 'vue-markdown-suite/plugins'

const plugins = [customTagsPlugin({ tags: ['x-note'] })]
```

自定义标签的 props 在到达宿主组件之前会被归一化，并剥离事件处理器和不安全 URL。
`custom-tag-click` 的负载只包含安全 props。

## CSP 与 Trusted Types

默认渲染路径：

- 不使用 `v-html`。
- 不使用 `eval` 或 `new Function`。
- 不需要内联脚本。
- 通过 Vue 的 DOM property/attribute 绑定设置属性。

严格的 CSP（例如 `default-src 'self'; script-src 'self'`）可以正常工作。如果通过
`htmlPlugin()` 启用原始 HTML，请保留内置净化器，并避免允许内联脚本。使用 Trusted Types 时，
避免需要 HTML 字符串的 sink；渲染器从不创建这类 sink。`exportMarkdownHtml` 为静态输出
返回字符串，把该字符串插入页面时，请应用你自己的 Trusted Types 策略。

## 诊断

安全相关的失败通过 `render-error` 报告，诊断包含 `code`、`message`、`severity` 和
`phase`。上一份正常文档会被保留。

## 下一步

- [SSR 与静态导出](./ssr.md)
- [官方管线](./pipeline.md)
