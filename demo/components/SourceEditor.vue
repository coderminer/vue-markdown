<script setup lang="ts">
withDefaults(
  defineProps<{
    modelValue: string
    label?: string
    rows?: number
  }>(),
  {
    label: 'Markdown',
    rows: 12,
  },
)

const emit = defineEmits<{ 'update:modelValue': [value: string] }>()

function onInput(event: Event): void {
  emit('update:modelValue', (event.target as HTMLTextAreaElement).value)
}
</script>

<template>
  <label class="demo-editor">
    <span class="demo-editor-label">{{ label }}</span>
    <textarea
      :value="modelValue"
      :rows="rows"
      spellcheck="false"
      @input="onInput"
    />
  </label>
</template>
