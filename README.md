# vue-markdown-suite

A general-purpose, customizable, plugin-driven Vue 3 Markdown component suite.

`vue-markdown-suite` is a Vue-native Markdown renderer built on the official
`unified` pipeline (`remark-parse` + `remark-rehype`). It renders Markdown
directly into Vue VNodes — there is no HTML string round-trip — and exposes a
serializable, DOM-free document model so the same parse can drive a styled
renderer, a headless host, or static HTML export.

- **Vue-native** — `shallowRef` documents, stable keys, a text fast path, and
  parse memoization keep re-renders cheap.
- **Customizable** — every Markdown tag can be replaced with another tag name or
  a Vue component. Visual parts are addressable through `data-vmd-part` and
  stable `vmd-*` classes.
- **Plugin-driven** — plugins contribute remark/rehype plugins, document
  transforms, components, labels, tokens, and lifecycle hooks.
- **Safe by default** — raw HTML is dropped, URLs are validated, and the
  sanitizer runs immediately after `rehype-raw` when the host opts in.
- **SSR-ready** — deterministic heading IDs, a synchronous path, and a static
  HTML export helper.

## Requirements

- Node 20+
- Vue 3.5+

## Install

```bash
npm install vue-markdown-suite
```

## Quick start

```vue
<script setup lang="ts">
import { MarkdownRenderer } from 'vue-markdown-suite'
import 'vue-markdown-suite/style.css'

const source = '# Hello\n\nA **bold** paragraph with a [link](https://example.com).'
</script>

<template>
  <MarkdownRenderer :source="source" toc />
</template>
```

The stylesheet is optional. Every component is semantic and works unstyled.

## Browser support

Runtime JavaScript follows Vue 3's baseline: native ES2016, no IE11. The
built library supports Chrome 54+, Edge 15+, Firefox 52+, Safari 10.1+, and
iOS 10.3+; Chrome 54 rather than 52 is required because a bundled dependency
uses `Object.entries` during module initialization. Source may use newer syntax
such as optional chaining, nullish coalescing, class fields, and async/await:
Vite downlevels it to `es2016` at build time. Runtime APIs must stay within
ES2016 because the build does not polyfill them. Browser-only APIs are guarded
and degrade gracefully during SSR.

The optional stylesheet targets the same browser baseline. It keeps logical
properties, `:focus-visible`, `position: sticky`, and `text-align: start` as
progressive enhancement while shipping physical-property, `:focus`,
`-webkit-sticky`, and `text-align: left` fallbacks. `prefers-color-scheme`,
`text-underline-offset`, and `forced-colors` remain enhancements in browsers
that support them. Unstyled and headless usage follows the runtime baseline, and
the demo stylesheet is not part of the published support claim.

## Entry points

| Entry | Contents |
| --- | --- |
| `vue-markdown-suite` | Renderer, preset components, composables, core helpers |
| `vue-markdown-suite/headless` | Types, model helpers, composables; no preset components or CSS |
| `vue-markdown-suite/pipeline` | Official pipeline, custom pipeline validation, identity |
| `vue-markdown-suite/plugins` | `defineMarkdownPlugin`, registry, built-in plugins |
| `vue-markdown-suite/presets` | `defineMarkdownPreset`, `composePresets`, configuration types |
| `vue-markdown-suite/node-components` | The node component catalog only |
| `vue-markdown-suite/components/*` | One entry per public component |
| `vue-markdown-suite/style.css` | Full stylesheet |
| `vue-markdown-suite/styles/tokens.css` | Design tokens only |
| `vue-markdown-suite/styles/components.css` | Part-based component styles |

## Renderer API (v1.0)

### Props

