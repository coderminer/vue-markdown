<script setup lang="ts">
import type { MarkdownDiagnostic } from '../core/types'

withDefaults(
  defineProps<{
    diagnostics?: MarkdownDiagnostic[]
    label?: string
  }>(),
  {
    diagnostics: () => [],
    label: 'The Markdown document could not be rendered.',
  },
)
</script>

<template>
  <div data-vmd-part="error" class="vmd-error" role="alert">
    <p>{{ label }}</p>
    <ul v-if="diagnostics.length > 0">
      <li v-for="(diagnostic, index) in diagnostics" :key="`${diagnostic.code}-${index}`">
        {{ diagnostic.message }}
      </li>
    </ul>
  </div>
</template>
