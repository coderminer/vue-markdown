---
description: Lazy Mermaid rendering, SVG sanitization, block states, and the live editor.
---

# Mermaid

Mermaid support is lazy and client-only. The runtime is requested only when a
Mermaid block or the live editor renders.

```ts
import { mermaidPlugin, renderMermaid } from 'vue-markdown-suite/mermaid'
```

`MermaidBlock` is exported from the package root. It renders a deterministic
placeholder during SSR, then loads the runtime after mount.

## Fenced diagrams

Add `mermaidPlugin()` to the renderer plugin set to turn ` ```mermaid ` (and
` ```mmd `) fences into Mermaid nodes:

```vue
<script setup lang="ts">
import { MarkdownRenderer } from 'vue-markdown-suite'
import { defaultPlugins } from 'vue-markdown-suite/plugins'
import { mermaidPlugin } from 'vue-markdown-suite/mermaid'

const plugins = [...defaultPlugins, mermaidPlugin()]
</script>

<template>
  <MarkdownRenderer :source="source" :plugins="plugins" />
</template>
```

The plugin is opt-in because Mermaid is an optional peer. Without it, a Mermaid
fence stays a normal code block. Without the `mermaid` package or a custom
renderer, the block keeps the source available and reports a
`mermaid-unavailable` diagnostic instead of collapsing to an empty region.

<script setup>
import { MermaidBlock } from 'vue-markdown-suite'

const diagram = `flowchart LR
  Markdown --> Pipeline
  Pipeline --> Model
  Model --> Vue
  Model --> Search
  Model --> Export`
</script>

<ClientOnly>
  <MermaidBlock :source="diagram" />
</ClientOnly>

## Security and CSP

The runtime uses Mermaid's `securityLevel: 'strict'` and `htmlLabels: false`, so
diagram labels are emitted as SVG `<text>`/`<tspan>` instead of HTML inside
`foreignObject`. Rendered SVG is parsed and sanitized before it becomes nodes:
scripts, event handlers, external links, and unsafe elements are removed. When
SVG markup is sanitized, any remaining `foreignObject` label text is converted
to SVG text; node output from an injected renderer drops `foreignObject`
elements instead.

Mermaid's generated theme stylesheet is preserved as a scoped `<style>` element
so node fills, strokes, fonts, and marker styling keep working. The stylesheet
is kept only when the root SVG has an id and every rule selector is prefixed by
that id (descendant and child combinators are allowed; sibling combinators and
unscoped selectors reject the element). External CSS imports and URLs plus
active CSS constructs are stripped. SVG element and attribute casing is
normalized before rendering, so `linearGradient`, `viewBox`, `stroke-width`,
`marker-end`, and `aria-*` attributes survive.

A host CSP should allow the Mermaid runtime's script chunk and permit the
sanitized `<style>` element, for example with `style-src 'unsafe-inline'` (a
nonce- or hash-only `style-src` blocks it, and the diagram renders without its
theme stylesheet). The runtime does not need `unsafe-eval`; Mermaid is not used
during SSR. The sanitized SVG never goes through `v-html`.

## Block behavior

`MermaidBlock` provides preview/source tabs, pending state, last-good retention,
opt-in error display, zoom, fullscreen, copy, SVG download, PNG export, and
retry. A failed first render always shows a lightweight fallback; `showErrors`
expands the detailed diagnostic. `theme` overrides the Mermaid theme and the
block's `data-vmd-theme`, and `compact` hides its toolbar for embedded previews.

It exposes `mermaid` and `mermaid-error` slots and the `mermaidRenderer`
injection point. A custom renderer still has its SVG and node output sanitized,
and invalid renderer output is reported while the last good preview is retained.

```vue
<MermaidBlock :source="diagram" theme="dark" show-errors @error="onDiagramError" />
```

## Live editor

`MermaidLiveEditor` binds `v-model`, syncs external values, debounces previews
(300 ms by default), and loads CodeMirror 6 only after mount. Its `theme` applies
to both CodeMirror and the `MermaidBlock` preview, and `compact` hides the
preview block's duplicate toolbar.

```vue
<MermaidLiveEditor v-model="source" theme="dark" :renderer="renderer" compact />
```

The split layout enforces minimum pane sizes, supports keyboard resizing
(ArrowLeft/ArrowRight, Home to reset), and fullscreen with a CSS fallback. The
`editor` slot receives `{ value, update, diagnostics, status, actions }`; the
`editor-diagnostics` slot receives `{ diagnostics, focusLine }`. The optional
`./editor` entry exposes the CodeMirror creation helper.
