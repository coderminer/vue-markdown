<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { version } from '@coderminer/vue-markdown'
import PlaygroundSection from './sections/PlaygroundSection.vue'
import BasicUsageSection from './sections/BasicUsageSection.vue'
import AdvancedUsageSection from './sections/AdvancedUsageSection.vue'
import CustomizationGuideSection from './sections/CustomizationGuideSection.vue'
import ApiSection from './sections/ApiSection.vue'
import CompleteExampleSection from './sections/CompleteExampleSection.vue'
import CommonMarkSection from './sections/CommonMarkSection.vue'
import GfmSection from './sections/GfmSection.vue'
import ComponentsSection from './sections/ComponentsSection.vue'
import FilteringSection from './sections/FilteringSection.vue'
import UrlTransformSection from './sections/UrlTransformSection.vue'
import RawHtmlSection from './sections/RawHtmlSection.vue'
import PluginSection from './sections/PluginSection.vue'
import HeadlessSection from './sections/HeadlessSection.vue'
import SsrSection from './sections/SsrSection.vue'
import CustomizationSection from './sections/CustomizationSection.vue'
import V1xSection from './sections/V1xSection.vue'

const groups = [
  {
    label: 'Guide',
    items: [
      { id: 'overview', label: 'Overview' },
      { id: 'basic-usage', label: 'Basic usage' },
      { id: 'advanced-usage', label: 'Advanced usage' },
      { id: 'customization', label: 'Customization' },
      { id: 'complete-example', label: 'Complete example' },
    ],
  },
  {
    label: 'Reference',
    items: [{ id: 'api', label: 'API reference' }],
  },
  {
    label: 'Interactive demos',
    items: [
      { id: 'playground', label: 'Playground' },
      { id: 'commonmark', label: 'CommonMark' },
      { id: 'gfm', label: 'GFM' },
      { id: 'components', label: 'Components' },
      { id: 'filtering', label: 'Filtering' },
      { id: 'url-transform', label: 'URL transform' },
      { id: 'raw-html', label: 'Raw HTML' },
      { id: 'plugin', label: 'Plugins' },
      { id: 'headless', label: 'Headless' },
      { id: 'ssr', label: 'SSR and export' },
      { id: 'customization-inspector', label: 'Customization inspector' },
      { id: 'v1x', label: 'Rich nodes and engines' },
    ],
  },
]

const activeSection = ref('overview')
let observer: IntersectionObserver | undefined

onMounted(() => {
  if (typeof IntersectionObserver === 'undefined') return
  const ids: string[] = []
  for (const group of groups) {
    for (const item of group.items) ids.push(item.id)
  }
  const sections = ids
    .map((id) => document.getElementById(id))
    .filter((element): element is HTMLElement => element !== null)

  observer = new IntersectionObserver(
    (entries) => {
      const visible = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
      if (visible[0]) activeSection.value = visible[0].target.id
    },
    { rootMargin: '-15% 0px -70% 0px', threshold: 0 },
  )
  for (const section of sections) observer.observe(section)
})

onBeforeUnmount(() => {
  observer?.disconnect()
})
</script>

