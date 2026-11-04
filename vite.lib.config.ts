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
    // Resolve portable default conditions. Selecting the `node` condition
    // would bake in `node:process`, `node:path`, and `node:url` through
    // dependencies such as vfile; selecting `browser` would pick DOM-dependent
    // modules that cannot be imported during SSR. The defaults keep the built
    // library importable by Node/SSR and safe to bundle for browsers.
    conditions: ['import', 'module', 'default'],
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
        'mermaid/plugin': resolveSrc('./src/mermaid/plugin.ts'),
        'mermaid/sanitize-svg': resolveSrc('./src/mermaid/sanitize-svg.ts'),
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
        // Match the adapter's deep language imports as well as the core
        // module. Bundling them would ship a second copy of the peer
        // dependency inside the optional highlight entry.
        /^highlight\.js(\/|$)/,
        'katex',
        'rehype-katex',
        'remark-math',
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
    // Maps are not published, so do not emit sourceMappingURL comments that
    // would point at missing files in consumer devtools.
    sourcemap: false,
    emptyOutDir: true,
  },
})
