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

The library targets evergreen browsers: Chrome/Edge 87+, Firefox 78+, Safari
14.1+, and iOS 14.5+. Runtime code stays within ES2020, and CSS avoids newer
features such as `:has()`, container queries, CSS nesting, `color-mix()`,
`oklch()`, `dvh`, and `text-wrap: balance`. The Vite configs pin the build and
CSS targets to this baseline; browser-only APIs are guarded and degrade
gracefully during SSR.

## Entry points

| Entry | Contents |
| --- | --- |
| `vue-markdown-suite` | Renderer, preset components, composables, core helpers |
| `vue-markdown-suite/headless` | Types, model helpers, composables; no preset components or CSS |
| `vue-markdown-suite/pipeline` | Official pipeline, custom pipeline validation, identity |
| `vue-markdown-suite/plugins` | `defineMarkdownPlugin`, registry, built-in plugins |
| `vue-markdown-suite/node-components` | The node component catalog only |
| `vue-markdown-suite/components/*` | One entry per public component |
| `vue-markdown-suite/style.css` | Full stylesheet |
| `vue-markdown-suite/styles/tokens.css` | Design tokens only |
| `vue-markdown-suite/styles/components.css` | Part-based component styles |

## Renderer API (v1.0)

### Props

| Prop | Type | Default | Notes |
| --- | --- | --- | --- |
| `source` | `string` | `''` | Markdown input. Wins over the default slot. Supports `v-model:source`. |
| `components` | `Record<string, Component \| string>` | `{}` | Tag-keyed overrides. |
| `plugins` | `PluginInput[]` | `defaultPlugins` | Replaces the default plugin set when provided. |
| `disablePlugins` | `string[]` | `[]` | Removes named plugins from the resolved set. |
| `remarkPlugins` | `PluggableList` | `[]` | Runs after library remark plugins. |
| `rehypePlugins` | `PluggableList` | `[]` | Runs after library rehype plugins. Adding `rehype-raw` enables raw HTML. |
| `remarkRehypeOptions` | `Record<string, unknown>` | `{ allowDangerousHtml: true }` | Merged into the conversion step. |
| `pipeline` | `MarkdownPipeline` | official | Advanced escape hatch; must return hast. |
| `slugger` | `MarkdownSlugger` | `github-slugger` | Heading ID generator. |
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

v1.0 has one slot: the `default` slot, treated as raw Markdown source and
ignored when `source` is present.

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
