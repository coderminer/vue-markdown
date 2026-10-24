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

async function measureRender(label, source, iterations, cold) {
  const render = async () => {
    if (cold) memoClear()
    const app = createSSRApp({
      render: () => h(MarkdownRenderer, { source }),
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

const results = [
  await measureParse('small', small, 100),
  await measureParse('large', large, 20),
  await measureRender('small', small, 30, true),
  await measureRender('small', small, 30, false),
  await measureRender('large', large, 5, true),
  await measureRender('large', large, 5, false),
]

console.table(results)
console.table([
  { label: 'nodes:small', nodes: smallNodes },
  { label: 'nodes:large', nodes: largeNodes },
])
console.table(
  Object.entries(await entrySizes()).map(([entry, bytes]) => ({ entry, bytes })),
)

const budgets = {
  'parse:small': 3,
  'parse:large': 100,
  'render-cold:small': 8,
  'render-warm:small': 5,
  'render-cold:large': 200,
  'render-warm:large': 120,
}

let failed = false
for (const result of results) {
  const budget = budgets[result.label]
  if (budget !== undefined && result.perRunMs > budget) {
    failed = true
    console.error(
      `Benchmark ${result.label} exceeded its budget: ${result.perRunMs}ms > ${budget}ms`,
    )
  }
}

if (failed) process.exit(1)
