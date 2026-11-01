---
layout: home
titleTemplate: false

hero:
  name: Vue Markdown Suite
  text: Markdown that renders as Vue, not HTML strings.
  tagline: A plugin-driven Vue 3 Markdown suite with a headless core, typed plugins, and optional highlighting, math, and diagram engines.
  image:
    src: /logo.svg
    alt: Vue Markdown Suite
  actions:
    - theme: brand
      text: Get started
      link: /guide/getting-started
    - theme: alt
      text: Complete example
      link: /guide/complete-example
    - theme: alt
      text: GitHub
      link: https://github.com/coderminer/vue-markdown

features:
  - icon:
      src: /icons/nodes.svg
      alt: Vue-native rendering
      width: 24
      height: 24
    title: Vue-native rendering
    details: Markdown becomes Vue VNodes through unified, remark-parse, and remark-rehype. No HTML string round-trip, no v-html, and no second parser.
  - icon:
      src: /icons/sliders.svg
      alt: Customizable by design
      width: 24
      height: 24
    title: Customizable by design
    details: Replace tags, semantic nodes, and structural regions. Target stable data-vmd-part hooks and --vmd-* tokens instead of internal DOM.
  - icon:
      src: /icons/plug.svg
      alt: Plugin-driven
      width: 24
      height: 24
    title: Plugin-driven
    details: Plugins contribute remark/rehype plugins, transforms, components, labels, tokens, and lifecycle hooks with isolated failures.
  - icon:
      src: /icons/shield.svg
      alt: Safe by default
      width: 24
      height: 24
    title: Safe by default
    details: Raw HTML is dropped by default; add htmlPlugin() from @coderminer/vue-markdown/html and the built-in sanitizer runs immediately.
  - icon:
      src: /icons/brackets.svg
      alt: Headless core
      width: 24
      height: 24
    title: Headless core
    details: Use useMarkdownDocument to own parsing, memoization, status, and diagnostics while rendering your own markup.
  - icon:
      src: /icons/rocket.svg
      alt: SSR and static export
      width: 24
      height: 24
    title: SSR and static export
    details: Deterministic heading IDs, a synchronous path, and static HTML export that applies the same plugins and security policy.
---

<div class="home-section">
  <p class="home-kicker">Built for production docs</p>
  <h2>A renderer you can design around</h2>
  <p>
    The suite ships semantic markup, optional styles, typed extension points, and
    lazy engines. Keep the defaults, or replace any layer without forking the
    renderer.
  </p>

  <div class="home-grid">
    <article class="home-card">
      <h3>Own the elements</h3>
      <p>
        Map <code>components</code>, <code>nodeComponents</code>, and
        <code>regions</code> to your design system. Function renderers get the
        normalized node, children, and a safe default render.
      </p>
    </article>
    <article class="home-card">
      <h3>Theme with tokens</h3>
      <p>
        Use <code>light</code>, <code>dark</code>, <code>auto</code>, or
        <code>custom</code>, then override <code>--vmd-*</code> variables on any
        ancestor or through the provider.
      </p>
    </article>
    <article class="home-card">
      <h3>Style only what you need</h3>
      <p>
        Import the full stylesheet, tokens only, or nothing at all. Every part is
        addressable through <code>data-vmd-part</code> and a stable class.
      </p>
    </article>
  </div>
</div>

<div class="home-section">
  <p class="home-kicker">Install</p>
  <h2>Start in one command</h2>
  <p>
    Install the package, import the optional stylesheet, and pass Markdown through
    the <code>source</code> prop.
  </p>

  <div class="home-install">

::: code-group
```bash [npm]
npm install @coderminer/vue-markdown
```

```bash [pnpm]
pnpm add @coderminer/vue-markdown
```

```bash [yarn]
yarn add @coderminer/vue-markdown
```

```bash [bun]
bun add @coderminer/vue-markdown
```
:::

  </div>

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { MarkdownRenderer } from '@coderminer/vue-markdown'
import '@coderminer/vue-markdown/style.css'

const source = ref('# Hello\n\nA **bold** paragraph with a [link](https://example.com).')
</script>

<template>
  <MarkdownRenderer v-model:source="source" toc />
</template>
```

  <div class="home-badges">
    <span><strong>Vue 3.5+</strong></span>
    <span><strong>TypeScript</strong> first</span>
    <span><strong>SSR</strong> ready</span>
    <span><strong>MIT</strong> licensed</span>
  </div>
</div>

<div class="home-section">
  <p class="home-kicker">Live playground</p>
  <h2>Edit Markdown, see Vue output</h2>
  <p>
    The preview below uses the real renderer. Switch samples, toggle the TOC, and
    inspect the output before installing anything.
  </p>

  <ClientOnly>
    <LivePlayground />
  </ClientOnly>
</div>

<div class="home-section">
  <p class="home-kicker">Go further</p>
  <h2>Read the guide, then build the portal</h2>
  <p>
    Start with the basics, customize every layer, and finish with a complete docs
    portal that combines search, TOC, frontmatter, plugins, math, and static
    export.
  </p>

  <div class="home-grid">
    <a class="home-card" href="./guide/basic-usage.html">
      <h3>Basic usage →</h3>
      <p>Install, render, style, and listen to events.</p>
    </a>
    <a class="home-card" href="./guide/customization.html">
      <h3>Customization →</h3>
      <p>Custom elements, themes, and CSS with live previews.</p>
    </a>
    <a class="home-card" href="./guide/complete-example.html">
      <h3>Complete example →</h3>
      <p>A full docs portal built with the public API only.</p>
    </a>
    <a class="home-card" href="./guide/rich-components.html">
      <h3>Rich components →</h3>
      <p>CodeBlock, VueSyntaxHighlighter, Mermaid, and the live editor.</p>
    </a>
  </div>
</div>
