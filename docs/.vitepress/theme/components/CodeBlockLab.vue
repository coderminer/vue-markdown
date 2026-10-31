<script setup lang="ts">
import { computed, ref } from 'vue'
import {
  type CodeBlockAction,
  type MarkdownCodeNode,
  type MarkdownHighlighter,
  type MarkdownTheme,
} from 'vue-markdown-suite'
import ReviewCodeBlock from './ReviewCodeBlock.vue'

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
    label: 'Log source',
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
      <p class="vmd-code-lab-kicker">CodeBlock feature lab</p>

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
        <span>Language</span>
        <select v-model="language">
          <option value="ts">ts</option>
          <option value="js">js</option>
          <option value="json">json</option>
          <option value="css">css</option>
        </select>
      </label>

      <label>
        <span>Highlighter</span>
        <select v-model="highlighterId">
          <option value="default">default (highlight.js)</option>
          <option value="uppercase">uppercase adapter</option>
          <option value="broken">broken loader</option>
        </select>
      </label>

      <label class="vmd-code-lab-check">
        <input v-model="useNode" type="checkbox" />
        <span>Use node prop</span>
      </label>
      <label class="vmd-code-lab-check">
        <input v-model="showActions" type="checkbox" />
        <span>showActions (default buttons)</span>
      </label>
      <label class="vmd-code-lab-check">
        <input v-model="plain" type="checkbox" />
        <span>Use #code slot (plain)</span>
      </label>
      <label class="vmd-code-lab-check">
        <input v-model="customToolbar" type="checkbox" />
        <span>Use #code-actions slot</span>
      </label>

      <div class="vmd-code-lab-actions">
        <button type="button" class="vmd-code-lab-button" @click="copy">
          copy() via ref
        </button>
        <button type="button" class="vmd-code-lab-button" @click="download">
          download() via ref
        </button>
        <button type="button" class="vmd-code-lab-button" @click="inspectHighlighted">
          inspect highlighted
        </button>
      </div>

      <p class="vmd-code-lab-note">
        The custom action is passed through the <code>actions</code> prop. Toggle
        the default buttons off and the custom action remains.
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
      <span class="vmd-code-lab-kicker">Events</span>
      <span v-if="events.length === 0" class="vmd-code-lab-note">
        Interact with the toolbar or use the ref buttons.
      </span>
      <code v-for="entry in events" :key="entry">{{ entry }}</code>
    </div>
  </div>
</template>
