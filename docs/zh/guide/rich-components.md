---
description: 独立使用 CodeBlock、VueSyntaxHighlighter、MermaidBlock、MermaidLiveEditor 和数学节点。
---

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useData } from 'vitepress'
import {
  CodeBlock,
  MarkdownConfigProvider,
  MarkdownRenderer,
  MermaidBlock,
  MermaidLiveEditor,
  VueSyntaxHighlighter,
  type CodeBlockAction,
  type MarkdownCodeNode,
} from 'vue-markdown-suite'
import { defaultPlugins } from 'vue-markdown-suite/plugins'
import { mathPlugin } from 'vue-markdown-suite/math'

const { isDark } = useData()
const richTheme = computed(() => (isDark.value ? 'dark' : 'light'))
// 保持插件实例稳定，不要在模板中内联创建。
const plugins = [...defaultPlugins, mathPlugin()]

const code = `interface User {
  id: string
  name: string
}

export function greet(user: User): string {
  return \`Hello, \${user.name}\`
}`

const codeNode: MarkdownCodeNode = {
  kind: 'code',
  key: 'rich-code',
  code,
  language: 'ts',
}

const actions: CodeBlockAction[] = [
  {
    key: 'log',
    label: '打印源码',
    run({ code: value }) {
      console.log(value)
    },
  },
]

const diagram = `flowchart LR
  Markdown --> Pipeline
  Pipeline --> Model
  Model --> Vue`

const editorSource = ref(diagram)

const mathSource = `行内公式如 $E = mc^2$，以及一个块级公式：

$$
\\int_0^1 x^2 \\, dx = \\frac{1}{3}
$$`
</script>

# 富组件

可选的富组件是公共组件，不是渲染器内部实现。你可以独立使用它们、替换渲染器区域，或用
自己的组件替换语义节点。

| 组件 | 默认渲染器中的角色 | 入口 |
| --- | --- | --- |
| `CodeBlock` | 带头部、操作和按需高亮的围栏代码 | `vue-markdown-suite` |
| `VueSyntaxHighlighter` | 独立的高亮代码片段 | `vue-markdown-suite` |
| `MermaidBlock` | 带缩放、全屏和导出的图表预览 | `vue-markdown-suite` |
| `MermaidLiveEditor` | 基于 CodeMirror 的 Mermaid 编辑器 | `vue-markdown-suite` |
| `MarkdownMath` | 由配置引擎渲染的数学节点 | `vue-markdown-suite` |

每个组件也都有单组件入口：

```ts
import CodeBlock from 'vue-markdown-suite/components/CodeBlock'
import VueSyntaxHighlighter from 'vue-markdown-suite/components/VueSyntaxHighlighter'
import MermaidBlock from 'vue-markdown-suite/components/MermaidBlock'
```

## CodeBlock

`CodeBlock` 是默认的围栏代码组件。没有配置高亮器时，它会懒加载 highlight.js；渲染带强调色
图标和复制/下载内联 SVG 操作的头部，并接受额外操作。头部与 `MermaidBlock` 保持同一套
Mermaid 主导的外观。内置图标不需要图标包，每个图标按钮都保留可访问标签和 title。

```vue
<script setup lang="ts">
import { CodeBlock, type CodeBlockAction } from 'vue-markdown-suite'

const actions: CodeBlockAction[] = [
  {
    key: 'log',
    label: '打印源码',
    run({ code }) {
      console.log(code)
    },
  },
]
</script>

<template>
  <CodeBlock :code="code" language="ts" :actions="actions" />
</template>
```

<DemoFrame title="CodeBlock" note="默认的 Mermaid 主导头部，带复制/下载图标">
  <MarkdownConfigProvider :theme="richTheme">
    <CodeBlock :node="codeNode" show-download />
  </MarkdownConfigProvider>
</DemoFrame>

