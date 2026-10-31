---
description: mathPlugin, KaTeX, delimiters, macros, and graceful fallbacks.
---

# Math

Math ships as an optional entry so KaTeX is not part of the core bundle.

```ts
import { defaultPlugins } from 'vue-markdown-suite/plugins'
import { mathPlugin, katexEngine } from 'vue-markdown-suite/math'
import 'vue-markdown-suite/styles/math-full.css'

const plugins = [...defaultPlugins, mathPlugin()]
```

`styles/math-full.css` imports `katex/dist/katex.min.css` and
`styles/math.css`, so display math is complete with one import. If you already
load KaTeX's stylesheet, import `vue-markdown-suite/styles/math.css` instead.
Without KaTeX CSS, the MathML fallback can appear twice.

Keep the plugin instance stable. Create it once in module scope or in `setup`,
not inline in a reactive render.

`mathPlugin` composes `remark-math` and `rehype-katex`. Inline `$...$` and
display `$$...$$` are enabled by default. The plugin keeps the exact TeX source
on each math node and passes it to `MarkdownMath`, so a custom engine can
re-render without re-parsing.

## Options

```ts
mathPlugin({
  singleDollarTextMath: true,
  inlineDelimiters: ['\\(', '\\)'],
  displayDelimiters: ['\\[', '\\]'],
  katex: { macros: { '\\RR': '\\mathbb{R}' } },
})
```

Custom delimiters are converted before parsing and never touch fenced or inline
code. Escaped delimiters stay literal. An unmatched delimiter renders as text.

## Engine

`katexEngine` uses `htmlAndMathml`, `throwOnError: false`, `trust: false`, safe
strictness, and a render cache. Invalid TeX produces a `math-error` diagnostic
and a readable fallback.

```ts
import type { MathEngine } from 'vue-markdown-suite'

const engine: MathEngine = {
  id: 'my-engine',
  render(tex, options) {
    return { nodes: [{ kind: 'text', key: 'x', value: tex }] }
  },
}
```

Pass an engine through `mathEngine` locally or from `MarkdownConfigProvider`.
A standalone `MarkdownMath` also accepts its own `mathEngine` prop. It exposes
`math` and `math-error` slots. With neither an engine nor pre-rendered nodes it
keeps the TeX visible and reports `math-engine-unavailable`; the optional
stylesheet keeps display math readable, and without it TeX still renders as
accessible text.

## Server rendering

KaTeX rendering is synchronous and deterministic. Server output includes MathML
and the default KaTeX HTML, and never loads the engine in the headless entry.
