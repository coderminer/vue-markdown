const identities = new WeakMap<object, number>()
let nextIdentity = 1

/** Stable process-local identity for objects and functions. */
export function identityOf(value: unknown): string {
  if (value === null) return 'null'
  if (value === undefined) return 'undefined'

  const type = typeof value
  if (type !== 'object' && type !== 'function') {
    return `${type}:${String(value)}`
  }

  const object = value as object
  let id = identities.get(object)
  if (id === undefined) {
    id = nextIdentity++
    identities.set(object, id)
  }
  return `${type}:${id}`
}

export function listIdentity(list: readonly unknown[] | undefined): string {
  if (!list || list.length === 0) return ''
  return list.map(identityOf).join(',')
}

export function stringListIdentity(list: readonly string[] | undefined): string {
  if (!list || list.length === 0) return ''
  return list.join('\u001f')
}
