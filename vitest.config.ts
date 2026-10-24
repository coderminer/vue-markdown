import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'

const resolveSrc = (path: string) =>
  fileURLToPath(new URL(path, import.meta.url))

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: [
      {
        find: 'vue-markdown-suite/styles/',
        replacement: `${resolveSrc('./src/styles')}/`,
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
  test: {
    projects: [
      {
        test: {
          name: 'node',
          environment: 'node',
          include: ['tests/node/**/*.test.ts'],
        },
      },
      {
        test: {
          name: 'dom',
          environment: 'happy-dom',
          include: ['tests/dom/**/*.test.ts'],
          setupFiles: ['tests/setup.ts'],
        },
      },
    ],
  },
})
