<script setup lang="ts">
import { computed, ref } from 'vue'
import { useData } from 'vitepress'
import { MarkdownRenderer } from 'vue-markdown-suite'
import { fullPlugins } from 'vue-markdown-suite/plugins'
import { mathPlugin } from 'vue-markdown-suite/math'
import { mermaidPlugin } from 'vue-markdown-suite/mermaid'
import { htmlPlugin } from 'vue-markdown-suite/html'

const { isDark } = useData()

const props = withDefaults(defineProps<{ locale?: 'en' | 'zh' }>(), {
  locale: 'en',
})

const text = computed(() =>
  props.locale === 'zh'
    ? {
        sample: '示例',
        preview: '预览',
        markdown: 'Markdown 源码',
        toc: '目录',
        copy: '复制',
        copied: '已复制',
        reset: '重置',
        sourceAria: 'Markdown 源码',
      }
    : {
        sample: 'Sample',
        preview: 'Preview',
        markdown: 'Markdown',
        toc: 'TOC',
        copy: 'Copy',
        copied: 'Copied',
        reset: 'Reset',
        sourceAria: 'Markdown source',
      },
)

const labels: Record<SampleKey, string> =
  props.locale === 'zh'
    ? { all: '全部元素', essentials: '基础', gfm: 'GFM', math: '数学' }
    : { all: 'All elements', essentials: 'Essentials', gfm: 'GFM', math: 'Math' }

const samples = {
  all: `# Markdown kitchen sink

A paragraph with **bold**, *italic*, ***both***, ~~strikethrough~~, \`inline code\`, and a [link](https://example.com).

Autolink: <https://example.com> and email <hello@example.com>.

> A blockquote.
>
> > A nested blockquote.

## Headings

### Level 3
#### Level 4
##### Level 5
###### Level 6

Setext heading
---

## Lists

- Unordered item
- Item with **formatting**
  - Nested item
- Another item

1. Ordered item
2. Second item
   1. Nested ordered item

- [x] Completed task
- [ ] Open task

## Table

| Left | Center | Right |
| :--- | :----: | ----: |
| A | B | C |
| D | E | F |

## Code

Inline: \`const answer = 42\`.

\`\`\`ts
interface User {
  id: string
  name: string
}

const user: User = { id: '1', name: 'Ada' }
\`\`\`

    indented code block
    keeps whitespace

## Media and links

![VitePress logo](https://vitepress.dev/vitepress-logo-mini.svg)

[External link](https://example.com) and [heading link](#lists).

## Math

Inline math: $E = mc^2$.

$$
\\int_0^1 x^2 \\, dx = \\frac{1}{3}
$$

## Mermaid

\`\`\`mermaid
flowchart LR
  Markdown --> Renderer
  Renderer --> Vue
\`\`\`

## Footnotes

A statement with a footnote.[^note]

[^note]: Footnotes come from GFM.

## Raw HTML

<mark>Highlighted HTML</mark>, <kbd>Ctrl</kbd> + <kbd>K</kbd>, and H<sub>2</sub>O.

<details>
<summary>Expandable raw HTML</summary>

Raw HTML is sanitized before rendering.

</details>

## Breaks and rules

A hard break follows this line.\\
The next line stays in the same paragraph.

---

Escaped characters: \\*not italic\\* and entities: &copy; &amp; &#169;.
`,
  essentials: `# Live playground

Edit the Markdown below. The preview uses the same renderer you ship.

## What you get

- **Vue VNodes**, not an HTML string
- Stable heading IDs
- TOC, links, and events
- Lazy syntax highlighting

> Replace any element or keep the semantic defaults.

\`\`\`ts
const answer: number = 42
console.log(answer)
\`\`\`
`,
  gfm: `# GFM support

| Feature | Status |
| --- | --- |
| Tables | ready |
| Task lists | ready |
| Strikethrough | ~~never~~ ready |
| Footnotes | ready[^1] |

- [x] Render Markdown
- [x] Keep it accessible
- [ ] Publish your docs

[^1]: Footnotes are part of the GFM extension set.
`,
  math: `# Math

Inline math: $E = mc^2$.

Display math:

$$
\\int_0^1 x^2 \\, dx = \\frac{1}{3}
$$

KaTeX renders synchronously and stays accessible.
`,
} as const

