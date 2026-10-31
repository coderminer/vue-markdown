<script setup lang="ts">
import { computed } from 'vue'
import type {
  DiagnosticFormatter,
  MarkdownConfig,
  MarkdownHighlighter,
  MarkdownLabels,
  MarkdownPipeline,
  MarkdownPreset,
  MarkdownSlugger,
  MarkdownTheme,
  MarkdownUrlTransform,
  MathEngine,
  MermaidRenderer,
  PluginInput,
} from '../core/types'
import { mergeMarkdownConfig } from '../core/config'
import { resolvePreset } from '../core/preset'
import type {
  VueMarkdownNodeComponents,
  VueMarkdownRegionComponents,
  VueMarkdownTagComponents,
} from './types'
import { provideMarkdownConfig, useMarkdownConfig } from './config'

defineOptions({ name: 'MarkdownConfigProvider' })

const props = defineProps<{
  theme?: MarkdownTheme
  tokens?: Record<string, string>
  labels?: Partial<MarkdownLabels>
  components?: VueMarkdownTagComponents
  regions?: VueMarkdownRegionComponents
  nodeComponents?: VueMarkdownNodeComponents
  plugins?: PluginInput[]
  pipeline?: MarkdownPipeline
  highlighter?: MarkdownHighlighter
  mathEngine?: MathEngine
  mermaidRenderer?: MermaidRenderer
  diagnosticsFormatter?: DiagnosticFormatter
  slugger?: MarkdownSlugger
  urlTransform?: MarkdownUrlTransform
  config?: MarkdownConfig
  preset?: MarkdownPreset | MarkdownPreset[]
}>()

const parent = useMarkdownConfig()

const own = computed<MarkdownConfig>(() => {
  const preset = resolvePreset(props.preset)
  const local: MarkdownConfig = {
    theme: props.theme,
    tokens: props.tokens,
    labels: props.labels,
    components: props.components,
    regions: props.regions,
    nodeComponents: props.nodeComponents,
    plugins: props.plugins,
    pipeline: props.pipeline,
    highlighter: props.highlighter,
    mathEngine: props.mathEngine,
    mermaidRenderer: props.mermaidRenderer,
    diagnosticsFormatter: props.diagnosticsFormatter,
    slugger: props.slugger,
    urlTransform: props.urlTransform,
  }

  return mergeMarkdownConfig(
    mergeMarkdownConfig(preset, props.config),
    local,
  )
})

const merged = computed(() => mergeMarkdownConfig(parent.value, own.value))

provideMarkdownConfig(merged)
</script>

<template>
  <slot />
</template>