<template>
  <div class="demo-shell">
    <aside class="demo-sidebar">
      <a class="demo-brand" href="#overview">
        <strong>Vue Markdown Suite</strong>
        <span class="demo-version">v{{ version }}</span>
      </a>

      <nav aria-label="Documentation sections">
        <div v-for="group in groups" :key="group.label" class="demo-nav-group">
          <span class="demo-nav-title">{{ group.label }}</span>
          <ul>
            <li v-for="item in group.items" :key="item.id">
              <a
                :href="`#${item.id}`"
                :class="{ 'is-active': activeSection === item.id }"
                :aria-current="activeSection === item.id ? 'true' : undefined"
              >
                {{ item.label }}
              </a>
            </li>
          </ul>
        </div>
      </nav>

      <div class="demo-sidebar-links">
        <a href="https://github.com/coderminer/vue-markdown" target="_blank" rel="noreferrer">
          GitHub
        </a>
        <a href="https://www.npmjs.com/package/@coderminer/vue-markdown" target="_blank" rel="noreferrer">
          npm
        </a>
      </div>
    </aside>

    <main class="demo-main">
      <section id="overview" class="demo-hero">
        <p class="demo-eyebrow">Vue 3 Markdown component suite</p>
        <h1>Markdown that renders as Vue, not HTML strings.</h1>
        <p class="demo-lede">
          A plugin-driven renderer built on <code>unified</code>,
          <code>remark-parse</code>, and <code>remark-rehype</code>. Replace any
          tag, own the document model, and add code, math, diagrams, and search
          without giving up accessibility or SSR.
        </p>

        <div class="demo-hero-install">
          <span>Install</span>
          <code>npm install @coderminer/vue-markdown</code>
        </div>

        <div class="demo-hero-actions">
          <a class="demo-button demo-button-primary" href="#basic-usage">Get started</a>
          <a class="demo-button" href="#complete-example">Complete example</a>
          <a class="demo-button" href="#api">API reference</a>
          <a class="demo-button" href="https://github.com/coderminer/vue-markdown" target="_blank" rel="noreferrer">GitHub</a>
        </div>

        <ul class="demo-pills">
          <li>Vue-native VNodes</li>
          <li>Typed plugins</li>
          <li>Headless core</li>
          <li>SSR and static export</li>
          <li>Optional highlight.js, Shiki, KaTeX, Mermaid, CodeMirror</li>
        </ul>
      </section>

      <BasicUsageSection />
      <AdvancedUsageSection />
      <CustomizationGuideSection />
      <CompleteExampleSection />

      <ApiSection />

      <div class="demo-block-heading">
        <p class="demo-eyebrow">Interactive demos</p>
        <h2>Every contract, live</h2>
        <p>
          Each section below imports through public entries, so this page also
          works as a packaging and behavior test.
        </p>
      </div>

      <PlaygroundSection />
      <CommonMarkSection />
      <GfmSection />
      <ComponentsSection />
      <FilteringSection />
      <UrlTransformSection />
      <RawHtmlSection />
      <PluginSection />
      <HeadlessSection />
      <SsrSection />
      <CustomizationSection />
      <V1xSection />
    </main>
  </div>
</template>

<style>
:root {
  color-scheme: light;
  font-family: var(--vmd-font-family);
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  background: #f6f8fa;
  color: #1f2328;
}

.demo-shell {
  display: grid;
  grid-template-columns: 260px minmax(0, 1fr);
  min-height: 100vh;
}

.demo-sidebar {
  position: sticky;
  top: 0;
  align-self: start;
  display: flex;
  flex-direction: column;
  height: 100vh;
  padding: 1.5rem 1.25rem;
  border-inline-end: 1px solid #d1d9e0;
  background: #fff;
  overflow-y: auto;
}

.demo-brand {
  display: flex;
  flex-wrap: wrap;
  gap: 0.15rem 0.5rem;
  align-items: baseline;
  color: inherit;
  text-decoration: none;
}

.demo-brand strong {
  font-size: 1.05rem;
}

.demo-version {
  color: #59636e;
  font-size: 0.8rem;
}

.demo-nav-group {
  margin-block-start: 1.25rem;
}

