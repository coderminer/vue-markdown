# Raw HTML and security

The default configuration is safe for untrusted Markdown. Security invariants
are not customizable away without an explicit trusted option.

## Raw HTML

Raw HTML is **dropped** by default. Inline HTML text between tags is kept as
text, matching react-markdown.

```vue
<!-- <b>bold</b> renders as bold text, not a <b> element -->
<MarkdownRenderer source="<b>bold</b>" />
```

### `skipHtml`

`skipHtml` removes raw nodes entirely, including their text:

```vue
<MarkdownRenderer :source="source" skip-html />
```

### Enable sanitized HTML

Add `rehype-raw` to `rehypePlugins`. The suite detects it by name and runs
`rehype-sanitize` immediately after it.

```vue
<script setup lang="ts">
import rehypeRaw from 'rehype-raw'
</script>

<template>
  <MarkdownRenderer :source="source" :rehype-plugins="[rehypeRaw]" />
</template>
```

Sanitization is not optional when raw HTML is enabled. The model also applies
the tag/attribute allowlist and URL policy after sanitization, so a host rehype
plugin that runs later cannot inject handlers or unsafe URLs.

## URL policy

`defaultUrlTransform` is react-markdown-compatible:

- Allowed protocols: `http`, `https`, `irc`, `ircs`, `mailto`, `xmpp`.
- Relative URLs, fragments, and queries pass through.
- `javascript:`, `vbscript:`, `data:text/html`, `file:`, and `ftp:` are removed.
- Image `data:` URLs are allowed for raster formats only
  (`png`, `jpeg`, `gif`, `webp`, `avif`, `bmp`, `x-icon`).
- `data:image/svg+xml` is rejected because SVG can carry script.

```ts
import { defaultUrlTransform } from 'vue-markdown-suite'

defaultUrlTransform('javascript:alert(1)') // ''
defaultUrlTransform('data:image/png;base64,abc', 'src') // kept
defaultUrlTransform('data:image/svg+xml,<svg/>', 'src') // ''
```

### Custom transforms

```ts
const urlTransform = (url: string, key: string) => {
  if (key === 'href' && url.startsWith('/docs/')) return url.replace('/docs/', '/guide/')
  return url
}
```

Return `null` to remove the attribute, or `undefined` to keep the sanitized URL.

## Attribute allowlist

- `on*` attributes are always removed.
- `style` and `srcdoc` are removed.
- `aria-*` and `data-*` are allowed.
- URL-bearing attributes are validated (`href`, `src`, `srcset`, `cite`,
  `poster`, `action`, `data`, `xlink:href`).
- Unknown tags (plugin/custom tags) accept safe named props, but still reject
  event handlers, `style`, and unsafe URLs.

## Custom tags

```ts
import { customTagsPlugin } from 'vue-markdown-suite/plugins'

const plugins = [customTagsPlugin({ tags: ['x-note'] })]
```

Custom tag props are normalized and stripped of handlers and unsafe URLs before
they reach a host component. The `custom-tag-click` payload contains only safe
props.

## CSP and Trusted Types

The default render path:

- Uses no `v-html`.
- Uses no `eval` or `new Function`.
- Requires no inline script.
- Sets attributes through Vue's DOM property/attribute bindings.

A strict CSP such as `default-src 'self'; script-src 'self'` works. If you
enable raw HTML, keep `rehype-raw` + the built-in sanitizer and avoid allowing
inline scripts. For Trusted Types, avoid sinks that require HTML strings; the
renderer never creates one. `exportMarkdownHtml` returns a string for static
output, so apply your own Trusted Types policy where that string is inserted.

## Diagnostics

Security-related failures are reported through `render-error` with a
diagnostic that includes `code`, `message`, `severity`, and `phase`. The last
good document is retained.

## Next

- [SSR and static export](ssr.md)
- [Migrating from react-markdown](migration.md)
