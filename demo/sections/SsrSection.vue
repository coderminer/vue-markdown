<script setup lang="ts">
import { computed, ref } from 'vue'
import { MarkdownRenderer, exportMarkdownHtmlSync } from 'vue-markdown-suite'
import SectionShell from '../components/SectionShell.vue'
import SourceEditor from '../components/SourceEditor.vue'
import OutputPane from '../components/OutputPane.vue'

const source = ref(`# Server rendering

The same pipeline produces static HTML and deterministic heading IDs.

## Repeatable

## Repeatable
`)

const staticHtml = computed(() => exportMarkdownHtmlSync(source.value))
const deterministic = computed(
  () => exportMarkdownHtmlSync(source.value) === staticHtml.value,
)
</script>

<template>
  <SectionShell
    id="ssr"
    title="SSR"
    description="exportMarkdownHtmlSync uses the official pipeline; the renderer uses processSync when every plugin is synchronous."
  >
    <div class="demo-controls">
      <span>deterministic: <strong>{{ deterministic }}</strong></span>
    </div>
    <div class="demo-grid">
      <SourceEditor v-model="source" label="Source" :rows="12" />
      <OutputPane>
        <MarkdownRenderer :source="source" />
      </OutputPane>
    </div>
    <details class="demo-details">
      <summary>Static HTML</summary>
      <pre class="demo-code">{{ staticHtml }}</pre>
    </details>
  </SectionShell>
</template>