.demo-nav-title {
  display: block;
  margin-block-end: 0.35rem;
  color: #59636e;
  font-size: 0.7rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.demo-sidebar ul {
  margin: 0;
  padding: 0;
  list-style: none;
}

.demo-sidebar a {
  display: block;
  padding-block: 0.28rem;
  color: inherit;
  font-size: 0.9rem;
  text-decoration: none;
}

.demo-sidebar a:hover {
  color: #0969da;
}

.demo-sidebar a.is-active {
  color: #0969da;
  font-weight: 600;
}

.demo-sidebar-links {
  display: flex;
  gap: 1rem;
  margin-block-start: auto;
  padding-block-start: 1.5rem;
  border-block-start: 1px solid #d1d9e0;
  font-size: 0.85rem;
}

.demo-main {
  max-width: 1120px;
  padding: 1.5rem 2rem 4rem;
}

.demo-hero {
  margin-block-end: 2.5rem;
  padding: 2rem;
  border: 1px solid #d1d9e0;
  border-radius: 14px;
  background:
    radial-gradient(circle at 100% 0%, rgba(130, 80, 223, 0.12), transparent 55%),
    #fff;
  scroll-margin-top: 1rem;
}

.demo-eyebrow {
  margin: 0 0 0.35rem;
  color: #8250df;
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.demo-hero h1 {
  max-width: 22ch;
  margin-block: 0 0.75rem;
  font-size: clamp(2rem, 4vw, 2.8rem);
  line-height: 1.1;
}

.demo-lede {
  max-width: 68ch;
  margin-block: 0 1.25rem;
  color: #59636e;
  font-size: 1.05rem;
  line-height: 1.7;
}

.demo-hero-install {
  display: inline-flex;
  flex-wrap: wrap;
  gap: 0.6rem;
  align-items: center;
  padding: 0.5rem 0.75rem;
  border: 1px solid #d1d9e0;
  border-radius: 8px;
  background: #f6f8fa;
  font-size: 0.85rem;
}

.demo-hero-install span {
  color: #59636e;
}

.demo-hero-install code {
  font-family: var(--vmd-font-mono);
}

.demo-hero-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.6rem;
  margin-block: 1.25rem 1rem;
}

.demo-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.5rem 0.85rem;
  border: 1px solid #d1d9e0;
  border-radius: 7px;
  background: #fff;
  color: inherit;
  font: inherit;
  font-size: 0.875rem;
  font-weight: 600;
  text-decoration: none;
  cursor: pointer;
}

.demo-button:hover {
  border-color: #0969da;
  color: #0969da;
}

.demo-button-primary {
  border-color: #0969da;
  background: #0969da;
  color: #fff;
}

.demo-button-primary:hover {
  background: #0757b8;
  color: #fff;
}

.demo-pills {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  margin: 0;
  padding: 0;
  list-style: none;
}

.demo-pills li {
  padding: 0.2rem 0.55rem;
  border: 1px solid #d1d9e0;
  border-radius: 999px;
  background: #fff;
  color: #59636e;
  font-size: 0.75rem;
}

.demo-section {
  margin-block-end: 2.5rem;
  padding-block-end: 2rem;
  border-block-end: 1px solid #d1d9e0;
  scroll-margin-top: 1rem;
}

.demo-section-header h2 {
  margin-block: 0 0.25rem;
}

.demo-section-header p {
  margin-block: 0 1rem;
  color: #59636e;
}

.demo-block-heading {
  margin-block: 3rem 1.5rem;
}

.demo-block-heading h2 {
  margin-block: 0 0.35rem;
}

.demo-block-heading p {
  max-width: 65ch;
  color: #59636e;
}

.demo-controls {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem 1.25rem;
  align-items: center;
  margin-block-end: 1rem;
  font-size: 0.9rem;
}

.demo-controls label {
  display: inline-flex;
  gap: 0.35rem;
  align-items: center;
}

.demo-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 1rem;
  align-items: start;
}

.demo-editor {
  display: grid;
  gap: 0.35rem;
}

