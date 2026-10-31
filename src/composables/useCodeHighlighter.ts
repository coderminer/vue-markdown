import {
  computed,
  onMounted,
  onScopeDispose,
  shallowRef,
  toValue,
  watch,
  type ComputedRef,
  type MaybeRefOrGetter,
  type ShallowRef,
} from 'vue'
import type {
  HighlightResult,
  MarkdownDiagnostic,
  MarkdownHighlighter,
  MarkdownTheme,
} from '../core/types'
import { createDiagnostic, errorMessage } from '../core/diagnostics'
import { plaintextHighlight, runHighlighter } from '../highlight/shared'

let defaultHighlighterPromise: Promise<MarkdownHighlighter> | undefined

function loadDefaultHighlighter(): Promise<MarkdownHighlighter> {
  if (!defaultHighlighterPromise) {
    defaultHighlighterPromise = import('../highlight/highlightjs')
      .then((module) => module.highlightjs)
      .catch((error) => {
        // Allow a later block to retry after a transient chunk-load failure.
        defaultHighlighterPromise = undefined
        throw error
      })
  }
  return defaultHighlighterPromise
}

export interface UseCodeHighlighterOptions {
  source: MaybeRefOrGetter<string>
  language: MaybeRefOrGetter<string>
  highlighter?: MaybeRefOrGetter<MarkdownHighlighter | undefined>
  theme?: MaybeRefOrGetter<MarkdownTheme | undefined>
  /** Nearest provider or render-context theme, below the local `theme` prop. */
  contextTheme?: MaybeRefOrGetter<MarkdownTheme | undefined>
  /** When false the highlighter is neither loaded nor run (for example, a region replacement). */
  enabled?: MaybeRefOrGetter<boolean>
  /** Optional debounce in milliseconds. */
  delay?: MaybeRefOrGetter<number>
  onDiagnostic?: (diagnostic: MarkdownDiagnostic) => void
}

export interface UseCodeHighlighterReturn {
  result: ShallowRef<HighlightResult>
  active: ShallowRef<MarkdownHighlighter | undefined>
  resolvedTheme: ComputedRef<MarkdownTheme>
  refresh: () => Promise<void>
  getHighlighted: () => HighlightResult
}

/**
 * Shared highlighter state for `CodeBlock` and `VueSyntaxHighlighter`.
 *
 * Keeping the lazy default adapter, theme mapping, readiness loading, and
 * diagnostics in one place prevents the two public components from drifting
 * apart as adapters are added.
 */
export function useCodeHighlighter(
  options: UseCodeHighlighterOptions,
): UseCodeHighlighterReturn {
  const resolvedTheme = computed<MarkdownTheme>(
    () => toValue(options.theme) ?? toValue(options.contextTheme) ?? 'light',
  )
  const result = shallowRef<HighlightResult>(
    plaintextHighlight(toValue(options.source), toValue(options.language)),
  )
  const active = shallowRef<MarkdownHighlighter | undefined>(
    toValue(options.highlighter),
  )

  const reportedDiagnostics = new Set<string>()
  function reportDiagnostic(diagnostic: MarkdownDiagnostic): void {
    const signature = `${diagnostic.code}\u001f${diagnostic.message}`
    if (reportedDiagnostics.has(signature)) return
    reportedDiagnostics.add(signature)
    options.onDiagnostic?.(diagnostic)
  }

  function colorScheme(): 'light' | 'dark' {
    if (resolvedTheme.value === 'dark') return 'dark'
    if (resolvedTheme.value === 'auto' && typeof window !== 'undefined') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light'
    }
    return 'light'
  }

  let generation = 0
  let timer: ReturnType<typeof setTimeout> | undefined

  async function run(): Promise<void> {
    const current = ++generation
    if (!(toValue(options.enabled) ?? true)) return

    let instance = toValue(options.highlighter)
    if (instance && typeof instance.highlight !== 'function') {
      reportDiagnostic(
        createDiagnostic(
          'highlighter-invalid',
          'The supplied highlighter does not implement `highlight()`. Falling back to plain text.',
          { severity: 'warning', phase: 'render' },
        ),
      )
      instance = undefined
    }

    if (!instance) {
      try {
        instance = await loadDefaultHighlighter()
      } catch (error) {
        reportDiagnostic(
          createDiagnostic(
            'highlighter-unavailable',
            'The default highlight.js adapter could not be loaded. Install the optional `highlight.js` peer dependency to enable syntax highlighting.',
            { severity: 'warning', phase: 'render' },
          ),
        )
        if (import.meta.env.DEV) {
          console.error('highlight.js failed to load', error)
        }
        instance = undefined
      }
    }

    if (current !== generation) return

    if (!instance || typeof instance.highlight !== 'function') {
      active.value = undefined
      result.value = plaintextHighlight(
        toValue(options.source),
        toValue(options.language),
      )
      return
    }

    active.value = instance
    try {
      await instance.load?.()
      const language = toValue(options.language)
      if (language) await instance.loadLanguage?.(language)
    } catch (error) {
      // Adapter readiness failures fall back to plain text, but the host should
      // be able to tell a missing peer or language grammar from a parse error.
      reportDiagnostic(
        createDiagnostic(
          'highlighter-load',
          `The highlighter could not prepare this language: ${errorMessage(error)}`,
          { severity: 'warning', phase: 'render' },
        ),
      )
    }

    if (current !== generation) return

    const source = toValue(options.source)
    const language = toValue(options.language)
    result.value = runHighlighter(instance, source, language, {
      theme: resolvedTheme.value,
      colorScheme: colorScheme(),
    })
  }

  function refresh(): Promise<void> {
    if (timer) {
      clearTimeout(timer)
      timer = undefined
    }
    const delay = toValue(options.delay) ?? 0
    if (delay > 0) {
      return new Promise((resolve) => {
        timer = setTimeout(() => {
          timer = undefined
          void run().then(resolve)
        }, delay)
      })
    }
    return run()
  }

  // Show escaped source immediately for a new snippet while an asynchronous
  // adapter prepares its grammar. Theme and adapter changes keep the previous
  // result until the new one is ready.
  watch(
    () => [toValue(options.source), toValue(options.language)] as const,
    ([source, language]) => {
      result.value = plaintextHighlight(source, language)
    },
  )

  watch(
    () =>
      [
        toValue(options.source),
        toValue(options.language),
        toValue(options.highlighter),
        resolvedTheme.value,
        toValue(options.enabled) ?? true,
      ] as const,
    () => {
      void refresh()
    },
  )

  onMounted(() => {
    void refresh()
  })

  onScopeDispose(() => {
    generation += 1
    if (timer) {
      clearTimeout(timer)
      timer = undefined
    }
  })

  function getHighlighted(): HighlightResult {
    return result.value
  }

  return {
    result,
    active,
    resolvedTheme,
    refresh,
    getHighlighted,
  }
}
