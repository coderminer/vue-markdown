<script setup lang="ts">
import { ref } from 'vue'
import {
  CodeBlock,
  MarkdownRenderer,
  MermaidBlock,
  MermaidLiveEditor,
  VueSyntaxHighlighter,
  gfmPlugin,
  type MarkdownCodeNode,
} from '@coderminer/vue-markdown'
import { mathPlugin } from '@coderminer/vue-markdown/math'
import SectionShell from '../components/SectionShell.vue'

const codeNode: MarkdownCodeNode = {
  kind: 'code',
  key: 'demo-code',
  code: 'const greeting = "hello"\nconsole.log(greeting)',
  language: 'ts',
}

const mathSource = `Inline $E = mc^2$ and a display block:

$$
\\int_0^1 x^2 \\, dx
$$
`

const mermaidSource = `flowchart LR
  A[Markdown] --> B[Pipeline]
  B --> C[Vue nodes]
  C --> D[Accessible output]
`

const editorSource = ref(mermaidSource)
const gfmPlugins = [gfmPlugin]
const mathPlugins = [mathPlugin()]
</script>

<template>
  <SectionShell
    id="v1x"
    title="v1.x nodes, highlighting, math, and Mermaid"
    description="Rich catalog entries and optional engines, all imported through public entries."
  >
    <div class="demo-grid">
      <div>
        <h3>CodeBlock</h3>
        <CodeBlock :node="codeNode" :code="codeNode.code" :language="codeNode.language" />
        <h3>VueSyntaxHighlighter</h3>
        <VueSyntaxHighlighter
          :source="codeNode.code"
          language="ts"
          line-numbers
          :highlight-lines="[1]"
        />
      </div>
      <div>
        <h3>GFM task items and footnotes</h3>
        <MarkdownRenderer
          :source="'- [x] shipped\n- [ ] next\n\nA note[^1].\n\n[^1]: Footnote body'"
          :plugins="gfmPlugins"
        />
        <h3>Math</h3>
        <MarkdownRenderer :source="mathSource" :plugins="mathPlugins" />
      </div>
    </div>

    <h3>Mermaid</h3>
    <MermaidBlock :source="mermaidSource" />

    <h3>Mermaid live editor</h3>
    <MermaidLiveEditor v-model="editorSource" />
  </SectionShell>
</template>
