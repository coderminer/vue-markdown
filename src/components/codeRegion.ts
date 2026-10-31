import { computed, inject, provide, type ComputedRef } from 'vue'
import type { MarkdownComponentValue } from '../core/types'
import { useMarkdownConfig } from './config'
import { useRenderContext } from './context'

const CODE_REGION_DEPTH = Symbol('vue-markdown-suite:code-region-depth')

export interface UseCodeRegionOptions {
  standalone?: () => boolean
  ignoreRegion?: () => boolean
}

/**
 * Resolve `regions.codeBlock` for a code component.
 *
 * A region that renders `CodeBlock` (or `MarkdownCode`) internally must not
 * re-enter itself. The provider below marks descendants as already inside a
 * code region, so nested code components always render their own default.
 */
export function useCodeBlockRegion(
  options: UseCodeRegionOptions = {},
): ComputedRef<MarkdownComponentValue | undefined> {
  const context = useRenderContext()
  const config = useMarkdownConfig()
  const depth = inject(CODE_REGION_DEPTH, 0)
  provide(CODE_REGION_DEPTH, depth + 1)

  return computed(() => {
    if (depth > 0) return undefined
    if (options.standalone?.() || options.ignoreRegion?.()) return undefined
    return context.regions?.codeBlock ?? config.value.regions?.codeBlock
  })
}
