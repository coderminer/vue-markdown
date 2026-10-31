<script setup lang="ts">
import { computed, defineComponent, h, ref } from 'vue'
import {
  COMPONENT_MANIFESTS,
  MarkdownConfigProvider,
  MarkdownRenderer,
  type MarkdownNodeRenderer,
  type MarkdownPipeline,
  type MarkdownTheme,
  type PipelineResult,
} from 'vue-markdown-suite'
import SectionShell from '../components/SectionShell.vue'
import SourceEditor from '../components/SourceEditor.vue'
import OutputPane from '../components/OutputPane.vue'

const source = ref(`# Customization inspector

Manifests, tokens, labels, themes, regions, node components, pipelines, and
overrides can all change live.

## An empty section follows
`)

const theme = ref<MarkdownTheme>('light')
const accent = ref('#8250df')
const tocLabel = ref('Contents')
const emptyLabel = ref('Nothing here')
const headingAnchor = ref('Permalink')
const headingTag = ref<'h1' | 'h2'>('h1')
const decorateLinks = ref(false)
const customEmpty = ref(false)
const useEmptySlot = ref(false)
const uppercasePipeline = ref(false)
const useMockHighlighter = ref(false)

const EmptyRegion = defineComponent({
  props: { label: String },
  setup(props) {
    return () => h('div', { class: 'demo-custom-empty' }, `Custom empty: ${props.label}`)
  },
})

const decorateLink: MarkdownNodeRenderer = (ctx) =>
  h('span', { class: 'demo-link-decoration' }, [ctx.defaultRender(), ' \u2197'])

const components = computed(() =>
  headingTag.value === 'h2' ? { h1: 'h2' } : {},
)
const labels = computed(() => ({
  toc: tocLabel.value,
  empty: emptyLabel.value,
  headingAnchor: headingAnchor.value,
}))
const nodeComponents = computed(() =>
  decorateLinks.value ? { a: decorateLink } : {},
)
const regions = computed(() => (customEmpty.value ? { empty: EmptyRegion } : {}))
const tokens = computed(() => ({ '--vmd-color-accent': accent.value }))

function uppercaseResult(value: string): PipelineResult {
  return {
    hast: {
      type: 'root',
      children: [
        {
          type: 'element',
          tagName: 'p',
          properties: {},
          children: [{ type: 'text', value: value.toUpperCase() }],
        },
      ],
    },
  }
}

const demoPipeline: MarkdownPipeline = {
  name: 'demo-uppercase',
  processSync(value: string) {
    return uppercaseResult(value)
  },
  async process(value: string) {
    return uppercaseResult(value)
  },
}

const mockHighlighter = {
  id: 'demo-mock',
  highlight(code: string, language: string) {
    return {
      language,
      nodes: [{ kind: 'text' as const, key: 'demo', value: code }],
    }
  },
}

const manifests = Object.values(COMPONENT_MANIFESTS)
</script>

<template>
  <SectionShell
    id="customization"
    title="Customization inspector"
    description="Every control below maps to a public customization layer and updates the preview live."
  >
    <div class="demo-grid">
      <div class="demo-controls">
        <SourceEditor v-model="source" label="Source" :rows="10" />

        <label>
          Theme
          <select v-model="theme">
            <option value="light">light</option>
            <option value="dark">dark</option>
            <option value="auto">auto</option>
            <option value="custom">custom</option>
          </select>
        </label>

        <label>
          Accent token
          <input v-model="accent" type="color" />
        </label>

        <label>
          TOC label
          <input v-model="tocLabel" type="text" />
        </label>

        <label>
          Empty label
          <input v-model="emptyLabel" type="text" />
        </label>

        <label>
          Heading anchor label
          <input v-model="headingAnchor" type="text" />
        </label>

        <label>
          Heading tag
          <select v-model="headingTag">
            <option value="h1">h1</option>
            <option value="h2">h2 (components.h1)</option>
          </select>
        </label>

        <label class="demo-check">
          <input v-model="decorateLinks" type="checkbox" />
          Decorate links with nodeComponents
        </label>
        <label class="demo-check">
          <input v-model="customEmpty" type="checkbox" />
          Replace the empty region
        </label>
        <label class="demo-check">
          <input v-model="useEmptySlot" type="checkbox" />
          Replace the empty region with a slot
        </label>
        <label class="demo-check">
          <input v-model="uppercasePipeline" type="checkbox" />
          Use a custom pipeline
        </label>
        <label class="demo-check">
          <input v-model="useMockHighlighter" type="checkbox" />
          Use the mock highlighter adapter
        </label>
        <p class="demo-adapter">
          Highlighter: {{ useMockHighlighter ? mockHighlighter.id : 'default' }}
        </p>
      </div>

      <OutputPane>
        <MarkdownConfigProvider
          :theme="theme"
          :tokens="tokens"
          :labels="labels"
          :components="components"
          :node-components="nodeComponents"
          :regions="regions"
          :pipeline="uppercasePipeline ? demoPipeline : undefined"
          :highlighter="useMockHighlighter ? mockHighlighter : undefined"
        >
          <MarkdownRenderer
            :source="source"
            toc
            :labels="labels"
            :components="components"
            :node-components="nodeComponents"
            :regions="regions"
          >
            <template v-if="useEmptySlot" #empty="{ label: slotLabel }">
              <div class="demo-custom-empty">Slot empty: {{ slotLabel }}</div>
            </template>
          </MarkdownRenderer>
        </MarkdownConfigProvider>
      </OutputPane>
    </div>

    <details class="demo-manifest">
      <summary>{{ manifests.length }} component manifests</summary>
      <table>
        <thead>
          <tr>
            <th>Component</th>
            <th>Parts</th>
            <th>Slots</th>
            <th>Labels</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="entry in manifests" :key="entry.name">
            <td>{{ entry.name }}</td>
            <td>{{ entry.parts.join(', ') || '—' }}</td>
            <td>{{ entry.slots.join(', ') || '—' }}</td>
            <td>{{ entry.labels.join(', ') || '—' }}</td>
          </tr>
        </tbody>
      </table>
    </details>
  </SectionShell>
</template>

<style scoped>
.demo-controls {
  display: grid;
  gap: 0.65rem;
  align-content: start;
}

.demo-controls label {
  display: grid;
  gap: 0.25rem;
  font-size: 0.875rem;
}

.demo-check {
  grid-template-columns: auto 1fr;
  align-items: center;
}

.demo-adapter {
  margin: 0;
  font-size: 0.8rem;
  color: #59636e;
}

.demo-manifest {
  margin-block-start: 1rem;
  font-size: 0.875rem;
}

.demo-manifest table {
  width: 100%;
  border-collapse: collapse;
  margin-block-start: 0.5rem;
}

.demo-manifest th,
.demo-manifest td {
  padding: 0.35rem 0.5rem;
  border: 1px solid var(--demo-border, #d1d9e0);
  text-align: left;
  vertical-align: top;
}
</style>
