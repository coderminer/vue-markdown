# Highlighting

Code fences render through `CodeBlock` by default. `VueSyntaxHighlighter` uses
the same adapter contract for standalone snippets.

## Default adapter

`CodeBlock` lazily imports the highlight.js adapter. The adapter registers an
explicit language set (JavaScript, TypeScript, HTML/XML, CSS, JSON, Bash,
Markdown, Python, Go, Rust, SQL, YAML, and related aliases) and highlights
synchronously. A document without code never loads it.

```ts
import { highlightjs } from 'vue-markdown-suite/highlight'
```

## Shiki

The optional Shiki entry preloads its highlighter, themes, and languages. Until
it is ready, source renders as plain text.

```ts
import { shiki } from 'vue-markdown-suite/highlight/shiki'

const highlighter = shiki
```

Install `shiki` as an optional peer before importing that entry.

## Selection

The active adapter resolves as local prop > `MarkdownConfigProvider` > preset >
default. `CodeBlock` and `VueSyntaxHighlighter` expose the resolved identity
through `data-highlighter`, and changing adapters does not re-parse the
document.

```vue
<MarkdownRenderer
  :source="source"
  :highlighter="shiki"
  :preset="docsPreset"
/>
```

A single block can override the provider:

```vue
<CodeBlock :node="node" :highlighter="highlightjs" />
```

## Custom adapters

An adapter is an object with a unique `id` and a `highlight` method that returns
normalized nodes, not an HTML string:

```ts
import type { MarkdownHighlighter } from 'vue-markdown-suite'

export const myHighlighter: MarkdownHighlighter = {
  id: 'my-highlighter',
  load: async () => {
    await loadMyGrammar()
  },
  highlight(code, language) {
    return {
      language,
      nodes: [{ kind: 'text', key: 'code', value: code }],
    }
  },
}
```

Unknown languages, thrown errors, and invalid results fall back to plain source
without breaking the block. Results are cached by adapter identity, source,
language, theme, and options. `mode: 'block'` may be returned when an adapter
supplies its own wrapper.

## Server rendering

On the server, `CodeBlock` renders plain source; highlighting starts after
mount. Shiki and highlight.js never enter the headless, pipeline, or plugins
entries.
