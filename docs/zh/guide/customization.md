---
description: 用稳定覆盖层、设计令牌和文档化部件定制元素、主题与 CSS。
---

# 定制

定制是一套分层契约。局部属性优先于 Provider、预设、插件默认值和内置值；每个视觉部件
都能在不触碰内部 DOM 的前提下被定位和替换。

```text
局部属性
  > 最近的 Provider
    > 预设
      > 插件默认值
        > 内置默认值
```

## 1. 替换元素

替换输出有四条稳定路径。

### 标签组件

`components` 把 HTML 标签映射到另一个标签名或 Vue 组件。把每个替换组件放在独立的
`.vue` 文件里，再传入组件引用。

```vue [BadgeLink.vue]
<script setup lang="ts">
import type { MarkdownNode } from '@coderminer/vue-markdown'

defineProps<{
  node?: MarkdownNode
  href?: string
}>()
</script>

<template>
  <a :href="href" class="badge-link">
    <span class="badge">链接</span>
    <slot />
  </a>
</template>
```

```vue [CodeFrame.vue]
<script setup lang="ts">
import type { MarkdownCodeNode } from '@coderminer/vue-markdown'

defineProps<{ node?: MarkdownCodeNode }>()
</script>

<template>
  <figure class="code-frame">
    <figcaption>{{ node?.language || 'text' }}</figcaption>
    <pre><code><slot /></code></pre>
  </figure>
</template>
```

```vue [App.vue]
<script setup lang="ts">
import { MarkdownRenderer } from '@coderminer/vue-markdown'
import BadgeLink from './BadgeLink.vue'
import CodeFrame from './CodeFrame.vue'

const components = {
  h1: 'h2',
  a: BadgeLink,
  pre: CodeFrame,
}
</script>

<template>
  <MarkdownRenderer :source="source" :components="components" />
</template>
```

组件通过 `node` 接收归一化节点，并通过默认插槽渲染子节点。围栏代码始终通过
`components.pre` 包裹，内部元素则通过 `components.code` 或 `nodeComponents.code`
解析。

### 节点组件

`nodeComponents` 面向语义节点（`code`、`math`、`mermaid`、`custom` 以及元素标签）。
最清晰的形式是组件：

```vue [Callout.vue]
<script setup lang="ts">
import type { MarkdownNode } from '@coderminer/vue-markdown'

defineProps<{ node?: MarkdownNode }>()
</script>

<template>
  <aside class="callout">
    <slot />
  </aside>
</template>
```

```vue [ArticleLink.vue]
<script setup lang="ts">
import type { MarkdownNode } from '@coderminer/vue-markdown'

defineProps<{ node?: MarkdownNode }>()
</script>

<template>
  <a class="article-link">
    <slot />
  </a>
</template>
```

```vue [App.vue]
<script setup lang="ts">
import { MarkdownRenderer } from '@coderminer/vue-markdown'
import ArticleLink from './ArticleLink.vue'
import Callout from './Callout.vue'

const nodeComponents = {
  blockquote: Callout,
  a: ArticleLink,
}
</script>

<template>
  <MarkdownRenderer :source="source" :node-components="nodeComponents" />
</template>
```

声明 `node` 是为了避免它被当作 DOM 属性透传；其他安全属性（如 `href`）会落到根元素上。
高级场景仍可使用函数渲染器，它收到
`{ node, kind, tag, attrs, key, children, defaultRender, context }`。
`defaultRender()` 保留内置安全、标题 ID 和目录行为。

### 完整示例：自定义代码与 Mermaid 节点

下面的例子注册自定义围栏代码节点和自定义 Mermaid 节点，然后渲染同时包含两者的 Markdown。

`nodeComponents.code` 替换围栏块内部的 `<code>` 元素，外层 `<pre>` 仍由 `MarkdownCode`
渲染。`nodeComponents.mermaid` 只有在 `mermaidPlugin()` 把 Mermaid 围栏转换成 `mermaid`
节点后才会运行，所以这个例子必须引入插件。

```vue [CustomCode.vue]
<script setup lang="ts">
import type { MarkdownCodeNode } from '@coderminer/vue-markdown'

defineProps<{
  node?: MarkdownCodeNode
  code?: string
  language?: string
  className?: string
}>()
</script>

<template>
  <code
    :class="['custom-code', className]"
    :data-language="language || 'text'"
  >{{ code ?? node?.code }}</code>
</template>
```

```vue [CustomMermaid.vue]
<script setup lang="ts">
import { MermaidBlock } from '@coderminer/vue-markdown'
import type { MarkdownMermaidNode } from '@coderminer/vue-markdown'

defineProps<{
  node?: MarkdownMermaidNode
  code?: string
}>()
</script>

<template>
  <MermaidBlock :source="code ?? node?.code ?? ''" show-errors />
</template>
```

