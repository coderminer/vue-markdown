---
description: 编写并校验一个替代 Markdown 管线。
---

# 编写自定义管线

自定义管线替换官方解析路径。它必须返回 hast root；套件仍然负责构建模型、应用过滤，并
渲染 Vue 组件。

## 契约

```ts
import type {
  MarkdownPipeline,
  PipelineContext,
  PipelineResult,
} from '@coderminer/vue-markdown/pipeline'
import { defineMarkdownPipeline } from '@coderminer/vue-markdown/pipeline'

export const myPipeline = defineMarkdownPipeline({
  name: 'my-pipeline',
  capabilities: { sync: true },
  process(source: string, ctx: PipelineContext): Promise<PipelineResult> {
    // ...
  },
  processSync(source: string, ctx: PipelineContext): PipelineResult {
    // 可选。同步 SSR 和静态导出需要它。
  },
  dispose() {
    // 可选。管线被替换或卸载时调用。
  },
})
```

`PipelineResult` 的形状是 `{ hast: Root; frontmatter?: Record<string, unknown> }`。

## 规则

- 返回 hast `root`。其他形状会抛错，并由宿主报告诊断。
- 如实声明能力。`sync: true` 表示 `processSync` 存在，并且可以在服务端安全执行。
- 不要修改宿主传入的选项。`ctx` 是每次运行独立的。
- 如果你自己解析原始 HTML，就要在返回前净化。套件的净化器只跑在官方路径上。
- `dispose` 是释放资源的唯一位置。

## 示例：预处理包装器

```ts
import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkRehype from 'remark-rehype'
import type { Root } from 'hast'
import { defineMarkdownPipeline } from '@coderminer/vue-markdown/pipeline'

const processor = unified().use(remarkParse).use(remarkRehype, {
  allowDangerousHtml: true,
})

function run(source: string): Root {
  const mdast = processor.parse(source)
  return processor.runSync(mdast) as Root
}

export const wrappedPipeline = defineMarkdownPipeline({
  name: 'wrapped',
  capabilities: { sync: true },
  async process(source) {
    return { hast: run(source) }
  },
  processSync(source) {
    return { hast: run(source) }
  },
})
```

## 回退行为

非法管线——缺少 `name`、缺少 `process`，或返回错误结果——会被报告诊断，并替换为官方
管线。运行中失败的管线会保留上一份正常文档。

```ts
import { resolvePipeline, validatePipeline } from '@coderminer/vue-markdown/pipeline'
```

## 运行时选择管线

```vue
<MarkdownRenderer :source="source" :pipeline="useCustom ? myPipeline : undefined" />
```

切换管线会让记忆化 key 失效，并重新解析。

## 下一步

- [官方管线](./pipeline.md)
- [SSR 与静态导出](./ssr.md)
