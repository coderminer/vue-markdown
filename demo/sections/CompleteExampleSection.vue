<script setup lang="ts">
import { computed, defineComponent, h, ref } from 'vue'
import {
  MarkdownRenderer,
  composePresets,
  defineMarkdownPreset,
  exportMarkdownHtmlSync,
  useActiveHeading,
  type MarkdownDiagnostic,
  type MarkdownDocument,
  type MarkdownNodeRenderContext,
  type MarkdownTheme,
  type TocItem,
  type VueMarkdownNodeComponents,
} from '@coderminer/vue-markdown'
import {
  codePlugin,
  customTagsPlugin,
  defineMarkdownPlugin,
  frontmatterPlugin,
  gfmPlugin,
  linkPlugin,
  searchPlugin,
  tocPlugin,
} from '@coderminer/vue-markdown/plugins'
import { mathPlugin } from '@coderminer/vue-markdown/math'
import { MermaidBlock } from '@coderminer/vue-markdown'
import CodeSample from '../components/CodeSample.vue'
import SectionShell from '../components/SectionShell.vue'
import SourceEditor from '../components/SourceEditor.vue'

const article = `---
title: Build a documentation portal
description: A complete page built with the public API only.
author: Vue Markdown Suite
---

# Build a documentation portal

A production documentation page needs more than Markdown parsing. It needs
navigation, search, safe HTML, rich code, math, diagrams, and a design system
that stays consistent. This example combines all of them with one renderer.

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

Plugins are plain objects. This page adds a search plugin and a small enhancement
plugin that contributes labels, tokens, and document metadata.

| Layer | Responsibility |
| --- | --- |
| Plugins | Parsing behavior, transforms, labels, tokens |
| Preset | Shareable defaults for labels and tokens |
| Node components | Vue rendering for blockquotes and links |
| Renderer | TOC, events, regions, and state |

## Make it searchable

Type in the search box above. Matches are wrapped in the
\`search-match\` part without changing the document structure, so highlighting
stays accessible and selectable.

## Render math and diagrams

Inline math such as $E = mc^2$ and display math are rendered by KaTeX through
the optional math entry:

$$
\\int_0^1 x^2 \\, dx = \\frac{1}{3}
$$

Mermaid diagrams use their own lazy entry, so the main bundle stays small.

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
  tokens: { '--vmd-radius-md': '12px' },
  transformDocument(document) {
    return {
      ...document,
      frontmatter: { ...(document.frontmatter ?? {}), enhanced: true },
    }
  },
})

const basePreset = defineMarkdownPreset({
  name: 'portal-base',
  labels: { toc: 'On this page' },
})

const portalPreset = composePresets(
  basePreset,
  defineMarkdownPreset({
    name: 'portal-accent',
    tokens: {
      '--vmd-color-accent': '#8250df',
      '--vmd-radius-md': '12px',
    },
  }),
)

const source = ref(article)
const theme = ref<MarkdownTheme>('light')
const query = ref('')
const toc = ref<TocItem[]>([])
const frontmatter = ref<Record<string, unknown>>({})
const diagnostics = ref<MarkdownDiagnostic[]>([])
const exportMessage = ref('')
const renderer = ref<{
  scrollToHeading(id: string, options?: ScrollIntoViewOptions): void
}>()

const activeId = useActiveHeading(computed(() => toc.value.map((item) => item.id)))

const plugins = computed(() => [
  tocPlugin,
  codePlugin,
  linkPlugin,
  searchPlugin({ query: query.value }),
  customTagsPlugin(),
  gfmPlugin,
  frontmatterPlugin,
  mathPlugin(),
  docsPlugin,
])

const Callout = defineComponent({
  setup(_, { slots }) {
    return () =>
      h('aside', { class: 'demo-callout demo-portal-callout' }, [
        h('strong', { class: 'demo-callout-title' }, 'Note'),
        h('div', slots.default?.()),
      ])
  },
})

const nodeComponents: VueMarkdownNodeComponents = {
  blockquote: (ctx: MarkdownNodeRenderContext) =>
    h(Callout, null, { default: () => ctx.defaultRender() }),
  a: (ctx: MarkdownNodeRenderContext) =>
    h(
      'a',
      {
        ...ctx.attrs,
        class: 'demo-article-link',
      },
      [ctx.defaultRender()],
    ),
}

const diagram = `flowchart LR
  Markdown --> Pipeline
  Pipeline --> Model
  Model --> Vue
  Model --> Search
  Model --> Export`

const composition = `const plugins = computed(() => [
  tocPlugin, codePlugin, linkPlugin,
  searchPlugin({ query: query.value }),
  customTagsPlugin(), gfmPlugin, frontmatterPlugin,
  mathPlugin(), docsPlugin,
])

