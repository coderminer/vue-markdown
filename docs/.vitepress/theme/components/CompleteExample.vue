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
} from 'vue-markdown-suite'
import {
  codePlugin,
  defineMarkdownPlugin,
  frontmatterPlugin,
  gfmPlugin,
  linkPlugin,
  searchPlugin,
  tocPlugin,
} from 'vue-markdown-suite/plugins'
import { mathPlugin } from 'vue-markdown-suite/math'

const { isDark } = useData()

const article = `---
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

const docsPlugin = defineMarkdownPlugin({
  name: 'docs-enhancements',
  labels: { toc: 'On this page' },
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
    labels: { toc: 'On this page' },
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
        h('strong', { class: 'vmd-callout-title' }, 'Note'),
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
        ...(ctx.node.kind === 'element' ? ctx.node.attrs : {}),
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
    anchor.download = 'vue-markdown-suite-example.html'
    window.document.body.appendChild(anchor)
    anchor.click()
    anchor.parentNode?.removeChild(anchor)
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
    exportMessage.value = `Exported ${html.length.toLocaleString()} characters.`
  } catch (error) {
    exportMessage.value =
      error instanceof Error ? error.message : 'Static export failed.'
  }
}
</script>

<template>
  <div class="vmd-portal">
    <header class="vmd-portal-bar">
      <div class="vmd-portal-brand">
        <span class="vmd-portal-kicker">Docs portal</span>
        <strong>{{ meta('title') || 'Build a documentation portal' }}</strong>
        <span v-if="meta('description')">{{ meta('description') }}</span>
      </div>
      <div class="vmd-portal-tools">
        <input
          v-model="query"
          type="search"
          placeholder="Search this article"
          aria-label="Search this article"
        />
        <button type="button" class="vmd-portal-button" @click="exportHtml">
          Export HTML
        </button>
      </div>
    </header>

    <div class="vmd-portal-body">
      <aside class="vmd-portal-toc" aria-label="On this page">
        <strong>On this page</strong>
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
        <p v-else class="vmd-portal-message">Add headings to build the TOC.</p>
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