| 属性 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `node` | `MarkdownCodeNode` | — | 使用节点里的 `code` 和 `language`。 |
| `code` | `string` | — | 覆盖节点源码。 |
| `language` | `string` | — | 覆盖节点语言。 |
| `highlighter` | `MarkdownHighlighter` | 上下文 | 单块适配器覆盖。 |
| `theme` | `MarkdownTheme` | 上下文 | 代码块和高亮器的主题覆盖。 |
| `actions` | `CodeBlockAction[]` | `[]` | 额外工具栏按钮，含 `key`、`label`、`run`。 |
| `showActions` | `boolean` | `true` | 隐藏默认复制/下载按钮。 |
| `showDownload` | `boolean` | `false` | 显示默认下载按钮。 |
| `title` | `string` | — | 替换默认头部里的语言标签。 |
| `fileName` | `string` | — | 显示文件名，并用于下载。 |
| `lineNumbers` | `boolean` | `false` | 渲染行号栏。 |
| `highlightLines` | `HighlightLine[]` | `[]` | 从 1 开始的编号或 `start-end` 范围，例如 `[2, '5-7']`。 |
| `maxLines` | `number` | `0` | 截断并提供展开控件。 |
| `virtual` | `boolean` | `false` | 超过 `virtualThreshold` 后虚拟化。 |
| `virtualThreshold` | `number` | `200` | 启用虚拟化的行数。 |
| `lineHeight` | `number` | `20` | 虚拟化使用的行高。 |
| `delay` | `number` | `0` | 高亮防抖，单位毫秒。 |
| `standalone` | `boolean` | `false` | 忽略 `regions.codeBlock`。 |
| `ignoreRegion` | `boolean` | `false` | `standalone` 的别名。 |

事件：`copy(source)`、`download(source)`、`action(key)` 和 `error(diagnostic)`。复制失败
报告 `copy-error`；自定义操作失败报告 `action-error`；下载失败报告 `download-error`。
三者都会同时触发 `error`。

插槽：`code`、`code-actions`、`header` 和 `toolbar`。`code` 收到
`{ node, source, language, highlighted, nodes, lines, visibleLines, actions }`；操作类
插槽收到 `{ source, language, fileName, title, highlighted, nodes, actions }`。

```vue
<CodeBlock :code="code" language="ts" file-name="demo.ts">
  <template #header="{ fileName, language, actions }">
    <strong>{{ fileName }}</strong>
    <span>{{ language }}</span>
    <button type="button" @click="actions.copy">复制</button>
  </template>
</CodeBlock>
```

在渲染器中，`components.pre` 包裹代码块，`components.code` / `nodeComponents.code`
替换内部元素，`regions.codeBlock` 替换整个代码块。区域组件内部可以渲染 `CodeBlock`；
嵌套代码组件会自动忽略区域，`standalone` / `ignoreRegion` 则显式表达这一意图。

## 用 CodeBlock 搭一个自定义代码块

自定义代码元素不需要重新实现高亮或复制/下载，组合 `CodeBlock` 的公共能力即可：

- `node`、`code`、`language`、`title` 和 `fileName` 输入
- `theme` 和 `highlighter` 覆盖
- `actions` 添加额外工具栏按钮
- `showActions` / `showDownload` 控制默认按钮
- 行号、高亮行、截断和虚拟化
- `#code`、`#code-actions`、`#toolbar` 和 `#header` 插槽
- `copy`、`download`、`action` 和 `error` 事件
- 实例上的 `copy()`、`download()`、`getHighlighted()` 和 `highlighted`

