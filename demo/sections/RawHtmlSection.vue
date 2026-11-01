<script setup lang="ts">
import { computed, ref } from 'vue'
import { MarkdownRenderer } from '@coderminer/vue-markdown'
import { defaultPlugins } from '@coderminer/vue-markdown/plugins'
import { htmlPlugin } from '@coderminer/vue-markdown/html'
import SectionShell from '../components/SectionShell.vue'
import SourceEditor from '../components/SourceEditor.vue'
import OutputPane from '../components/OutputPane.vue'
import unsafe from '../fixtures/unsafe.md?raw'

const modes = ['drop', 'raw'] as const
type Mode = (typeof modes)[number]

const mode = ref<Mode>('drop')
const source = ref(unsafe)

const plugins = computed(() =>
  mode.value === 'raw' ? [...defaultPlugins, htmlPlugin()] : undefined,
)
</script>

<template>
  <SectionShell
    id="raw-html"
    title="Raw HTML"
    description="Raw HTML is dropped by default. htmlPlugin() enables parsing plus the built-in sanitizer."
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
        <MarkdownRenderer :source="source" :plugins="plugins" />
      </OutputPane>
    </div>
    <p class="demo-note">
      With htmlPlugin() the sanitizer runs immediately after raw parsing, and the
      model still applies the URL policy and attribute allowlist.
    </p>
  </SectionShell>
</template>
