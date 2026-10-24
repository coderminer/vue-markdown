<script setup lang="ts">
import { computed, defineComponent, h, ref, type VNodeChild } from 'vue'
import { useMarkdownDocument } from 'vue-markdown-suite/headless'
import type { MarkdownNode } from 'vue-markdown-suite/headless'
import SectionShell from '../components/SectionShell.vue'
import SourceEditor from '../components/SourceEditor.vue'
import OutputPane from '../components/OutputPane.vue'

const source = ref(`# Headless

The composable owns parsing, status, diagnostics, and the document model.

## TOC

- custom markup
- no preset components
`)

const { document, toc, status, diagnostics, pipeline, plugins } =
  useMarkdownDocument(source)

const nodeCount = computed(() => document.value?.nodes.length ?? 0)

function renderHeadless(node: MarkdownNode): VNodeChild {
  if (node.kind === 'text') return node.value
  if (node.kind === 'code') return h('pre', [h('code', node.code)])
  if (node.kind === 'element') {
    const children = node.children.map((child) =>
      h(HeadlessNode, { node: child, key: child.key }),
    )
    if (node.tag === 'a') {
      return h('a', { href: node.attrs.href }, children)
    }
    return h(node.tag, node.attrs, children)
  }
  return h('span', { 'data-kind': node.kind }, node.kind)
}

const HeadlessNode = defineComponent({
  name: 'HeadlessNode',
  props: { node: { type: Object as () => MarkdownNode, required: true } },
  setup(props) {
    return () => renderHeadless(props.node)
  },
})
</script>

<template>
  <SectionShell
    id="headless"
    title="Headless"
    description="useMarkdownDocument returns the model, TOC, status, and diagnostics without preset markup."
  >
    <div class="demo-controls">
      <span>status: <strong>{{ status }}</strong></span>
      <span>pipeline: <strong>{{ pipeline }}</strong></span>
      <span>plugins: <strong>{{ plugins.join(', ') }}</strong></span>
      <span>nodes: <strong>{{ nodeCount }}</strong></span>
      <span>diagnostics: <strong>{{ diagnostics.length }}</strong></span>
    </div>
    <div class="demo-grid">
      <SourceEditor v-model="source" label="Source" :rows="12" />
      <OutputPane>
        <article class="demo-headless">
          <h3>Custom TOC</h3>
          <ol>
            <li v-for="item in toc" :key="item.id">
              <a :href="`#${item.id}`">{{ item.text }}</a>
            </li>
          </ol>
          <h3>Custom markup</h3>
          <HeadlessNode
            v-for="entry in document?.nodes ?? []"
            :key="entry.key"
            :node="entry"
          />
        </article>
      </OutputPane>
    </div>
    <details class="demo-details">
      <summary>Document model</summary>
      <pre class="demo-code">{{ JSON.stringify(document, null, 2) }}</pre>
    </details>
  </SectionShell>
</template>
