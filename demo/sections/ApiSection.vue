<script setup lang="ts">
import {
  COMPONENT_MANIFESTS,
  PART_NAMES,
  TOKEN_NAMES,
} from 'vue-markdown-suite'
import CodeSample from '../components/CodeSample.vue'
import SectionShell from '../components/SectionShell.vue'

interface Row {
  name: string
  type: string
  fallback: string
  notes: string
}

const props: Row[] = [
  { name: 'source', type: 'string', fallback: "''", notes: 'Controlled Markdown input. Wins over the default slot and supports v-model:source.' },
  { name: 'components', type: 'Record<string, Component | string>', fallback: '{}', notes: 'Tag-keyed overrides such as p, h1–h6, a, pre, code, and table.' },
  { name: 'regions', type: 'Partial<Record<RegionKey, Component | string>>', fallback: '{}', notes: 'Replaces root, content, toc, tocItem, codeBlock, mermaidBlock, error, empty, or loading.' },
  { name: 'nodeComponents', type: 'Record<string, Component | string | NodeRenderer>', fallback: '{}', notes: 'Semantic overrides for code, math, mermaid, custom, and element tags.' },
  { name: 'labels', type: 'Partial<MarkdownLabels>', fallback: '{}', notes: 'String or context-aware functions for every built-in label.' },
  { name: 'preset', type: 'MarkdownPreset | MarkdownPreset[]', fallback: '—', notes: 'Applies one or more composed presets.' },
  { name: 'plugins', type: 'PluginInput[]', fallback: 'defaultPlugins', notes: 'Replaces the default plugin set when provided.' },
  { name: 'disablePlugins', type: 'string[]', fallback: '[]', notes: 'Removes named plugins. Core markers cannot be disabled.' },
  { name: 'remarkPlugins', type: 'PluggableList', fallback: '[]', notes: 'Runs after library remark plugins.' },
  { name: 'rehypePlugins', type: 'PluggableList', fallback: '[]', notes: 'Runs after rehype-sanitize and heading IDs. Adding rehype-raw enables raw HTML.' },
  { name: 'remarkRehypeOptions', type: 'Record<string, unknown>', fallback: '{}', notes: 'Merged into the mdast → hast conversion.' },
  { name: 'pipeline', type: 'MarkdownPipeline', fallback: 'official', notes: 'Advanced escape hatch. Must return a hast root.' },
  { name: 'slugger', type: 'MarkdownSlugger', fallback: 'github-slugger', notes: 'Heading ID generator.' },
  { name: 'highlighter', type: 'MarkdownHighlighter', fallback: '—', notes: 'Code adapter. highlight.js is loaded lazily; Shiki is a separate entry.' },
  { name: 'mathEngine', type: 'MathEngine', fallback: '—', notes: 'Math adapter. katexEngine is available from the math entry.' },
  { name: 'mermaidRenderer', type: 'MermaidRenderer', fallback: '—', notes: 'Diagram adapter used by MermaidBlock.' },
  { name: 'diagnosticsFormatter', type: 'DiagnosticFormatter', fallback: '—', notes: 'Formats thrown render errors into diagnostics.' },
  { name: 'allowedElements', type: 'string[]', fallback: '—', notes: 'Allow list. Mutually exclusive with disallowedElements; wins on conflict.' },
  { name: 'disallowedElements', type: 'string[]', fallback: '—', notes: 'Deny list.' },
  { name: 'unwrapDisallowed', type: 'boolean', fallback: 'false', notes: 'Keeps the children of removed elements.' },
  { name: 'allowElement', type: '(node, index, parent) => boolean | null | undefined', fallback: '—', notes: 'Runs after the allow/deny lists; any falsy result rejects the element.' },
  { name: 'urlTransform', type: '(url, key, node) => string | null | undefined', fallback: 'defaultUrlTransform', notes: 'Return null to remove an attribute. Output is revalidated.' },
  { name: 'linkTarget', type: 'string', fallback: "'_self'", notes: 'Target attribute applied to links.' },
  { name: 'externalLinkTarget', type: "'_self' | '_blank'", fallback: "'_self'", notes: '_blank adds rel="noopener noreferrer".' },
  { name: 'baseUrl', type: 'string', fallback: '—', notes: 'Resolves relative URLs before urlTransform.' },
  { name: 'idPrefix', type: 'string', fallback: "''", notes: 'Prefixes generated heading IDs.' },
  { name: 'syncHash', type: 'boolean', fallback: 'false', notes: 'Updates the URL hash when scrolling to a heading.' },
  { name: 'skipHtml', type: 'boolean', fallback: 'false', notes: 'Removes raw HTML nodes and their text.' },
  { name: 'toc', type: 'boolean', fallback: 'false', notes: 'Renders the TOC region.' },
  { name: 'showError', type: 'boolean', fallback: 'false', notes: 'Renders the error region when a run fails.' },
  { name: 'tokens', type: 'Record<string, string>', fallback: '{}', notes: 'Inline --vmd-* custom properties on the root.' },
  { name: 'theme', type: "'light' | 'dark' | 'auto' | 'custom'", fallback: "'light'", notes: 'Writes data-vmd-theme on the root only.' },
  { name: 'as', type: 'string | Component', fallback: "'div'", notes: 'Root element or component.' },
]

