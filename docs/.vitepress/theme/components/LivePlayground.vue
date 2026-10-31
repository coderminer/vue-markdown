<script setup lang="ts">
import { computed, ref } from 'vue'
import { useData } from 'vitepress'
import { MarkdownRenderer } from 'vue-markdown-suite'
import { fullPlugins } from 'vue-markdown-suite/plugins'
import { mathPlugin } from 'vue-markdown-suite/math'

const { isDark } = useData()

const samples = {
  Essentials: `# Live playground

Edit the Markdown on the left. The preview uses the same renderer you ship.

## What you get

- **Vue VNodes**, not an HTML string
- Stable heading IDs
- TOC, links, and events
- Lazy syntax highlighting

> Replace any element or keep the semantic defaults.

\`\`\`ts
const answer: number = 42
console.log(answer)
\`\`\`
`,
  GFM: `# GFM support

| Feature | Status |
| --- | --- |
| Tables | ready |
| Task lists | ready |
| Strikethrough | ~~never~~ ready |
| Footnotes | ready[^1] |

- [x] Render Markdown
- [x] Keep it accessible
- [ ] Publish your docs

[^1]: Footnotes are part of the GFM extension set.
`,
  Math: `# Math

Inline math: $E = mc^2$.

Display math:

$$
\\int_0^1 x^2 \\, dx = \\frac{1}{3}
$$

KaTeX renders synchronously and stays accessible.
`,
} as const

type SampleName = keyof typeof samples

const names = Object.keys(samples) as SampleName[]
const active = ref<SampleName>('Essentials')
const source = ref<string>(samples.Essentials)
const showToc = ref(false)
const copied = ref(false)

const plugins = computed(() => [...fullPlugins, mathPlugin()])
const theme = computed(() => (isDark.value ? 'dark' : 'light'))

function useSample(name: SampleName): void {
  active.value = name
  source.value = samples[name]
}

async function copy(): Promise<void> {
  if (typeof navigator === 'undefined' || !navigator.clipboard) return
  await navigator.clipboard.writeText(source.value)
  copied.value = true
  window.setTimeout(() => {
    copied.value = false
  }, 1500)
}

function reset(): void {
  source.value = samples[active.value]
}
</script>

<template>
  <div class="vmd-live">
    <div class="vmd-live-toolbar">
      <div class="vmd-live-toolbar-group">
        <span class="vmd-live-label">Sample</span>
        <button
          v-for="name in names"
          :key="name"
          type="button"
          class="vmd-live-button"
          :class="{ 'is-active': active === name }"
          @click="useSample(name)"
        >
          {{ name }}
        </button>
      </div>
      <div class="vmd-live-toolbar-group">
        <button
          type="button"
          class="vmd-live-button"
          :class="{ 'is-active': showToc }"
          @click="showToc = !showToc"
        >
          TOC
        </button>
        <button type="button" class="vmd-live-button" @click="copy">
          {{ copied ? 'Copied' : 'Copy' }}
        </button>
        <button type="button" class="vmd-live-button" @click="reset">
          Reset
        </button>
      </div>
    </div>

    <div class="vmd-live-body">
      <div class="vmd-live-pane">
        <div class="vmd-live-pane-header">Markdown</div>
        <textarea v-model="source" spellcheck="false" aria-label="Markdown source" />
      </div>
      <div class="vmd-live-pane">
        <div class="vmd-live-pane-header">Preview</div>
        <div class="vmd-live-output">
          <MarkdownRenderer
            :source="source"
            :plugins="plugins"
            :theme="theme"
            :toc="showToc"
            show-error
          />
        </div>
      </div>
    </div>
  </div>
</template>
