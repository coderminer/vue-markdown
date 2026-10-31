<script setup lang="ts">
import { ref } from 'vue'
import { visit } from 'unist-util-visit'
import { MarkdownRenderer } from 'vue-markdown-suite'
import { defineMarkdownPlugin } from 'vue-markdown-suite/plugins'
import SectionShell from '../components/SectionShell.vue'
import SourceEditor from '../components/SourceEditor.vue'
import OutputPane from '../components/OutputPane.vue'

const source = ref(`# Plugin demo

This paragraph mentions plugin behavior and keeps **formatting**.

## Second heading
`)

const setups = ref(0)
const cleanups = ref(0)

function remarkUppercaseKeyword() {
  return (tree: { children: unknown[] }) => {
    visit(tree as never, 'text', (node: { value: string }) => {
      node.value = node.value.split('plugin').join('PLUGIN')
    })
  }
}

function rehypeMarkHeadings() {
  return (tree: { children: unknown[] }) => {
    visit(tree as never, 'element', (node: {
      tagName: string
      properties: Record<string, unknown>
    }) => {
      if (/^h[1-6]$/.test(node.tagName)) {
        node.properties = { ...node.properties, 'data-demo-plugin': 'yes' }
      }
    })
  }
}

const demoPlugin = defineMarkdownPlugin({
  name: 'demo-plugin',
  remarkPlugins: [remarkUppercaseKeyword],
  rehypePlugins: [rehypeMarkHeadings],
  components: { h2: 'h3' },
  labels: { toc: 'Plugin contents' },
  tokens: { '--vmd-color-accent': 'rgb(130, 80, 223)' },
  setup() {
    setups.value += 1
    return () => {
      cleanups.value += 1
    }
  },
  transformDocument(document) {
    return {
      ...document,
      frontmatter: { ...(document.frontmatter ?? {}), demoPlugin: true },
    }
  },
})
</script>

<template>
  <SectionShell
    id="plugin"
    title="Plugin"
    description="defineMarkdownPlugin contributes remark/rehype plugins, components, labels, tokens, and setup/cleanup."
  >
    <div class="demo-controls">
      <span>setups: <strong>{{ setups }}</strong></span>
      <span>cleanups: <strong>{{ cleanups }}</strong></span>
    </div>
    <div class="demo-grid">
      <SourceEditor v-model="source" label="Source" :rows="10" />
      <OutputPane>
        <MarkdownRenderer :source="source" :plugins="[demoPlugin]" toc />
      </OutputPane>
    </div>
    <p class="demo-note">
      The plugin uppercases "plugin" in text nodes, marks headings with
      <code>data-demo-plugin</code>, maps h2 to h3, and renames the TOC label.
    </p>
  </SectionShell>
</template>
