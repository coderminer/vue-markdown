import { existsSync } from 'node:fs'
import { fileURLToPath, URL } from 'node:url'
import { defineConfig, type HeadConfig } from 'vitepress'

const src = (path: string) =>
  fileURLToPath(new URL(`../../src/${path}`, import.meta.url))

const base = process.env.DOCS_BASE || '/'

const SITE_ORIGIN = process.env.DOCS_ORIGIN || 'https://coderminer.github.io'
const CANONICAL_BASE = process.env.DOCS_BASE || '/vue-markdown/'
const SITE_URL = `${SITE_ORIGIN}${CANONICAL_BASE}`
const SITE_NAME = 'Vue Markdown Suite'
const DOCS_ROOT = fileURLToPath(new URL('..', import.meta.url))
const OG_IMAGE = `${SITE_URL}og-image.png`
const OG_IMAGE_ZH = `${SITE_URL}og-image.zh.png`

const EN_DESCRIPTION =
  'A plugin-driven Vue 3 Markdown component suite with a headless core, typed plugins, and optional highlighting, math, and diagram engines.'
const ZH_DESCRIPTION =
  '插件驱动的 Vue 3 Markdown 组件套件：无头内核、类型化插件，以及按需加载的代码高亮、数学公式与图表引擎。'

function pageUrl(relativePath: string): string {
  const clean = relativePath.replace(/\.md$/, '')
  const path =
    clean === 'index'
      ? ''
      : clean.endsWith('/index')
        ? `${clean.slice(0, -'/index'.length)}/`
        : `${clean}.html`
  return `${SITE_URL}${path}`
}

function localeLinks(relativePath: string): {
  isChinese: boolean
  en?: string
  zh?: string
} {
  const isChinese = relativePath.startsWith('zh/')
  const enPath = isChinese ? relativePath.slice(3) : relativePath
  const zhPath = isChinese ? relativePath : `zh/${relativePath}`
  return {
    isChinese,
    en: existsSync(`${DOCS_ROOT}/${enPath}`) ? pageUrl(enPath) : undefined,
    zh: existsSync(`${DOCS_ROOT}/${zhPath}`) ? pageUrl(zhPath) : undefined,
  }
}

function seoHead(context: {
  pageData: {
    relativePath: string
    title?: string
    description?: string
    lastUpdated?: number
    frontmatter?: Record<string, unknown>
  }
}): HeadConfig[] {
  const { pageData } = context
  const relativePath = pageData.relativePath

  if (relativePath === '404.md') {
    return [['meta', { name: 'robots', content: 'noindex' }]]
  }

  const { isChinese, en, zh } = localeLinks(relativePath)
  const isHome = relativePath === 'index.md' || relativePath === 'zh/index.md'
  const fallback = isChinese ? ZH_DESCRIPTION : EN_DESCRIPTION
  const description =
    (typeof pageData.frontmatter?.description === 'string'
      ? pageData.frontmatter.description
      : undefined) ||
    pageData.description ||
    fallback
  const title = pageData.title || SITE_NAME
  const fullTitle = title === SITE_NAME ? title : `${title} · ${SITE_NAME}`
  const url = pageUrl(relativePath)
  const language = isChinese ? 'zh-CN' : 'en'
  const locale = isChinese ? 'zh_CN' : 'en_US'
  const alternateLocale = isChinese ? 'en_US' : 'zh_CN'
  const ogImage = isChinese ? OG_IMAGE_ZH : OG_IMAGE

  const head: HeadConfig[] = [
    ['meta', { name: 'robots', content: 'index,follow,max-image-preview:large' }],
    ['link', { rel: 'canonical', href: url }],
    ['meta', { property: 'og:type', content: isHome ? 'website' : 'article' }],
    ['meta', { property: 'og:title', content: fullTitle }],
    ['meta', { property: 'og:description', content: description }],
    ['meta', { property: 'og:url', content: url }],
    ['meta', { property: 'og:image', content: ogImage }],
    ['meta', { property: 'og:image:type', content: 'image/png' }],
    ['meta', { property: 'og:image:width', content: '1200' }],
    ['meta', { property: 'og:image:height', content: '630' }],
    ['meta', { property: 'og:image:alt', content: SITE_NAME }],
    ['meta', { property: 'og:locale', content: locale }],
    ['meta', { property: 'og:locale:alternate', content: alternateLocale }],
    ['meta', { name: 'twitter:card', content: 'summary_large_image' }],
    ['meta', { name: 'twitter:title', content: fullTitle }],
    ['meta', { name: 'twitter:description', content: description }],
    ['meta', { name: 'twitter:image', content: ogImage }],
    ['meta', { name: 'twitter:image:alt', content: SITE_NAME }],
  ]

  if (en) {
    head.push(['link', { rel: 'alternate', hreflang: 'en-US', href: en }])
  }
  if (zh) {
    head.push(['link', { rel: 'alternate', hreflang: 'zh-CN', href: zh }])
  }
  if (en) {
    head.push(['link', { rel: 'alternate', hreflang: 'x-default', href: en }])
  }

  if (!isHome) {
    head.push(['meta', { property: 'article:author', content: 'CoderMiner' }])
    if (typeof pageData.lastUpdated === 'number') {
      head.push([
        'meta',
        {
          property: 'article:modified_time',
          content: new Date(pageData.lastUpdated).toISOString(),
        },
      ])
    }
  }

  const structuredData = isHome
    ? {
        '@context': 'https://schema.org',
        '@type': 'SoftwareApplication',
        name: SITE_NAME,
        applicationCategory: 'DeveloperApplication',
        operatingSystem: 'Web',
        description,
        url,
        inLanguage: language,
        license: 'https://opensource.org/licenses/MIT',
        offers: {
          '@type': 'Offer',
          price: '0',
          priceCurrency: 'USD',
        },
      }
    : {
        '@context': 'https://schema.org',
        '@type': 'TechArticle',
        headline: title,
        description,
        url,
        inLanguage: language,
        isPartOf: {
          '@type': 'WebSite',
          name: SITE_NAME,
          url: SITE_URL,
        },
        publisher: {
          '@type': 'Organization',
          name: 'CoderMiner',
          url: 'https://github.com/coderminer',
        },
        license: 'https://opensource.org/licenses/MIT',
      }

  head.push([
    'script',
    { type: 'application/ld+json' },
    JSON.stringify(structuredData),
  ])

  return head
}

