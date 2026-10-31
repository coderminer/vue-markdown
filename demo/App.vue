<script setup lang="ts">
import { version } from 'vue-markdown-suite'
import PlaygroundSection from './sections/PlaygroundSection.vue'
import CommonMarkSection from './sections/CommonMarkSection.vue'
import GfmSection from './sections/GfmSection.vue'
import ComponentsSection from './sections/ComponentsSection.vue'
import FilteringSection from './sections/FilteringSection.vue'
import UrlTransformSection from './sections/UrlTransformSection.vue'
import RawHtmlSection from './sections/RawHtmlSection.vue'
import PluginSection from './sections/PluginSection.vue'
import HeadlessSection from './sections/HeadlessSection.vue'
import MigrationSection from './sections/MigrationSection.vue'
import SsrSection from './sections/SsrSection.vue'
import CustomizationSection from './sections/CustomizationSection.vue'
import V1xSection from './sections/V1xSection.vue'

const sections = [
  { id: 'playground', label: 'Playground' },
  { id: 'commonmark', label: 'CommonMark' },
  { id: 'gfm', label: 'GFM' },
  { id: 'components', label: 'Components' },
  { id: 'filtering', label: 'Filtering' },
  { id: 'url-transform', label: 'URL transform' },
  { id: 'raw-html', label: 'Raw HTML' },
  { id: 'plugin', label: 'Plugin' },
  { id: 'headless', label: 'Headless' },
  { id: 'migration', label: 'Migration' },
  { id: 'ssr', label: 'SSR' },
  { id: 'customization', label: 'Customization' },
  { id: 'v1x', label: 'v1.x engines' },
]
</script>

<template>
  <div class="demo-shell">
    <aside class="demo-sidebar">
      <strong>Vue Markdown Suite</strong>
      <span class="demo-version">v{{ version }}</span>
      <nav aria-label="Demo sections">
        <ul>
          <li v-for="section in sections" :key="section.id">
            <a :href="`#${section.id}`">{{ section.label }}</a>
          </li>
        </ul>
      </nav>
    </aside>

    <main class="demo-main">
      <header class="demo-hero">
        <h1>Vue Markdown Suite</h1>
        <p>
          A plugin-driven Vue 3 Markdown component suite. Every section imports
          through public entries, so this page doubles as a packaging test.
        </p>
      </header>

      <PlaygroundSection />
      <CommonMarkSection />
      <GfmSection />
      <ComponentsSection />
      <FilteringSection />
      <UrlTransformSection />
      <RawHtmlSection />
      <PluginSection />
      <HeadlessSection />
      <MigrationSection />
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
  grid-template-columns: 240px minmax(0, 1fr);
  min-height: 100vh;
}

.demo-sidebar {
  position: sticky;
  top: 0;
  align-self: start;
  height: 100vh;
  padding: 1.5rem;
  border-inline-end: 1px solid #d1d9e0;
  background: #fff;
  overflow-y: auto;
}

.demo-version {
  display: block;
  margin-block: 0.25rem 1rem;
  color: #59636e;
  font-size: 0.875rem;
}

.demo-sidebar ul {
  padding: 0;
  list-style: none;
}

.demo-sidebar a {
  display: block;
  padding-block: 0.3rem;
  color: inherit;
  text-decoration: none;
}

.demo-sidebar a:hover {
  color: #0969da;
}

.demo-main {
  max-width: 1100px;
  padding: 1.5rem 2rem 4rem;
}

.demo-hero {
  margin-block-end: 2rem;
}

.demo-hero h1 {
  margin-block: 0 0.5rem;
}

.demo-hero p {
  max-width: 60ch;
  color: #59636e;
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

@media (max-width: 860px) {
  .demo-shell {
    grid-template-columns: minmax(0, 1fr);
  }

  .demo-sidebar {
    position: static;
    height: auto;
    border-inline-end: 0;
    border-block-end: 1px solid #d1d9e0;
  }

  .demo-grid {
    grid-template-columns: minmax(0, 1fr);
  }

  .demo-main {
    padding: 1.25rem;
  }
}
</style>
