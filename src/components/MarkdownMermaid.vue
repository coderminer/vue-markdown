<script setup lang="ts">
import { computed, ref } from 'vue'
import type {
  MarkdownNode,
  MarkdownTheme,
  MermaidAction,
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
    actions?: MermaidAction[]
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
    actions: () => [],
  },
)

const emit = defineEmits<{
  rendered: [result: MermaidRenderResult]
  error: [message: string]
  copy: [source: string]
  export: [format: 'png' | 'svg']
  fullscreen: [active: boolean]
  action: [key: string]
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
    :actions="actions"
    @rendered="emit('rendered', $event)"
    @error="emit('error', $event)"
    @copy="emit('copy', $event)"
    @export="emit('export', $event)"
    @fullscreen="emit('fullscreen', $event)"
    @action="emit('action', $event)"
  >
    <template v-if="$slots.header" #header="slotProps">
      <slot name="header" v-bind="slotProps || {}" />
    </template>
    <template v-if="$slots.tabs" #tabs="slotProps">
      <slot name="tabs" v-bind="slotProps || {}" />
    </template>
    <template v-if="$slots.actions" #actions="slotProps">
      <slot name="actions" v-bind="slotProps || {}" />
    </template>
    <template v-if="$slots.mermaid" #mermaid="slotProps">
      <slot name="mermaid" v-bind="slotProps || {}" />
    </template>
    <template v-if="$slots['mermaid-error']" #mermaid-error="slotProps">
      <slot name="mermaid-error" v-bind="slotProps || {}" />
    </template>
  </component>
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
    :actions="actions"
    @rendered="emit('rendered', $event)"
    @error="emit('error', $event)"
    @copy="emit('copy', $event)"
    @export="emit('export', $event)"
    @fullscreen="emit('fullscreen', $event)"
    @action="emit('action', $event)"
  >
    <template v-if="$slots.header" #header="slotProps">
      <slot name="header" v-bind="slotProps || {}" />
    </template>
    <template v-if="$slots.tabs" #tabs="slotProps">
      <slot name="tabs" v-bind="slotProps || {}" />
    </template>
    <template v-if="$slots.actions" #actions="slotProps">
      <slot name="actions" v-bind="slotProps || {}" />
    </template>
    <template v-if="$slots.mermaid" #mermaid="slotProps">
      <slot name="mermaid" v-bind="slotProps || {}" />
    </template>
    <template v-if="$slots['mermaid-error']" #mermaid-error="slotProps">
      <slot name="mermaid-error" v-bind="slotProps || {}" />
    </template>
  </MermaidBlock>
</template>