const events = [
  { name: 'update:source', payload: 'source: string', notes: 'Emitted by the updateSource action and v-model:source.' },
  { name: 'toc-change', payload: 'toc: TocItem[]', notes: 'Signature-gated; fires only when the serialized TOC changes.' },
  { name: 'link-click', payload: '{ url, target, node, event }', notes: 'Fires after a rendered link is activated.' },
  { name: 'custom-tag-click', payload: '{ tag, props, node, event }', notes: 'Props are normalized and safe.' },
  { name: 'task-change', payload: '{ checked, node }', notes: 'Fires when a GFM task checkbox changes.' },
  { name: 'render-error', payload: 'MarkdownDiagnostic', notes: 'Reports parse, plugin, adapter, and configuration failures.' },
  { name: 'ready', payload: 'MarkdownDocument', notes: 'Fires once for the first successful document.' },
]

const actions = [
  { name: 'scrollToHeading', signature: '(id: string, options?: ScrollIntoViewOptions) => void' },
  { name: 'getDocument', signature: '() => MarkdownDocument | undefined' },
  { name: 'getToc', signature: '() => TocItem[]' },
  { name: 'refresh', signature: '() => Promise<void>' },
  { name: 'updateSource', signature: '(source: string) => void' },
]

const entries = [
  { entry: 'vue-markdown-suite', contents: 'Renderer, preset components, composables, core helpers, and export helpers.' },
  { entry: 'vue-markdown-suite/headless', contents: 'Model, composables, and helpers without preset components or CSS.' },
  { entry: 'vue-markdown-suite/pipeline', contents: 'Official pipeline, custom pipeline validation, and identity helpers.' },
  { entry: 'vue-markdown-suite/plugins', contents: 'defineMarkdownPlugin, registry, built-in plugins, and search.' },
  { entry: 'vue-markdown-suite/presets', contents: 'defineMarkdownPreset, composePresets, and configuration types.' },
  { entry: 'vue-markdown-suite/highlight', contents: 'highlight.js adapter and normalization helpers.' },
  { entry: 'vue-markdown-suite/highlight/shiki', contents: 'Optional Shiki adapter.' },
  { entry: 'vue-markdown-suite/math', contents: 'mathPlugin, katexEngine, and math types.' },
  { entry: 'vue-markdown-suite/mermaid', contents: 'Lazy Mermaid runtime and SVG sanitizer.' },
  { entry: 'vue-markdown-suite/editor', contents: 'Lazy CodeMirror editor used by MermaidLiveEditor.' },
  { entry: 'vue-markdown-suite/components/*', contents: 'One entry per public component.' },
  { entry: 'vue-markdown-suite/style.css', contents: 'Full optional stylesheet.' },
  { entry: 'vue-markdown-suite/styles/tokens.css', contents: 'Design tokens only.' },
  { entry: 'vue-markdown-suite/styles/components.css', contents: 'Part-based component styles.' },
]

const adapters = `import type {
  MarkdownHighlighter,
  MathEngine,
  MermaidRenderer,
  MarkdownPlugin,
  MarkdownPipeline,
} from 'vue-markdown-suite'

const highlighter: MarkdownHighlighter = {
  id: 'my-highlighter',
  highlight(code, language) {
    return { language, nodes: [{ kind: 'text', key: 'code', value: code }] }
  },
}

const engine: MathEngine = {
  id: 'my-math',
  render(tex) {
    return { nodes: [{ kind: 'text', key: 'tex', value: tex }] }
  },
}

const renderer: MermaidRenderer = {
  id: 'my-mermaid',
  async render(source) {
    return { nodes: [], svg: await render(source) }
  },
}

const plugin: MarkdownPlugin = {
  name: 'my-plugin',
  remarkPlugins: [],
  rehypePlugins: [],
  components: { h2: 'h3' },
  labels: { toc: 'Contents' },
  tokens: { '--vmd-color-accent': '#8250df' },
  setup() {
    return () => {}
  },
}

const pipeline: MarkdownPipeline = {
  name: 'my-pipeline',
  async process(source) {
    return { hast: { type: 'root', children: [] } }
  },
}`

const manifests = Object.values(COMPONENT_MANIFESTS)
const tokens = TOKEN_NAMES
const parts = PART_NAMES
</script>

