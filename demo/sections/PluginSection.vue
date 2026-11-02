<script setup lang="ts">
import { ref } from 'vue'
import { MarkdownRenderer } from '@coderminer/vue-markdown'
import SectionShell from '../components/SectionShell.vue'
import SourceEditor from '../components/SourceEditor.vue'
import OutputPane from '../components/OutputPane.vue'
import { createSamplePlugin } from '../plugins/samplePlugin'

const source = ref(`# Plugin demo

[[sample]]

This paragraph mentions plugin behavior and keeps **formatting**.

> Every blockquote is rendered by the sample plugin's node component.

## Second heading
`)

const setups = ref(0)
const cleanups = ref(0)

const demoPlugin = createSamplePlugin({
  onSetup: () => {
    setups.value += 1
  },
  onCleanup: () => {
    cleanups.value += 1
  },
})
</script>

<template>
  <SectionShell
    id="plugin"
    title="Plugin"
    description="A complete sample plugin: source transform, remark/rehype hooks, component contribution, document transform, labels, tokens, and cleanup. See demo/plugins/samplePlugin.ts."
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
      <code>[[sample]]</code> is replaced before parsing, text nodes uppercase
      "plugin", headings receive <code>data-sample-heading</code>, blockquotes
      become a callout, the document gains frontmatter, and the TOC label and
      accent token change.
    </p>
  </SectionShell>
</template>
