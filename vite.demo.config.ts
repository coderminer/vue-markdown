import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

const resolveSrc = (path: string) =>
  fileURLToPath(new URL(path, import.meta.url))

export default defineConfig({
  // Project pages are served from /<repository>/; local dev uses the root.
  base: process.env.DOCS_BASE || '/',
  root: 'demo',
  plugins: [vue()],
  resolve: {
    alias: [
      {
        find: '@coderminer/vue-markdown/styles/',
        replacement: `${resolveSrc('./src/styles')}/`,
      },
      {
        find: /^@coderminer\/vue-markdown\/style\.css$/,
        replacement: resolveSrc('./src/style.css'),
      },
      {
        find: '@coderminer/vue-markdown/node-components',
        replacement: resolveSrc('./src/node-components.ts'),
      },
      {
        find: '@coderminer/vue-markdown/headless',
        replacement: resolveSrc('./src/headless.ts'),
      },
      {
        find: '@coderminer/vue-markdown/pipeline',
        replacement: resolveSrc('./src/pipeline.ts'),
      },
      {
        find: '@coderminer/vue-markdown/plugins',
        replacement: resolveSrc('./src/plugins.ts'),
      },
      {
        find: '@coderminer/vue-markdown/math',
        replacement: resolveSrc('./src/math/index.ts'),
      },
      {
        find: '@coderminer/vue-markdown/highlight/shiki',
        replacement: resolveSrc('./src/highlight/shiki.ts'),
      },
      {
        find: '@coderminer/vue-markdown/highlight',
        replacement: resolveSrc('./src/highlight/index.ts'),
      },
      {
        find: '@coderminer/vue-markdown/mermaid',
        replacement: resolveSrc('./src/mermaid/index.ts'),
      },
      {
        find: '@coderminer/vue-markdown/editor',
        replacement: resolveSrc('./src/editor/index.ts'),
      },
      {
        find: '@coderminer/vue-markdown/html',
        replacement: resolveSrc('./src/html/index.ts'),
      },
      {
        find: '@coderminer/vue-markdown',
        replacement: resolveSrc('./src/index.ts'),
      },
    ],
  },
  build: {
    // Match the library runtime baseline. The demo keeps its own modern
    // target and is not part of the published support claim.
    target: 'es2016',
    cssTarget: ['chrome87', 'edge88', 'firefox78', 'safari14.1', 'ios14.5'],
    outDir: '../dist-demo',
    emptyOutDir: true,
    // Mermaid's diagram grammars are intentionally lazy demo chunks.
    chunkSizeWarningLimit: 2000,
  },
})
