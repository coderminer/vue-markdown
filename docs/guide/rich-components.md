---
description: Standalone CodeBlock, VueSyntaxHighlighter, MermaidBlock, MermaidLiveEditor, and rich math node usage.
---

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useData } from 'vitepress'
import {
  CodeBlock,
  MarkdownConfigProvider,
  MarkdownRenderer,
  MermaidBlock,
  MermaidLiveEditor,
  VueSyntaxHighlighter,
  type CodeBlockAction,
  type MarkdownCodeNode,
} from 'vue-markdown-suite'
import { defaultPlugins } from 'vue-markdown-suite/plugins'
import { mathPlugin } from 'vue-markdown-suite/math'

const { isDark } = useData()
const richTheme = computed(() => (isDark.value ? 'dark' : 'light'))
// Keep plugin instances stable. Do not create them inline in the template.
const plugins = [...defaultPlugins, mathPlugin()]

const code = `interface User {
  id: string
  name: string
}

export function greet(user: User): string {
  return \`Hello, \${user.name}\`
}`

const codeNode: MarkdownCodeNode = {
  kind: 'code',
  key: 'rich-code',
  code,
  language: 'ts',
}

const actions: CodeBlockAction[] = [
  {
    key: 'log',
    label: 'Log source',
    run({ code: value }) {
      console.log(value)
    },
  },
]

const diagram = `flowchart LR
  Markdown --> Pipeline
  Pipeline --> Model
  Model --> Vue`

const editorSource = ref(diagram)

const mathSource = `Inline math such as $E = mc^2$ and a display block:

$$
\\int_0^1 x^2 \\, dx = \\frac{1}{3}
$$`
</script>

# Rich components

The optional rich components are public components, not renderer internals. Use
them standalone, override the renderer's regions, or replace a semantic node
with your own component.

| Component | Default renderer role | Entry |
| --- | --- | --- |
| `CodeBlock` | Fenced code with header, actions, and lazy highlighting | `vue-markdown-suite` |
| `VueSyntaxHighlighter` | Standalone highlighted snippet | `vue-markdown-suite` |
| `MermaidBlock` | Diagram preview with zoom, fullscreen, and export | `vue-markdown-suite` |
| `MermaidLiveEditor` | CodeMirror-backed Mermaid editor | `vue-markdown-suite` |
| `MarkdownMath` | Math node rendered by the configured engine | `vue-markdown-suite` |

Every component is also available through a per-component entry:

```ts
import CodeBlock from 'vue-markdown-suite/components/CodeBlock'
import VueSyntaxHighlighter from 'vue-markdown-suite/components/VueSyntaxHighlighter'
import MermaidBlock from 'vue-markdown-suite/components/MermaidBlock'
```

## CodeBlock

`CodeBlock` is the default fenced-code component. It lazy-loads highlight.js when
no highlighter is configured, renders a copy/download toolbar, and accepts extra
actions.

```vue
<script setup lang="ts">
import { CodeBlock, type CodeBlockAction } from 'vue-markdown-suite'

const actions: CodeBlockAction[] = [
  {
    key: 'log',
    label: 'Log source',
    run({ code }) {
      console.log(code)
    },
  },
]
</script>

<template>
  <CodeBlock :code="code" language="ts" :actions="actions" />
</template>
```

<DemoFrame title="CodeBlock" note="Header, copy/download, and a custom action">
  <MarkdownConfigProvider :theme="richTheme">
    <CodeBlock :node="codeNode" :actions="actions" />
  </MarkdownConfigProvider>
</DemoFrame>

