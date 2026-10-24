<script setup lang="ts">
import { computed, ref } from 'vue'
import rehypeRaw from 'rehype-raw'
import { MarkdownRenderer } from 'vue-markdown-suite'
import SectionShell from '../components/SectionShell.vue'
import SourceEditor from '../components/SourceEditor.vue'
import OutputPane from '../components/OutputPane.vue'
import unsafe from '../fixtures/unsafe.md?raw'

const modes = ['drop', 'skip', 'raw'] as const
type Mode = (typeof modes)[number]

const mode = ref<Mode>('drop')
const source = ref(unsafe)

const rehypePlugins = computed(() => (mode.value === 'raw' ? [rehypeRaw] : []))
const skipHtml = computed(() => mode.value === 'skip')
</script>

<template>
  <SectionShell
    id="raw-html"
    title="Raw HTML"
    description="Raw HTML is dropped by default. skipHtml removes raw nodes; rehype-raw enables sanitized HTML."
  >
    <div class="demo-controls">
      <label v-for="option in modes" :key="option">
        <input v-model="mode" type="radio" :value="option" />
        {{ option }}
      </label>
    </div>
    <div class="demo-grid">
      <SourceEditor v-model="source" label="Unsafe fixture" :rows="16" />
      <OutputPane>
        <MarkdownRenderer
          :source="source"
          :skip-html="skipHtml"
          :rehype-plugins="rehypePlugins"
        />
      </OutputPane>
    </div>
    <p class="demo-note">
      With rehype-raw the sanitizer runs immediately after raw parsing, and the
      model still applies the URL policy and attribute allowlist.
    </p>
  </SectionShell>
</template>
