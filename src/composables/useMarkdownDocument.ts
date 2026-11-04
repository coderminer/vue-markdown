import {
  computed,
  effectScope,
  getCurrentScope,
  onScopeDispose,
  shallowRef,
  toValue,
  watch,
  type ComputedRef,
  type EffectScope,
  type MaybeRefOrGetter,
  type ShallowRef,
} from 'vue'
import type { PluggableList } from 'unified'
import type {
  MarkdownDiagnostic,
  MarkdownDocument,
  MarkdownDocumentOptions,
  MarkdownLabels,
  MarkdownNodeComponents,
  MarkdownPipeline,
  MarkdownRegionComponents,
  MarkdownSlugger,
  MarkdownTagComponents,
  PipelineContext,
  PipelineResult,
  TocItem,
} from '../core/types'
import {
  createDiagnostic,
  errorMessage,
  reportPluginError,
} from '../core/diagnostics'
import { finalizeMarkdownDocument } from '../core/finalize'
import { identityOf } from '../core/identity'
import { memoGetEntry, memoSetEntry } from '../core/memo'
import { withSearchSegments } from '../core/search'
import { createDefaultSlugger, withUniqueSlugs } from '../core/slugger'
import { createPluginContext } from '../plugins/define'
import { applySourceTransforms } from '../plugins/source'
import { defaultPlugins } from '../plugins/builtin'
import { resolvePlugins, type ResolvedPlugins } from '../plugins/registry'
import { assertPipelineResult, resolvePipeline } from '../pipeline/custom'
import { createOfficialPipeline } from '../pipeline/official'
import { createMemoKey, createPipelineIdentity } from '../pipeline/identity'

export type MarkdownStatus = 'idle' | 'pending' | 'ready' | 'error'

export interface UseMarkdownDocumentReturn {
  document: ShallowRef<MarkdownDocument | undefined>
  toc: ComputedRef<TocItem[]>
  status: ShallowRef<MarkdownStatus>
  diagnostics: ShallowRef<MarkdownDiagnostic[]>
  pipeline: ComputedRef<string>
  plugins: ComputedRef<string[]>
  /** Tag components contributed by plugins; local props are merged by the host. */
  resolvedComponents: ComputedRef<MarkdownTagComponents>
  /** Semantic node components contributed by plugins. */
  resolvedNodeComponents: ComputedRef<MarkdownNodeComponents>
  /** Structural regions contributed by plugins. */
  resolvedRegions: ComputedRef<MarkdownRegionComponents>
  /** Labels contributed by plugins. */
  resolvedLabels: ComputedRef<Partial<MarkdownLabels>>
  /** Design tokens contributed by plugins. */
  resolvedTokens: ComputedRef<Record<string, string>>
  refresh: () => Promise<void>
  /** Clear the published diagnostics without changing the document. */
  clearDiagnostics: () => void
}

function isAsyncError(error: unknown): boolean {
  return (
    error instanceof Error &&
    /finished async|processSync.*async|async.*processSync/i.test(error.message)
  )
}

/** Configuration frozen at the start of a run. */
interface RunSnapshot {
  source: string
  options: MarkdownDocumentOptions
  plugins: ResolvedPlugins
  pipeline: MarkdownPipeline
  remarkPlugins: PluggableList
  rehypePlugins: PluggableList
  remarkRehypeOptions: Record<string, unknown>
  slugger: MarkdownSlugger
  idPrefix: string
  diagnostics: MarkdownDiagnostic[]
}

/** Run a cleanup at most once, even when it is registered twice. */
function once(cleanup: () => void): () => void {
  let done = false
  return () => {
    if (done) return
    done = true
    cleanup()
  }
}