<template>
  <SectionShell
    id="api"
    title="API reference"
    description="The renderer surface, entry points, adapter contracts, and customization primitives."
  >
    <div class="demo-api-nav" aria-label="API sections">
      <a href="#api-props">Props</a>
      <a href="#api-events">Events</a>
      <a href="#api-actions">Actions</a>
      <a href="#api-slots">Slots</a>
      <a href="#api-entries">Entry points</a>
      <a href="#api-adapters">Adapters</a>
      <a href="#api-components">Components</a>
    </div>

    <h3 id="api-props">MarkdownRenderer props</h3>
    <p class="demo-note">
      Parse-affecting props are memoized. Presentation-only changes such as
      <code>theme</code> or <code>tokens</code> do not re-parse the document.
    </p>
    <div class="demo-api-table-wrap">
      <table class="demo-table">
        <thead>
          <tr><th>Prop</th><th>Type</th><th>Default</th><th>Notes</th></tr>
        </thead>
        <tbody>
          <tr v-for="row in props" :key="row.name">
            <td><code>{{ row.name }}</code></td>
            <td><code>{{ row.type }}</code></td>
            <td><code>{{ row.fallback }}</code></td>
            <td>{{ row.notes }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <h3 id="api-events">Events</h3>
    <table class="demo-table">
      <thead><tr><th>Event</th><th>Payload</th><th>Notes</th></tr></thead>
      <tbody>
        <tr v-for="row in events" :key="row.name">
          <td><code>{{ row.name }}</code></td>
          <td><code>{{ row.payload }}</code></td>
          <td>{{ row.notes }}</td>
        </tr>
      </tbody>
    </table>

    <h3 id="api-actions">Exposed actions</h3>
    <table class="demo-table">
      <thead><tr><th>Action</th><th>Signature</th></tr></thead>
      <tbody>
        <tr v-for="row in actions" :key="row.name">
          <td><code>{{ row.name }}</code></td>
          <td><code>{{ row.signature }}</code></td>
        </tr>
      </tbody>
    </table>

    <h3 id="api-slots">Slots and regions</h3>
    <p>
      The <code>default</code> slot is raw Markdown text and is re-read when its
      text changes; a bound <code>source</code> wins. Named slots fully replace
      their region and receive scoped data:
      <code>root</code>, <code>toc</code>, <code>toc-item</code>,
      <code>content</code>, <code>error</code>, <code>empty</code>, and
      <code>loading</code>.
    </p>
    <div class="demo-api-grid">
      <article class="demo-card">
        <h4>Region keys</h4>
        <p><code>root</code>, <code>content</code>, <code>toc</code>, <code>tocItem</code>, <code>codeBlock</code>, <code>mermaidBlock</code>, <code>error</code>, <code>empty</code>, <code>loading</code></p>
      </article>
      <article class="demo-card">
        <h4>Override precedence</h4>
        <p>Local props &gt; nearest provider &gt; preset &gt; plugin defaults &gt; built-ins.</p>
      </article>
      <article class="demo-card">
        <h4>Node resolution</h4>
        <p><code>nodeComponents</code> functions &gt; <code>nodeComponents[tag]</code> &gt; <code>components[tag]</code> &gt; <code>nodeComponents[kind]</code>.</p>
      </article>
    </div>

    <h3 id="api-entries">Entry points</h3>
    <table class="demo-table">
      <thead><tr><th>Entry</th><th>Contents</th></tr></thead>
      <tbody>
        <tr v-for="row in entries" :key="row.entry">
          <td><code>{{ row.entry }}</code></td>
          <td>{{ row.contents }}</td>
        </tr>
      </tbody>
    </table>

    <h3 id="api-adapters">Adapter and extension contracts</h3>
    <CodeSample :code="adapters" label="TypeScript" language="ts" />

    <h3 id="api-components">Component catalog</h3>
    <details class="demo-details" open>
      <summary>{{ manifests.length }} public component manifests</summary>
      <div class="demo-api-table-wrap">
        <table class="demo-table">
          <thead>
            <tr><th>Component</th><th>Parts</th><th>Slots</th><th>Labels</th></tr>
          </thead>
          <tbody>
            <tr v-for="entry in manifests" :key="entry.name">
              <td><code>{{ entry.name }}</code></td>
              <td>{{ entry.parts.join(', ') || '—' }}</td>
              <td>{{ entry.slots.join(', ') || '—' }}</td>
              <td>{{ entry.labels.join(', ') || '—' }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </details>

    <details class="demo-details">
      <summary>{{ parts.length }} stable parts and {{ tokens.length }} design tokens</summary>
      <p class="demo-note">
        Parts render as <code>class="vmd-&lt;part&gt;"</code> and
        <code>data-vmd-part="&lt;part&gt;"</code>. Tokens use the
        <code>--vmd-</code> prefix.
      </p>
      <div class="demo-api-grid">
        <article class="demo-card">
          <h4>Parts</h4>
          <p class="demo-chip-list">
            <code v-for="part in parts" :key="part">{{ part }}</code>
          </p>
        </article>
        <article class="demo-card">
          <h4>Tokens</h4>
          <p class="demo-chip-list">
            <code v-for="token in tokens" :key="token">{{ token }}</code>
          </p>
        </article>
      </div>
    </details>
  </SectionShell>
</template>