| Prop | Type | Default | Notes |
| --- | --- | --- | --- |
| `node` | `MarkdownCodeNode` | — | Uses the node's `code` and `language`. |
| `code` | `string` | — | Overrides the node source. |
| `language` | `string` | — | Overrides the node language. |
| `highlighter` | `MarkdownHighlighter` | context | Per-block adapter override. |
| `theme` | `MarkdownTheme` | context | Theme override for the block and highlighter. |
| `actions` | `CodeBlockAction[]` | `[]` | Extra toolbar buttons with `key`, `label`, and `run`. |
| `showActions` | `boolean` | `true` | Hides the default copy/download buttons. |
| `showDownload` | `boolean` | `true` | Hides only the default download button. |
| `title` | `string` | — | Replaces the language label in the default header. |
| `fileName` | `string` | — | Shows a file name and uses it for downloads. |
| `lineNumbers` | `boolean` | `false` | Renders a gutter. |
| `highlightLines` | `number[]` | `[]` | 1-based line numbers to emphasize. |
| `maxLines` | `number` | `0` | Truncates and offers an expand control. |
| `virtual` | `boolean` | `false` | Virtualizes after `virtualThreshold`. |
| `virtualThreshold` | `number` | `200` | Line count that enables virtualization. |
| `lineHeight` | `number` | `20` | Row height used by virtualization. |
| `delay` | `number` | `0` | Debounces highlighting in milliseconds. |
| `standalone` | `boolean` | `false` | Ignores `regions.codeBlock`. |
| `ignoreRegion` | `boolean` | `false` | Alias for `standalone`. |

Events: `copy(source)`, `download(source)`, `action(key)`, and `error(diagnostic)`.
Copy failures report `copy-error`; custom action failures report `action-error`;
download failures report `download-error`. All three also emit `error`.
Slots: `code`, `code-actions`, `header`, and `toolbar`. `code` receives
`{ node, source, language, highlighted, nodes, lines, visibleLines, actions }`;
the action slots receive `{ source, language, fileName, title, highlighted,
nodes, actions }`.

```vue
<CodeBlock :code="code" language="ts" file-name="demo.ts">
  <template #header="{ fileName, language, actions }">
    <strong>{{ fileName }}</strong>
    <span>{{ language }}</span>
    <button type="button" @click="actions.copy">Copy</button>
  </template>
</CodeBlock>
```

In the renderer, `components.pre` wraps the block, `components.code` /
`nodeComponents.code` replace the inner element, and `regions.codeBlock` replaces
the whole block. A region may render `CodeBlock` internally; nested code
components automatically ignore the region, and `standalone` / `ignoreRegion`
make that intent explicit.

## Build a custom code block with CodeBlock

A custom code element does not need to reimplement highlighting or copy/
download. Compose the public `CodeBlock` features:

- `node`, `code`, `language`, `title`, and `fileName` inputs
- `theme` and `highlighter` overrides
- `actions` for extra toolbar buttons
- `showActions` / `showDownload` for the default buttons
- line numbers, highlighted lines, truncation, and virtualization
- `#code`, `#code-actions`, `#toolbar`, and `#header` slots
- `copy`, `download`, `action`, and `error` events
- `copy()`, `download()`, `getHighlighted()`, and `highlighted` on the instance

```vue [ReviewCodeBlock.vue]
<script setup lang="ts">
import { ref } from 'vue'
import {
  CodeBlock,
  type CodeBlockAction,
  type HighlightResult,
  type MarkdownDiagnostic,
  type MarkdownHighlighter,
  type MarkdownNode,
  type MarkdownTheme,
} from 'vue-markdown-suite'

withDefaults(
  defineProps<{
    node?: MarkdownNode
    code?: string
    language?: string
    theme?: MarkdownTheme
    highlighter?: MarkdownHighlighter
    actions?: CodeBlockAction[]
    showActions?: boolean
    plain?: boolean
    customToolbar?: boolean
  }>(),
  {
    node: undefined,
    code: undefined,
    language: '',
    theme: undefined,
    highlighter: undefined,
    actions: () => [],
    showActions: true,
    plain: false,
    customToolbar: false,
  },
)

const emit = defineEmits<{
  copy: [source: string]
  download: [source: string]
  action: [key: string]
  error: [diagnostic: MarkdownDiagnostic]
}>()

const block = ref<InstanceType<typeof CodeBlock>>()

function copy() {
  return block.value?.copy()
}

function download() {
  return block.value?.download()
}

function getHighlighted(): HighlightResult | undefined {
  return block.value?.getHighlighted()
}

defineExpose({ copy, download, getHighlighted })
</script>

<template>
  <CodeBlock
    ref="block"
    :node="node"
    :code="code"
    :language="language"
    :theme="theme"
    :highlighter="highlighter"
    :actions="actions"
    :show-actions="showActions"
    @copy="emit('copy', $event)"
    @download="emit('download', $event)"
    @action="emit('action', $event)"
    @error="emit('error', $event)"
  >
    <template #code="{ source }">
      <span v-if="plain" class="review-plain">{{ source }}</span>
    </template>

    <template #code-actions="{ language, actions }">
      <template v-if="customToolbar">
        <button type="button" @click="actions.copy">Copy</button>
        <button type="button" @click="actions.download">Download</button>
        <button type="button" @click="emit('action', 'inspect')">
          Inspect {{ language }}
        </button>
      </template>
    </template>
  </CodeBlock>
</template>
```

