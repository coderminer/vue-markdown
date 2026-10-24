import { readFile, stat } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const dist = resolve(root, 'dist')

const entries = [
  'index.js',
  'headless.js',
  'pipeline.js',
  'plugins.js',
  'node-components.js',
  'components/index.js',
]

const forbidden = {
  'index.js': [],
  'headless.js': ['mermaid', '@codemirror', 'shiki', 'katex', 'highlight.js'],
  'pipeline.js': ['mermaid', '@codemirror', 'shiki', 'katex', 'highlight.js'],
  'plugins.js': ['mermaid', '@codemirror', 'shiki', 'katex', 'highlight.js'],
}

let failed = false
const report = []

for (const entry of entries) {
  const path = resolve(dist, entry)
  try {
    const info = await stat(path)
    const source = await readFile(path, 'utf8')
    const hits = (forbidden[entry] ?? []).filter((name) => source.includes(name))
    report.push({ entry, bytes: info.size, forbidden: hits })
    if (hits.length > 0) {
      failed = true
      console.error(
        `Size guard: ${entry} unexpectedly references ${hits.join(', ')}.`,
      )
    }
  } catch {
    failed = true
    console.error(`Size guard: missing build output ${entry}.`)
  }
}

console.table(report)
if (failed) process.exit(1)
