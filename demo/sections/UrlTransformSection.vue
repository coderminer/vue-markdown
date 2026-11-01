<script setup lang="ts">
import { computed, ref } from 'vue'
import { MarkdownRenderer, defaultUrlTransform } from '@coderminer/vue-markdown'
import type { MarkdownUrlTransform } from '@coderminer/vue-markdown'
import SectionShell from '../components/SectionShell.vue'
import SourceEditor from '../components/SourceEditor.vue'
import OutputPane from '../components/OutputPane.vue'

const modes = ['default', 'custom', 'null'] as const
type Mode = (typeof modes)[number]

const mode = ref<Mode>('default')
const baseUrl = ref('https://example.com/docs/')
const source = ref(`[relative](/guide) [external](https://example.com) [unsafe](javascript:alert(1))

![image](/image.png)
`)

const customTransform: MarkdownUrlTransform = (url, key) =>
  key === 'href' ? `${url}?from=demo` : url

const urlTransform = computed<MarkdownUrlTransform | undefined>(() => {
  if (mode.value === 'custom') return customTransform
  if (mode.value === 'null') return () => null
  return undefined
})
</script>

<template>
  <SectionShell
    id="url-transform"
    title="URL transform"
    description="defaultUrlTransform applies the package URL policy; a custom transform may replace or remove URLs."
  >
    <div class="demo-controls">
      <label v-for="option in modes" :key="option">
        <input v-model="mode" type="radio" :value="option" />
        {{ option }}
      </label>
      <label><input v-model="baseUrl" type="text" /> baseUrl</label>
    </div>
    <div class="demo-grid">
      <SourceEditor v-model="source" label="Source" :rows="10" />
      <OutputPane>
        <MarkdownRenderer
          :source="source"
          :base-url="baseUrl || undefined"
          :url-transform="urlTransform"
        />
      </OutputPane>
    </div>
    <pre class="demo-code">defaultUrlTransform('javascript:alert(1)') === '{{ defaultUrlTransform('javascript:alert(1)') }}'</pre>
  </SectionShell>
</template>
