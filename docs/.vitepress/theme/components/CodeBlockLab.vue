<script setup lang="ts">
import { computed, ref } from 'vue'
import {
  type CodeBlockAction,
  type MarkdownCodeNode,
  type MarkdownHighlighter,
  type MarkdownTheme,
} from 'vue-markdown-suite'
import ReviewCodeBlock from './ReviewCodeBlock.vue'

const props = withDefaults(defineProps<{ locale?: 'en' | 'zh' }>(), {
  locale: 'en',
})

const text = computed(() =>
  props.locale === 'zh'
    ? {
        kicker: 'CodeBlock 功能实验室',
        theme: '主题',
        language: '语言',
        highlighter: '高亮器',
        useNode: '使用 node 属性',
        showActions: 'showActions（默认按钮）',
        plain: '使用 #code 插槽（纯文本）',
        customToolbar: '使用 #code-actions 插槽',
        copyRef: '通过 ref 调用 copy()',
        downloadRef: '通过 ref 调用 download()',
        inspect: '检查高亮结果',
        defaultHighlighter: 'default (highlight.js)',
        uppercaseAdapter: '大写适配器',
        brokenLoader: '故障加载器',
        note: '自定义操作通过 actions 属性传入。关闭默认按钮后，自定义操作仍然保留。',
        events: '事件',
        empty: '操作工具栏或使用 ref 按钮。',
        logSource: '打印源码',
      }
    : {
        kicker: 'CodeBlock feature lab',
        theme: 'Theme',
        language: 'Language',
        highlighter: 'Highlighter',
        useNode: 'Use node prop',
        showActions: 'showActions (default buttons)',
        plain: 'Use #code slot (plain)',
        customToolbar: 'Use #code-actions slot',
        copyRef: 'copy() via ref',
        downloadRef: 'download() via ref',
        inspect: 'inspect highlighted',
        defaultHighlighter: 'default (highlight.js)',
        uppercaseAdapter: 'uppercase adapter',
        brokenLoader: 'broken loader',
        note: 'The custom action is passed through the actions prop. Toggle the default buttons off and the custom action remains.',
        events: 'Events',
        empty: 'Interact with the toolbar or use the ref buttons.',
        logSource: 'Log source',
      },
)

const code = ref(`interface User {
  id: string
  name: string
}

export function greet(user: User): string {
  return \`Hello, \${user.name}\`
}`)

const language = ref('ts')
const theme = ref<MarkdownTheme>('auto')
const useNode = ref(false)
const showActions = ref(true)
const plain = ref(false)
const customToolbar = ref(false)
const highlighterId = ref<'default' | 'uppercase' | 'broken'>('default')
const events = ref<string[]>([])

const review = ref<InstanceType<typeof ReviewCodeBlock>>()

const node = computed<MarkdownCodeNode>(() => ({
  kind: 'code',
  key: 'review-code',
  code: code.value,
  language: language.value,
}))

const uppercaseHighlighter: MarkdownHighlighter = {
  id: 'uppercase-demo',
  highlight(value, language) {
    return {
      language,
      nodes: [{ kind: 'text', key: 'uppercase', value: value.toUpperCase() }],
    }
  },
}

const brokenHighlighter: MarkdownHighlighter = {
  id: 'broken-loader',
  async load() {
    throw new Error('Demo grammar is intentionally unavailable')
  },
  highlight(value, language) {
    return {
      language,
      nodes: [{ kind: 'text', key: 'plain', value }],
    }
  },
}

const highlighter = computed(() => {
  if (highlighterId.value === 'uppercase') return uppercaseHighlighter
  if (highlighterId.value === 'broken') return brokenHighlighter
  return undefined
})

const actions: CodeBlockAction[] = [
  {
    key: 'log',
    label: text.value.logSource,
    run({ code: value }) {
      log('action:log', `${value.length} characters`)
    },
  },
]

function log(name: string, detail = ''): void {
  const entry = detail ? `${name}: ${detail}` : name
  events.value = [entry, ...events.value].slice(0, 8)
}

function copy(): void {
  void review.value?.copy()
}

function download(): void {
  void review.value?.download()
}

function inspectHighlighted(): void {
  const highlighted = review.value?.getHighlighted()
  log(
    'highlighted',
    highlighted
      ? `${highlighted.language || 'text'} / ${highlighted.nodes.length} nodes`
      : 'not ready',
  )
}
</script>

<template>
  <div class="vmd-code-lab">
    <aside class="vmd-code-lab-controls">
      <p class="vmd-code-lab-kicker">{{ text.kicker }}</p>

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
        <span>{{ text.language }}</span>
        <select v-model="language">
          <option value="ts">ts</option>
          <option value="js">js</option>
          <option value="json">json</option>
          <option value="css">css</option>
        </select>
      </label>

      <label>
        <span>{{ text.highlighter }}</span>
        <select v-model="highlighterId">
          <option value="default">{{ text.defaultHighlighter }}</option>
          <option value="uppercase">{{ text.uppercaseAdapter }}</option>
          <option value="broken">{{ text.brokenLoader }}</option>
        </select>
      </label>

      <label class="vmd-code-lab-check">
        <input v-model="useNode" type="checkbox" />
        <span>{{ text.useNode }}</span>
      </label>
      <label class="vmd-code-lab-check">
        <input v-model="showActions" type="checkbox" />
        <span>{{ text.showActions }}</span>
      </label>
      <label class="vmd-code-lab-check">
        <input v-model="plain" type="checkbox" />
        <span>{{ text.plain }}</span>
      </label>
      <label class="vmd-code-lab-check">
        <input v-model="customToolbar" type="checkbox" />
        <span>{{ text.customToolbar }}</span>
      </label>

      <div class="vmd-code-lab-actions">
        <button type="button" class="vmd-code-lab-button" @click="copy">
          {{ text.copyRef }}
        </button>
        <button type="button" class="vmd-code-lab-button" @click="download">
          {{ text.downloadRef }}
        </button>
        <button type="button" class="vmd-code-lab-button" @click="inspectHighlighted">
          {{ text.inspect }}
        </button>
      </div>

      <p class="vmd-code-lab-note">
        {{ text.note }}
      </p>
    </aside>

    <div class="vmd-code-lab-preview">
      <ReviewCodeBlock
        ref="review"
        :node="useNode ? node : undefined"
        :code="useNode ? undefined : code"
        :language="useNode ? undefined : language"
        :theme="theme"
        :highlighter="highlighter"
        :actions="actions"
        :show-actions="showActions"
        :plain="plain"
        :custom-toolbar="customToolbar"
        @copy="log('copy')"
        @download="log('download')"
        @action="log(`action:${$event}`)"
        @error="log('error', $event.message)"
      />
    </div>

    <div class="vmd-code-lab-events">
      <span class="vmd-code-lab-kicker">{{ text.events }}</span>
      <span v-if="events.length === 0" class="vmd-code-lab-note">
        {{ text.empty }}
      </span>
      <code v-for="entry in events" :key="entry">{{ entry }}</code>
    </div>
  </div>
</template>
