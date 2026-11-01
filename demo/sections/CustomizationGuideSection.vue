<script setup lang="ts">
import { computed, defineComponent, h, ref } from 'vue'
import {
  MarkdownRenderer,
  type MarkdownNodeRenderContext,
  type MarkdownTheme,
} from '@coderminer/vue-markdown'
import CodeSample from '../components/CodeSample.vue'
import SectionShell from '../components/SectionShell.vue'
import OutputPane from '../components/OutputPane.vue'

const elementsSample = `import { defineComponent, h } from 'vue'

// 1. Replace a tag with another tag or a Vue component.
const BadgeLink = defineComponent({
  props: { href: String },
  setup(props, { slots }) {
    return () =>
      h('a', { href: props.href, class: 'badge-link' }, [
        h('span', { class: 'badge' }, 'link'),
        slots.default?.(),
      ])
  },
})

const components = {
  h1: 'h2',
  a: BadgeLink,
  pre: CodeFrame,
}

// 2. Replace a semantic node with a component or a function renderer.
const nodeComponents = {
  blockquote: Callout,
  a: (ctx) =>
    h(
      'a',
      { ...ctx.attrs, class: 'article-link' },
      ctx.defaultRender(),
    ),
}

// 3. Replace a structural region.
const regions = {
  toc: MyToc,
  empty: MyEmpty,
}`

const themeSample = `<!-- Theme presets -->
<MarkdownRenderer theme="light" :source="source" />
<MarkdownRenderer theme="dark" :source="source" />
<MarkdownRenderer theme="auto" :source="source" />
<MarkdownRenderer theme="custom" :source="source" />

<!-- Per-instance tokens -->
<MarkdownRenderer
  theme="auto"
  :source="source"
  :tokens="{
    '--vmd-color-accent': '#8250df',
    '--vmd-radius-md': '12px',
  }"
/>

<!-- App-wide defaults -->
<MarkdownConfigProvider theme="auto" :tokens="brandTokens">
  <MarkdownRenderer :source="source" toc />
</MarkdownConfigProvider>`

const cssImport = `import '@coderminer/vue-markdown/style.css'`

const cssSample = `/* Tokens cascade from any ancestor. */
.my-docs {
  --vmd-font-size: 1.0625rem;
  --vmd-line-height: 1.8;
  --vmd-color-accent: #8250df;
}

/* Target stable parts, never internal DOM structure. */
[data-vmd-part='heading'] {
  letter-spacing: -0.01em;
}

[data-vmd-part='code'] {
  --vmd-code-bg: #0d1117;
  color: #e6edf3;
}

/* A scoped theme is just a class with tokens. */
.theme-brand {
  --vmd-color-accent: #0969da;
  --vmd-radius-md: 12px;
}`

const source = ref(`# Custom elements

A paragraph with a [link](https://example.com) and **strong text**.

> A callout can replace the default blockquote rendering.

- Lists keep their semantics
- Code blocks lazy-load the highlighter

\`\`\`ts
const answer = 42
\`\`\`
`)

const theme = ref<MarkdownTheme>('light')
const accent = ref('#8250df')
const overrideHeading = ref(true)
const customCallout = ref(true)
const decorateLinks = ref(true)
const cssSkin = ref(false)

const BadgeLink = defineComponent({
  props: { href: String },
  setup(props, { slots }) {
    return () =>
      h('a', { href: props.href, class: 'demo-badge-link' }, [
        h('span', { class: 'demo-badge' }, 'link'),
        slots.default?.(),
      ])
  },
})

const Callout = defineComponent({
  setup(_, { slots }) {
    return () =>
      h('aside', { class: 'demo-callout' }, [
        h('strong', { class: 'demo-callout-title' }, 'Custom blockquote'),
        h('div', slots.default?.()),
      ])
  },
})

const components = computed(() => ({
  ...(overrideHeading.value ? { h1: 'h2' } : {}),
  ...(decorateLinks.value ? { a: BadgeLink } : {}),
}))

const nodeComponents = computed(() =>
  customCallout.value
    ? {
        blockquote: (ctx: MarkdownNodeRenderContext) =>
          h(Callout, null, { default: () => ctx.defaultRender() }),
      }
    : {},
)

const tokens = computed(() => ({
  '--vmd-color-accent': accent.value,
}))

const parts = [
  'root',
  'content',
  'heading',
  'heading-anchor',
  'paragraph',
  'link',
  'code',
  'code-header',
  'blockquote',
  'table',
  'math',
  'mermaid',
  'toc',
]

