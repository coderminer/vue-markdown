<script setup lang="ts">
import { ref } from 'vue'
import { MarkdownRenderer } from 'vue-markdown-suite'
import SectionShell from '../components/SectionShell.vue'
import SourceEditor from '../components/SourceEditor.vue'
import OutputPane from '../components/OutputPane.vue'
import commonmark from '../fixtures/commonmark.md?raw'

const source = ref(commonmark)
</script>

<template>
  <SectionShell
    id="commonmark"
    title="CommonMark"
    description="The official remark pipeline, heading IDs, lists, code, and links."
  >
    <div class="demo-grid">
      <SourceEditor v-model="source" label="CommonMark fixture" :rows="18" />
      <OutputPane>
        <MarkdownRenderer :source="source" toc />
      </OutputPane>
    </div>
  </SectionShell>
</template>