const portalPreset = composePresets(
  defineMarkdownPreset({ name: 'base', labels: { toc: 'On this page' } }),
  defineMarkdownPreset({
    name: 'accent',
    tokens: { '--vmd-color-accent': '#8250df' },
  }),
)

const nodeComponents = {
  blockquote: (ctx) => h(Callout, null, { default: () => ctx.defaultRender() }),
  a: (ctx) =>
    h(
      'a',
      { ...ctx.attrs, class: 'article-link' },
      ctx.defaultRender(),
    ),
}

<MarkdownRenderer
  ref="renderer"
  v-model:source="source"
  :plugins="plugins"
  :preset="portalPreset"
  :node-components="nodeComponents"
  :theme="theme"
  toc
  show-error
  @toc-change="toc = $event"
  @ready="onReady"
/>`

function toggleTheme(): void {
  theme.value = theme.value === 'dark' ? 'light' : 'dark'
}

function onReady(document: MarkdownDocument): void {
  frontmatter.value = document.frontmatter ?? {}
}

function meta(key: string): string {
  const value = frontmatter.value[key]
  return typeof value === 'string' ? value : ''
}

function onError(diagnostic: MarkdownDiagnostic): void {
  diagnostics.value = [diagnostic, ...diagnostics.value].slice(0, 4)
}

function scrollTo(id: string): void {
  renderer.value?.scrollToHeading(id)
}

function downloadHtml(): void {
  try {
    const html = exportMarkdownHtmlSync(source.value, {
      plugins: plugins.value,
    })
    if (typeof document === 'undefined') return
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = '@coderminer/vue-markdown-example.html'
    anchor.click()
    URL.revokeObjectURL(url)
    exportMessage.value = `Exported ${html.length.toLocaleString()} characters.`
  } catch (error) {
    exportMessage.value =
      error instanceof Error ? error.message : 'Static export failed.'
  }
}
</script>

<template>
  <SectionShell
    id="complete-example"
    title="Complete example"
    description="A docs portal page with search, TOC, frontmatter, rich content, custom components, and static export."
  >
    <div class="demo-portal">
      <header class="demo-portal-bar">
        <div class="demo-portal-brand">
          <span class="demo-portal-kicker">Docs portal</span>
          <strong>{{ meta('title') || 'Build a documentation portal' }}</strong>
          <span v-if="meta('description')">{{ meta('description') }}</span>
        </div>
        <div class="demo-portal-tools">
          <label class="demo-portal-search">
            <span>Search</span>
            <input
              v-model="query"
              type="search"
              placeholder="Search this article"
              aria-label="Search this article"
            />
          </label>
          <button type="button" class="demo-button" @click="toggleTheme">
            {{ theme === 'dark' ? 'Light theme' : 'Dark theme' }}
          </button>
          <button type="button" class="demo-button" @click="downloadHtml">
            Export HTML
          </button>
        </div>
      </header>

      <div class="demo-portal-body">
        <aside class="demo-portal-toc" aria-label="On this page">
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
          <p v-else class="demo-note">Add headings to build the TOC.</p>
          <p v-if="exportMessage" class="demo-portal-message">{{ exportMessage }}</p>
          <p v-if="diagnostics.length > 0" class="demo-portal-diagnostic">
            {{ diagnostics[0]?.message }}
          </p>
        </aside>

        <div class="demo-portal-article">
          <MarkdownRenderer
            ref="renderer"
            v-model:source="source"
            :plugins="plugins"
            :preset="portalPreset"
            :node-components="nodeComponents"
            :theme="theme"
            toc
            show-error
            @toc-change="toc = $event"
            @ready="onReady"
            @render-error="onError"
          />
        </div>
      </div>
    </div>

    <details class="demo-details">
      <summary>Edit the article source</summary>
      <SourceEditor v-model="source" label="Markdown source" :rows="16" />
    </details>

    <details class="demo-details">
      <summary>Mermaid diagram (lazy entry)</summary>
      <MermaidBlock :source="diagram" />
    </details>

    <details class="demo-details">
      <summary>The composition behind this example</summary>
      <CodeSample :code="composition" label="CompleteExample.vue" />
    </details>
  </SectionShell>
</template>
