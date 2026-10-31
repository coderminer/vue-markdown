import { cp, mkdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const source = resolve(root, 'src')
const dist = resolve(root, 'dist')

await mkdir(resolve(dist, 'styles'), { recursive: true })

for (const file of ['tokens.css', 'components.css', 'math.css', 'math-full.css']) {
  await cp(resolve(source, 'styles', file), resolve(dist, 'styles', file))
}

await cp(resolve(source, 'style.css'), resolve(dist, 'style.css'))

console.log('Copied token, component, math, and aggregate styles to dist/.')
