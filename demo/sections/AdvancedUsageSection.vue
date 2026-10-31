<script setup lang="ts">
import { computed, defineComponent, h, ref } from 'vue'
import {
  MarkdownRenderer,
  defineMarkdownPreset,
  type MarkdownNodeRenderContext,
  type MarkdownTheme,
} from 'vue-markdown-suite'
import {
  codePlugin,
  customTagsPlugin,
  defineMarkdownPlugin,
  frontmatterPlugin,
  gfmPlugin,
  linkPlugin,
  searchPlugin,
  tocPlugin,
} from 'vue-markdown-suite/plugins'
import { mathPlugin } from 'vue-markdown-suite/math'
import CodeSample from '../components/CodeSample.vue'
import SectionShell from '../components/SectionShell.vue'
import SourceEditor from '../components/SourceEditor.vue'
import OutputPane from '../components/OutputPane.vue'

const composition = `import { MarkdownRenderer, defineMarkdownPreset } from 'vue-markdown-suite'
import { defineMarkdownPlugin, fullPlugins } from 'vue-markdown-suite/plugins'
import { mathPlugin } from 'vue-markdown-suite/math'

const docsPreset = defineMarkdownPreset({
  name: 'docs',
  labels: { toc: 'On this page' },
  tokens: { '--vmd-color-accent': '#8250df' },
})

const callout = defineMarkdownPlugin({
  name: 'callout',
  components: { blockquote: 'aside' },
  transformDocument: (document) => ({
    ...document,
    frontmatter: { ...document.frontmatter, enhanced: true },
  }),
})

const plugins = [...fullPlugins, mathPlugin(), callout]

const components = {
  a: MyLink,
}

const nodeComponents = {
  blockquote: (ctx) => h('aside', { class: 'callout' }, ctx.defaultRender()),
}
`

const source = ref(`# Advanced composition

A paragraph with a [reference link](https://vuejs.org) and **custom rendering**.

> Callouts are a blockquote node component. They are plain Vue, so they can
> carry icons, actions, or any design system markup.

## GFM and math

| Feature | Status |
| --- | --- |
| Tables | ready |
| Task lists | ready |
| Math | ready |

- [x] GFM plugin
- [x] KaTeX plugin
- [ ] Your next idea

Inline math: $E = mc^2$. Display math:

$$
\\int_0^1 x^2 \\, dx = \\frac{1}{3}
$$
`)

const theme = ref<MarkdownTheme>('light')
const accent = ref('#8250df')
const decorate = ref(true)
const includeMath = ref(true)
const includeGfm = ref(true)
const setups = ref(0)
const cleanups = ref(0)

const advancedPlugin = defineMarkdownPlugin({
  name: 'advanced-demo',
  labels: { toc: 'On this page' },
  tokens: { '--vmd-radius-md': '10px' },
  transformDocument(document) {
    return {
      ...document,
      frontmatter: { ...(document.frontmatter ?? {}), 'advanced-demo': true },
    }
  },
  setup() {
    setups.value += 1
    return () => {
      cleanups.value += 1
    }
  },
})

const baseSearch = searchPlugin()

const plugins = computed(() => [
  tocPlugin,
  codePlugin,
  linkPlugin,
  baseSearch,
  customTagsPlugin(),
  ...(includeGfm.value ? [gfmPlugin, frontmatterPlugin] : []),
  ...(includeMath.value ? [mathPlugin()] : []),
  advancedPlugin,
])

const preset = computed(() =>
  defineMarkdownPreset({
    name: 'advanced-demo',
    labels: { toc: 'On this page' },
    tokens: {
      '--vmd-color-accent': accent.value,
      '--vmd-radius-md': '10px',
    },
  }),
)

const Callout = defineComponent({
  setup(_, { slots }) {
    return () =>
      h('aside', { class: 'demo-callout' }, [
        h('strong', { class: 'demo-callout-title' }, 'Note'),
        h('div', slots.default?.()),
      ])
  },
})

const nodeComponents = computed(() =>
  decorate.value
    ? {
        a: (ctx: MarkdownNodeRenderContext) =>
          h(
            'a',
            {
              ...ctx.attrs,
              class: 'demo-advanced-link',
            },
            [ctx.defaultRender()],
          ),
        blockquote: (ctx: MarkdownNodeRenderContext) =>
          h(Callout, null, { default: () => ctx.defaultRender() }),
      }
    : {},
)
</script>

<template>
  <SectionShell
    id="advanced-usage"
    title="Advanced usage"
    description="Compose presets, plugins, node components, math, GFM, and design tokens with one renderer."
  >
    <CodeSample :code="composition" label="Composition" />

    <div class="demo-controls">
      <label>
        Theme
        <select v-model="theme">
          <option value="light">light</option>
          <option value="dark">dark</option>
          <option value="auto">auto</option>
          <option value="custom">custom</option>
        </select>
      </label>
      <label>Accent <input v-model="accent" type="color" /></label>
      <label><input v-model="decorate" type="checkbox" /> Node components</label>
      <label><input v-model="includeGfm" type="checkbox" /> GFM</label>
      <label><input v-model="includeMath" type="checkbox" /> Math</label>
      <span class="demo-note">plugin setups: {{ setups }} · cleanups: {{ cleanups }}</span>
    </div>

    <div class="demo-grid">
      <SourceEditor v-model="source" label="Markdown source" :rows="18" />
      <OutputPane>
        <MarkdownRenderer
          :source="source"
          :plugins="plugins"
          :preset="preset"
          :node-components="nodeComponents"
          :theme="theme"
          toc
        />
      </OutputPane>
    </div>

    <p class="demo-note">
      The advanced plugin contributes labels, tokens, and document metadata; the
      preset changes tokens; local node components win over built-ins. Removing a
      plugin re-runs plugin setup only when the resolved set changes.
    </p>
  </SectionShell>
</template>