<DemoFrame title="ReviewCodeBlock" note="Toggle every CodeBlock feature below">
  <ClientOnly>
    <CodeBlockLab />
  </ClientOnly>
</DemoFrame>

Use the lab to verify:

| Feature | How to see it |
| --- | --- |
| `node` / `code` / `language` | Toggle **Use node prop** and change the language. |
| `theme` | Switch light, dark, auto, and custom. |
| `highlighter` | Switch between highlight.js, an uppercase adapter, and a broken loader. |
| `actions` | Use **Log source** in the toolbar. |
| `showActions` | Hide the default buttons; the custom action remains. |
| `#code` slot | Enable **Use #code slot** for a plain source rendering. The slot also exposes `highlighted`, `nodes`, and `lines`. |
| `#header` / `#toolbar` slots | Replace the title area or only the action area. |
| line options | Pass `line-numbers`, `highlight-lines`, `max-lines`, or `virtual` like the standalone highlighter. |
| `copy` / `download` events | Use either toolbar; the event log records it. |
| `action` event | Trigger **Log source** or the custom toolbar action. |
| `error` event | Select **broken loader**; the warning is logged. |
| exposed methods | Use **copy() via ref**, **download() via ref**, and **inspect highlighted**. |

### Use it in Markdown

`components.pre` is the safe integration point when the wrapper renders
`CodeBlock` internally:

```vue
<script setup lang="ts">
import { MarkdownRenderer } from 'vue-markdown-suite'
import ReviewCodeBlock from './ReviewCodeBlock.vue'

const components = {
  pre: ReviewCodeBlock,
}
</script>

<template>
  <MarkdownRenderer :source="source" :components="components" />
</template>
```

::: tip Wrap vs. replace
`regions.codeBlock` replaces the entire block. A region component may render
`CodeBlock` internally: nested code components automatically ignore the region,
so it cannot recurse. Pass `standalone` (or its alias `ignoreRegion`) when the
intent should be explicit.
:::

## VueSyntaxHighlighter

Use `VueSyntaxHighlighter` when you need a highlighted snippet outside Markdown
rendering. It supports line numbers, highlighted lines, truncation, and
virtualization for long files.

```vue
<script setup lang="ts">
import { VueSyntaxHighlighter } from 'vue-markdown-suite'
</script>

<template>
  <VueSyntaxHighlighter
    :source="code"
    language="ts"
    line-numbers
    :highlight-lines="[1, 5]"
    :max-lines="20"
  />
</template>
```

<DemoFrame title="VueSyntaxHighlighter" note="Line numbers, highlighted lines, and truncation">
  <MarkdownConfigProvider :theme="richTheme">
    <VueSyntaxHighlighter
      :source="code"
      language="ts"
      line-numbers
      :highlight-lines="[1, 5]"
      :max-lines="20"
    />
  </MarkdownConfigProvider>
</DemoFrame>

| Prop | Type | Default | Notes |
| --- | --- | --- | --- |
| `source` | `string` | required | Code source. |
| `language` | `string` | `''` | Language passed to the adapter. |
| `theme` | `MarkdownTheme` | context | Highlight theme override. |
| `highlighter` | `MarkdownHighlighter` | context | Adapter override. |
| `lineNumbers` | `boolean` | `false` | Renders a gutter. |
| `highlightLines` | `number[]` | `[]` | 1-based line numbers to emphasize. |
| `maxLines` | `number` | `0` | Truncates to the first N lines and shows a “Show all lines” control. |
| `virtual` | `boolean` | `false` | Virtualizes after `virtualThreshold`. |
| `virtualThreshold` | `number` | `200` | Line count that enables virtualization. |
| `lineHeight` | `number` | `20` | Row height used by virtualization. Match your CSS line height. |
| `delay` | `number` | `0` | Debounces highlighting in milliseconds. |

