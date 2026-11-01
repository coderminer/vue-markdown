---
description: 官方 unified 管线的阶段顺序、插件交接和记忆化身份。
---

# 官方管线

官方管线由 `unified` + `remark-parse` + `remark-rehype` 组成。它把 Markdown 解析成
mdast，再转换成 hast，在需要时净化，最后把 hast 交给模型构建器。整个过程没有 HTML
字符串往返。

## 阶段顺序

```text
插件 transformSource          （按解析后的插件顺序）
  -> remark-parse
  -> 库内置 remark 插件
  -> 宿主 remarkPlugins
  -> remark-rehype            （allowDangerousHtml: true）
  -> rehype-raw               （仅当启用 html 插件时）
  -> rehype-sanitize          （紧跟 rehype-raw）
  -> 内核标题 ID
  -> 宿主 rehypePlugins
  -> 捕获 hast 交给模型
```

这个顺序是契约。源码变换由 `useMarkdownDocument` 和静态导出辅助函数在管线启动前执行；
直接调用 `createOfficialPipeline` 的宿主需要自己传入已经变换过的源码。宿主 rehype 插件
在内核标题 ID 处理之后运行。原始 HTML 通过把 `htmlPlugin()` 加入 `plugins` 启用，而不是
往 `rehypePlugins` 里加 `rehype-raw`；手动解析器会被管线忽略并给出警告。
没有 html 插件时，raw 节点会在宿主 rehype 插件运行前被丢弃，所以即使手动解析器被包装
或压缩、名字无法识别，也不会有任何效果。

## 直接使用

```ts
import { createOfficialPipeline } from 'vue-markdown-suite/pipeline'
import GithubSlugger from 'github-slugger'
import { defaultPlugins } from 'vue-markdown-suite/plugins'

const pipeline = createOfficialPipeline()
const result = await pipeline.process('# 你好', {
  source: '# 你好',
  options: {},
  plugins: defaultPlugins,
  remarkPlugins: [],
  rehypePlugins: [],
  remarkRehypeOptions: {},
  slugger: new GithubSlugger(),
  idPrefix: '',
  diagnostics: [],
})

// result.hast 是 hast root。
```

当所有插件都是同步的时，`processSync` 也可用。渲染器优先使用它，遇到异步插件再回退到
`process`。

失败的 remark 或 rehype 插件会被报告为诊断，并交给所属 `MarkdownPlugin.onError`。
缓存后的 processor 从 vfile 读取当前运行的上下文，所以复用 processor 不会把错误写进
上一次运行的诊断里。

## 为什么不用 markdown-it

`remark` 提供了类型化的 mdast、成熟的插件生态，以及通往 hast 的官方路径。正是这些让
标签级 Vue 组件、可序列化模型和宿主 remark/rehype 插件能够成立，而不需要 HTML 字符串
往返。

## 身份与记忆化

解析缓存 key 包含源码、管线身份、有序插件身份，以及影响解析的选项。纯展示变化——令牌、
文案、当前标题——不会触发重新解析。

```ts
import { memoClear, memoSize } from 'vue-markdown-suite'
```

`memoClear()` 适合测试和基准测试；`memoSize()` 返回有界缓存当前的大小。

## 标题 ID

标题 ID 默认由 `github-slugger` 生成，在单份文档内唯一，并加上 `idPrefix` 前缀。传入
自定义 `slugger` 可以替换算法：

```ts
const slugger = {
  slug: (value: string) => value.toLowerCase().split(' ').join('-'),
}
```

## 下一步

- [编写自定义管线](./custom-pipeline.md)
- [插件与 remark/rehype 集成](./plugins.md)
