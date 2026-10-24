<script setup lang="ts">
import { defineComponent, h, ref } from 'vue'
import { MarkdownRenderer } from 'vue-markdown-suite'
import SectionShell from '../components/SectionShell.vue'
import SourceEditor from '../components/SourceEditor.vue'
import OutputPane from '../components/OutputPane.vue'

const source = ref(`# Components map

A [link](https://example.com) and a paragraph.

\`\`\`ts
const answer = 42
\`\`\`
`)

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

const CodeFrame = defineComponent({
  props: { code: String, language: String },
  setup(props, { slots }) {
    return () =>
      h('figure', { class: 'demo-code-frame' }, [
        h('figcaption', props.language || 'text'),
        h('pre', [h('code', slots.default?.() ?? props.code)]),
      ])
  },
})

const components = {
  h1: 'h2',
  a: BadgeLink,
  pre: CodeFrame,
}
</script>

<template>
  <SectionShell
    id="components"
    title="Components"
    description="Replace any tag with a tag name or a Vue component; fenced code uses pre/code overrides."
  >
    <div class="demo-grid">
      <SourceEditor v-model="source" label="Source" :rows="12" />
      <OutputPane>
        <MarkdownRenderer :source="source" :components="components" />
      </OutputPane>
    </div>
    <pre class="demo-code">components = { h1: 'h2', a: BadgeLink, pre: CodeFrame }</pre>
  </SectionShell>
</template>