Events: `copy(source)` and `error(diagnostic)`.
Slot: `highlighter` receives `{ source, language, nodes, lines, actions }`.
Exposed: `copy()` and `highlighted`.

## MermaidBlock

`MermaidBlock` renders one diagram. It keeps the last good diagram while a new
render is pending, sanitizes SVG, and exposes preview/source tabs.

```vue
<script setup lang="ts">
import { MermaidBlock } from 'vue-markdown-suite'

const diagram = `flowchart LR
  Markdown --> Pipeline
  Pipeline --> Vue`
</script>

<template>
  <MermaidBlock
    :source="diagram"
    show-errors
    @rendered="onRendered"
    @error="onError"
  />
</template>
```

<DemoFrame title="MermaidBlock" note="Sanitized SVG with zoom, fullscreen, and export">
  <ClientOnly>
    <MarkdownConfigProvider :theme="richTheme">
      <MermaidBlock :source="diagram" show-errors />
    </MarkdownConfigProvider>
  </ClientOnly>
</DemoFrame>

| Prop | Type | Default | Notes |
| --- | --- | --- | --- |
| `node` | `MarkdownMermaidNode` | — | Uses the node source. |
| `source` | `string` | — | Overrides the node source. |
| `renderer` | `MermaidRenderer` | context | Per-block renderer override. |
| `theme` | `MarkdownTheme` | context | Theme override for Mermaid and the block shell. |
| `showErrors` | `boolean` | `false` | Shows the detailed error. A lightweight fallback is always shown. |
| `enableZoom` | `boolean` | `true` | Shows zoom controls. |
| `allowFullscreen` | `boolean` | `true` | Allows fullscreen. |
| `compact` | `boolean` | `false` | Hides the block action toolbar for embedded previews. |

Events: `rendered(result)`, `error(message)`, `copy(source)`,
`export('png' | 'svg')`, and `fullscreen(active)`.
Slots: `mermaid` and `mermaid-error`.
Exposed: `render()`, `copy()`, `exportPng()`, `downloadSvg()`, and
`toggleFullscreen()`.

A failed first render always shows a lightweight fallback and keeps the source
tab available. `show-errors` expands the detailed parser or missing-peer
diagnostic. If `mermaid` is not installed, the diagnostic names the optional
peer dependency instead of reporting a generic render failure.

A custom renderer is sanitized and validated. The renderer receives
`(source, { theme, id })` and returns nodes or SVG markup:

```ts
const renderer = {
  id: 'my-renderer',
  async render(source, options) {
    return { svg: await render(source, options) }
  },
}
```

```vue
<MermaidBlock :source="diagram" :renderer="renderer" />
```

## MermaidLiveEditor

`MermaidLiveEditor` combines CodeMirror, a draggable split, diagnostics, and
`MermaidBlock`. It loads CodeMirror only when mounted.

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { MermaidLiveEditor } from 'vue-markdown-suite'

const source = ref(`flowchart LR
  Markdown --> Pipeline
  Pipeline --> Vue`)
</script>

<template>
  <MermaidLiveEditor v-model="source" :debounce="300" />
</template>
```

<DemoFrame title="MermaidLiveEditor" note="CodeMirror editor with a live preview">
  <ClientOnly>
    <MarkdownConfigProvider :theme="richTheme">
      <MermaidLiveEditor v-model="editorSource" :debounce="300" compact />
    </MarkdownConfigProvider>
  </ClientOnly>
</DemoFrame>

| Prop | Type | Default | Notes |
| --- | --- | --- | --- |
| `modelValue` | `string` | `''` | Diagram source. Use `v-model`. |
| `debounce` | `number` | `300` | Preview debounce in milliseconds. |
| `theme` | `MarkdownTheme` | context | Editor and preview theme. |
| `renderer` | `MermaidRenderer` | context | Preview renderer override. |
| `diagnosticsFormatter` | `DiagnosticFormatter` | context | Formats preview errors. |
| `compact` | `boolean` | `false` | Compact toolbar layout. |
| `initialRatio` | `number` | `0.5` | Initial editor pane ratio. |
| `minRatio` | `number` | `0.2` | Minimum editor pane ratio. |

Events: `update:modelValue(value)`, `preview(value)`, and `error(diagnostic)`.
Slots: `editor` and `editor-diagnostics`.
The `editor` slot receives `{ value, update, diagnostics, status, actions }`;
`editor-diagnostics` receives `{ diagnostics, focusLine }`.
Exposed: `focus()`, `refreshPreview()`, `toggleFullscreen()`, and
`getDiagnostics()`.

`compact` hides the preview block's toolbar buttons while keeping the preview
tabs, so the editor's own toolbar is not duplicated.

```vue
<MermaidLiveEditor v-model="source">
  <template #editor="{ value, update }">
    <textarea :value="value" @input="update($event.target.value)" />
  </template>
