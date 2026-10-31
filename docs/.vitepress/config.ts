import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vitepress'

const src = (path: string) =>
  fileURLToPath(new URL(`../../src/${path}`, import.meta.url))

const base = process.env.DOCS_BASE || '/'

const aliases = [
  { find: /^vue-markdown-suite\/style\.css$/, replacement: src('style.css') },
  { find: 'vue-markdown-suite/styles/', replacement: `${src('styles')}/` },
  { find: /^vue-markdown-suite\/highlight\/shiki$/, replacement: src('highlight/shiki.ts') },
  { find: /^vue-markdown-suite\/highlight$/, replacement: src('highlight/index.ts') },
  { find: /^vue-markdown-suite\/math$/, replacement: src('math/index.ts') },
  { find: /^vue-markdown-suite\/mermaid$/, replacement: src('mermaid/index.ts') },
  { find: /^vue-markdown-suite\/editor$/, replacement: src('editor/index.ts') },
  { find: /^vue-markdown-suite\/headless$/, replacement: src('headless.ts') },
  { find: /^vue-markdown-suite\/pipeline$/, replacement: src('pipeline.ts') },
  { find: /^vue-markdown-suite\/plugins$/, replacement: src('plugins.ts') },
  { find: /^vue-markdown-suite\/presets$/, replacement: src('presets.ts') },
  { find: /^vue-markdown-suite\/node-components$/, replacement: src('node-components.ts') },
  { find: /^vue-markdown-suite$/, replacement: src('index.ts') },
]

export default defineConfig({
  lang: 'en-US',
  title: 'Vue Markdown Suite',
  titleTemplate: ':title · Vue Markdown Suite',
  description:
    'A plugin-driven Vue 3 Markdown component suite with a headless core, typed plugins, and optional highlighting, math, and diagram engines.',
  base,
  lastUpdated: true,
  head: [
    ['link', { rel: 'icon', type: 'image/svg+xml', href: `${base}logo.svg` }],
    ['meta', { name: 'theme-color', content: '#7c3aed' }],
    ['meta', { property: 'og:type', content: 'website' }],
    ['meta', { property: 'og:site_name', content: 'Vue Markdown Suite' }],
    [
      'meta',
      {
        property: 'og:description',
        content:
          'A plugin-driven Vue 3 Markdown component suite with a headless core, typed plugins, and optional highlighting, math, and diagram engines.',
      },
    ],
  ],
  themeConfig: {
    logo: '/logo.svg',
    siteTitle: 'Vue Markdown Suite',
    nav: [
      { text: 'Guide', link: '/guide/getting-started', activeMatch: '/guide/' },
      { text: 'Reference', link: '/reference/renderer', activeMatch: '/reference/' },
      { text: 'Examples', link: '/examples/playground', activeMatch: '/examples/' },
    ],
    sidebar: {
      '/guide/': [
        {
          text: 'Introduction',
          items: [
            { text: 'Getting started', link: '/guide/getting-started' },
            { text: 'Basic usage', link: '/guide/basic-usage' },
            { text: 'Advanced usage', link: '/guide/advanced-usage' },
            { text: 'Customization', link: '/guide/customization' },
            { text: 'Complete example', link: '/guide/complete-example' },
          ],
        },
        {
          text: 'Reference guides',
          items: [
            { text: 'Rich components', link: '/guide/rich-components' },
            { text: 'Styling and themes', link: '/guide/styling' },
            { text: 'Plugins', link: '/guide/plugins' },
            { text: 'Headless rendering', link: '/guide/headless' },
            { text: 'Syntax highlighting', link: '/guide/highlighting' },
            { text: 'Math', link: '/guide/math' },
            { text: 'Mermaid', link: '/guide/mermaid' },
            { text: 'SSR and export', link: '/guide/ssr' },
            { text: 'Security', link: '/guide/security' },
          ],
        },
        {
          text: 'Pipeline',
          items: [
            { text: 'Official pipeline', link: '/guide/pipeline' },
            { text: 'Custom pipeline', link: '/guide/custom-pipeline' },
            { text: 'CommonMark and GFM', link: '/guide/commonmark-gfm' },
          ],
        },
        {
          text: 'More',
          items: [
            { text: 'Cookbook', link: '/guide/cookbook' },
            { text: 'Accessibility audits', link: '/guide/audits' },
          ],
        },
      ],
      '/reference/': [
        {
          text: 'API reference',
          items: [
            { text: 'Renderer', link: '/reference/renderer' },
            { text: 'Components', link: '/reference/components' },
            { text: 'Adapters', link: '/reference/adapters' },
            { text: 'Entry points', link: '/reference/entry-points' },
            { text: 'Document model', link: '/reference/document-model' },
          ],
        },
      ],
      '/examples/': [
        {
          text: 'Examples',
          items: [
            { text: 'Live playground', link: '/examples/playground' },
            { text: 'Complete docs portal', link: '/guide/complete-example' },
          ],
        },
      ],
    },
    socialLinks: [
      { icon: 'github', link: 'https://github.com/coderminer/vue-markdown' },
      { icon: 'npm', link: 'https://www.npmjs.com/package/vue-markdown-suite' },
    ],
    search: {
      provider: 'local',
      options: {
        detailedView: true,
      },
    },
    editLink: {
      pattern: 'https://github.com/coderminer/vue-markdown/edit/main/docs/:path',
      text: 'Edit this page on GitHub',
    },
    lastUpdated: {
      text: 'Updated',
      formatOptions: { dateStyle: 'medium', timeStyle: 'short' },
    },
    outline: {
      level: [2, 3],
      label: 'On this page',
    },
    docFooter: {
      prev: 'Previous',
      next: 'Next',
    },
    footer: {
      message: 'Released under the MIT License.',
      copyright: 'Copyright © 2026 CoderMiner',
    },
  },
  markdown: {
    lineNumbers: true,
    theme: {
      light: 'github-light',
      dark: 'github-dark',
    },
  },
  vite: {
    resolve: {
      alias: aliases,
    },
  },
})
