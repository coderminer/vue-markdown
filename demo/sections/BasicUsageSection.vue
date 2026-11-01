<script setup lang="ts">
import { ref } from 'vue'
import { MarkdownRenderer } from '@coderminer/vue-markdown'
import CodeSample from '../components/CodeSample.vue'
import SectionShell from '../components/SectionShell.vue'
import SourceEditor from '../components/SourceEditor.vue'
import OutputPane from '../components/OutputPane.vue'

const install = 'npm install @coderminer/vue-markdown'

const quickStart = `<script setup lang="ts">
import { ref } from 'vue'
import { MarkdownRenderer } from '@coderminer/vue-markdown'
import '@coderminer/vue-markdown/style.css'

const source = ref('# Hello\\n\\nA **bold** paragraph with a [link](https://example.com).')
\x3C/script>

<template>
  <MarkdownRenderer v-model:source="source" toc />
</template>`

const source = ref(`# Hello, Markdown

A **bold** paragraph with a [link](https://example.com), inline \`code\`, and a
list:

- Write Markdown
- Ship Vue components
- Keep full control

> The renderer keeps the last good document while a new parse is pending.
`)

const showToc = ref(true)
const externalLinks = ref(true)
const lastEvent = ref('')

function onTocChange(items: unknown[]): void {
  lastEvent.value = `toc-change: ${items.length} headings`
}

function onLinkClick(payload: { url: string }): void {
  lastEvent.value = `link-click: ${payload.url}`
}
</script>

<template>
  <SectionShell
    id="basic-usage"
    title="Basic usage"
    description="Install the package, pass Markdown through the source prop, and import the optional stylesheet."
  >
    <div class="demo-steps">
      <div class="demo-step">
        <span class="demo-step-number">1</span>
        <div>
          <h3>Install</h3>
          <CodeSample :code="install" label="Terminal" language="bash" />
        </div>
      </div>
      <div class="demo-step">
        <span class="demo-step-number">2</span>
        <div>
          <h3>Render</h3>
          <CodeSample :code="quickStart" label="App.vue" />
        </div>
      </div>
    </div>

    <div class="demo-controls">
      <label><input v-model="showToc" type="checkbox" /> TOC</label>
      <label>
        <input v-model="externalLinks" type="checkbox" />
        Open external links in a new tab
      </label>
      <span class="demo-note">{{ lastEvent || 'Interact with the preview to see events.' }}</span>
    </div>

    <div class="demo-grid">
      <SourceEditor v-model="source" label="Markdown source" :rows="14" />
      <OutputPane>
        <MarkdownRenderer
          v-model:source="source"
          :toc="showToc"
          :external-link-target="externalLinks ? '_blank' : '_self'"
          @toc-change="onTocChange"
          @link-click="onLinkClick"
        />
      </OutputPane>
    </div>

    <div class="demo-cards">
      <article class="demo-card">
        <h3>Controlled source</h3>
        <p>
          <code>source</code> is the controlled prop. Use
          <code>v-model:source</code> for a two-way editor, or pass static text.
        </p>
      </article>
      <article class="demo-card">
        <h3>Styled or unstyled</h3>
        <p>
          Import <code>@coderminer/vue-markdown/style.css</code> for the default design,
          or skip it and keep the semantic markup.
        </p>
      </article>
      <article class="demo-card">
        <h3>SSR ready</h3>
        <p>
          Parsing is deterministic and DOM-free. Server output and client output
          share the same heading IDs.
        </p>
      </article>
    </div>
  </SectionShell>
</template>