```vue [ReviewCodeBlock.vue]
<script setup lang="ts">
import { ref } from 'vue'
import {
  CodeBlock,
  type CodeBlockAction,
  type HighlightResult,
  type MarkdownDiagnostic,
  type MarkdownHighlighter,
  type MarkdownNode,
  type MarkdownTheme,
} from 'vue-markdown-suite'

withDefaults(
  defineProps<{
    node?: MarkdownNode
    code?: string
    language?: string
    theme?: MarkdownTheme
    highlighter?: MarkdownHighlighter
    actions?: CodeBlockAction[]
    showActions?: boolean
    plain?: boolean
    customToolbar?: boolean
  }>(),
  {
    node: undefined,
    code: undefined,
    language: '',
    theme: undefined,
    highlighter: undefined,
    actions: () => [],
    showActions: true,
    plain: false,
    customToolbar: false,
  },
)

const emit = defineEmits<{
  copy: [source: string]
  download: [source: string]
  action: [key: string]
  error: [diagnostic: MarkdownDiagnostic]
}>()

const block = ref<InstanceType<typeof CodeBlock>>()

function copy() {
  return block.value?.copy()
}

function download() {
  return block.value?.download()
}

function getHighlighted(): HighlightResult | undefined {
  return block.value?.getHighlighted()
}

defineExpose({ copy, download, getHighlighted })
</script>

<template>
  <CodeBlock
    ref="block"
    :node="node"
    :code="code"
    :language="language"
    :theme="theme"
    :highlighter="highlighter"
    :actions="actions"
    :show-actions="showActions"
    @copy="emit('copy', $event)"
    @download="emit('download', $event)"
    @action="emit('action', $event)"
    @error="emit('error', $event)"
  >
    <template #code="{ source }">
      <span v-if="plain" class="review-plain">{{ source }}</span>
    </template>

    <template #code-actions="{ language, actions }">
      <template v-if="customToolbar">
        <button type="button" @click="actions.copy">复制</button>
        <button type="button" @click="actions.download">下载</button>
        <button type="button" @click="emit('action', 'inspect')">
          检查 {{ language }}
        </button>
      </template>
    </template>
  </CodeBlock>
</template>
```

<DemoFrame title="ReviewCodeBlock" note="在下方切换 CodeBlock 的每一项能力">
  <ClientOnly>
    <CodeBlockLab locale="zh" />
  </ClientOnly>
</DemoFrame>

用这个实验室验证：

| 能力 | 怎么看 |
| --- | --- |
| `node` / `code` / `language` | 切换「使用 node 属性」并改变语言。 |
| `theme` | 切换 light、dark、auto 和 custom。 |
| `highlighter` | 在 highlight.js、大写适配器和故障加载器之间切换。 |
| `actions` | 使用工具栏里的「打印源码」。 |
| `showActions` | 隐藏默认图标按钮，自定义操作仍然保留。 |
| `#code` 插槽 | 打开「使用 #code 插槽」，查看纯源码渲染；插槽还暴露 `highlighted`、`nodes` 和 `lines`。 |
| `#header` / `#toolbar` 插槽 | 替换标题区域，或只替换操作区域。 |
| 行选项 | 像独立高亮器一样传 `line-numbers`、`highlight-lines`、`max-lines` 或 `virtual`。 |
| `copy` / `download` 事件 | 使用任一工具栏，事件日志会记录。 |
| `action` 事件 | 触发「打印源码」或自定义工具栏操作。 |
| `error` 事件 | 选择「故障加载器」，警告会写入日志。 |
| 实例方法 | 使用「通过 ref 调用 copy()」「通过 ref 调用 download()」和「检查高亮结果」。 |

### 在 Markdown 中使用

当包装组件内部渲染 `CodeBlock` 时，`components.pre` 是安全的集成点：

```vue
<script setup lang="ts">
import { MarkdownRenderer } from 'vue-markdown-suite'
import ReviewCodeBlock from './ReviewCodeBlock.vue'

const components = {
  pre: ReviewCodeBlock,
}
</script>

<template>
  <MarkdownRenderer :source="source" :components="components" />
</template>
```

::: tip 包装还是替换
`regions.codeBlock` 替换整个代码块。区域组件可以在内部渲染 `CodeBlock`：嵌套代码组件会
自动忽略区域，因此不会递归。需要显式表达意图时，传 `standalone`（或其别名
`ignoreRegion`）。
:::

## VueSyntaxHighlighter

需要在 Markdown 渲染之外展示高亮代码片段时，使用 `VueSyntaxHighlighter`。它支持行号、
高亮行、截断，以及长文件的虚拟滚动。

