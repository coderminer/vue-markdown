<script setup lang="ts">
import { ref } from 'vue'
import { MarkdownRenderer } from '@coderminer/vue-markdown'
import SectionShell from '../components/SectionShell.vue'
import SourceEditor from '../components/SourceEditor.vue'
import OutputPane from '../components/OutputPane.vue'

const source = ref(`# Playground

Edit this Markdown and watch the renderer update.

- **source** wins over the default slot
- \`v-model:source\` stays in sync
- TOC and link events are observable

> The renderer keeps the last good document when a run fails.
`)

const showToc = ref(true)
const externalLinks = ref(true)
const events = ref<string[]>([])

function log(name: string, payload: unknown): void {
  const detail =
    payload && typeof payload === 'object' && 'code' in payload
      ? String((payload as { code: unknown }).code)
      : ''
  events.value = [`${name}${detail ? `: ${detail}` : ''}`, ...events.value].slice(0, 6)
}
</script>

<template>
  <SectionShell
    id="playground"
    title="Playground"
    description="source prop, v-model:source, ready, toc-change, and render-error."
  >
    <div class="demo-controls">
      <label><input v-model="showToc" type="checkbox" /> TOC</label>
      <label>
        <input v-model="externalLinks" type="checkbox" />
        Open external links in a new tab
      </label>
    </div>

    <div class="demo-grid">
      <SourceEditor v-model="source" label="Source" :rows="14" />
      <OutputPane>
        <MarkdownRenderer
          v-model:source="source"
          :toc="showToc"
          :external-link-target="externalLinks ? '_blank' : '_self'"
          @ready="log('ready', $event)"
          @toc-change="log('toc-change', $event)"
          @render-error="log('render-error', $event)"
          @link-click="log('link-click', $event)"
        />
      </OutputPane>
    </div>

    <p class="demo-events">
      <strong>Events:</strong>
      <span v-if="events.length === 0">none yet</span>
      <code v-for="event in events" :key="event">{{ event }}</code>
    </p>
  </SectionShell>
</template>