```vue [App.vue]
<script setup lang="ts">
import { MarkdownRenderer } from '@coderminer/vue-markdown'
import { defaultPlugins } from '@coderminer/vue-markdown/plugins'
import { mermaidPlugin } from '@coderminer/vue-markdown/mermaid'
import CustomCode from './CustomCode.vue'
import CustomMermaid from './CustomMermaid.vue'

const source = `# 自定义节点

\`\`\`ts
const answer: number = 42
\`\`\`

\`\`\`mermaid
flowchart LR
  Markdown --> Node
  Node --> Vue
\`\`\`
`

// 保持插件实例稳定，不要在模板中内联创建。
const plugins = [...defaultPlugins, mermaidPlugin()]

const nodeComponents = {
  code: CustomCode,
  mermaid: CustomMermaid,
}
</script>

<template>
  <MarkdownRenderer
    :source="source"
    :plugins="plugins"
    :node-components="nodeComponents"
  />
</template>
```

`nodeComponents.code` 收到 `{ node, code, language, className }`，它不会运行高亮器。
如果要在替换整个代码块的同时保留内置 `CodeBlock` 的头部、操作和高亮，请使用
`regions.codeBlock` 并在区域内渲染 `CodeBlock`：

```ts
const regions = {
  codeBlock: MyCodeBlock, // 内部渲染 <CodeBlock standalone ... />
}
```

`nodeComponents.mermaid` 收到 `{ node, code }`。没有 `mermaidPlugin()` 时，
` ```mermaid ` 围栏仍然是普通 `code` 节点，自定义 Mermaid 组件不会执行。

### 区域

`regions` 替换结构性区域：

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

区域覆盖会收到与默认组件相同的 props。

### 插槽

具名插槽是最后一层，接收作用域数据和可执行动作。插槽不存在或内容为空时保留默认渲染。

```vue
<MarkdownRenderer :source="source" toc>
  <template #toc="{ items, activeId, navigate }">
    <nav class="my-toc">
      <a
        v-for="item in items"
        :key="item.id"
        :href="`#${item.id}`"
        :aria-current="item.id === activeId ? 'location' : undefined"
        @click.prevent="navigate(item.id)"
      >
        {{ item.text }}
      </a>
    </nav>
  </template>
</MarkdownRenderer>
```

每个插槽的完整上下文见[渲染器参考](../reference/renderer.md)。

### 目录

目录由 `toc` 属性选择性开启，从标题派生，以 `TocItem[]` 形式提供：

```ts
interface TocItem {
  id: string
  text: string
  level: number
}
```

可以从多个层面定制：

| 层面 | API |
| --- | --- |
| 整个目录 | `#toc` 插槽或 `regions.toc` |
| 单项 | `#toc-item` 插槽或 `regions.tocItem` |
| 文案 | `labels.toc` |
| 深度 | `tocDepth`（`0` 表示全部层级，`1`–`6` 表示最大层级） |
| 位置 | `tocPlacement`（`top`、`left`、`right`、`hidden`） |
| 行为 | `toc`、`syncHash`、`idPrefix`、`getToc()`、`scrollToHeading(id)` |

只保留 `h1`–`h3`，或把目录放到内容左侧：

```vue
<MarkdownRenderer :source="source" toc :toc-depth="3" />
<MarkdownRenderer :source="source" toc toc-placement="left" />
```

`left` / `right` 在宽屏使用侧栏布局，窄屏自动回退为置顶。`hidden` 会隐藏默认目录，
即使 `toc` 为 true；`#toc` 插槽和 `regions.toc` 仍可用于完全自定义布局。

`tocDepth` 会同时过滤传给 `#toc` / `#toc-item` 的 `items`、`getToc()` 的返回值，以及
`toc-change` 的负载。

替换整个目录：

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

只替换单项，保留默认 `<nav>`：

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

使用区域组件时，`MyToc` 收到 `items`、`activeId`、`label` 和可选的 `tocItem`，并触发
`navigate(id)`；`MyTocItem` 收到 `item` 和 `active`，同样触发 `navigate(id)`。

```ts
const regions = {
  toc: MyToc,
  tocItem: MyTocItem,
}
```

一个页面里有多个渲染器时使用 `idPrefix`；需要导航时同步 URL hash 就用 `syncHash`；
外部目录可以通过实例上的 `getToc()` 和 `scrollToHeading(id)` 驱动。完整目录契约见
[公共 API](../reference/api.md)。

### 自定义标签

`customTagsPlugin` 把选中的元素转换成自定义节点，再映射到你自己的组件：

```ts
import { customTagsPlugin } from '@coderminer/vue-markdown/plugins'

const plugins = [customTagsPlugin({ tags: ['x-note'] })]
```

::: tip 富组件
同样的组件优先模式也适用于富组件。参见[用 CodeBlock 搭一个自定义代码块](./rich-components.md)，
它覆盖了所有公共能力。
:::