```vue
<script setup lang="ts">
import { VueSyntaxHighlighter } from 'vue-markdown-suite'
</script>

<template>
  <VueSyntaxHighlighter
    :source="code"
    language="ts"
    line-numbers
    :highlight-lines="[1, 5]"
    :max-lines="20"
  />
</template>
```

<DemoFrame title="VueSyntaxHighlighter" note="行号、高亮行和截断">
  <MarkdownConfigProvider :theme="richTheme">
    <VueSyntaxHighlighter
      :source="code"
      language="ts"
      line-numbers
      :highlight-lines="[1, 5]"
      :max-lines="20"
    />
  </MarkdownConfigProvider>
</DemoFrame>

| 属性 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `source` | `string` | 必填 | 代码源码。 |
| `language` | `string` | `''` | 传给适配器的语言。 |
| `theme` | `MarkdownTheme` | 上下文 | 高亮主题覆盖。 |
| `highlighter` | `MarkdownHighlighter` | 上下文 | 适配器覆盖。 |
| `lineNumbers` | `boolean` | `false` | 渲染行号栏。 |
| `highlightLines` | `HighlightLine[]` | `[]` | 从 1 开始的编号或 `start-end` 范围，例如 `[2, '5-7']`。 |
| `maxLines` | `number` | `0` | 截断到前 N 行，并显示「显示全部行」控件。 |
| `virtual` | `boolean` | `false` | 超过 `virtualThreshold` 后虚拟化。 |
| `virtualThreshold` | `number` | `200` | 启用虚拟化的行数。 |
| `lineHeight` | `number` | `20` | 虚拟化使用的行高，应与 CSS 行高一致。 |
| `delay` | `number` | `0` | 高亮防抖，单位毫秒。 |

事件：`copy(source)` 和 `error(diagnostic)`。

插槽：`header`、`footer`、`empty`、`actions` 和 `highlighter`。`highlighter` 插槽收到
`{ source, language, nodes, lines, highlighted, actions }`。

暴露：`copy()`、`getHighlighted()` 和 `highlighted`。

## MermaidBlock

`MermaidBlock` 渲染单个图表。新渲染进行中时保留上一次成功图表，净化 SVG，并提供
preview/source 标签。默认头部、标签、文案和图标操作由可选样式表控制，因此不添加工具栏
标记或图标库也能使用。头部的高度、内边距、背景、排版和操作按钮样式与 `CodeBlock`
一致。

```vue
<script setup lang="ts">
import { MermaidBlock } from 'vue-markdown-suite'

const diagram = `flowchart LR
  Markdown --> Pipeline
  Pipeline --> Vue`
</script>

<template>
  <MermaidBlock
    :source="diagram"
    show-errors
    @rendered="onRendered"
    @error="onError"
  />
</template>
```

<DemoFrame title="MermaidBlock" note="净化后的 SVG，带缩放、全屏和导出">
  <ClientOnly>
    <MarkdownConfigProvider :theme="richTheme">
      <MermaidBlock :source="diagram" show-errors />
    </MarkdownConfigProvider>
  </ClientOnly>
</DemoFrame>

| 属性 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `node` | `MarkdownMermaidNode` | — | 使用节点源码。 |
| `source` | `string` | — | 覆盖节点源码。 |
| `renderer` | `MermaidRenderer` | 上下文 | 单块渲染器覆盖。 |
| `theme` | `MarkdownTheme` | 上下文 | Mermaid 和块外壳的主题覆盖。 |
| `showErrors` | `boolean` | `false` | 显示详细错误；轻量回退始终存在。 |
| `enableZoom` | `boolean` | `true` | 显示缩放控件。 |
| `allowFullscreen` | `boolean` | `true` | 允许全屏。 |
| `compact` | `boolean` | `false` | 隐藏块操作工具栏，适合嵌入式预览。 |
| `actions` | `MermaidAction[]` | `[]` | 额外工具栏按钮，含 `key`、`label`、`run`。 |

