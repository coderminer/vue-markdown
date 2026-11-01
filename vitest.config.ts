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
        find: '@coderminer/vue-markdown/styles/',
        replacement: `${resolveSrc('./src/styles')}/`,
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
        find: '@coderminer/vue-markdown',
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
          environmentOptions: {
            happyDOM: {
              settings: {
                disableJavaScriptEvaluation: true,
                disableJavaScriptFileLoading: true,
              },
            },
          },
          include: ['tests/dom/**/*.test.ts'],
          setupFiles: ['tests/setup.ts'],
        },
      },
    ],
  },
})
