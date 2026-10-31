# Math

Math ships as an optional entry so KaTeX is not part of the core bundle.

```ts
import { mathPlugin, katexEngine } from 'vue-markdown-suite/math'
import 'vue-markdown-suite/styles/math.css'

const plugins = [mathPlugin()]
```

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
`MarkdownMath` exposes `math` and `math-error` slots. The optional stylesheet
keeps display math readable; without it, TeX still renders as accessible text.

## Server rendering

KaTeX rendering is synchronous and deterministic. Server output includes MathML
and the default KaTeX HTML, and never loads the engine in the headless entry.
