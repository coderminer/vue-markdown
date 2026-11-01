import {
  computed,
  inject,
  provide,
  type ComputedRef,
  type InjectionKey,
} from 'vue'
import type { MarkdownConfig } from '../core/types'

export const MARKDOWN_CONFIG: InjectionKey<ComputedRef<MarkdownConfig>> = Symbol(
  '@coderminer/vue-markdown:config',
)

/** Read the nearest provider configuration, or an empty configuration. */
export function useMarkdownConfig(): ComputedRef<MarkdownConfig> {
  return inject(MARKDOWN_CONFIG, computed(() => ({})))
}

/** Provide a configuration to descendant renderers and providers. */
export function provideMarkdownConfig(
  config: ComputedRef<MarkdownConfig>,
): void {
  provide(MARKDOWN_CONFIG, config)
}
