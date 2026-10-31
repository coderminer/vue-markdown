import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

const resolveSrc = (path: string) =>
  fileURLToPath(new URL(path, import.meta.url))

export default defineConfig({
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
        find: 'vue-markdown-suite',
        replacement: resolveSrc('./src/index.ts'),
      },
    ],
  },
  build: {
    // Match the library runtime baseline. The demo's stylesheet still uses the
    // current CSS baseline until the CSS compatibility pass.
    target: 'es2016',
    cssTarget: ['chrome87', 'edge88', 'firefox78', 'safari14.1', 'ios14.5'],
    outDir: '../dist-demo',
    emptyOutDir: true,
  },
})
