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
  'mermaid/plugin.js',
  'mermaid/sanitize-svg.js',
  'editor/index.js',
  'html/index.js',
]

const heavy = [
  'mermaid',
  'shiki',
  'katex',
  'highlight.js',
  '@codemirror/',
  'rehype-raw',
  // The HTML parser is only needed by entries that convert engine output.
  // It must stay out of the base renderer and the headless entry.
  'hast-util-from-html',
  'parse5',
]

const allowed = {
  'highlight/index.js': ['highlight.js'],
  'highlight/shiki.js': ['shiki'],
  'math/index.js': ['katex', 'hast-util-from-html', 'parse5'],
  'mermaid/sanitize-svg.js': ['hast-util-from-html', 'parse5'],
  'editor/index.js': ['@codemirror/'],
  'html/index.js': ['rehype-raw'],
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

function isNodeBuiltin(specifier) {
  return specifier.startsWith('node:')
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
  const nodeHits = []
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
      if (isNodeBuiltin(specifier)) {
        nodeHits.push({ file: file.replace(dist, ''), specifier })
        continue
      }
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
    nodeHits,
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
      nodeBuiltins: result.nodeHits.length,
    })
    if (result.heavyHits.length > 0) {
      failed = true
      for (const hit of result.heavyHits) {
        console.error(
          `Size guard: ${entry} statically reaches ${hit.specifier} via ${hit.file}.`,
        )
      }
    }
    if (result.nodeHits.length > 0) {
      failed = true
      for (const hit of result.nodeHits) {
        console.error(
          `Browser guard: ${entry} statically imports ${hit.specifier} via ${hit.file}.`,
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
