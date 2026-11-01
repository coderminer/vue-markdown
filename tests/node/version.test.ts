import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { version } from '../../src/index'

function readJson(path: URL): Record<string, unknown> {
  return JSON.parse(readFileSync(path, 'utf8')) as Record<string, unknown>
}

describe('package version', () => {
  it('keeps the runtime version aligned with package metadata', () => {
    const pkg = readJson(new URL('../../package.json', import.meta.url))
    const lock = readJson(new URL('../../package-lock.json', import.meta.url))
    const root = (lock.packages as Record<string, Record<string, unknown>>)['']

    expect(version).toBe(pkg.version)
    expect(lock.version).toBe(pkg.version)
    expect(root?.version).toBe(pkg.version)
  })
})
