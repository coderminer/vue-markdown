# Mermaid

Mermaid support is lazy and client-only. The runtime is requested only when a
Mermaid block or the live editor renders.

```ts
import { renderMermaid } from 'vue-markdown-suite/mermaid'
```

`MermaidBlock` is exported from the package root. It renders a deterministic
placeholder during SSR, then loads the runtime after mount.

## Security and CSP

The runtime uses Mermaid's `securityLevel: 'strict'`. Rendered SVG is parsed and
sanitized before it becomes nodes: scripts, `foreignObject`, event handlers,
external links, and unsafe elements are removed. A host CSP should allow the
Mermaid runtime's script chunk but does not need `unsafe-eval`; Mermaid is not
used during SSR. The sanitized SVG never goes through `v-html`.

## Block behavior

`MermaidBlock` provides preview/source tabs, pending state, last-good retention,
opt-in error display, zoom, fullscreen, copy, SVG download, PNG export, and
retry. It exposes `mermaid` and `mermaid-error` slots and the
`mermaidRenderer` injection point. A custom renderer still has its SVG
sanitized, and an invalid renderer falls back to the default runtime.

```vue
<MermaidBlock :source="diagram" @error="onDiagramError" />
```

## Live editor

`MermaidLiveEditor` binds `v-model`, syncs external values, debounces previews
(300 ms by default), and loads CodeMirror 6 only after mount.

```vue
<MermaidLiveEditor v-model="source" :renderer="renderer" />
```

The split layout enforces minimum pane sizes, supports keyboard resizing
(ArrowLeft/ArrowRight, Home to reset), and fullscreen with a CSS fallback. The
`editor` slot receives `{ value, update, diagnostics, status, actions }`; the
`editor-diagnostics` slot receives `{ diagnostics, focusLine }`. The optional
`./editor` entry exposes the CodeMirror creation helper.
