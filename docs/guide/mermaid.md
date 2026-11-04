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
import { mermaidPlugin } from '@coderminer/vue-markdown/mermaid/plugin'

const plugins = [...defaultPlugins, mermaidPlugin()]
</script>

<template>
  <MarkdownRenderer :source="source" :plugins="plugins" />
</template>
```

Import the plugin from `@coderminer/vue-markdown/mermaid/plugin` when you only
need the transform; that entry exports only the plugin and its built-in
component. Use `@coderminer/vue-markdown/mermaid` when you also need
`renderMermaid`, `resetMermaidRuntime`, or `MERMAID_ALLOWED_TAGS`. The
synchronous `sanitizeSvg` lives in
`@coderminer/vue-markdown/mermaid/sanitize-svg`; the Mermaid runtime sanitizes
lazily and does not statically load the HTML parser.

The plugin is opt-in because Mermaid is an optional peer. It also registers the
built-in `MarkdownMermaid` component, so the base renderer does not import the
Mermaid runtime or the SVG parser until the plugin is present. A custom plugin
that emits `mermaid` nodes without `mermaidPlugin()` should register
`nodeComponents.mermaid` itself; otherwise the node falls back to a code block.
Without the plugin, a Mermaid fence stays a normal code block. Without the
`mermaid` package or a custom renderer, the block keeps the source available and
reports a `mermaid-unavailable` diagnostic instead of collapsing to an empty
region.

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

Renders are serialized, because Mermaid keeps process-wide configuration and
generated ids, so two blocks never render at the same time. Each render measures
inside one reusable offscreen host instead of letting Mermaid append its
temporary `dvmd-mermaid-*` element to the end of `document.body`. That element
therefore never enters page flow, which is what caused the document to jump
while diagrams rendered.

A block that is far outside the viewport defers its first render until it comes
within 400 px of the viewport. A long document therefore does not pay the parse,
sanitize, and node-building cost for diagrams the reader has not reached yet,
and `rendered` fires when that deferred render actually finishes. Deferral is
skipped when `IntersectionObserver` is unavailable or the block has no layout
box, so headless and server-rendered shells still render eagerly.

Deferral is abandoned when printing starts: `beforeprint`, or the print media
query where that event is unavailable, renders the pending diagrams. Because
rendering stays asynchronous, a print, PDF, or full-page screenshot pipeline
that snapshots immediately after load should disable deferral and wait for the
rendered result before capturing. Set `deferRendering` on `MermaidBlock` or
`MarkdownMermaid`, or `mermaidDeferRendering` on `MarkdownRenderer` and
`MarkdownConfigProvider`; listen to `rendered` on the block or `mermaid-rendered`
on `MarkdownRenderer`.

Diagram nodes use content-derived keys, so editing one block does not remount
the diagrams after it. Identical diagrams inside one sibling list still need
distinct keys, so each gets an occurrence suffix; editing one of two identical
diagrams changes the suffix of the remaining duplicate and re-renders it once.
The output is unchanged, but avoid relying on byte-identical duplicates when
that extra render matters.

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
unscoped selectors reject the element). Rules that target the root SVG keep only
presentation declarations, and descendant rules drop layout declarations
(`position`, `inset`, `top`/`left`/`right`/`bottom`, `z-index`, `overflow`), so
a diagram stylesheet cannot turn the SVG into a full-page overlay. External CSS
imports and URLs plus active CSS constructs are removed. Presentation
attributes that accept `<url>` values (`fill`, `stroke`, `filter`, `mask`,
`clip-path`, marker attributes, `cursor`) keep only same-document fragment
references. SVG element and attribute casing is normalized before rendering, so
`linearGradient`, `viewBox`, `stroke-width`, `marker-end`, and `aria-*`
attributes survive.

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
Set `:defer-rendering="false"` to render every diagram on mount, which is the
safe choice for print, PDF, and screenshot pipelines.

The pending state reserves one diagram's worth of height through
`--vmd-mermaid-min-height` (12rem by default), so the first render does not push
the following content down. Later updates keep the last good preview in place
and never change the block height.

A diagram renders at the intrinsic pixel width Mermaid reports, capped at the
preview width. Small diagrams therefore keep their natural size instead of
stretching to the block, and wide diagrams shrink to fit instead of overflowing.

Zoom runs from 0.25x to 4x. Whenever the diagram overflows the preview, either
because it is zoomed past the preview bounds or because a host caps the preview
size, drag inside the preview to pan, or focus it and use the arrow keys
(`Shift` moves further). Panning is not offered while the diagram fits, so text
selection and ordinary pointer interaction stay untouched. Pan and zoom reset on
re-render, retry, theme or renderer change, source update, and when returning
from the source tab.

PNG export rasterizes the diagram at three times its intrinsic size, so exported
labels and lines stay crisp instead of upscaling a one-pixel-density bitmap.
Diagrams that are already large are downscaled to stay within an 8192 px longest
edge and a 16-megapixel bitmap, so a canvas dimension or area limit cannot fail
the export. SVG download keeps the vector source.

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
