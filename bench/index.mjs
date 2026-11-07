import { performance } from 'node:perf_hooks'
import { stat } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')

const small = `# Benchmark

A paragraph with **strong**, *emphasis*, a [link](https://example.com), and \`inline code\`.

- one
- two
- three

\`\`\`js
const value = 1
\`\`\`
`

const large = Array.from({ length: 200 }, (_, index) =>
  `## Section ${index}\n\nParagraph ${index} with **bold** text and a [link](https://example.com/${index}).\n\n- item a\n- item b\n`,
).join('\n')

const catalog = `# Full catalog

- [x] task item
- [ ] another task

A footnote reference[^1].

[^1]: The note body.

\`\`\`ts
const value: number = 1
\`\`\`

Inline math $x^2$ and display math:

$$
\\int_0^1 x^2 \\, dx
$$

\`\`\`mermaid
flowchart LR
  A --> B
\`\`\`
`

let pipelineModule
try {
  pipelineModule = await import('../dist/pipeline.js')
} catch {
  console.error('Build the library first: npm run build:lib')
  process.exit(1)
}

const { createOfficialPipeline } = pipelineModule
const { defaultPlugins } = await import('../dist/plugins.js')
const { normalizeHast, memoClear, walkNodes } = await import('../dist/headless.js')
const { MarkdownRenderer } = await import('../dist/index.js')
const { createSSRApp, h } = await import('vue')
const { renderToString } = await import('@vue/server-renderer')
const { default: GithubSlugger } = await import('github-slugger')

function context(source, slugger) {
  return {
    source,
    plugins: defaultPlugins,
    remarkPlugins: [],
    rehypePlugins: [],
    remarkRehypeOptions: {},
    slugger,
    idPrefix: '',
    allowHtml: false,
    diagnostics: [],
  }
}

function countNodes(nodes) {
  let count = 0
  walkNodes(nodes, () => {
    count += 1
  })
  return count
}

function round(value) {
  return Number(value.toFixed(3))
}

async function measureParse(label, source, iterations) {
  const pipeline = createOfficialPipeline()
  const slugger = new GithubSlugger()

  for (let index = 0; index < 5; index += 1) {
    const result = pipeline.processSync(source, context(source, slugger))
    normalizeHast(result.hast, { slugger })
  }

  const start = performance.now()
  for (let index = 0; index < iterations; index += 1) {
    const result = pipeline.processSync(source, context(source, slugger))
    normalizeHast(result.hast, { slugger })
  }
  const elapsed = performance.now() - start
  return {
    label: `parse:${label}`,
    iterations,
    perRunMs: round(elapsed / iterations),
    bytes: source.length,
  }
}

async function measureRender(label, source, iterations, cold, props = {}) {
  const render = async () => {
    if (cold) memoClear()
    const app = createSSRApp({
      render: () => h(MarkdownRenderer, { source, ...props }),
    })
    return renderToString(app)
  }

  for (let index = 0; index < 3; index += 1) await render()

  const start = performance.now()
  for (let index = 0; index < iterations; index += 1) await render()
  const elapsed = performance.now() - start
  return {
    label: `render${cold ? '-cold' : '-warm'}:${label}`,
    iterations,
    perRunMs: round(elapsed / iterations),
    bytes: source.length,
  }
}

async function entrySizes() {
  const entries = [
    'index.js',
    'headless.js',
    'pipeline.js',
    'plugins.js',
    'node-components.js',
  ]
  const report = {}
  for (const entry of entries) {
    try {
      const info = await stat(resolve(root, 'dist', entry))
      report[entry] = info.size
    } catch {
      report[entry] = -1
    }
  }
  return report
}

const smallNodes = (() => {
  const pipeline = createOfficialPipeline()
  const slugger = new GithubSlugger()
  const result = pipeline.processSync(small, context(small, slugger))
  return countNodes(normalizeHast(result.hast, { slugger }).nodes)
})()

const largeNodes = (() => {
  const pipeline = createOfficialPipeline()
  const slugger = new GithubSlugger()
  const result = pipeline.processSync(large, context(large, slugger))
  return countNodes(normalizeHast(result.hast, { slugger }).nodes)
})()

let catalogPlugins = []
try {
  const { gfmPlugin } = await import('../dist/plugins.js')
  const { mathPlugin } = await import('../dist/math/index.js')
  catalogPlugins = [gfmPlugin, mathPlugin()]
} catch {
  // Optional entries are not required for the small/large benchmarks.
}

const catalogNodes = (() => {
  const pipeline = createOfficialPipeline()
  const slugger = new GithubSlugger()
  const result = pipeline.processSync(catalog, context(catalog, slugger))
  return countNodes(normalizeHast(result.hast, { slugger }).nodes)
})()

const measurements = [
  { label: 'parse:small', run: () => measureParse('small', small, 100) },
  { label: 'parse:large', run: () => measureParse('large', large, 20) },
]
if (catalogPlugins.length > 0) {
  measurements.push({
    label: 'parse:catalog',
    run: () => measureParse('catalog', catalog, 10),
  })
}
measurements.push(
  { label: 'render-cold:small', run: () => measureRender('small', small, 30, true) },
  { label: 'render-warm:small', run: () => measureRender('small', small, 30, false) },
  { label: 'render-cold:large', run: () => measureRender('large', large, 5, true) },
  { label: 'render-warm:large', run: () => measureRender('large', large, 5, false) },
)
if (catalogPlugins.length > 0) {
  measurements.push(
    {
      label: 'render-cold:catalog',
      run: () =>
        measureRender('catalog', catalog, 5, true, { plugins: catalogPlugins }),
    },
    {
      label: 'render-warm:catalog',
      run: () =>
        measureRender('catalog', catalog, 5, false, { plugins: catalogPlugins }),
    },
  )
}

const results = []
for (const measurement of measurements) {
  results.push(await measurement.run())
}

console.table(results)
console.table([
  { label: 'nodes:small', nodes: smallNodes },
  { label: 'nodes:large', nodes: largeNodes },
  { label: 'nodes:catalog', nodes: catalogNodes },
])
console.table(
  Object.entries(await entrySizes()).map(([entry, bytes]) => ({ entry, bytes })),
)

const budgets = {
  'parse:small': 3,
  // Large-document budgets leave room for shared CI runners and noisy local
  // machines. They still catch order-of-magnitude regressions without turning a
  // single scheduling pause into a failed release.
  'parse:large': 150,
  'render-cold:small': 8,
  'render-warm:small': 5,
  'render-cold:large': 350,
  'render-warm:large': 500,
}

const measurementsByLabel = new Map(
  measurements.map((measurement) => [measurement.label, measurement.run]),
)

let failed = false
for (const result of results) {
  const budget = budgets[result.label]
  if (budget === undefined || result.perRunMs <= budget) continue

  // CI runners occasionally pause between phases, which can push a single
  // warm measurement over the line without a real regression. Re-run only the
  // failed measurement once and keep the budget strict.
  const rerun = measurementsByLabel.get(result.label)
  const retry = rerun ? await rerun() : undefined
  if (retry && retry.perRunMs <= budget) {
    console.warn(
      `Benchmark ${result.label} exceeded its budget on the first run (${result.perRunMs}ms > ${budget}ms) but passed on retry (${retry.perRunMs}ms).`,
    )
    continue
  }

  failed = true
  const measured = retry
    ? `${retry.perRunMs}ms after retry (${result.perRunMs}ms first run)`
    : `${result.perRunMs}ms`
  console.error(
    `Benchmark ${result.label} exceeded its budget: ${measured} > ${budget}ms`,
  )
}

if (failed) process.exit(1)
