import GithubSlugger from 'github-slugger'
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
  MarkdownRegionComponents,
  MarkdownSlugger,
  MarkdownTagComponents,
  PipelineContext,
  PipelineResult,
  TocItem,
} from '../core/types'
import { createDiagnostic, errorMessage } from '../core/diagnostics'
import { finalizeMarkdownDocument } from '../core/finalize'
import { identityOf } from '../core/identity'
import { memoGet, memoSet } from '../core/memo'
import { withUniqueSlugs } from '../core/slugger'
import { createPluginContext } from '../plugins/define'
import { applySourceTransforms } from '../plugins/source'
import { defaultPlugins } from '../plugins/builtin'
import { resolvePlugins } from '../plugins/registry'
import { assertPipelineResult, resolvePipeline } from '../pipeline/custom'
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
}

function isAsyncError(error: unknown): boolean {
  return (
    error instanceof Error &&
    /finished async|processSync.*async|async.*processSync/i.test(error.message)
  )
}

export function useMarkdownDocument(
  source: MaybeRefOrGetter<string>,
  options: MaybeRefOrGetter<MarkdownDocumentOptions> = {},
): UseMarkdownDocumentReturn {
  const document = shallowRef<MarkdownDocument>()
  const status = shallowRef<MarkdownStatus>('idle')
  const diagnostics = shallowRef<MarkdownDiagnostic[]>([])
  const setupDiagnostics = shallowRef<MarkdownDiagnostic[]>([])
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

  const pipelineResult = computed(() => resolvePipeline(optionsRef.value.pipeline))
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

  const defaultSlugger: MarkdownSlugger = new GithubSlugger()
  const baseSlugger = computed(() => optionsRef.value.slugger ?? defaultSlugger)
  const slugger = computed(() => withUniqueSlugs(baseSlugger.value))
  const idPrefix = computed(() => optionsRef.value.idPrefix ?? '')

  const pipelineIdentity = computed(() =>
    createPipelineIdentity({
      pipelineName: pipeline.value.name,
      plugins: resolved.value.plugins,
      remarkPlugins: remarkPlugins.value,
      rehypePlugins: rehypePlugins.value,
      remarkRehypeOptions: optionsRef.value.remarkRehypeOptions,
      options: optionsRef.value,
    }),
  )

  const parseKey = computed(() => pipelineIdentity.value)

  const pluginSetupKey = computed(() =>
    resolved.value.plugins.map((plugin) => identityOf(plugin)).join(','),
  )

  let scope: EffectScope | undefined
  let cleanups: Array<() => void> = []

  const setupPlugins = (): void => {
    scope?.stop()
    for (const cleanup of cleanups) {
      try {
        cleanup()
      } catch {
        // Cleanup failures must not break reconfiguration.
      }
    }
    cleanups = []
    scope = effectScope(true)
    setupDiagnostics.value = []

    const context = createPluginContext(
      sourceRef.value,
      optionsRef.value,
      setupDiagnostics.value as MarkdownDiagnostic[],
    )
    for (const plugin of resolved.value.plugins) {
      if (!plugin.setup) continue
      try {
        const cleanup = plugin.setup(context)
        if (typeof cleanup === 'function') cleanups.push(cleanup)
      } catch (error) {
        const diagnostic = createDiagnostic('plugin-setup', errorMessage(error), {
          phase: 'setup',
          plugin: plugin.name,
        })
        setupDiagnostics.value = [...setupDiagnostics.value, diagnostic]
        plugin.onError?.(error, 'setup', context)
      }
    }
  }

  const teardown = (): void => {
    scope?.stop()
    for (const cleanup of cleanups) {
      try {
        cleanup()
      } catch {
        // Ignore cleanup errors during teardown.
      }
    }
    cleanups = []
    pipeline.value.dispose?.()
  }

  if (getCurrentScope()) onScopeDispose(teardown)

  const apply = (next: MarkdownDocument): void => {
    document.value = next
    status.value = 'ready'
  }

  const createContext = (
    source: string,
    nextDiagnostics: MarkdownDiagnostic[],
  ): PipelineContext => ({
    source,
    options: optionsRef.value,
    plugins: resolved.value.plugins,
    remarkPlugins: remarkPlugins.value,
    rehypePlugins: rehypePlugins.value,
    remarkRehypeOptions: remarkRehypeOptions.value,
    slugger: slugger.value,
    idPrefix: idPrefix.value,
    diagnostics: nextDiagnostics,
  })

  const finalize = (
    source: string,
    result: PipelineResult,
    nextDiagnostics: MarkdownDiagnostic[],
  ): MarkdownDocument =>
    finalizeMarkdownDocument({
      source,
      result,
      options: optionsRef.value,
      plugins: resolved.value,
      pipelineName: pipeline.value.name,
      slugger: slugger.value,
      idPrefix: idPrefix.value,
      diagnostics: nextDiagnostics,
    })

  let runId = 0

  const applyRun = (
    source: string,
    result: PipelineResult,
    nextDiagnostics: MarkdownDiagnostic[],
    key: string,
    cache: boolean,
  ): void => {
    const next = finalize(source, result, nextDiagnostics)
    diagnostics.value = nextDiagnostics
    if (cache) memoSet(key, next)
    apply(next)
  }

  const runSync = (
    source: string,
    key: string,
    cache: boolean,
    nextDiagnostics: MarkdownDiagnostic[],
  ): 'done' | 'async' => {
    const sync = pipeline.value.processSync
    if (!sync) return 'async'

    try {
      slugger.value.reset?.()
      const result = assertPipelineResult(sync.call(pipeline.value, source, createContext(source, nextDiagnostics)))
      applyRun(source, result, nextDiagnostics, key, cache)
      return 'done'
    } catch (error) {
      if (isAsyncError(error)) return 'async'
      status.value = 'error'
      diagnostics.value = [
        ...nextDiagnostics,
        createDiagnostic('pipeline-sync', errorMessage(error), {
          phase: 'pipeline',
        }),
      ]
      return 'done'
    }
  }

  const runAsync = async (
    id: number,
    source: string,
    key: string,
    cache: boolean,
    nextDiagnostics: MarkdownDiagnostic[],
  ): Promise<void> => {
    status.value = 'pending'
    try {
      slugger.value.reset?.()
      const result = assertPipelineResult(
        await pipeline.value.process(source, createContext(source, nextDiagnostics)),
      )
      if (id !== runId) return
      applyRun(source, result, nextDiagnostics, key, cache)
    } catch (error) {
      if (id !== runId) return
      status.value = 'error'
      diagnostics.value = [
        ...nextDiagnostics,
        createDiagnostic('pipeline-process', errorMessage(error), {
          phase: 'pipeline',
        }),
      ]
    }
  }

  const run = (force = false): Promise<void> => {
    const id = ++runId
    const nextDiagnostics: MarkdownDiagnostic[] = [
      ...pipelineResult.value.diagnostics,
      ...resolved.value.diagnostics,
      ...setupDiagnostics.value,
    ]
    const source = applySourceTransforms(
      sourceRef.value,
      resolved.value.plugins,
      optionsRef.value,
      nextDiagnostics,
    )
    const key = createMemoKey(source, pipelineIdentity.value)

    if (!force) {
      const cached = memoGet(key)
      if (cached) {
        diagnostics.value = nextDiagnostics
        apply(cached)
        return Promise.resolve()
      }
    }

    const sync = runSync(source, key, !force, nextDiagnostics)
    if (sync === 'done') return Promise.resolve()
    return runAsync(id, source, key, !force, nextDiagnostics)
  }

  const refresh = (): Promise<void> => run(true)

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
  }
}
