---
description: Lazy Mermaid rendering, SVG sanitization, block states, and the live editor.
---

# Mermaid

Mermaid support is lazy and client-only. The runtime is requested only when a
Mermaid block or the live editor renders.

```ts
import { mermaidPlugin, renderMermaid } from '@coderminer/vue-markdown/mermaid'
```

`renderMermaid()` is asynchronous because the Mermaid runtime is loaded lazily
and rendering itself is asynchronous. Await its result before using it as a
diagram source:

```ts
const result = await renderMermaid('graph TD; A-->B')
```

Passing the un-awaited Promise to `MermaidBlock`'s `source` prop (or to
`renderMermaid()` itself) reports a clear error instead of throwing.

`MermaidBlock` is exported from the package root. It renders a deterministic
placeholder during SSR, then loads the runtime after mount.

## Fenced diagrams

Add `mermaidPlugin()` to the renderer plugin set to turn ` ```mermaid ` (and
` ```mmd `) fences into Mermaid nodes:

```vue
<script setup lang="ts">
import { MarkdownRenderer } from '@coderminer/vue-markdown'
import { defaultPlugins } from '@coderminer/vue-markdown/plugins'
import { mermaidPlugin } from '@coderminer/vue-markdown/mermaid'

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

`mermaidPlugin()` reads only the `languages` option. Configure the renderer and
theme on `MarkdownRenderer` with `mermaidRenderer` and `theme`; those are not
plugin arguments.

## Choosing a renderer

Mermaid has one rendering pipeline with three configuration layers. Use the
highest layer only when you need to override the one below:

1. **Built-in runtime (default).** When no renderer is configured,
   `MermaidBlock` calls `renderMermaid()` lazily. This is the normal setup.
2. **App-wide adapter.** Set `mermaidRenderer` on `MarkdownRenderer`,
   `MarkdownConfigProvider`, or a preset. Use this for a different Mermaid
   build, a remote service, or pre-rendered output.
3. **Per-block adapter.** Set `renderer` on `MermaidBlock` or
   `MarkdownMermaid`. It wins over the provider, preset, and built-in runtime.

The precedence is local prop > nearest provider > preset > built-in.
`mermaidPlugin()` is not a renderer: it only converts fenced code into Mermaid
nodes. `renderMermaid()` is the async function behind the built-in runtime, not
a `MermaidRenderer` object. It has no `id`, so do not pass it directly as
`mermaidRenderer` or `renderer`; wrap it when you need an explicit adapter:

```ts
const renderer = {
  id: 'mermaid',
  render: (source, options) => renderMermaid(source, options),
}
```

For most applications, do not configure a renderer at all: add
`mermaidPlugin()`, set the theme, and let the built-in runtime load on demand.

## Runtime lifecycle

The Mermaid runtime is a process-wide singleton. All blocks share one lazy
import, configuration, and render queue. Unmounting a block does not reset or
unload it: the cache holds no per-block state, and another block may still be
rendering. `resetMermaidRuntime()` is for tests or an explicit reinitialization,
not a component lifecycle hook, and it cannot unload the browser's module cache.

<script setup>
import { MermaidBlock } from '@coderminer/vue-markdown'

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
preview block's duplicate toolbar while tightening the diagnostics panel.

```vue
<MermaidLiveEditor v-model="source" theme="dark" :renderer="renderer" compact />
```

The split layout enforces minimum pane sizes, supports keyboard resizing
(ArrowLeft/ArrowRight, Home to reset), and fullscreen with a CSS fallback.
Fullscreen locks page scrolling, contains focus, and restores the previous
scroll and fullscreen state on exit or unmount.
`rawDetails` shows the original parser message next to the friendly diagnostic,
and `autoFocus` focuses the mapped error line. Slots: `toolbar`, `editor`,
`preview`, `editor-diagnostics`, `empty`, and `fullscreen`. The `editor` slot
receives `{ value, update, diagnostics, status, actions }`; `preview` receives
`{ source, status, error, nodes, actions }`; `editor-diagnostics` receives
`{ diagnostics, focusLine }`. An empty source renders the `empty` placeholder
instead of a stale diagram. The optional `./editor` entry exposes the CodeMirror
creation helper.