事件：`rendered(result)`、`error(message)`、`copy(source)`、
`export('png' | 'svg')`、`fullscreen(active)` 和 `action(key)`。

插槽：`header`、`tabs`、`actions`、`mermaid` 和 `mermaid-error`。

暴露：`render()`、`copy()`、`exportPng()`、`downloadSvg()` 和 `toggleFullscreen()`。

```vue
<MermaidBlock :source="diagram">
  <template #actions="{ actions }">
    <button type="button" @click="actions.zoomIn">+</button>
    <button type="button" @click="actions.copy">复制</button>
  </template>
</MermaidBlock>
```

`#header` 替换完整头部内容，收到
`{ source, label, view, status, copied, fullscreen, compact, actions, showPreview, showSource }`。
`#tabs` 只替换 Preview/Source 标签；`#actions` 只替换右侧操作组。两者都会收到当前动作，
自定义头部因此可以保留复制、导出、缩放、全屏和重试。

首次渲染失败时始终显示轻量回退，并保留源码标签。`show-errors` 展开详细解析器或缺少
peer 的诊断。如果没有安装 `mermaid`，诊断会指出可选 peer 依赖，而不是笼统的渲染失败。

自定义渲染器会被净化和校验。渲染器收到 `(source, { theme, id })`，返回节点或 SVG 标记：

```ts
const renderer = {
  id: 'my-renderer',
  async render(source, options) {
    return { svg: await render(source, options) }
  },
}
```

```vue
<MermaidBlock :source="diagram" :renderer="renderer" />
```

## MermaidLiveEditor

`MermaidLiveEditor` 组合 CodeMirror、可拖动分栏、诊断和 `MermaidBlock`。它只在挂载后加载
CodeMirror。

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { MermaidLiveEditor } from 'vue-markdown-suite'

const source = ref(`flowchart LR
  Markdown --> Pipeline
  Pipeline --> Vue`)
</script>

<template>
  <MermaidLiveEditor v-model="source" :debounce="300" />
</template>
```

<DemoFrame title="MermaidLiveEditor" note="带实时预览的 CodeMirror 编辑器">
  <ClientOnly>
    <MarkdownConfigProvider :theme="richTheme">
      <MermaidLiveEditor v-model="editorSource" :debounce="300" compact />
    </MarkdownConfigProvider>
  </ClientOnly>
</DemoFrame>

| 属性 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `modelValue` | `string` | `''` | 图表源码，使用 `v-model`。 |
| `debounce` | `number` | `300` | 预览防抖，单位毫秒。 |
| `theme` | `MarkdownTheme` | 上下文 | 编辑器和预览主题。 |
| `renderer` | `MermaidRenderer` | 上下文 | 预览渲染器覆盖。 |
| `diagnosticsFormatter` | `DiagnosticFormatter` | 上下文 | 格式化预览错误。 |
| `compact` | `boolean` | `false` | 紧凑工具栏布局。 |
| `initialRatio` | `number` | `0.5` | 编辑器面板初始比例。 |
| `minRatio` | `number` | `0.2` | 编辑器面板最小比例。 |

事件：`update:modelValue(value)`、`preview(value)` 和 `error(diagnostic)`。

插槽：`editor` 和 `editor-diagnostics`。`editor` 收到
`{ value, update, diagnostics, status, actions }`；`editor-diagnostics` 收到
`{ diagnostics, focusLine }`。

暴露：`focus()`、`refreshPreview()`、`toggleFullscreen()` 和 `getDiagnostics()`。

`compact` 隐藏预览块的操作按钮，但保留预览标签，避免与编辑器自己的工具栏重复。

```vue
<MermaidLiveEditor v-model="source">
  <template #editor="{ value, update }">
    <textarea :value="value" @input="update($event.target.value)" />
  </template>