const tokenPreview = [
  '--vmd-font-family',
  '--vmd-font-size',
  '--vmd-line-height',
  '--vmd-color-text',
  '--vmd-color-accent',
  '--vmd-space-4',
  '--vmd-radius-md',
  '--vmd-code-bg',
]
</script>

<template>
  <SectionShell
    id="customization"
    title="Customization"
    description="Replace elements, choose a theme, and layer CSS without targeting internal DOM."
  >
    <div class="demo-guide">
      <article class="demo-guide-block">
        <h3>1. Customize your own elements</h3>
        <p>
          There are four stable seams. <code>components</code> maps an HTML tag to
          another tag or a Vue component. <code>nodeComponents</code> targets the
          semantic model and accepts function renderers. <code>regions</code>
          replaces structural areas such as the TOC or empty state. Slots replace a
          region with scoped data and actions.
        </p>
        <p>
          Precedence is local props &gt; nearest provider &gt; preset &gt; plugin
          defaults &gt; built-ins. A <code>nodeComponents</code> function wins at its
          own key; otherwise a tag override wins over a semantic kind override.
        </p>
        <CodeSample :code="elementsSample" label="Custom elements" language="ts" />
      </article>

      <article class="demo-guide-block">
        <h3>2. Customize the theme</h3>
        <p>
          Set <code>theme</code> to <code>light</code>, <code>dark</code>,
          <code>auto</code>, or <code>custom</code>. The renderer writes
          <code>data-vmd-theme</code> on its own root and never touches the host
          page. <code>auto</code> follows <code>prefers-color-scheme</code>;
          <code>custom</code> applies no preset colors so your tokens win unchanged.
        </p>
        <p>
          Tokens use the <code>--vmd-*</code> prefix. Pass them through
          <code>tokens</code> for one instance, or set them on an ancestor or
          <code>MarkdownConfigProvider</code> for an app-wide theme.
        </p>
        <CodeSample :code="themeSample" label="Themes and tokens" />
      </article>

      <article class="demo-guide-block">
        <h3>3. Customize CSS</h3>
        <p>
          The stylesheet is optional and layered: <code>style.css</code> includes
          tokens and component styles, <code>styles/tokens.css</code> contains only
          variables, and <code>styles/components.css</code> contains part-based
          rules. Target documented parts and tokens rather than element selectors,
          because a host may replace any tag component.
        </p>
        <CodeSample :code="cssImport" label="Load the stylesheet" language="ts" />
        <CodeSample :code="cssSample" label="CSS overrides" language="css" />
        <div class="demo-api-grid">
          <article class="demo-card">
            <h4>Stable parts</h4>
            <p class="demo-chip-list">
              <code v-for="part in parts" :key="part">{{ part }}</code>
            </p>
          </article>
          <article class="demo-card">
            <h4>Common tokens</h4>
            <p class="demo-chip-list">
              <code v-for="token in tokenPreview" :key="token">{{ token }}</code>
            </p>
          </article>
        </div>
      </article>
    </div>

    <h3>Live customization preview</h3>
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
      <label><input v-model="overrideHeading" type="checkbox" /> h1 → h2</label>
      <label><input v-model="decorateLinks" type="checkbox" /> Badge links</label>
      <label><input v-model="customCallout" type="checkbox" /> Callout blockquotes</label>
      <label><input v-model="cssSkin" type="checkbox" /> Scoped CSS skin</label>
    </div>

    <OutputPane>
      <div :class="['demo-skin-frame', { 'demo-skin': cssSkin }]">
        <MarkdownRenderer
          :source="source"
          :theme="theme"
          :tokens="tokens"
          :components="components"
          :node-components="nodeComponents"
          toc
        />
      </div>
    </OutputPane>
  </SectionShell>
</template>

<style>
.demo-guide {
  display: grid;
  gap: 1.5rem;
}

.demo-guide-block h3 {
  margin-block: 0 0.5rem;
}

.demo-guide-block > p {
  max-width: 75ch;
  margin-block: 0 0.75rem;
  color: #59636e;
  line-height: 1.7;
}

.demo-guide-block .demo-code-frame {
  margin-block: 0.75rem 0;
}

.demo-skin-frame {
  min-height: 3rem;
}

.demo-skin {
  --vmd-color-accent: #0969da;
  --vmd-radius-md: 12px;
}

.demo-skin [data-vmd-part='heading'] {
  padding-block-start: 0.35rem;
  border-block-start: 2px solid #0969da;
  letter-spacing: -0.02em;
}

.demo-skin [data-vmd-part='code'] {
  border-radius: 12px;
}

.demo-skin [data-vmd-part='blockquote'] {
  font-style: italic;
}
</style>
