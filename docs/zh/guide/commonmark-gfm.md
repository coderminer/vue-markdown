---
description: CommonMark 与 GFM 的语法覆盖和一致性测试。
---

# CommonMark 与 GFM

官方管线默认解析 CommonMark。GFM 需要显式引入 `gfmPlugin`。

## CommonMark

```vue
<MarkdownRenderer :source="source" />
```

覆盖标题、段落、强调、加粗、链接、图片、列表、引用、代码、分隔线、硬换行，以及行内
HTML（默认丢弃）。

## GFM

```ts
import { gfmPlugin } from 'vue-markdown-suite/plugins'
```

```vue
<MarkdownRenderer :source="source" :plugins="[gfmPlugin]" />
```

`gfmPlugin` 加入 `remark-gfm`，带来：

- 带对齐信息的表格
- 删除线
- 任务列表项
- 自动链接

如果想保留默认插件：

```ts
import { defaultPlugins, gfmPlugin } from 'vue-markdown-suite/plugins'

const plugins = [...defaultPlugins, gfmPlugin]
```

也可以直接使用 `fullPlugins`，它还会启用 frontmatter。

## 表格

表格分别由 `MarkdownTable`、`MarkdownTableSection`、`MarkdownTableRow` 和
`MarkdownTableCell` 渲染。单元格从分隔行取得 `align` 并设置 `text-align`；表头单元格
带有 `scope="col"`。

## 任务列表

任务列表项渲染 `remark-gfm` 解析出的复选框。`MarkdownTaskItem` 在其上提供
`task-change` 事件，复选框保持可访问语义。

## Frontmatter

```ts
import { frontmatterPlugin } from 'vue-markdown-suite/plugins'

const plugins = [frontmatterPlugin]
```

Frontmatter 会被捕获到 `document.frontmatter`，并从正文中移除。你可以从
`getDocument()` 和 `ready` 事件读取它。

## 一致性

测试套件会运行 CommonMark 规范示例和一组精选 GFM fixture：

- CommonMark：[commonmark-spec](https://www.npmjs.com/package/commonmark-spec) 0.31.2
  中 576/576 个适用示例通过；76 个示例被跳过，因为它们依赖原始 HTML、注释、活动内容，
  或依赖套件按设计拒绝的 URL。
- GFM：6/6 个 fixture 通过，覆盖表格、对齐、删除线、任务列表和自动链接。

运行方式：

```bash
npm test
```

fixture 回退时测试会失败。

## 下一步

- [安全](./security.md)
- [插件](./plugins.md)