| Prop | Type | Default | Notes |
| --- | --- | --- | --- |
| `source` | `string` | `''` | Controlled Markdown input. Wins over the default slot. Supports `v-model:source`. |
| `components` | `Record<string, Component \| string>` | `{}` | Tag-keyed overrides. |
| `regions` | `Partial<Record<string, Component \| string>>` | `{}` | Root, content, TOC, TOC item, error, empty, and loading region overrides. |
| `nodeComponents` | `Partial<Record<string, Component \| string \| MarkdownNodeRenderer>>` | `{}` | Semantic node overrides and function renderers. |
| `labels` | `Partial<MarkdownLabels>` | `{}` | String or function labels for built-in text. |
| `preset` | `MarkdownPreset \| MarkdownPreset[]` | — | Applies one or more presets. |
| `plugins` | `PluginInput[]` | `defaultPlugins` | Replaces the default plugin set when provided. |
| `disablePlugins` | `string[]` | `[]` | Removes named plugins from the resolved set. |
| `remarkPlugins` | `PluggableList` | `[]` | Runs after library remark plugins. |
| `rehypePlugins` | `PluggableList` | `[]` | Runs after library rehype plugins. Adding `rehype-raw` enables raw HTML. |
| `remarkRehypeOptions` | `Record<string, unknown>` | `{ allowDangerousHtml: true }` | Merged into the conversion step. |
| `pipeline` | `MarkdownPipeline` | official | Advanced escape hatch; must return hast. |
| `slugger` | `MarkdownSlugger` | `github-slugger` | Heading ID generator. |
| `highlighter` | `MarkdownHighlighter` | — | Syntax highlighting adapter. |
| `mathEngine` | `MathEngine` | — | Math rendering adapter. |
| `mermaidRenderer` | `MermaidRenderer` | — | Mermaid rendering adapter. |
| `diagnosticsFormatter` | `DiagnosticFormatter` | — | Formats render errors. |
| `allowedElements` | `string[]` | — | Mutually exclusive with `disallowedElements`; wins on conflict. |
| `disallowedElements` | `string[]` | — | Deny list. |
| `unwrapDisallowed` | `boolean` | `false` | Keep the children of a removed element. |
| `allowElement` | `(node, index, parent) => boolean \| null \| undefined` | — | Runs after the allow/deny lists; any falsy result rejects the element. |
| `urlTransform` | `(url, key, node) => string \| null \| undefined` | `defaultUrlTransform` | Applies to every URL-bearing attribute; `null` removes it and the result is revalidated. |
| `linkTarget` | `string` | `'_self'` | Applied to links. |
| `externalLinkTarget` | `'_self' \| '_blank'` | `'_self'` | `_blank` adds `rel="noopener noreferrer"`. |
| `baseUrl` | `string` | — | Resolves relative URLs before `urlTransform`. |
| `idPrefix` | `string` | `''` | Prefixes generated heading IDs. |
| `syncHash` | `boolean` | `false` | Updates the URL hash on heading activation. |
| `skipHtml` | `boolean` | `false` | Removes raw HTML nodes. |
| `toc` | `boolean` | `false` | Renders the TOC region. |
| `showError` | `boolean` | `false` | Renders the error region on failure. |
| `tokens` | `Record<string, string>` | `{}` | Inline `--vmd-*` custom properties on the root. |
| `theme` | `'light' \| 'dark' \| 'auto' \| 'custom'` | `'light'` | Sets `data-vmd-theme` on the root. |
| `as` | `string \| Component` | `'div'` | Root element or component. |

A non-string `source` reports a diagnostic and renders the empty state instead
of throwing.

### Events

| Event | Payload |
| --- | --- |
| `update:source` | `source: string` |
| `toc-change` | `toc: TocItem[]` |
| `link-click` | `{ url, target, node, event }` |
| `custom-tag-click` | `{ tag, props, node, event }` |
| `render-error` | `MarkdownDiagnostic` |
| `ready` | `MarkdownDocument` |

`toc-change` is signature-gated: it only fires when the serialized TOC changes.
`ready` fires once for the first successful document.

### Exposed actions

| Action | Signature |
| --- | --- |
| `scrollToHeading` | `(id: string, options?: ScrollIntoViewOptions) => void` |
| `getDocument` | `() => MarkdownDocument \| undefined` |
| `getToc` | `() => TocItem[]` |
| `refresh` | `() => Promise<void>` |

### Slots

The `default` slot is raw Markdown text. Its text content is re-read when it
changes, so a reactive slot updates the rendered document. `source` is the
controlled prop: when a non-empty `source` is bound it wins over the slot, and
the slot is ignored. The slot is text-only; use `source` or `v-model:source` for
richer input.

