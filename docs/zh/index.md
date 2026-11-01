---
layout: home
titleTemplate: false
description: 插件驱动的 Vue 3 Markdown 组件套件：无头内核、类型化插件，以及按需加载的代码高亮、数学公式与图表引擎。

hero:
  name: Vue Markdown Suite
  text: Markdown 渲染成 Vue，而不是 HTML 字符串。
  tagline: 插件驱动的 Vue 3 Markdown 套件：无头内核、类型化插件，以及按需加载的代码高亮、数学公式与图表引擎。
  image:
    src: /logo.svg
    alt: Vue Markdown Suite
  actions:
    - theme: brand
      text: 快速开始
      link: /zh/guide/getting-started
    - theme: alt
      text: 完整示例
      link: /zh/guide/complete-example
    - theme: alt
      text: GitHub
      link: https://github.com/coderminer/vue-markdown

features:
  - icon:
      src: /icons/nodes.svg
      alt: Vue 原生渲染
      width: 24
      height: 24
    title: Vue 原生渲染
    details: 通过 unified、remark-parse 和 remark-rehype 把 Markdown 变成 Vue VNode。没有 HTML 字符串往返，没有 v-html，也不引入第二套解析器。
  - icon:
      src: /icons/sliders.svg
      alt: 为定制而设计
      width: 24
      height: 24
    title: 为定制而设计
    details: 可替换标签、语义节点和结构区域。面向稳定的 data-vmd-part 钩子和 --vmd-* 令牌，而不是内部 DOM。
  - icon:
      src: /icons/plug.svg
      alt: 插件驱动
      width: 24
      height: 24
    title: 插件驱动
    details: 插件可以贡献 remark/rehype 插件、变换、组件、文案、令牌和生命周期钩子，单点失败会被隔离。
  - icon:
      src: /icons/shield.svg
      alt: 默认安全
      width: 24
      height: 24
    title: 默认安全
    details: 原始 HTML 默认丢弃；从 @coderminer/vue-markdown/html 加入 htmlPlugin() 后，内置净化器会紧接着运行。
  - icon:
      src: /icons/brackets.svg
      alt: 无头内核
      width: 24
      height: 24
    title: 无头内核
    details: 用 useMarkdownDocument 接管解析、记忆化、状态和诊断，同时用你自己的标记完成渲染。
  - icon:
      src: /icons/rocket.svg
      alt: SSR 与静态导出
      width: 24
      height: 24
    title: SSR 与静态导出
    details: 标题 ID 确定性生成，提供同步路径；静态 HTML 导出复用同一套插件和安全策略。
---

<div class="home-section">
  <p class="home-kicker">为生产级文档而建</p>
  <h2>一个可以围绕它做设计的渲染器</h2>
  <p>
    套件提供语义化标记、可选样式、类型化扩展点和按需加载的引擎。你可以保留默认值，
    也可以替换任意一层，而不用 fork 渲染器。
  </p>

  <div class="home-grid">
    <article class="home-card">
      <h3>掌控元素</h3>
      <p>
        用 <code>components</code>、<code>nodeComponents</code> 和
        <code>regions</code> 对接你的设计系统。函数渲染器会收到归一化节点、子节点和
        安全的默认渲染函数。
      </p>
    </article>
    <article class="home-card">
      <h3>用令牌做主题</h3>
      <p>
        使用 <code>light</code>、<code>dark</code>、<code>auto</code> 或
        <code>custom</code>，再在任意祖先元素或 Provider 上覆盖
        <code>--vmd-*</code> 变量。
      </p>
    </article>
    <article class="home-card">
      <h3>只写需要的样式</h3>
      <p>
        可以引入完整样式表、只引入令牌，或者完全不引入。每个部件都能通过
        <code>data-vmd-part</code> 和稳定类名定位。
      </p>
    </article>
  </div>
</div>

<div class="home-section">
  <p class="home-kicker">安装</p>
  <h2>一条命令开始</h2>
  <p>
    安装包，引入可选样式表，然后把 Markdown 传给 <code>source</code> 属性。
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

const source = ref('# 你好\n\n一段带 **加粗** 和 [链接](https://example.com) 的文字。')
</script>

<template>
  <MarkdownRenderer v-model:source="source" toc />
</template>
```

  <div class="home-badges">
    <span><strong>Vue 3.5+</strong></span>
    <span><strong>TypeScript</strong> 优先</span>
    <span><strong>SSR</strong> 就绪</span>
    <span><strong>MIT</strong> 许可</span>
  </div>
</div>

<div class="home-section">
  <p class="home-kicker">在线演练场</p>
  <h2>编辑 Markdown，直接看 Vue 输出</h2>
  <p>
    下面的预览使用真实渲染器。安装之前就可以切换示例、打开目录，并检查输出。
  </p>

  <ClientOnly>
    <LivePlayground locale="zh" />
  </ClientOnly>
</div>

<div class="home-section">
  <p class="home-kicker">继续深入</p>
  <h2>先读指南，再搭一个文档门户</h2>
  <p>
    从基础开始，逐层定制，最后完成一个组合搜索、目录、frontmatter、插件、数学公式和
    静态导出的完整文档门户。
  </p>

  <div class="home-grid">
    <a class="home-card" href="./guide/basic-usage.html">
      <h3>基础用法 →</h3>
      <p>安装、渲染、样式和事件。</p>
    </a>
    <a class="home-card" href="./guide/customization.html">
      <h3>定制 →</h3>
      <p>自定义元素、主题和 CSS，附带实时预览。</p>
    </a>
    <a class="home-card" href="./guide/complete-example.html">
      <h3>完整示例 →</h3>
      <p>只用公共 API 搭建的完整文档门户。</p>
    </a>
    <a class="home-card" href="./guide/rich-components.html">
      <h3>富组件 →</h3>
      <p>CodeBlock、VueSyntaxHighlighter、Mermaid 和可视化编辑器。</p>
    </a>
  </div>
</div>
