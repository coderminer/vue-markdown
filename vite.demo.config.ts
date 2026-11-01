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
        find: 'vue-markdown-suite/styles/',
        replacement: `${resolveSrc('./src/styles')}/`,
      },
      {
        find: /^vue-markdown-suite\/style\.css$/,
        replacement: resolveSrc('./src/style.css'),
      },
      {
        find: 'vue-markdown-suite/node-components',
        replacement: resolveSrc('./src/node-components.ts'),
      },
      {
        find: 'vue-markdown-suite/headless',
        replacement: resolveSrc('./src/headless.ts'),
      },
      {
        find: 'vue-markdown-suite/pipeline',
        replacement: resolveSrc('./src/pipeline.ts'),
      },
      {
        find: 'vue-markdown-suite/plugins',
        replacement: resolveSrc('./src/plugins.ts'),
      },
      {
        find: 'vue-markdown-suite/math',
        replacement: resolveSrc('./src/math/index.ts'),
      },
      {
        find: 'vue-markdown-suite/highlight/shiki',
        replacement: resolveSrc('./src/highlight/shiki.ts'),
      },
      {
        find: 'vue-markdown-suite/highlight',
        replacement: resolveSrc('./src/highlight/index.ts'),
      },
      {
        find: 'vue-markdown-suite/mermaid',
        replacement: resolveSrc('./src/mermaid/index.ts'),
      },
      {
        find: 'vue-markdown-suite/editor',
        replacement: resolveSrc('./src/editor/index.ts'),
      },
      {
        find: 'vue-markdown-suite/html',
        replacement: resolveSrc('./src/html/index.ts'),
      },
      {
        find: 'vue-markdown-suite',
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