### 覆盖优先级

```text
nodeComponents 函数
  > nodeComponents[tag]
    > components[tag]
      > nodeComponents[kind]
        > 插件组件
          > 预设
            > 内置
```

## 2. 定制主题

把 `theme` 设为 `light`、`dark`、`auto` 或 `custom`。渲染器只在自己的根元素写入
`data-vmd-theme`，不会触碰宿主页面。

```vue
<!-- 预设 -->
<MarkdownRenderer theme="light" :source="source" />
<MarkdownRenderer theme="dark" :source="source" />
<MarkdownRenderer theme="auto" :source="source" />
<MarkdownRenderer theme="custom" :source="source" />

<!-- 单实例令牌 -->
<MarkdownRenderer
  theme="auto"
  :source="source"
  :tokens="{
    '--vmd-color-accent': '#7c3aed',
    '--vmd-radius-md': '12px',
  }"
/>

<!-- 应用级默认值 -->
<MarkdownConfigProvider theme="auto" :tokens="brandTokens">
  <MarkdownRenderer :source="source" toc />
</MarkdownConfigProvider>
```

- `auto` 不依赖 JavaScript，跟随 `prefers-color-scheme`。
- `custom` 不应用预设颜色，你的覆盖会原样生效。
- 令牌从任意祖先层叠，因此作用域主题就是一个带 `--vmd-*` 属性的类。

```css
.theme-brand {
  --vmd-color-accent: #7c3aed;
  --vmd-radius-md: 12px;
  --vmd-font-size: 1.0625rem;
}
```

完整令牌表见[样式与主题](./styling.md)。

## 3. 定制 CSS

样式表是可选的，分为两层：

```ts
import '@coderminer/vue-markdown/style.css'
// 或者
import '@coderminer/vue-markdown/styles/tokens.css'
import '@coderminer/vue-markdown/styles/components.css'
```

只面向文档化的部件和令牌，不要针对内部元素结构：

```css
.my-docs {
  --vmd-font-size: 1.0625rem;
  --vmd-line-height: 1.8;
  --vmd-color-accent: #7c3aed;
}

[data-vmd-part='heading'] {
  letter-spacing: -0.01em;
}

[data-vmd-part='code'] {
  --vmd-code-bg: #0d1117;
  color: #e6edf3;
}

[data-vmd-part='blockquote'] {
  font-style: italic;
}
```

每个视觉部件同时暴露 `class="vmd-<part>"` 和 `data-vmd-part="<part>"`，并在同一个
主版本内保持稳定。

::: tip 无样式模式
不引入任何样式表。标记仍然语义化、可访问且功能完整；标题 ID、目录、过滤、URL 策略、
插件和 SSR 都不变。
:::

::: warning 避免元素选择器
宿主可能替换任意标签组件。请写 `[data-vmd-part='...']` 或 `.vmd-*`，不要写 `h1`、
`pre` 或 `table`。
:::

## 试一试这些层

<ClientOnly>
  <CustomizationLab locale="zh" />
</ClientOnly>

## 文案与清单

每个面向用户的字符串都是 label，值可以是字符串或上下文函数：

```vue
<MarkdownRenderer
  :source="source"
  toc
  :labels="{
    toc: '本页目录',
    headingAnchor: ({ id }) => `链接到 ${id}`,
    empty: '暂无内容',
  }"
/>
```

`COMPONENT_MANIFESTS` 和 `getComponentManifest(name)` 暴露每个组件的令牌、部件、插槽、
文案、覆盖键和行为钩子。注册表不依赖 Vue，工具和文档无需导入组件代码即可读取。

```ts
import { COMPONENT_MANIFESTS, getComponentManifest } from '@coderminer/vue-markdown'

const manifest = getComponentManifest('CodeBlock')
console.log(COMPONENT_MANIFESTS)
```

## 预设

预设把配置打包到一个名字下。它是声明式的，但由于包含组件和函数，并不是 JSON 可序列化
的：

```ts
import { composePresets, defineMarkdownPreset } from '@coderminer/vue-markdown/presets'

const brand = defineMarkdownPreset({
  name: 'brand',
  theme: 'dark',
  labels: { toc: '目录' },
  components: { h1: 'h2' },
})

const preset = composePresets(brand, docsPreset)
```

把预设传给渲染器或 Provider。应用预设不会修改全局状态。

## 行为注入

渲染器接受 `pipeline`、`slugger`、`urlTransform`、`highlighter`、`mathEngine`、
`mermaidRenderer` 和 `diagnosticsFormatter`。非法适配器会通过 `render-error` 报告，
并使用文档化的回退。自定义 slugger 会被包装，确保重复标题仍然获得唯一 ID。

## 下一步

- [样式与主题](./styling.md)
- [渲染器参考](../reference/renderer.md)
- [完整示例](./complete-example.md)
