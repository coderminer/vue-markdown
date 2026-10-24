import { readdir, readFile, rename, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join, resolve } from 'node:path'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const dist = resolve(root, 'dist')

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true })
  const files = []
  for (const entry of entries) {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) files.push(...(await walk(path)))
    else files.push(path)
  }
  return files
}

const files = await walk(dist)

for (const file of files) {
  if (!file.endsWith('.vue.d.ts')) continue
  await rename(file, file.slice(0, -'.vue.d.ts'.length) + '.d.ts')
}

for (const file of await walk(dist)) {
  if (!file.endsWith('.d.ts')) continue
  const source = await readFile(file, 'utf8')
  const next = source.replace(/(from\s+['"][^'"]+)\.vue(['"])/g, '$1$2')
  if (next !== source) await writeFile(file, next, 'utf8')
}

console.log('Normalized declaration file names and imports.')