.demo-editor-label {
  color: #59636e;
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.demo-editor textarea {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #d1d9e0;
  border-radius: 6px;
  background: #fff;
  color: inherit;
  font-family: var(--vmd-font-mono);
  font-size: 0.85rem;
  line-height: 1.6;
  resize: vertical;
}

.demo-output {
  min-height: 4rem;
  padding: 1rem;
  border: 1px solid #d1d9e0;
  border-radius: 6px;
  background: #fff;
}

.demo-output .vmd-root {
  padding: 0;
}

.demo-note {
  color: #59636e;
  font-size: 0.9rem;
}

.demo-events {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  align-items: center;
  font-size: 0.85rem;
}

.demo-events code,
.demo-code {
  padding: 0.1rem 0.35rem;
  border-radius: 4px;
  background: #f6f8fa;
  font-family: var(--vmd-font-mono);
  font-size: 0.8rem;
}

.demo-code {
  display: block;
  padding: 0.75rem;
  overflow-x: auto;
  white-space: pre-wrap;
}

.demo-table {
  width: 100%;
  margin-block-start: 1rem;
  border-collapse: collapse;
  font-size: 0.9rem;
}

.demo-table th,
.demo-table td {
  padding: 0.5rem;
  border: 1px solid #d1d9e0;
  text-align: start;
  vertical-align: top;
}

.demo-table th {
  background: #f6f8fa;
}

.demo-details {
  margin-block-start: 1rem;
}

.demo-details summary {
  cursor: pointer;
  color: #59636e;
}

.demo-headless {
  display: grid;
  gap: 0.5rem;
}

.demo-badge-link {
  display: inline-flex;
  gap: 0.3rem;
  align-items: center;
}

.demo-badge {
  padding: 0 0.3rem;
  border-radius: 999px;
  background: #0969da;
  color: #fff;
  font-size: 0.7rem;
}

.demo-code-frame {
  margin: 0;
  padding: 0.75rem;
  border: 1px solid #d1d9e0;
  border-radius: 6px;
  background: #f6f8fa;
}

.demo-code-frame figcaption {
  color: #59636e;
  font-size: 0.75rem;
  text-transform: uppercase;
}

.demo-code-frame pre {
  margin: 0.5rem 0 0;
  overflow-x: auto;
}

.demo-code-sample {
  margin-block-end: 1rem;
}

.demo-code-sample figcaption {
  display: flex;
  gap: 1rem;
  align-items: center;
  justify-content: space-between;
}

.demo-code-sample pre {
  margin-block-start: 0.6rem;
}

.demo-code-sample code {
  font-family: var(--vmd-font-mono);
  font-size: 0.82rem;
  line-height: 1.65;
}

.demo-copy {
  padding: 0.15rem 0.5rem;
  border: 1px solid #d1d9e0;
  border-radius: 5px;
  background: #fff;
  color: #59636e;
  font: inherit;
  font-size: 0.72rem;
  text-transform: none;
  cursor: pointer;
}

.demo-copy:hover {
  border-color: #0969da;
  color: #0969da;
}

.demo-steps {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1rem;
  margin-block-end: 1rem;
}

.demo-step {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 0.75rem;
  align-items: start;
}

.demo-step h3 {
  margin-block: 0 0.5rem;
  font-size: 1rem;
}

.demo-step .demo-code-frame {
  margin-block-end: 0;
}

.demo-step-number {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.6rem;
  height: 1.6rem;
  border-radius: 999px;
  background: #8250df;
  color: #fff;
  font-size: 0.8rem;
  font-weight: 700;
}

.demo-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 1rem;
  margin-block-start: 1rem;
}

.demo-card {
  padding: 0.9rem 1rem;
  border: 1px solid #d1d9e0;
  border-radius: 9px;
  background: #fff;
}

.demo-card h3,
.demo-card h4 {
  margin-block: 0 0.35rem;
  font-size: 0.95rem;
}

.demo-card p {
  margin: 0;
  color: #59636e;
  font-size: 0.875rem;
  line-height: 1.6;
}

.demo-callout {
  margin-block: 1rem;
  padding: 0.85rem 1rem;
  border-inline-start: 3px solid #8250df;
  border-radius: 0 8px 8px 0;
  background: #faf5ff;
}

