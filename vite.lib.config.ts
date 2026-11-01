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
      '@coderminer/vue-markdown': resolveSrc('./src/index.ts'),
    },
    // Prefer the DOM-free implementations so the built library can be
    // imported by Node/SSR as well as bundled for browsers.
    conditions: ['node', 'import', 'module', 'default'],
  },
  build: {
    // Runtime JavaScript follows Vue 3's baseline: native ES2016, no IE11.
    // This does not polyfill runtime APIs; source code must stay ES2016-compatible.
    target: 'es2016',
    // The stylesheet targets the same browser baseline as the runtime and uses
    // additive physical-property and interaction fallbacks for older engines.
    cssTarget: ['chrome54', 'edge15', 'firefox52', 'safari10.1', 'ios10.3'],
    lib: {
      entry: {
        index: resolveSrc('./src/index.ts'),
        headless: resolveSrc('./src/headless.ts'),
        pipeline: resolveSrc('./src/pipeline.ts'),
        plugins: resolveSrc('./src/plugins.ts'),
        presets: resolveSrc('./src/presets.ts'),
        'node-components': resolveSrc('./src/node-components.ts'),
        'highlight/index': resolveSrc('./src/highlight/index.ts'),
        'highlight/shiki': resolveSrc('./src/highlight/shiki.ts'),
        'math/index': resolveSrc('./src/math/index.ts'),
        'mermaid/index': resolveSrc('./src/mermaid/index.ts'),
        'editor/index': resolveSrc('./src/editor/index.ts'),
        'html/index': resolveSrc('./src/html/index.ts'),
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
        'rehype-raw',
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
