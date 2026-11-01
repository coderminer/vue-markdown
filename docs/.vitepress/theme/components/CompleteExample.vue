<script setup lang="ts">
import { computed, defineComponent, h, ref } from 'vue'
import { useData } from 'vitepress'
import {
  MarkdownRenderer,
  composePresets,
  defineMarkdownPreset,
  exportMarkdownHtmlSync,
  useActiveHeading,
  type MarkdownDiagnostic,
  type MarkdownDocument,
  type TocItem,
  type VueMarkdownNodeComponents,
} from '@coderminer/vue-markdown'
import {
  codePlugin,
  defineMarkdownPlugin,
  frontmatterPlugin,
  gfmPlugin,
  linkPlugin,
  searchPlugin,
  tocPlugin,
} from '@coderminer/vue-markdown/plugins'
import { mathPlugin } from '@coderminer/vue-markdown/math'

const { isDark } = useData()

const props = withDefaults(defineProps<{ locale?: 'en' | 'zh' }>(), {
  locale: 'en',
})

const text = computed(() =>
  props.locale === 'zh'
    ? {
        kicker: '文档门户',
        search: '搜索本文',
        export: '导出 HTML',
        onThisPage: '本页目录',
        emptyToc: '添加标题后会生成目录。',
        callout: '提示',
        exported: (length: string) => `已导出 ${length} 个字符。`,
        exportFailed: '静态导出失败。',
      }
    : {
        kicker: 'Docs portal',
        search: 'Search this article',
        export: 'Export HTML',
        onThisPage: 'On this page',
        emptyToc: 'Add headings to build the TOC.',
        callout: 'Note',
        exported: (length: string) => `Exported ${length} characters.`,
        exportFailed: 'Static export failed.',
      },
)

const articleEn = `---
title: Build a documentation portal
description: A complete page built with the public API only.
author: Vue Markdown Suite
---

# Build a documentation portal

A production documentation page needs more than Markdown parsing. It needs
navigation, search, safe rendering, rich code, math, and a design system that
stays consistent. This example combines all of them with one renderer.

> **Everything here is public API.** The page uses presets, plugins, node
> components, tokens, search, the TOC, and static export without touching
> internal modules.

## Start with a document

The headless composable owns parsing, memoization, status, and diagnostics. The
renderer wraps the same composable and adds preset markup, regions, and slots.

\`\`\`ts
const { document, toc, status, diagnostics } = useMarkdownDocument(source, {
  plugins: [tocPlugin, codePlugin, linkPlugin, gfmPlugin, mathPlugin()],
})
\`\`\`

## Compose behavior with plugins

Plugins are plain objects. This page adds a search plugin and an enhancement
plugin that contributes labels, tokens, and document metadata.

| Layer | Responsibility |
| --- | --- |
| Plugins | Parsing behavior, transforms, labels, tokens |
| Preset | Shareable defaults for labels and tokens |
| Node components | Vue rendering for blockquotes and links |
| Renderer | TOC, events, regions, and state |

## Make it searchable

Type in the search box above. Matches are wrapped in the \`search-match\` part
without changing the document structure, so highlighting stays accessible and
selectable.

## Render math

Inline math such as $E = mc^2$ and display math are rendered by KaTeX through
the optional math entry:

$$
\\int_0^1 x^2 \\, dx = \\frac{1}{3}
$$

## Track the work

- [x] Markdown rendering
- [x] Search and navigation
- [x] Accessible code blocks
- [ ] Publish your docs

## Export the same document

Static export applies the same plugins, sanitizer, URL policy, and heading IDs.
Use the **Export HTML** button to download this article as a standalone file.
`

const articleZh = `---
title: 搭建文档门户
description: 只用公共 API 构建的完整页面。
author: Vue Markdown Suite
---

# 搭建文档门户

生产级文档页面不只需要 Markdown 解析。它还需要导航、搜索、安全渲染、富代码、数学公式，
以及一套保持一致的设计系统。这个示例用一个渲染器把它们组合起来。

> **这里的一切都是公共 API。** 页面使用了预设、插件、节点组件、令牌、搜索、目录和
> 静态导出，没有触碰任何内部模块。

## 从文档开始

无头组合式函数负责解析、记忆化、状态和诊断。渲染器包装同一个组合式函数，并加上预设
标记、区域和插槽。

\`\`\`ts
const { document, toc, status, diagnostics } = useMarkdownDocument(source, {
  plugins: [tocPlugin, codePlugin, linkPlugin, gfmPlugin, mathPlugin()],
})
\`\`\`

## 用插件组合行为

插件是普通对象。这个页面加入搜索插件，以及一个贡献文案、令牌和文档元数据的增强插件。

| 层 | 职责 |
| --- | --- |
| 插件 | 解析行为、变换、文案、令牌 |
| 预设 | 可共享的文案和令牌默认值 |
| 节点组件 | 引用块和链接的 Vue 渲染 |
| 渲染器 | 目录、事件、区域和状态 |

## 让它可搜索

在上方搜索框输入文字。匹配项会被包进 \`search-match\` 部件，而不改变文档结构，因此高亮
仍然可访问、可选中。

## 渲染数学

行内公式如 $E = mc^2$，以及块级公式，都由可选数学入口通过 KaTeX 渲染：

$$
\\int_0^1 x^2 \\, dx = \\frac{1}{3}
$$

## 跟踪进度

- [x] Markdown 渲染
- [x] 搜索与导航
- [x] 可访问的代码块
- [ ] 发布文档

## 导出同一份文档

静态导出应用相同的插件、净化器、URL 策略和标题 ID。使用 **导出 HTML** 按钮把本文下载
为独立文件。
`

