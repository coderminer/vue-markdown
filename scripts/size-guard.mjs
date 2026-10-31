import { readFile, stat } from 'node:fs/promises'
import { existsSync } from 'node:fs'
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
  'highlight/index.js',
  'highlight/shiki.js',
  'math/index.js',
  'mermaid/index.js',
  'editor/index.js',
]

const heavy = ['mermaid', 'shiki', 'katex', 'highlight.js', '@codemirror/']

const allowed = {
  'highlight/index.js': ['highlight.js'],
  'highlight/shiki.js': ['shiki'],
  'math/index.js': ['katex'],
  'mermaid/index.js': ['mermaid'],
  'editor/index.js': ['@codemirror/'],
}

function isRelative(specifier) {
  return specifier.startsWith('./') || specifier.startsWith('../')
}

function packageName(specifier) {
  if (specifier.startsWith('@')) return specifier.split('/').slice(0, 2).join('/')
  return specifier.split('/')[0]
}

function importsOf(source) {
  const staticSpecifiers = []
  const dynamicSpecifiers = []
  for (const match of source.matchAll(
    /(?:^|\n)\s*(?:import|export)\s+(?:[\s\S]*?\s+from\s+)?["']([^"']+)["']/g,
  )) {
    staticSpecifiers.push(match[1])
  }
  for (const match of source.matchAll(/import\(\s*["']([^"']+)["']/g)) {
    dynamicSpecifiers.push(match[1])
  }
  return { staticSpecifiers, dynamicSpecifiers }
}

function forbiddenFor(entry, specifier) {
  const name = packageName(specifier)
  const allow = allowed[entry] ?? []
  const hit = heavy.find(
    (forbidden) =>
      (forbidden.endsWith('/') ? name.startsWith(forbidden) : name === forbidden) &&
      !allow.some((allowedName) =>
        allowedName.endsWith('/')
          ? name.startsWith(allowedName)
          : name === allowedName,
      ),
  )
  return hit
}

async function graph(entry) {
  const start = resolve(dist, entry)
  if (!existsSync(start)) throw new Error(`missing build output ${entry}`)

  const staticFiles = new Set()
  const dynamicFiles = new Set()
  const heavyHits = []
  const queue = [start]
  let bytes = 0

  while (queue.length > 0) {
    const file = queue.shift()
    if (!file || staticFiles.has(file)) continue
    staticFiles.add(file)
    const info = await stat(file)
    bytes += info.size
    const source = await readFile(file, 'utf8')
    const { staticSpecifiers, dynamicSpecifiers } = importsOf(source)

    for (const specifier of staticSpecifiers) {
      const hit = forbiddenFor(entry, specifier)
      if (hit) {
        heavyHits.push({ file: file.replace(dist, ''), specifier })
        continue
      }
      if (isRelative(specifier)) {
        const next = resolve(dirname(file), specifier)
        if (existsSync(next)) queue.push(next)
      }
    }

    for (const specifier of dynamicSpecifiers) {
      if (isRelative(specifier)) {
        const next = resolve(dirname(file), specifier)
        if (existsSync(next)) dynamicFiles.add(next)
      }
    }
  }

  return {
    entry,
    bytes,
    staticModules: staticFiles.size,
    lazyModules: dynamicFiles.size,
    heavyHits,
  }
}

let failed = false
const report = []
for (const entry of entries) {
  try {
    const result = await graph(entry)
    report.push({
      entry,
      bytes: result.bytes,
      staticModules: result.staticModules,
      lazyModules: result.lazyModules,
      forbidden: result.heavyHits.length,
    })
    if (result.heavyHits.length > 0) {
      failed = true
      for (const hit of result.heavyHits) {
        console.error(
          `Size guard: ${entry} statically reaches ${hit.specifier} via ${hit.file}.`,
        )
      }
    }
  } catch (error) {
    failed = true
    console.error(`Size guard: ${error instanceof Error ? error.message : error}`)
  }
}

console.table(report)
if (failed) process.exit(1)
