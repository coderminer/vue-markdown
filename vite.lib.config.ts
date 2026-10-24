import { readdirSync } from 'node:fs'
import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import dts from 'vite-plugin-dts'

const resolveSrc = (path: string) => fileURLToPath(new URL(path, import.meta.url))

const componentsDir = resolveSrc('./src/components')
const componentEntries = Object.fromEntries(
  readdirSync(componentsDir)
    .filter((file) => file.endsWith('.vue'))
    .map((file) => [
      `components/${file.replace(/\.vue$/, '')}`,
      resolveSrc(`./src/components/${file}`),
    ]),
)

export default defineConfig({
  plugins: [
    vue(),
    dts({
      include: ['src'],
      tsconfigPath: './tsconfig.json',
      rollupTypes: false,
      copyDtsFiles: true,
    }),
  ],
  resolve: {
    alias: {
      'vue-markdown-suite': resolveSrc('./src/index.ts'),
    },
    // Prefer the DOM-free implementations so the built library can be
    // imported by Node/SSR as well as bundled for browsers.
    conditions: ['node', 'import', 'module', 'default'],
  },
  build: {
    lib: {
      entry: {
        index: resolveSrc('./src/index.ts'),
        headless: resolveSrc('./src/headless.ts'),
        pipeline: resolveSrc('./src/pipeline.ts'),
        plugins: resolveSrc('./src/plugins.ts'),
        'node-components': resolveSrc('./src/node-components.ts'),
        'components/index': resolveSrc('./src/components/index.ts'),
        ...componentEntries,
      },
      formats: ['es'],
    },
    rollupOptions: {
      external: [
        /^vue$/,
        /^vue\//,
        /^node:/,
        'highlight.js',
        'katex',
        'shiki',
        'mermaid',
        /^@codemirror\//,
      ],
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: 'chunks/[name]-[hash].js',
        assetFileNames: 'assets/[name][extname]',
      },
    },
    cssCodeSplit: false,
    sourcemap: true,
    emptyOutDir: true,
  },
})
