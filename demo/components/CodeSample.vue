<script setup lang="ts">
import { onBeforeUnmount, ref } from 'vue'

const props = withDefaults(
  defineProps<{
    code: string
    label?: string
    language?: string
  }>(),
  {
    label: 'Example',
    language: 'vue',
  },
)

const copied = ref(false)
let timer: ReturnType<typeof setTimeout> | undefined

async function copy(): Promise<void> {
  if (typeof navigator === 'undefined' || !navigator.clipboard) return
  await navigator.clipboard.writeText(props.code)
  copied.value = true
  if (timer) clearTimeout(timer)
  timer = setTimeout(() => {
    copied.value = false
  }, 1600)
}

onBeforeUnmount(() => {
  if (timer) clearTimeout(timer)
})
</script>

<template>
  <figure class="demo-code-frame demo-code-sample">
    <figcaption>
      <span>{{ label }}</span>
      <button type="button" class="demo-copy" @click="copy">
        {{ copied ? 'Copied' : 'Copy' }}
      </button>
    </figcaption>
    <pre><code :data-language="language">{{ code }}</code></pre>
  </figure>
</template>
