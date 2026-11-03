type PrintStartListener = () => void

const listeners = new Set<PrintStartListener>()
let media: MediaQueryList | undefined
let listening = false

function notify(): void {
  // Copy first: a listener unsubscribes while it runs.
  for (const listener of Array.from(listeners)) listener()
}

function onBeforePrint(): void {
  notify()
}

function onMediaChange(event: MediaQueryListEvent): void {
  if (event.matches) notify()
}

function start(): void {
  if (listening || typeof window === 'undefined') return
  listening = true
  window.addEventListener('beforeprint', onBeforePrint)
  if (typeof window.matchMedia !== 'function') return
  const query = window.matchMedia('print')
  media = query
  if (typeof query.addEventListener === 'function') {
    query.addEventListener('change', onMediaChange)
  } else if (typeof query.addListener === 'function') {
    query.addListener(onMediaChange)
  }
}

function stop(): void {
  if (!listening) return
  listening = false
  if (typeof window !== 'undefined') {
    window.removeEventListener('beforeprint', onBeforePrint)
  }
  const query = media
  media = undefined
  if (!query) return
  if (typeof query.removeEventListener === 'function') {
    query.removeEventListener('change', onMediaChange)
  } else if (typeof query.removeListener === 'function') {
    query.removeListener(onMediaChange)
  }
}

/**
 * Subscribe to print start with a single shared browser listener.
 *
 * Long documents keep many Mermaid blocks deferred, so each block would
 * otherwise create its own `matchMedia('print')` query and `beforeprint`
 * listener. The shared controller installs the listeners once and removes them
 * again when the last subscriber leaves.
 *
 * Returns an idempotent unsubscribe function. When print media already matches
 * at subscribe time, the listener is notified on a microtask, after the caller
 * has stored the unsubscribe function.
 */
export function onPrintStart(listener: PrintStartListener): () => void {
  listeners.add(listener)
  start()
  if (media?.matches) {
    void Promise.resolve().then(() => {
      if (listeners.has(listener)) listener()
    })
  }

  let stopped = false
  return () => {
    if (stopped) return
    stopped = true
    listeners.delete(listener)
    if (listeners.size === 0) stop()
  }
}
