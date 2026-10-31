<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { MarkdownNode } from '../core/types'
import { useRenderContext } from './context'

const props = defineProps<{
  node: MarkdownNode
  children?: MarkdownNode[]
  checked?: boolean
  disabled?: boolean
}>()

const context = useRenderContext()
const checked = ref(Boolean(props.checked))

watch(
  () => props.checked,
  (value) => {
    checked.value = Boolean(value)
  },
)

const state = computed(() => (checked.value ? 'checked' : 'unchecked'))

function onChange(event: Event): void {
  checked.value = (event.target as HTMLInputElement).checked
  context.onTaskChange({ checked: checked.value, node: props.node })
}
</script>

<template>
  <li
    data-vmd-part="task-item"
    class="vmd-task-item"
    :data-state="state"
    :class="{ 'vmd-list-item': true }"
  >
    <input
      type="checkbox"
      data-vmd-part="task-checkbox"
      class="vmd-task-checkbox"
      :checked="checked"
      :disabled="disabled"
      @change="onChange"
    />
    <span class="vmd-task-content"><slot /></span>
  </li>
</template>
