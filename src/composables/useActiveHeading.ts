import {
  onBeforeUnmount,
  onMounted,
  ref,
  toValue,
  watch,
  type MaybeRefOrGetter,
} from 'vue'

export interface UseActiveHeadingOptions {
  /**
   * Scope heading lookups to one rendered document root. Pass this when a
   * page contains multiple renderers that may generate the same heading IDs.
   */
  root?: MaybeRefOrGetter<Element | Document | null | undefined>
}

/** Find an element by id inside a document or a scoped root element. */
export function findElementById(
  scope: Element | Document,
  id: string,
): HTMLElement | null {
  const byId = (scope as Document).getElementById
  if (typeof byId === 'function') {
    return byId.call(scope, id)
  }
  // Avoid CSS selector escaping for generated ids with punctuation.
  const candidates = (scope as Element).querySelectorAll('[id]')
  for (let index = 0; index < candidates.length; index += 1) {
    const element = candidates[index] as HTMLElement
    if (element.getAttribute('id') === id) return element
  }
  return null
}

/** Tracks the heading currently in view without touching the DOM before mount. */
export function useActiveHeading(
  ids: MaybeRefOrGetter<string[]>,
  enabled: MaybeRefOrGetter<boolean> = true,
  options: UseActiveHeadingOptions = {},
) {
  const activeId = ref<string>()
  let observer: IntersectionObserver | undefined

  const disconnect = (): void => {
    observer?.disconnect()
    observer = undefined
  }

  const connect = (): void => {
    disconnect()
    if (!toValue(enabled)) return
    if (typeof window === 'undefined' || typeof IntersectionObserver === 'undefined') {
      return
    }

    const scope = toValue(options.root) ?? window.document
    const elements = toValue(ids)
      .map((id) => findElementById(scope, id))
      .filter((element): element is HTMLElement => element !== null)

    if (elements.length === 0) return

    observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
        if (visible[0]) activeId.value = visible[0].target.id
      },
      { rootMargin: '0px 0px -70% 0px', threshold: 0 },
    )

    for (const element of elements) observer.observe(element)
  }

  onMounted(connect)
  watch(() => toValue(ids).join('\u001f'), connect)
  watch(() => toValue(enabled), connect)
  if (options.root) watch(() => toValue(options.root), connect)
  onBeforeUnmount(disconnect)

  return activeId
}
