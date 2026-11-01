<script setup lang="ts">
import { computed, ref } from 'vue'
import { MarkdownRenderer } from '@coderminer/vue-markdown'
import { gfmPlugin } from '@coderminer/vue-markdown/plugins'
import SectionShell from '../components/SectionShell.vue'
import SourceEditor from '../components/SourceEditor.vue'
import OutputPane from '../components/OutputPane.vue'
import gfm from '../fixtures/gfm.md?raw'

const enabled = ref(true)
const source = ref(gfm)
const plugins = computed(() => (enabled.value ? [gfmPlugin] : undefined))
</script>

<template>
  <SectionShell
    id="gfm"
    title="GFM"
    description="gfmPlugin is opt-in: compare the same source with and without it."
  >
    <div class="demo-controls">
      <label><input v-model="enabled" type="checkbox" /> Enable gfmPlugin</label>
    </div>
    <div class="demo-grid">
      <SourceEditor v-model="source" label="GFM fixture" :rows="16" />
      <OutputPane>
        <MarkdownRenderer :source="source" :plugins="plugins" />
      </OutputPane>
    </div>
  </SectionShell>
</template>
