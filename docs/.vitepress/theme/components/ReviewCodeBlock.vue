<script setup lang="ts">
import { ref } from 'vue'
import {
  CodeBlock,
  type CodeBlockAction,
  type HighlightResult,
  type MarkdownDiagnostic,
  type MarkdownHighlighter,
  type MarkdownNode,
  type MarkdownTheme,
} from '@coderminer/vue-markdown'

withDefaults(
  defineProps<{
    node?: MarkdownNode
    code?: string
    language?: string
    theme?: MarkdownTheme
    highlighter?: MarkdownHighlighter
    actions?: CodeBlockAction[]
    showActions?: boolean
    plain?: boolean
    customToolbar?: boolean
  }>(),
  {
    node: undefined,
    code: undefined,
    language: '',
    theme: undefined,
    highlighter: undefined,
    actions: () => [],
    showActions: true,
    plain: false,
    customToolbar: false,
  },
)

const emit = defineEmits<{
  copy: [source: string]
  download: [source: string]
  action: [key: string]
  error: [diagnostic: MarkdownDiagnostic]
}>()

const block = ref<InstanceType<typeof CodeBlock>>()

function copy(): Promise<void> | undefined {
  return block.value?.copy()
}

function download(): Promise<void> | undefined {
  return block.value?.download()
}

function getHighlighted(): HighlightResult | undefined {
  return block.value?.getHighlighted()
}

defineExpose({ copy, download, getHighlighted })
</script>

<template>
  <CodeBlock
    ref="block"
    :node="node"
    :code="code"
    :language="language"
    :theme="theme"
    :highlighter="highlighter"
    :actions="actions"
    :show-actions="showActions"
    @copy="emit('copy', $event)"
    @download="emit('download', $event)"
    @action="emit('action', $event)"
    @error="emit('error', $event)"
  >
    <template #code="{ source }">
      <span v-if="plain" class="vmd-review-plain">{{ source }}</span>
    </template>

    <template #code-actions="{ language, actions }">
      <template v-if="customToolbar">
        <button
          type="button"
          class="vmd-review-action"
          data-review-action="copy"
          @click="actions.copy"
        >
          Copy
        </button>
        <button
          type="button"
          class="vmd-review-action"
          data-review-action="download"
          @click="actions.download"
        >
          Download
        </button>
        <button
          type="button"
          class="vmd-review-action"
          data-review-action="inspect"
          @click="emit('action', 'inspect')"
        >
          Inspect {{ language }}
        </button>
      </template>
    </template>
  </CodeBlock>
</template>