const aliases = [
  { find: /^@coderminer\/vue-markdown\/style\.css$/, replacement: src('style.css') },
  { find: '@coderminer/vue-markdown/styles/', replacement: `${src('styles')}/` },
  { find: /^@coderminer\/vue-markdown\/highlight\/shiki$/, replacement: src('highlight/shiki.ts') },
  { find: /^@coderminer\/vue-markdown\/highlight$/, replacement: src('highlight/index.ts') },
  { find: /^@coderminer\/vue-markdown\/math$/, replacement: src('math/index.ts') },
  { find: /^@coderminer\/vue-markdown\/mermaid$/, replacement: src('mermaid/index.ts') },
  { find: /^@coderminer\/vue-markdown\/editor$/, replacement: src('editor/index.ts') },
  { find: /^@coderminer\/vue-markdown\/html$/, replacement: src('html/index.ts') },
  { find: /^@coderminer\/vue-markdown\/headless$/, replacement: src('headless.ts') },
  { find: /^@coderminer\/vue-markdown\/pipeline$/, replacement: src('pipeline.ts') },
  { find: /^@coderminer\/vue-markdown\/plugins$/, replacement: src('plugins.ts') },
  { find: /^@coderminer\/vue-markdown\/presets$/, replacement: src('presets.ts') },
  { find: /^@coderminer\/vue-markdown\/node-components$/, replacement: src('node-components.ts') },
  { find: /^@coderminer\/vue-markdown$/, replacement: src('index.ts') },
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
    ['meta', { name: 'author', content: 'CoderMiner' }],
    ['link', { rel: 'sitemap', type: 'application/xml', href: `${SITE_URL}sitemap.xml` }],
    ['meta', { property: 'og:site_name', content: 'Vue Markdown Suite' }],
  ],
  sitemap: {
    hostname: SITE_URL,
  },
  transformHead: seoHead,
  themeConfig: {
    logo: '/logo.svg',
    siteTitle: 'Vue Markdown Suite',
    nav: [
      { text: 'Guide', link: '/guide/getting-started', activeMatch: '/guide/' },
      { text: 'Reference', link: '/reference/api', activeMatch: '/reference/' },
      { text: 'Examples', link: '/examples/playground', activeMatch: '/examples/' },
      { text: 'Release notes', link: '/release-notes' },
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
            { text: 'Public API', link: '/reference/api' },
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
      { icon: 'npm', link: 'https://www.npmjs.com/package/@coderminer/vue-markdown' },
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
  locales: {
    root: {
      label: 'English',
      lang: 'en-US',
    },
    zh: {
      label: '简体中文',
      lang: 'zh-CN',
      title: 'Vue Markdown Suite',
      titleTemplate: ':title · Vue Markdown Suite',
      description:
        '插件驱动的 Vue 3 Markdown 组件套件：无头内核、类型化插件，以及按需加载的代码高亮、数学公式与图表引擎。',
      themeConfig: {
        logo: '/logo.svg',
        siteTitle: 'Vue Markdown Suite',
        nav: [
          { text: '指南', link: '/zh/guide/getting-started', activeMatch: '/zh/guide/' },
          { text: '参考', link: '/zh/reference/api', activeMatch: '/zh/reference/' },
          { text: '示例', link: '/zh/examples/playground', activeMatch: '/zh/examples/' },
          { text: '发布说明', link: '/zh/release-notes' },
        ],
        sidebar: {
          '/zh/guide/': [
            {
              text: '入门',
              items: [
                { text: '快速开始', link: '/zh/guide/getting-started' },
                { text: '基础用法', link: '/zh/guide/basic-usage' },
                { text: '进阶用法', link: '/zh/guide/advanced-usage' },
                { text: '定制', link: '/zh/guide/customization' },
                { text: '完整示例', link: '/zh/guide/complete-example' },
              ],
            },
            {
              text: '专题指南',
              items: [
                { text: '富组件', link: '/zh/guide/rich-components' },
                { text: '样式与主题', link: '/zh/guide/styling' },
                { text: '插件', link: '/zh/guide/plugins' },
                { text: '无头渲染', link: '/zh/guide/headless' },
                { text: '语法高亮', link: '/zh/guide/highlighting' },
                { text: '数学公式', link: '/zh/guide/math' },
                { text: 'Mermaid 图表', link: '/zh/guide/mermaid' },
                { text: 'SSR 与静态导出', link: '/zh/guide/ssr' },
                { text: '安全', link: '/zh/guide/security' },
              ],
            },
            {
              text: '管线',
              items: [
                { text: '官方管线', link: '/zh/guide/pipeline' },
                { text: '自定义管线', link: '/zh/guide/custom-pipeline' },
                { text: 'CommonMark 与 GFM', link: '/zh/guide/commonmark-gfm' },
              ],
            },
            {
              text: '更多',
              items: [
                { text: '定制手册', link: '/zh/guide/cookbook' },
                { text: '可访问性审计', link: '/zh/guide/audits' },
              ],
            },
          ],
          '/zh/reference/': [
            {
              text: 'API 参考',
              items: [
                { text: '公共 API', link: '/zh/reference/api' },
                { text: '渲染器', link: '/zh/reference/renderer' },
                { text: '组件', link: '/zh/reference/components' },
                { text: '适配器', link: '/zh/reference/adapters' },
                { text: '入口', link: '/zh/reference/entry-points' },
                { text: '文档模型', link: '/zh/reference/document-model' },
              ],
            },
          ],
          '/zh/examples/': [
            {
              text: '示例',
              items: [
                { text: '在线演练场', link: '/zh/examples/playground' },
                { text: '完整文档门户', link: '/zh/guide/complete-example' },
              ],
            },
          ],
        },
        socialLinks: [
          { icon: 'github', link: 'https://github.com/coderminer/vue-markdown' },
          { icon: 'npm', link: 'https://www.npmjs.com/package/@coderminer/vue-markdown' },
        ],
        search: {
          provider: 'local',
          options: {
            detailedView: true,
            locales: {
              zh: {
                translations: {
                  button: {
                    buttonText: '搜索文档',
                    buttonAriaLabel: '搜索文档',
                  },
                  modal: {
                    noResultsText: '没有找到相关结果',
                    resetButtonTitle: '清除查询条件',
                    footer: {
                      selectText: '选择',
                      navigateText: '切换',
                      closeText: '关闭',
                    },
                  },
                },
              },
            },
          },
        },
        editLink: {
          pattern: 'https://github.com/coderminer/vue-markdown/edit/main/docs/:path',
          text: '在 GitHub 上编辑此页',
        },
        lastUpdated: {
          text: '最后更新',
          formatOptions: { dateStyle: 'medium', timeStyle: 'short' },
        },
        outline: {
          level: [2, 3],
          label: '本页目录',
        },
        docFooter: {
          prev: '上一页',
          next: '下一页',
        },
        footer: {
          message: '基于 MIT 许可证发布。',
          copyright: 'Copyright © 2026 CoderMiner',
        },
      },
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
