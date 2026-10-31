<script setup lang="ts">
import { computed, defineComponent, h, ref } from 'vue'
import {
  MarkdownRenderer,
  type MarkdownNodeRenderContext,
  type MarkdownTheme,
} from 'vue-markdown-suite'

const source = ref(`# Custom elements

A paragraph with a [link](https://example.com) and **strong text**.

> A callout can replace the default blockquote rendering.

- Lists keep their semantics
- Code blocks lazy-load the highlighter

\`\`\`ts
const answer = 42
\`\`\`
`)

const theme = ref<MarkdownTheme>('auto')
const accent = ref('#7c3aed')
const overrideHeading = ref(true)
const decorateLinks = ref(true)
const customCallout = ref(true)
const cssSkin = ref(false)

const BadgeLink = defineComponent({
  props: { href: String },
  setup(props, { slots }) {
    return () =>
      h('a', { href: props.href, class: 'vmd-badge-link' }, [
        h('span', { class: 'vmd-badge' }, 'link'),
        slots.default?.(),
      ])
  },
})

const Callout = defineComponent({
  setup(_, { slots }) {
    return () =>
      h('aside', { class: 'vmd-callout' }, [
        h('strong', { class: 'vmd-callout-title' }, 'Custom blockquote'),
        h('div', slots.default?.()),
      ])
  },
})

const components = computed(() => ({
  ...(overrideHeading.value ? { h1: 'h2' } : {}),
  ...(decorateLinks.value ? { a: BadgeLink } : {}),
}))

const nodeComponents = computed(() =>
  customCallout.value
    ? {
        blockquote: (ctx: MarkdownNodeRenderContext) =>
          h(Callout, null, { default: () => ctx.defaultRender() }),
      }
    : {},
)

const tokens = computed(() => ({
  '--vmd-color-accent': accent.value,
}))
</script>

<template>
  <div class="vmd-lab">
    <aside class="vmd-lab-controls">
      <p class="vmd-lab-kicker">Customization lab</p>

      <label>
        <span>Theme</span>
        <select v-model="theme">
          <option value="light">light</option>
          <option value="dark">dark</option>
          <option value="auto">auto</option>
          <option value="custom">custom</option>
        </select>
      </label>

      <label>
        <span>Accent token</span>
        <input v-model="accent" type="color" />
      </label>

      <label class="vmd-lab-check">
        <input v-model="overrideHeading" type="checkbox" />
        <span>h1 → h2</span>
      </label>

      <label class="vmd-lab-check">
        <input v-model="decorateLinks" type="checkbox" />
        <span>Badge links</span>
      </label>

      <label class="vmd-lab-check">
        <input v-model="customCallout" type="checkbox" />
        <span>Callout blockquotes</span>
      </label>

      <label class="vmd-lab-check">
        <input v-model="cssSkin" type="checkbox" />
        <span>Scoped CSS skin</span>
      </label>

      <p class="vmd-lab-note">
        The preview is the real renderer. Toggle a layer to see its surface.
      </p>
    </aside>

    <div class="vmd-lab-preview" :class="{ 'vmd-lab-skin': cssSkin }">
      <MarkdownRenderer
        :source="source"
        :theme="theme"
        :tokens="tokens"
        :components="components"
        :node-components="nodeComponents"
        toc
      />
    </div>
  </div>
</template>