const samplesZh = {
  all: `# Markdown 全要素示例

一段包含 **加粗**、*斜体*、***粗斜体***、~~删除线~~、\`行内代码\` 和 [链接](https://example.com) 的文字。

自动链接：<https://example.com> 和邮箱 <hello@example.com>。

> 一段引用。
>
> > 嵌套引用。

## 标题

### 三级标题
#### 四级标题
##### 五级标题
###### 六级标题

Setext 标题
---

## 列表

- 无序项
- 带 **格式** 的项
  - 嵌套项
- 另一项

1. 有序项
2. 第二项
   1. 嵌套有序项

- [x] 已完成任务
- [ ] 未完成任务

## 表格

| 左对齐 | 居中 | 右对齐 |
| :--- | :----: | ----: |
| A | B | C |
| D | E | F |

## 代码

行内：\`const answer = 42\`。

\`\`\`ts
interface User {
  id: string
  name: string
}

const user: User = { id: '1', name: 'Ada' }
\`\`\`

    缩进代码块
    保留空白

## 媒体与链接

![VitePress 标志](https://vitepress.dev/vitepress-logo-mini.svg)

[外部链接](https://example.com) 和 [标题链接](#列表)。

## 数学

行内公式：$E = mc^2$。

$$
\\int_0^1 x^2 \\, dx = \\frac{1}{3}
$$

## Mermaid

\`\`\`mermaid
flowchart LR
  Markdown --> Renderer
  Renderer --> Vue
\`\`\`

## 脚注

一句带脚注的话。[^note]

[^note]: 脚注来自 GFM。

## 原始 HTML

<mark>高亮 HTML</mark>、<kbd>Ctrl</kbd> + <kbd>K</kbd>，以及 H<sub>2</sub>O。

<details>
<summary>可展开的原始 HTML</summary>

原始 HTML 在渲染前会被净化。

</details>

## 换行与分隔线

这一行后面是硬换行。\\
下一行仍属于同一段。

---

转义字符：\\*不是斜体\\*，实体：&copy; &amp; &#169;。
`,
  essentials: `# 在线演练场

在下面编辑 Markdown，预览使用与你发布时相同的渲染器。

## 你会得到

- **Vue VNode**，而不是 HTML 字符串
- 稳定的标题 ID
- 目录、链接和事件
- 按需加载的语法高亮

> 可以替换任意元素，也可以保留语义化默认值。

\`\`\`ts
const answer: number = 42
console.log(answer)
\`\`\`
`,
  gfm: `# GFM 支持

| 功能 | 状态 |
| --- | --- |
| 表格 | 就绪 |
| 任务列表 | 就绪 |
| 删除线 | ~~不可用~~ 就绪 |
| 脚注 | 就绪[^1] |

- [x] 渲染 Markdown
- [x] 保持可访问
- [ ] 发布你的文档

[^1]: 脚注属于 GFM 扩展集合。
`,
  math: `# 数学

行内公式：$E = mc^2$。

块级公式：

$$
\\int_0^1 x^2 \\, dx = \\frac{1}{3}
$$

KaTeX 同步渲染，并保持可访问。
`,
} as const

type SampleKey = keyof typeof samples

const names = Object.keys(samples) as SampleKey[]
const active = ref<SampleKey>('all')
const source = ref<string>(props.locale === 'zh' ? samplesZh.all : samples.all)
const showToc = ref(false)
const copied = ref(false)

const plugins = computed(() => [
  ...fullPlugins,
  mathPlugin(),
  mermaidPlugin(),
  htmlPlugin(),
])
const theme = computed(() => (isDark.value ? 'dark' : 'light'))

function sampleText(name: SampleKey): string {
  return props.locale === 'zh' ? samplesZh[name] : samples[name]
}

function useSample(name: SampleKey): void {
  active.value = name
  source.value = sampleText(name)
}

async function copy(): Promise<void> {
  if (typeof navigator === 'undefined' || !navigator.clipboard) return
  await navigator.clipboard.writeText(source.value)
  copied.value = true
  window.setTimeout(() => {
    copied.value = false
  }, 1500)
}

function reset(): void {
  source.value = sampleText(active.value)
}
</script>

<template>
  <div class="vmd-live">
    <div class="vmd-live-toolbar">
      <div class="vmd-live-toolbar-group">
        <span class="vmd-live-label">{{ text.sample }}</span>
        <button
          v-for="name in names"
          :key="name"
          type="button"
          class="vmd-live-button"
          :class="{ 'is-active': active === name }"
          @click="useSample(name)"
        >
          {{ labels[name] }}
        </button>
      </div>
      <div class="vmd-live-toolbar-group">
        <button
          type="button"
          class="vmd-live-button"
          :class="{ 'is-active': showToc }"
          @click="showToc = !showToc"
        >
          {{ text.toc }}
        </button>
        <button type="button" class="vmd-live-button" @click="copy">
          {{ copied ? text.copied : text.copy }}
        </button>
        <button type="button" class="vmd-live-button" @click="reset">
          {{ text.reset }}
        </button>
      </div>
    </div>

    <div class="vmd-live-body">
      <div class="vmd-live-pane">
        <div class="vmd-live-pane-header">{{ text.preview }}</div>
        <div class="vmd-live-output">
          <MarkdownRenderer
            :source="source"
            :plugins="plugins"
            :theme="theme"
            :toc="showToc"
            show-error
          />
        </div>
      </div>
      <div class="vmd-live-pane">
        <div class="vmd-live-pane-header">{{ text.markdown }}</div>
        <textarea v-model="source" spellcheck="false" :aria-label="text.sourceAria" />
      </div>
    </div>
  </div>
</template>
