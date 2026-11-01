<script setup lang="ts">
import { computed, defineComponent, h, ref } from 'vue'
import {
  MarkdownRenderer,
  type MarkdownNodeRenderContext,
  type MarkdownTheme,
} from '@coderminer/vue-markdown'

const props = withDefaults(defineProps<{ locale?: 'en' | 'zh' }>(), {
  locale: 'en',
})

const text = computed(() =>
  props.locale === 'zh'
    ? {
        kicker: '定制实验室',
        theme: '主题',
        accent: '强调色令牌',
        toggleHeading: 'h1 → h2',
        badgeLinks: '徽章链接',
        callout: 'Callout 引用块',
        skin: '作用域 CSS 皮肤',
        note: '预览就是真实渲染器。切换任意一层，观察它影响的范围。',
        calloutTitle: '自定义引用块',
      }
    : {
        kicker: 'Customization lab',
        theme: 'Theme',
        accent: 'Accent token',
        toggleHeading: 'h1 → h2',
        badgeLinks: 'Badge links',
        callout: 'Callout blockquotes',
        skin: 'Scoped CSS skin',
        note: 'The preview is the real renderer. Toggle a layer to see its surface.',
        calloutTitle: 'Custom blockquote',
      },
)

const source = ref(
  props.locale === 'zh'
    ? `# 自定义元素

一段带 [链接](https://example.com) 和 **加粗文字** 的文字。

> 引用块可以替换默认的 blockquote 渲染。

- 列表保留语义
- 代码块会懒加载高亮器

\`\`\`ts
const answer = 42
\`\`\`
`
    : `# Custom elements

A paragraph with a [link](https://example.com) and **strong text**.

> A callout can replace the default blockquote rendering.

- Lists keep their semantics
- Code blocks lazy-load the highlighter

\`\`\`ts
const answer = 42
\`\`\`
`,
)

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
        h('strong', { class: 'vmd-callout-title' }, text.value.calloutTitle),
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
      <p class="vmd-lab-kicker">{{ text.kicker }}</p>

      <label>
        <span>{{ text.theme }}</span>
        <select v-model="theme">
          <option value="light">light</option>
          <option value="dark">dark</option>
          <option value="auto">auto</option>
          <option value="custom">custom</option>
        </select>
      </label>

      <label>
        <span>{{ text.accent }}</span>
        <input v-model="accent" type="color" />
      </label>

      <label class="vmd-lab-check">
        <input v-model="overrideHeading" type="checkbox" />
        <span>{{ text.toggleHeading }}</span>
      </label>

      <label class="vmd-lab-check">
        <input v-model="decorateLinks" type="checkbox" />
        <span>{{ text.badgeLinks }}</span>
      </label>

      <label class="vmd-lab-check">
        <input v-model="customCallout" type="checkbox" />
        <span>{{ text.callout }}</span>
      </label>

      <label class="vmd-lab-check">
        <input v-model="cssSkin" type="checkbox" />
        <span>{{ text.skin }}</span>
      </label>

      <p class="vmd-lab-note">
        {{ text.note }}
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