export function useMarkdownDocument(
  source: MaybeRefOrGetter<string>,
  options: MaybeRefOrGetter<MarkdownDocumentOptions> = {},
): UseMarkdownDocumentReturn {
  const document = shallowRef<MarkdownDocument>()
  /** Parsed document without search segments; shared with the parse cache. */
  const baseDocument = shallowRef<MarkdownDocument>()
  const status = shallowRef<MarkdownStatus>('idle')
  const diagnostics = shallowRef<MarkdownDiagnostic[]>([])
  const setupDiagnostics = shallowRef<MarkdownDiagnostic[]>([])
  /**
   * Publish the latest run's diagnostics. Identical entries are collapsed so a
   * plugin that reports the same failure twice, or a cached processor that
   * replays an error, cannot grow the exposed list across runs. The source
   * range and details are part of the signature so distinct occurrences of the
   * same message are preserved.
   */
  const publishDiagnostics = (list: readonly MarkdownDiagnostic[]): void => {
    const seen = new Set<string>()
    const next: MarkdownDiagnostic[] = []
    for (const diagnostic of list) {
      const sourceRange = diagnostic.source
        ? `${diagnostic.source.start.line}:${diagnostic.source.start.column}:${diagnostic.source.start.offset ?? ''}-${diagnostic.source.end.line}:${diagnostic.source.end.column}:${diagnostic.source.end.offset ?? ''}`
        : ''
      const signature = [
        diagnostic.code,
        diagnostic.message,
        diagnostic.severity,
        diagnostic.plugin ?? '',
        diagnostic.phase ?? '',
        sourceRange,
        diagnostic.details ?? '',
      ].join('\u001f')
      if (seen.has(signature)) continue
      seen.add(signature)
      next.push(diagnostic)
    }
    diagnostics.value = next
  }
  const optionsRef = computed(() => toValue(options) ?? {})
  const sourceRef = computed(() => {
    const value = toValue(source)
    return typeof value === 'string' ? value : ''
  })

  const resolved = computed(() =>
    resolvePlugins(
      optionsRef.value.plugins ?? defaultPlugins,
      optionsRef.value.disablePlugins ?? [],
    ),
  )

  /**
   * The pipeline the composable owns. It is created once so presentation-only
   * option changes cannot invalidate the official processor cache, and so the
   * identity used for memoization stays stable.
   */
  const libraryPipeline = createOfficialPipeline()
  const pipelineResult = computed(() =>
    resolvePipeline(optionsRef.value.pipeline, libraryPipeline),
  )
  const pipeline = computed(() => pipelineResult.value.pipeline)

  const remarkPlugins = computed<PluggableList>(() => [
    ...resolved.value.remarkPlugins,
    ...(optionsRef.value.remarkPlugins ?? []),
  ])
  const rehypePlugins = computed<PluggableList>(() => [
    ...resolved.value.rehypePlugins,
    ...(optionsRef.value.rehypePlugins ?? []),
  ])
  const remarkRehypeOptions = computed(() => ({
    ...resolved.value.remarkRehypeOptions,
    ...(optionsRef.value.remarkRehypeOptions ?? {}),
  }))

  const defaultSlugger: MarkdownSlugger = createDefaultSlugger()
  const baseSlugger = computed(() => optionsRef.value.slugger ?? defaultSlugger)
  const idPrefix = computed(() => optionsRef.value.idPrefix ?? '')

  const pipelineIdentity = computed(() =>
    createPipelineIdentity({
      pipeline: pipeline.value,
      pipelineName: pipeline.value.name,
      plugins: resolved.value.plugins,
      remarkPlugins: remarkPlugins.value,
      rehypePlugins: rehypePlugins.value,
      remarkRehypeOptions: optionsRef.value.remarkRehypeOptions,
      options: optionsRef.value,
    }),
  )

  const parseKey = computed(() => pipelineIdentity.value)

  /**
   * Search state is derived from a parsed document, so it is deliberately kept
   * out of `parseKey`: changing the query must not re-run the pipeline.
   */
  const searchKey = computed(() => {
    const search = optionsRef.value.search
    return `${search?.query?.trim() ?? ''}\u001f${search?.caseSensitive ? '1' : '0'}`
  })

  const pluginSetupKey = computed(() =>
    resolved.value.plugins.map((plugin) => identityOf(plugin)).join(','),
  )

  let scope: EffectScope | undefined
  let cleanups: Array<() => void> = []

  const disposePluginScope = (): void => {
    const active = scope
    scope = undefined
    active?.stop()
    const pending = cleanups
    cleanups = []
    for (const cleanup of pending) {
      try {
        cleanup()
      } catch {
        // Cleanup failures must not break reconfiguration.
      }
    }
  }

  const setupPlugins = (): void => {
    disposePluginScope()
    const nextScope = effectScope(true)
    scope = nextScope

    const collected: MarkdownDiagnostic[] = []
    const context = createPluginContext(
      sourceRef.value,
      optionsRef.value,
      collected,
    )
    // Run setup inside the scope so watchers, timers, and `onScopeDispose`
    // registrations belong to this plugin set and stop on reconfiguration or
    // unmount. Running it outside a scope silently leaks them.
    nextScope.run(() => {
      for (const plugin of resolved.value.plugins) {
        if (!plugin.setup) continue
        try {
          const cleanup = plugin.setup(context)
          if (typeof cleanup === 'function') cleanups.push(once(cleanup))
        } catch (error) {
          collected.push(
            createDiagnostic('plugin-setup', errorMessage(error), {
              phase: 'setup',
              plugin: plugin.name,
            }),
          )
          reportPluginError(plugin, error, 'setup', context, collected)
        }
      }
    })
    // Publish a snapshot. A plugin that retains the setup context must not be
    // able to append to the list that every later run spreads.
    setupDiagnostics.value = collected.slice()
  }

  /** Only the pipeline the library created is ours to dispose. */
  const disposePipeline = (value: MarkdownPipeline | undefined): void => {
    if (!value || value !== libraryPipeline) return
    try {
      value.dispose?.()
    } catch {
      // A failing dispose must not break unmount.
    }
  }

  let disposed = false
  const teardown = (): void => {
    if (disposed) return
    disposed = true
    disposePluginScope()
    disposePipeline(pipeline.value)
  }

  if (getCurrentScope()) onScopeDispose(teardown)

  /** Search key that produced the currently published document. */
  let publishedSearchKey = ''

  const deriveDocument = (base: MarkdownDocument): MarkdownDocument =>
    withSearchSegments(base, optionsRef.value.search)

  const publish = (
    base: MarkdownDocument,
    list: readonly MarkdownDiagnostic[],
  ): void => {
    baseDocument.value = base
    document.value = deriveDocument(base)
    publishDiagnostics(list)
    status.value = 'ready'
    publishedSearchKey = searchKey.value
  }

  const createContext = (snapshot: RunSnapshot): PipelineContext => ({
    source: snapshot.source,
    options: snapshot.options,
    plugins: snapshot.plugins.plugins,
    remarkPlugins: snapshot.remarkPlugins,
    rehypePlugins: snapshot.rehypePlugins,
    remarkRehypeOptions: snapshot.remarkRehypeOptions,
    slugger: snapshot.slugger,
    idPrefix: snapshot.idPrefix,
    diagnostics: snapshot.diagnostics,
  })

  const finalize = (
    snapshot: RunSnapshot,
    result: PipelineResult,
  ): MarkdownDocument =>
    finalizeMarkdownDocument({
      source: snapshot.source,
      result,
      options: snapshot.options,
      plugins: snapshot.plugins,
      pipelineName: snapshot.pipeline.name,
      slugger: snapshot.slugger,
      idPrefix: snapshot.idPrefix,
      diagnostics: snapshot.diagnostics,
      // Search is derived after the cache lookup so the cached document stays
      // query-independent.
      search: false,
    })

  let runId = 0

  const applyRun = (
    snapshot: RunSnapshot,
    result: PipelineResult,
    key: string,
    cache: boolean,
  ): void => {
    // Custom pipelines may produce headings without IDs; normalize assigns them.
    // Reset the per-run slugger so ids from the pipeline and the fallback path
    // cannot collide with another run's state.
    snapshot.slugger.reset?.()
    const next = finalize(snapshot, result)
    if (cache) {
      memoSetEntry(key, {
        document: next,
        diagnostics: snapshot.diagnostics.slice(),
      })
    }
    publish(next, snapshot.diagnostics)
  }

  const runSync = (
    snapshot: RunSnapshot,
    key: string,
    cache: boolean,
  ): 'done' | 'async' => {
    const sync = snapshot.pipeline.processSync
    if (!sync) return 'async'

    try {
      const result = assertPipelineResult(
        sync.call(snapshot.pipeline, snapshot.source, createContext(snapshot)),
      )
      applyRun(snapshot, result, key, cache)
      return 'done'
    } catch (error) {
      if (isAsyncError(error)) return 'async'
      status.value = 'error'
      publishDiagnostics([
        ...snapshot.diagnostics,
        createDiagnostic('pipeline-sync', errorMessage(error), {
          phase: 'pipeline',
        }),
      ])
      return 'done'
    }
  }

  const runAsync = async (
    id: number,
    snapshot: RunSnapshot,
    key: string,
    cache: boolean,
  ): Promise<void> => {
    status.value = 'pending'
    try {
      const result = assertPipelineResult(
        await snapshot.pipeline.process(
          snapshot.source,
          createContext(snapshot),
        ),
      )
      if (id !== runId) return
      applyRun(snapshot, result, key, cache)
    } catch (error) {
      if (id !== runId) return
      status.value = 'error'
      publishDiagnostics([
        ...snapshot.diagnostics,
        createDiagnostic('pipeline-process', errorMessage(error), {
          phase: 'pipeline',
        }),
      ])
    }
  }

  const run = (force = false): Promise<void> => {
    const id = ++runId
    try {
      const options = optionsRef.value
      const pluginSet = resolved.value
      const runPipeline = pipeline.value
      const nextDiagnostics: MarkdownDiagnostic[] = [
        ...pipelineResult.value.diagnostics,
        ...pluginSet.diagnostics,
        ...setupDiagnostics.value,
      ]
      const source = applySourceTransforms(
        sourceRef.value,
        pluginSet.plugins,
        options,
        nextDiagnostics,
      )
      const key = createMemoKey(source, pipelineIdentity.value)

      if (!force) {
        const cached = memoGetEntry(key)
        if (cached) {
          publish(cached.document, [...nextDiagnostics, ...cached.diagnostics])
          return Promise.resolve()
        }
      }

      const snapshot: RunSnapshot = {
        source,
        options,
        plugins: pluginSet,
        pipeline: runPipeline,
        remarkPlugins: remarkPlugins.value,
        rehypePlugins: rehypePlugins.value,
        remarkRehypeOptions: remarkRehypeOptions.value,
        // A slugger per run keeps concurrent runs from resetting each other.
        slugger: withUniqueSlugs(baseSlugger.value),
        idPrefix: idPrefix.value,
        diagnostics: nextDiagnostics,
      }

      const sync = runSync(snapshot, key, !force)
      if (sync === 'done') return Promise.resolve()
      return runAsync(id, snapshot, key, !force)
    } catch (error) {
      // Configuration failures before the pipeline starts must replace the
      // published diagnostics, not leave the previous run's list in place.
      status.value = 'error'
      publishDiagnostics([
        createDiagnostic('pipeline-run', errorMessage(error), {
          phase: 'pipeline',
        }),
      ])
      return Promise.resolve()
    }
  }

  const refresh = (): Promise<void> => run(true)

  // Re-derive search segments against the last good document. This runs without
  // re-entering the pipeline, so a query change never re-parses.
  watch(searchKey, () => {
    const base = baseDocument.value
    if (!base) return
    if (publishedSearchKey === searchKey.value) return
    document.value = deriveDocument(base)
    publishedSearchKey = searchKey.value
  })

  // Dispose the previous pipeline when the host replaces it. Host-supplied
  // pipelines outside our ownership are left alone.
  watch(pipeline, (next, previous) => {
    if (previous && previous !== next) disposePipeline(previous)
  })

  watch(pluginSetupKey, setupPlugins, { immediate: true })
  watch([sourceRef, parseKey], () => void run())

  void run()

  return {
    document,
    toc: computed(() => document.value?.toc ?? []),
    status,
    diagnostics,
    pipeline: computed(() => pipeline.value.name),
    plugins: computed(() => resolved.value.names),
    resolvedComponents: computed(() => resolved.value.components),
    resolvedNodeComponents: computed(() => resolved.value.nodeComponents),
    resolvedRegions: computed(() => resolved.value.regions),
    resolvedLabels: computed(() => resolved.value.labels),
    resolvedTokens: computed(() => resolved.value.tokens),
    refresh,
    clearDiagnostics: () => {
      diagnostics.value = []
    },
  }
}
