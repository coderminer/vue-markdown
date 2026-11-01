---
description: Raw HTML, sanitization, URL policy, custom tags, CSP, and Trusted Types.
---

# Raw HTML and security

The default configuration is safe for untrusted Markdown. Security invariants
are not customizable away without an explicit trusted option.

## Raw HTML

Raw HTML is **dropped** by default. Inline HTML text between tags is kept as
text.

```vue
<!-- <b>bold</b> renders as bold text, not a <b> element -->
<MarkdownRenderer source="<b>bold</b>" />
```

### Enable sanitized HTML

Install `rehype-raw` and add `htmlPlugin()` from `@coderminer/vue-markdown/html`:

```bash
npm install rehype-raw
```

```vue
<script setup lang="ts">
import { MarkdownRenderer } from '@coderminer/vue-markdown'
import { defaultPlugins } from '@coderminer/vue-markdown/plugins'
import { htmlPlugin } from '@coderminer/vue-markdown/html'

const plugins = [...defaultPlugins, htmlPlugin()]
</script>

<template>
  <MarkdownRenderer :source="source" :plugins="plugins" />
</template>
```

`htmlPlugin()` is the only supported way to enable raw HTML. The official
pipeline runs `rehype-raw` before the built-in sanitizer; a manual `rehype-raw`
in `rehypePlugins` is ignored with a warning. Sanitization is not optional.

The plugin entry is separate so applications that do not render raw HTML never
bundle the HTML parser.

### Extend the sanitizer

`htmlPlugin({ schema })` adds tags and properties. It cannot remove
the built-in strip list, change the URL policy, or bypass the attribute rules.

```ts
const plugins = [
  htmlPlugin({
    schema: {
      tags: ['video'],
      attributes: { video: ['src', 'controls', 'poster'] },
    },
  }),
]
```

Property names use hast casing (`srcSet`, `dateTime`). `script`, `style`,
`iframe`, `object`, and `embed` remain stripped. `on*`, `style`, and `srcdoc`
properties are ignored even when listed by an extension. Unsafe URLs are removed
by the core model builder even when a host rehype plugin runs later. The URL
protocol policy is a core invariant and is not extensible.

## URL policy

`defaultUrlTransform` implements the package URL policy:

- Allowed protocols: `http`, `https`, `irc`, `ircs`, `mailto`, `xmpp`.
- Relative URLs, fragments, and queries pass through.
- `javascript:`, `vbscript:`, `data:text/html`, `file:`, and `ftp:` are removed.
- Image `data:` URLs are allowed for raster formats only
  (`png`, `jpeg`, `gif`, `webp`, `avif`, `bmp`, `x-icon`).
- `data:image/svg+xml` is rejected because SVG can carry script.

```ts
import { defaultUrlTransform } from '@coderminer/vue-markdown'

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
import { customTagsPlugin } from '@coderminer/vue-markdown/plugins'

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
enable raw HTML with `htmlPlugin()`, keep the built-in sanitizer and avoid
allowing inline scripts. For Trusted Types, avoid sinks that require HTML
strings; the renderer never creates one. `exportMarkdownHtml` returns a string
for static output, so apply your own Trusted Types policy where that string is
inserted.

## Diagnostics

Security-related failures are reported through `render-error` with a
diagnostic that includes `code`, `message`, `severity`, and `phase`. The last
good document is retained.

## Next

- [SSR and static export](ssr.md)
- [The official pipeline](pipeline.md)
