<script setup lang="ts">
import { computed, ref } from 'vue'
import { MarkdownRenderer } from '@coderminer/vue-markdown'
import type { MarkdownElementNode } from '@coderminer/vue-markdown'
import SectionShell from '../components/SectionShell.vue'
import SourceEditor from '../components/SourceEditor.vue'
import OutputPane from '../components/OutputPane.vue'

const modes = ['allow', 'deny', 'unwrap', 'predicate'] as const
type Mode = (typeof modes)[number]

const mode = ref<Mode>('allow')
const source = ref(`# Filtering

Keep this paragraph with **bold** text.

## Drop or keep this heading
`)

const allowElement = (node: MarkdownElementNode): boolean => node.tag !== 'strong'

const options = computed(() => ({
  allowedElements: mode.value === 'allow' ? ['h1', 'p', 'strong'] : undefined,
  disallowedElements: mode.value === 'deny' ? ['h2'] : undefined,
  unwrapDisallowed: mode.value === 'unwrap',
  allowElement: mode.value === 'predicate' ? allowElement : undefined,
}))
</script>

<template>
  <SectionShell
    id="filtering"
    title="Filtering"
    description="allowedElements, disallowedElements, unwrapDisallowed, and allowElement run on the normalized model."
  >
    <div class="demo-controls">
      <label v-for="option in modes" :key="option">
        <input v-model="mode" type="radio" :value="option" />
        {{ option }}
      </label>
    </div>
    <div class="demo-grid">
      <SourceEditor v-model="source" label="Source" :rows="10" />
      <OutputPane>
        <MarkdownRenderer :source="source" v-bind="options" />
      </OutputPane>
    </div>
  </SectionShell>
</template>
