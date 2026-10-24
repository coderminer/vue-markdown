<script setup lang="ts">
import { computed, type CSSProperties } from 'vue'
import type { TocItem } from '../core/types'

const props = withDefaults(
  defineProps<{ item: TocItem; active?: boolean }>(),
  { active: false },
)

defineEmits<{ navigate: [id: string] }>()

const style = computed(
  () => ({ '--vmd-toc-depth': String(props.item.level) }) as CSSProperties,
)
</script>

<template>
  <li class="vmd-toc-entry">
    <a
      data-vmd-part="toc-item"
      class="vmd-toc-item"
      :href="`#${item.id}`"
      :aria-current="active ? 'true' : undefined"
      :style="style"
      @click.prevent="$emit('navigate', item.id)"
    >{{ item.text }}</a>
  </li>
</template>