const article = props.locale === 'zh' ? articleZh : articleEn

const tocLabel = props.locale === 'zh' ? '本页目录' : 'On this page'

const docsPlugin = defineMarkdownPlugin({
  name: 'docs-enhancements',
  labels: { toc: tocLabel },
  transformDocument(document) {
    return {
      ...document,
      frontmatter: { ...(document.frontmatter ?? {}), enhanced: true },
    }
  },
})

const portalPreset = composePresets(
  defineMarkdownPreset({
    name: 'portal-base',
    labels: { toc: tocLabel },
  }),
  defineMarkdownPreset({
    name: 'portal-accent',
    tokens: {
      '--vmd-color-accent': '#7c3aed',
      '--vmd-radius-md': '12px',
    },
  }),
)

const source = ref(article)
const query = ref('')
const toc = ref<TocItem[]>([])
const frontmatter = ref<Record<string, unknown>>({})
const diagnostics = ref<MarkdownDiagnostic[]>([])
const exportMessage = ref('')
const renderer = ref<{
  scrollToHeading(id: string, options?: ScrollIntoViewOptions): void
}>()

const theme = computed(() => (isDark.value ? 'dark' : 'light'))
const activeId = useActiveHeading(computed(() => toc.value.map((item) => item.id)))

const plugins = computed(() => [
  tocPlugin,
  codePlugin,
  linkPlugin,
  searchPlugin({ query: query.value }),
  gfmPlugin,
  frontmatterPlugin,
  mathPlugin(),
  docsPlugin,
])

const Callout = defineComponent({
  setup(_, { slots }) {
    return () =>
      h('aside', { class: 'vmd-callout' }, [
        h('strong', { class: 'vmd-callout-title' }, text.value.callout),
        h('div', slots.default?.()),
      ])
  },
})

const nodeComponents: VueMarkdownNodeComponents = {
  blockquote: (ctx) => h(Callout, null, { default: () => ctx.defaultRender() }),
  a: (ctx) =>
    h(
      'a',
      {
        ...ctx.attrs,
        class: 'vmd-article-link',
      },
      [ctx.defaultRender()],
    ),
}

function meta(key: string): string {
  const value = frontmatter.value[key]
  return typeof value === 'string' ? value : ''
}

function onReady(document: MarkdownDocument): void {
  frontmatter.value = document.frontmatter ?? {}
}

function onError(diagnostic: MarkdownDiagnostic): void {
  diagnostics.value = [diagnostic, ...diagnostics.value].slice(0, 3)
}

function scrollTo(id: string): void {
  renderer.value?.scrollToHeading(id)
}

function exportHtml(): void {
  try {
    const html = exportMarkdownHtmlSync(source.value, {
      plugins: plugins.value,
    })
    if (typeof window === 'undefined') return
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const anchor = window.document.createElement('a')
    anchor.href = url
    anchor.download = '@coderminer/vue-markdown-example.html'
    window.document.body.appendChild(anchor)
    anchor.click()
    anchor.parentNode?.removeChild(anchor)
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
    exportMessage.value = text.value.exported(html.length.toLocaleString())
  } catch (error) {
    exportMessage.value =
      error instanceof Error ? error.message : text.value.exportFailed
  }
}
</script>

<template>
  <div class="vmd-portal">
    <header class="vmd-portal-bar">
      <div class="vmd-portal-brand">
        <span class="vmd-portal-kicker">{{ text.kicker }}</span>
        <strong>{{ meta('title') || (props.locale === 'zh' ? '搭建文档门户' : 'Build a documentation portal') }}</strong>
        <span v-if="meta('description')">{{ meta('description') }}</span>
      </div>
      <div class="vmd-portal-tools">
        <input
          v-model="query"
          type="search"
          :placeholder="text.search"
          :aria-label="text.search"
        />
        <button type="button" class="vmd-portal-button" @click="exportHtml">
          {{ text.export }}
        </button>
      </div>
    </header>

    <div class="vmd-portal-body">
      <aside class="vmd-portal-toc" :aria-label="text.onThisPage">
        <strong>{{ text.onThisPage }}</strong>
        <ol v-if="toc.length > 0">
          <li
            v-for="item in toc"
            :key="item.id"
            :class="{ 'is-active': item.id === activeId }"
          >
            <a :href="`#${item.id}`" @click.prevent="scrollTo(item.id)">
              {{ item.text }}
            </a>
          </li>
        </ol>
        <p v-else class="vmd-portal-message">{{ text.emptyToc }}</p>
        <p v-if="exportMessage" class="vmd-portal-message">{{ exportMessage }}</p>
        <p v-if="diagnostics.length > 0" class="vmd-portal-diagnostic">
          {{ diagnostics[0]?.message }}
        </p>
      </aside>

      <div class="vmd-portal-article">
        <MarkdownRenderer
          ref="renderer"
          v-model:source="source"
          :plugins="plugins"
          :preset="portalPreset"
          :node-components="nodeComponents"
          :theme="theme"
          show-error
          @toc-change="toc = $event"
          @ready="onReady"
          @render-error="onError"
        />
      </div>
    </div>
  </div>
</template>