</MermaidLiveEditor>
```

## MarkdownMath

`MarkdownMath` 用配置的 `mathEngine` 渲染数学节点。在普通 Markdown 渲染中，
`mathPlugin()` 提供 KaTeX 渲染后的节点和精确 TeX 源码。

```vue
<script setup lang="ts">
import { MarkdownRenderer } from 'vue-markdown-suite'
import { katexEngine, mathPlugin } from 'vue-markdown-suite/math'
import 'vue-markdown-suite/styles/math-full.css'
</script>

<template>
  <MarkdownRenderer
    :source="mathSource"
    :plugins="plugins"
    :math-engine="katexEngine"
  />
</template>
```

`styles/math-full.css` 引入 KaTeX 样式表和套件的数学容器样式。已经自行引入
`katex/dist/katex.min.css` 时，只用 `styles/math.css`。

<DemoFrame title="MarkdownMath" note="mathPlugin() 产生的 KaTeX 输出">
  <MarkdownConfigProvider :theme="richTheme">
    <MarkdownRenderer
      :source="mathSource"
      :plugins="plugins"
      class="rich-math-demo"
    />
  </MarkdownConfigProvider>
</DemoFrame>

| 属性 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `node` | `MarkdownMathNode` | — | 使用节点里的 `tex`、`displayMode` 和 `rendered`。 |
| `tex` | `string` | — | 覆盖节点源码。 |
| `displayMode` | `boolean` | 节点值 | 块级或行内数学。 |
| `rendered` | `MarkdownNode[]` | 节点值 | 预渲染的引擎输出。 |
| `error` | `string` | — | 强制显示错误部件。 |
| `mathEngine` | `MathEngine` | 上下文 | 在没有 Provider 时渲染独立 `tex`。 |

插槽：`math` 和 `math-error`。需要自定义数学呈现时，用 `nodeComponents.math` 或上面的
区域/插槽替换节点。既没有引擎也没有 `rendered` 节点时，块会保留可读的 TeX，并报告
`math-engine-unavailable`，而不是什么都不渲染。

## MarkdownMermaid

`MarkdownMermaid` 是渲染器使用的语义节点包装。它把 `node`、`code`、`renderer`、`theme`、
`showErrors`、`enableZoom`、`allowFullscreen`、`compact` 和 `actions` 转发给
`MermaidBlock`，转发 `header`、`tabs`、`actions`、`mermaid` 和 `mermaid-error` 插槽，
并暴露相同的 `render()`、`copy()`、`exportPng()`、`downloadSvg()` 和
`toggleFullscreen()`。需要语义包装，或想替换 `nodeComponents.mermaid` 时使用它。

## 渲染器集成

```vue
<script setup lang="ts">
import { MarkdownRenderer } from 'vue-markdown-suite'
import { fullPlugins } from 'vue-markdown-suite/plugins'
import { mathPlugin } from 'vue-markdown-suite/math'
import { mermaidPlugin } from 'vue-markdown-suite/mermaid'

// 在模板和渲染函数之外创建一次插件实例。
const plugins = [...fullPlugins, mathPlugin(), mermaidPlugin()]
</script>

<template>
  <MarkdownRenderer
    :source="source"
    :plugins="plugins"
    :regions="{ codeBlock: MyCodeBlock, mermaidBlock: MyMermaid }"
    :node-components="{ code: MyCode, math: MyMath, mermaid: MyMermaidNode }"
  />
</template>
```

完整可复制的自定义 `code` 和 `mermaid` 节点示例见[定制](./customization.md)。记住：
`nodeComponents.mermaid` 只有在插件列表包含 `mermaidPlugin()` 时才会运行。

::: tip 保持插件身份稳定
`:plugins="[mathPlugin()]"` 这样的内联数组会在每次父组件渲染时创建新的插件对象。插件
身份是解析缓存 key 的一部分，因此这种写法会重新解析文档，并可能重跑 `setup`/cleanup。
把插件实例提升到模块作用域或 `setup` 常量。
:::

## 下一步

- [语法高亮](./highlighting.md)
- [数学公式](./math.md)
- [Mermaid](./mermaid.md)
- [组件参考](../reference/components.md)