Named region slots fully replace their default region and receive scoped
context: `root`, `toc`, `toc-item`, `content`, `error`, `empty`, and `loading`.
See [Customization](docs/customization.md#slots).

### Heading anchors

Every heading rendered through the built-in heading component gets a
deterministic ID plus an anchor link. The link uses `data-vmd-part="heading-anchor"`
and `class="vmd-heading-anchor"`, targets `#<id>`, and takes its accessible name
from the `headingAnchor` label (`Link to this heading` by default). Anchors are
keyboard-focusable, appear on heading hover or anchor focus, and are hidden in
print. A heading without an ID renders no anchor, and replacing `h1`–`h6`
through `components` makes the replacement own its anchor behavior.

### Raw HTML and `MarkdownHtml`

Raw HTML is dropped by default. Adding `rehype-raw` to `rehypePlugins` parses it
into normal element nodes, which render through the element components
(`components.b`, a plugin `nodeComponents.b`, and so on). `MarkdownHtml` is a
standalone component for host use: mount it directly with a `value` and it
renders escaped text in the `html` part without parsing Markdown. It is not the
raw-HTML render path, and the renderer never creates `html` nodes.

## Overriding components

```vue
<script setup lang="ts">
import { defineComponent, h } from 'vue'
import { MarkdownRenderer } from 'vue-markdown-suite'

const BadgeLink = defineComponent({
  props: { href: String },
  setup(props, { slots }) {
    return () => h('a', { href: props.href, class: 'badge-link' }, slots.default?.())
  },
})

const components = {
  h1: 'h2',
  a: BadgeLink,
}
</script>

<template>
  <MarkdownRenderer :source="source" :components="components" />
</template>
```

Fenced code renders as `pre` wrapping `code`. `components.pre` replaces the
wrapper and receives the code element as its child; `components.code` applies to
both inline and fenced code and receives a `language-*` class for fenced blocks.

## Plugins

```ts
import { defineMarkdownPlugin } from 'vue-markdown-suite/plugins'

export const highlightPlugin = defineMarkdownPlugin({
  name: 'highlight',
  components: { h2: 'h3' },
  labels: { toc: 'Contents' },
  tokens: { '--vmd-color-accent': 'rgb(130, 80, 223)' },
  setup() {
    // Runs once per resolved plugin set inside an effectScope.
    return () => {
      // Cleanup on reconfiguration and unmount.
    }
  },
})
```

Order is `pre` → `normal` → `post`, then registration order. Duplicate names
replace deterministically and report a diagnostic. A failing plugin is isolated
and never corrupts the last good document.

Built-in exports: `defaultPlugins`, `fullPlugins`, `tocPlugin`, `codePlugin`,
`linkPlugin`, `searchPlugin`, `customTagsPlugin`, `gfmPlugin`,
`frontmatterPlugin`.

## Headless usage

```ts
import { useMarkdownDocument } from 'vue-markdown-suite/headless'

const { document, toc, status, diagnostics, refresh } =
  useMarkdownDocument(source)
```

The composable owns parsing, memoization, plugin lifecycle, and status. It does
not render anything, so a host can map the model to its own markup.

## Security defaults

- Raw HTML is dropped. Add `rehype-raw` to `rehypePlugins` to enable it; the
  sanitizer then runs immediately after raw parsing.
- URL protocols are limited to `http`, `https`, `irc`, `ircs`, `mailto`,
  `xmpp`, and relative URLs.
- Image `data:` URLs are raster-only; `data:image/svg+xml` is rejected.
- Event handler attributes and `style` are stripped from raw HTML and custom
  tags.

See [docs/security.md](docs/security.md) for the full policy.

## Guides

- [Styled usage](docs/styled.md)
- [Customization](docs/customization.md)
- [Headless usage](docs/headless.md)
- [The official pipeline](docs/pipeline.md)
- [Authoring a custom pipeline](docs/custom-pipeline.md)
- [Plugins and remark/rehype integration](docs/plugins.md)
- [CommonMark and GFM](docs/commonmark-gfm.md)
- [Raw HTML and security](docs/security.md)
- [SSR and static export](docs/ssr.md)
- [Migrating from react-markdown](docs/migration.md)

## Development

```bash
npm install
npm run dev          # demo
npm run build:lib    # library, declarations, styles
npm run build:demo   # static demo
npm test             # node + happy-dom projects
npm run typecheck
npm run lint
npm run size         # bundle entry guard
npm run bench        # parse/render budget gate
```

`AGENTS.md` documents the layered architecture and the rules that keep the core
DOM-free and the dependency direction one-way.

## License

MIT
