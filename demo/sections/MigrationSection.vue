<script setup lang="ts">
import { ref } from 'vue'
import { MarkdownRenderer } from 'vue-markdown-suite'
import type { MarkdownUrlTransform } from 'vue-markdown-suite'
import SectionShell from '../components/SectionShell.vue'
import SourceEditor from '../components/SourceEditor.vue'
import OutputPane from '../components/OutputPane.vue'

const source = ref(`# Migration example

A **bold** paragraph with a [link](https://example.com) and [relative](/guide).

<script>alert('dropped')\x3C/script>
`)

const rows = [
  { react: 'components', vue: 'components', note: 'Same tag-keyed map; values are components or tag strings.' },
  { react: 'allowedElements', vue: 'allowedElements', note: 'Runs on the normalized model.' },
  { react: 'disallowedElements', vue: 'disallowedElements', note: 'Allowed list wins on conflict.' },
  { react: 'unwrapDisallowed', vue: 'unwrapDisallowed', note: 'Keeps children.' },
  { react: 'allowElement', vue: 'allowElement', note: 'Runs after the lists.' },
  { react: 'urlTransform', vue: 'urlTransform', note: 'Return null to remove the attribute.' },
  { react: 'skipHtml', vue: 'skipHtml', note: 'Raw nodes are removed.' },
  { react: 'remarkPlugins', vue: 'remarkPlugins', note: 'Runs after library remark plugins.' },
  { react: 'rehypePlugins', vue: 'rehypePlugins', note: 'Add rehype-raw to enable raw HTML.' },
  { react: 'children', vue: 'source / default slot', note: 'source wins over the slot.' },
  { react: 'MarkdownAsync', vue: 'useMarkdownDocument', note: 'The composable owns async status.' },
  { react: 'MarkdownHooks', vue: 'useMarkdownDocument', note: 'No separate hooks entry.' },
]

const transform: MarkdownUrlTransform = (url) =>
  url.startsWith('https://') ? url : null
</script>

<template>
  <SectionShell
    id="migration"
    title="Migration"
    description="react-markdown props map directly to Vue props; the composable replaces the async and hooks entries."
  >
    <div class="demo-grid">
      <SourceEditor v-model="source" label="Source" :rows="10" />
      <OutputPane>
        <MarkdownRenderer
          :source="source"
          :components="{ h1: 'h2' }"
          :allowed-elements="['h2', 'p', 'strong', 'a']"
          :url-transform="transform"
          skip-html
        />
      </OutputPane>
    </div>

    <table class="demo-table">
      <thead>
        <tr><th>react-markdown</th><th>vue-markdown-suite</th><th>Notes</th></tr>
      </thead>
      <tbody>
        <tr v-for="row in rows" :key="row.react">
          <td><code>{{ row.react }}</code></td>
          <td><code>{{ row.vue }}</code></td>
          <td>{{ row.note }}</td>
        </tr>
      </tbody>
    </table>
  </SectionShell>
</template>
