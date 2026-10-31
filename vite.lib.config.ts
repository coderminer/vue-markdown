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
    // Runtime JavaScript follows Vue 3's baseline: native ES2016, no IE11.
    // This does not polyfill runtime APIs; source code must stay ES2016-compatible.
    target: 'es2016',
    // The bundled stylesheet still uses logical properties and `gap`, so its
    // own baseline stays at Chrome/Edge 87+, Firefox 78+, Safari 14.1+ until
    // the CSS compatibility pass.
    cssTarget: ['chrome87', 'edge88', 'firefox78', 'safari14.1', 'ios14.5'],
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
