import type { PluggableList } from 'unified'
import type {
  MarkdownDiagnostic,
  MarkdownLabels,
  MarkdownNodeComponents,
  MarkdownPlugin,
  MarkdownRegionComponents,
  MarkdownTagComponents,
  PluginInput,
} from '../core/types'
import { createDiagnostic } from '../core/diagnostics'
import { validatePlugin } from './define'

const PHASE_ORDER: Record<NonNullable<MarkdownPlugin['phase']>, number> = {
  pre: 0,
  normal: 1,
  post: 2,
}

export interface ResolvedPlugins {
  plugins: MarkdownPlugin[]
  names: string[]
  diagnostics: MarkdownDiagnostic[]
  components: MarkdownTagComponents
  nodeComponents: MarkdownNodeComponents
  regions: MarkdownRegionComponents
  labels: Partial<MarkdownLabels>
  tokens: Record<string, string>
  remarkPlugins: PluggableList
  rehypePlugins: PluggableList
  remarkRehypeOptions: Record<string, unknown>
}

export function resolvePlugins(
  input: readonly PluginInput[] | undefined,
  disablePlugins: readonly string[] = [],
): ResolvedPlugins {
  const diagnostics: MarkdownDiagnostic[] = []
  const byName = new Map<string, { plugin: MarkdownPlugin; index: number }>()

  ;(input ?? []).forEach((entry, index) => {
    if (!entry) return
    let plugin: MarkdownPlugin
    try {
      plugin = validatePlugin(entry)
    } catch (error) {
      diagnostics.push(
        createDiagnostic(
          'plugin-invalid',
          error instanceof Error ? error.message : String(error),
          { phase: 'setup' },
        ),
      )
      return
    }

    if (byName.has(plugin.name)) {
      diagnostics.push(
        createDiagnostic(
          'plugin-duplicate',
          `Plugin "${plugin.name}" was registered more than once; the last registration wins.`,
          { severity: 'warning', phase: 'setup', plugin: plugin.name },
        ),
      )
    }
    byName.set(plugin.name, { plugin, index })
  })

  const disabled = new Set(disablePlugins)
  const ordered = [...byName.values()]
    .filter(({ plugin }) => !disabled.has(plugin.name))
    .sort((a, b) => {
      const phase =
        PHASE_ORDER[a.plugin.phase ?? 'normal'] -
        PHASE_ORDER[b.plugin.phase ?? 'normal']
      return phase !== 0 ? phase : a.index - b.index
    })
    .map(({ plugin }) => plugin)

  const resolved: ResolvedPlugins = {
    plugins: ordered,
    names: ordered.map((plugin) => plugin.name),
    diagnostics,
    components: {},
    nodeComponents: {},
    regions: {},
    labels: {},
    tokens: {},
    remarkPlugins: [],
    rehypePlugins: [],
    remarkRehypeOptions: {},
  }

  for (const plugin of ordered) {
    mergeComponents(resolved.components, plugin.components)
    mergeComponents(resolved.nodeComponents, plugin.nodeComponents)
    mergeComponents(
      resolved.regions as Record<string, unknown>,
      plugin.regions as Record<string, unknown> | undefined,
    )
    Object.assign(resolved.labels, plugin.labels)
    Object.assign(resolved.tokens, plugin.tokens)
    if (plugin.remarkPlugins) resolved.remarkPlugins.push(...plugin.remarkPlugins)
    if (plugin.rehypePlugins) resolved.rehypePlugins.push(...plugin.rehypePlugins)
    Object.assign(resolved.remarkRehypeOptions, plugin.remarkRehypeOptions)
  }

  return resolved
}

function mergeComponents(
  target: Record<string, unknown>,
  source: Record<string, unknown> | undefined,
): void {
  if (!source) return
  for (const key of Object.keys(source)) {
    const value = source[key]
    if (value !== undefined) target[key] = value
  }
}