.demo-callout-title {
  display: block;
  margin-block-end: 0.25rem;
  color: #8250df;
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.demo-callout p:last-child {
  margin-block-end: 0;
}

.demo-advanced-link {
  text-decoration-color: #8250df;
  text-underline-offset: 0.2em;
}

.demo-api-nav {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-block-end: 1rem;
}

.demo-api-nav a {
  padding: 0.2rem 0.55rem;
  border: 1px solid #d1d9e0;
  border-radius: 999px;
  color: inherit;
  font-size: 0.78rem;
  text-decoration: none;
}

.demo-api-nav a:hover {
  border-color: #0969da;
  color: #0969da;
}

.demo-api-table-wrap {
  overflow-x: auto;
}

.demo-api-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 1rem;
  margin-block: 1rem;
}

.demo-chip-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.3rem;
}

.demo-chip-list code {
  padding: 0.1rem 0.35rem;
  border-radius: 4px;
  background: #f6f8fa;
  font-size: 0.72rem;
}

.demo-portal {
  overflow: hidden;
  border: 1px solid #d1d9e0;
  border-radius: 12px;
  background: #fff;
}

.demo-portal-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1.25rem;
  border-block-end: 1px solid #d1d9e0;
  background: #fafbfc;
}

.demo-portal-brand {
  display: grid;
  gap: 0.15rem;
}

.demo-portal-kicker {
  color: #8250df;
  font-size: 0.68rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.demo-portal-brand strong {
  font-size: 1rem;
}

.demo-portal-brand > span:last-child {
  color: #59636e;
  font-size: 0.8rem;
}

.demo-portal-tools {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  align-items: center;
}

.demo-portal-search {
  display: flex;
  gap: 0.4rem;
  align-items: center;
  font-size: 0.78rem;
  color: #59636e;
}

.demo-portal-search input {
  width: 13rem;
  padding: 0.4rem 0.6rem;
  border: 1px solid #d1d9e0;
  border-radius: 6px;
  font: inherit;
  font-size: 0.82rem;
}

.demo-portal-body {
  display: grid;
  grid-template-columns: 200px minmax(0, 1fr);
  gap: 1.5rem;
  padding: 1.25rem;
}

.demo-portal-toc {
  position: sticky;
  top: 1rem;
  align-self: start;
  font-size: 0.82rem;
}

.demo-portal-toc strong {
  display: block;
  margin-block-end: 0.5rem;
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #59636e;
}

.demo-portal-toc ol {
  margin: 0;
  padding-inline-start: 1.1rem;
}

.demo-portal-toc li {
  margin-block: 0.2rem;
  color: #59636e;
}

.demo-portal-toc a {
  color: inherit;
  text-decoration: none;
}

.demo-portal-toc li.is-active a {
  color: #0969da;
  font-weight: 600;
}

.demo-portal-message,
.demo-portal-diagnostic {
  margin-block: 0.75rem 0;
  font-size: 0.75rem;
}

.demo-portal-message {
  color: #1a7f37;
}

.demo-portal-diagnostic {
  color: #cf222e;
}

.demo-portal-article {
  min-width: 0;
}

.demo-portal-article .vmd-root {
  padding: 0;
}

@media (max-width: 980px) {
  .demo-shell {
    grid-template-columns: minmax(0, 1fr);
  }

  .demo-sidebar {
    position: static;
    height: auto;
    border-inline-end: 0;
    border-block-end: 1px solid #d1d9e0;
  }

  .demo-sidebar nav {
    display: flex;
    flex-wrap: wrap;
    gap: 0 1.5rem;
  }

  .demo-sidebar-links {
    margin-block-start: 1rem;
  }
}

@media (max-width: 860px) {
  .demo-grid {
    grid-template-columns: minmax(0, 1fr);
  }

  .demo-portal-body {
    grid-template-columns: minmax(0, 1fr);
  }

  .demo-portal-toc {
    position: static;
  }

  .demo-main {
    padding: 1.25rem;
  }

  .demo-hero {
    padding: 1.25rem;
  }
}
</style>
