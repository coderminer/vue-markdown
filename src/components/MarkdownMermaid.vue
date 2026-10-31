<script setup lang="ts">
import { computed, ref } from 'vue'
import type {
  MarkdownNode,
  MarkdownTheme,
  MermaidRenderResult,
  MermaidRenderer,
} from '../core/types'
import { useRenderContext } from './context'
import MermaidBlock from './MermaidBlock.vue'

const props = withDefaults(
  defineProps<{
    node?: MarkdownNode
    code?: string
    renderer?: MermaidRenderer
    theme?: MarkdownTheme
    showErrors?: boolean
    enableZoom?: boolean
    allowFullscreen?: boolean
    compact?: boolean
  }>(),
  {
    node: undefined,
    code: undefined,
    renderer: undefined,
    theme: undefined,
    showErrors: false,
    enableZoom: true,
    allowFullscreen: true,
    compact: false,
  },
)

const emit = defineEmits<{
  rendered: [result: MermaidRenderResult]
  error: [message: string]
  copy: [source: string]
  export: [format: 'png' | 'svg']
  fullscreen: [active: boolean]
}>()

const context = useRenderContext()
const block = ref<InstanceType<typeof MermaidBlock>>()
const source = computed(() =>
  props.code ?? (props.node?.kind === 'mermaid' ? props.node.code : ''),
)
const region = computed(() => context.regions?.mermaidBlock)

function render(): Promise<void> | undefined {
  return block.value?.render()
}

function copy(): Promise<void> | undefined {
  return block.value?.copy()
}

function exportPng(): Promise<void> | undefined {
  return block.value?.exportPng()
}

function downloadSvg(): void {
  block.value?.downloadSvg()
}

function toggleFullscreen(): Promise<void> | undefined {
  return block.value?.toggleFullscreen()
}

defineExpose({
  render,
  copy,
  exportPng,
  downloadSvg,
  toggleFullscreen,
})
</script>

<template>
  <component
    :is="region"
    v-if="region"
    :node="node"
    :source="source"
    :renderer="renderer"
    :theme="theme"
    :show-errors="showErrors"
    :enable-zoom="enableZoom"
    :allow-fullscreen="allowFullscreen"
    :compact="compact"
    @rendered="emit('rendered', $event)"
    @error="emit('error', $event)"
    @copy="emit('copy', $event)"
    @export="emit('export', $event)"
    @fullscreen="emit('fullscreen', $event)"
  />
  <MermaidBlock
    v-else
    ref="block"
    :node="node"
    :source="source"
    :renderer="renderer"
    :theme="theme"
    :show-errors="showErrors"
    :enable-zoom="enableZoom"
    :allow-fullscreen="allowFullscreen"
    :compact="compact"
    @rendered="emit('rendered', $event)"
    @error="emit('error', $event)"
    @copy="emit('copy', $event)"
    @export="emit('export', $event)"
    @fullscreen="emit('fullscreen', $event)"
  />
</template>