</MermaidLiveEditor>
```

## MarkdownMath

`MarkdownMath` renders a math node with the configured `mathEngine`. In normal
Markdown rendering, `mathPlugin()` supplies KaTeX-rendered nodes and the exact
TeX source.

```vue
<script setup lang="ts">
import { MarkdownRenderer } from 'vue-markdown-suite'
import { mathPlugin, katexEngine } from 'vue-markdown-suite/math'
import 'vue-markdown-suite/styles/math-full.css'
</script>

<template>
  <MarkdownRenderer
    :source="mathSource"
    :plugins="plugins"
    :math-engine="katexEngine"
  />
</template>
```

`styles/math-full.css` imports KaTeX's stylesheet and the suite's math
container styles. Use `styles/math.css` only when you already import
`katex/dist/katex.min.css` yourself.

<DemoFrame title="MarkdownMath" note="KaTeX output from mathPlugin()">
  <MarkdownConfigProvider :theme="richTheme">
    <MarkdownRenderer
      :source="mathSource"
      :plugins="plugins"
      class="rich-math-demo"
    />
  </MarkdownConfigProvider>
</DemoFrame>

| Prop | Type | Default | Notes |
| --- | --- | --- | --- |
| `node` | `MarkdownMathNode` | — | Uses `tex`, `displayMode`, and `rendered`. |
| `tex` | `string` | — | Overrides the node source. |
| `displayMode` | `boolean` | node value | Block or inline math. |
| `rendered` | `MarkdownNode[]` | node value | Pre-rendered engine output. |
| `error` | `string` | — | Forces the error part. |
| `mathEngine` | `MathEngine` | context | Renders standalone `tex` without a provider. |

Slots: `math` and `math-error`. Replace the node with
`nodeComponents.math` or the `regions`/slots above when you need a custom math
presentation. With no engine and no `rendered` nodes, the block keeps the TeX
readable and reports `math-engine-unavailable` instead of rendering nothing.

## MarkdownMermaid

`MarkdownMermaid` is the semantic node wrapper used by the renderer. It forwards
`node`, `code`, `renderer`, `theme`, `showErrors`, `enableZoom`,
`allowFullscreen`, and `compact` to `MermaidBlock`, and it exposes the same
`render()`, `copy()`, `exportPng()`, `downloadSvg()`, and `toggleFullscreen()`
actions. Use it when you need the semantic wrapper or want to replace
`nodeComponents.mermaid`.

## Renderer integration

```vue
<script setup lang="ts">
import { MarkdownRenderer } from 'vue-markdown-suite'
import { fullPlugins } from 'vue-markdown-suite/plugins'
import { mathPlugin } from 'vue-markdown-suite/math'
import { mermaidPlugin } from 'vue-markdown-suite/mermaid'

// Create plugin instances once, outside the template and outside render.
const plugins = [...fullPlugins, mathPlugin(), mermaidPlugin()]
</script>

<template>
  <MarkdownRenderer
    :source="source"
    :plugins="plugins"
    :regions="{ codeBlock: MyCodeBlock, mermaidBlock: MyMermaid }"
    :node-components="{ code: MyCode, math: MyMath }"
  />
</template>
```

::: tip Keep plugin identities stable
An inline array such as `:plugins="[mathPlugin()]"` creates a new plugin object
on every parent render. Plugin identity is part of the parse memo key, so that
pattern re-parses the document and can rerun `setup`/cleanup. Hoist plugin
instances to module scope or a `setup` constant.
:::

## Next

- [Syntax highlighting](./highlighting.md)
- [Math](./math.md)
- [Mermaid](./mermaid.md)
- [Components reference](../reference/components.md)
