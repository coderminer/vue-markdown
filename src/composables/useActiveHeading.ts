import {
  onBeforeUnmount,
  onMounted,
  ref,
  toValue,
  watch,
  type MaybeRefOrGetter,
} from 'vue'

/** Tracks the heading currently in view without touching the DOM before mount. */
export function useActiveHeading(
  ids: MaybeRefOrGetter<string[]>,
  enabled: MaybeRefOrGetter<boolean> = true,
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

    const elements = toValue(ids)
      .map((id) => window.document.getElementById(id))
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
  onBeforeUnmount(disconnect)

  return activeId
}
