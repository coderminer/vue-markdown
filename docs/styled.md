# Styled usage

`vue-markdown-suite` ships semantic, unstyled components. The optional
stylesheet adds layout, spacing, and color through design tokens and stable
parts.

## Import the stylesheet

```ts
import 'vue-markdown-suite/style.css'
```

Or import the pieces separately:

```ts
import 'vue-markdown-suite/styles/tokens.css'
import 'vue-markdown-suite/styles/components.css'
```

`tokens.css` defines defaults on `:where(:root)`, so it has zero specificity and
never overrides host styles. `components.css` targets `vmd-*` classes and
`data-vmd-part` attributes only; it never targets internal DOM structure.

## Customize with tokens

Tokens use the `--vmd-*` prefix. Override them on any ancestor:

```css
.my-docs {
  --vmd-font-size: 1.0625rem;
  --vmd-line-height: 1.8;
  --vmd-color-accent: #8250df;
  --vmd-space-4: 1.25rem;
}
```

Or pass them inline through the `tokens` prop:

```vue
<MarkdownRenderer
  :source="source"
  :tokens="{ '--vmd-color-accent': 'rgb(130, 80, 223)' }"
/>
```

Inline tokens land on the root element and inherit into every nested part.

## Target parts

Every visual part exposes both a stable class and a `data-vmd-part` attribute:

```css
[data-vmd-part='heading'] {
  letter-spacing: -0.01em;
}

[data-vmd-part='code'] {
  --vmd-code-bg: #0d1117;
  color: #e6edf3;
}
```

Use parts instead of element selectors. A host may replace any tag component, so
element-based CSS is not a stable contract.

## Replace components

Tag overrides accept a tag name or a Vue component:

```vue
<script setup lang="ts">
import { MarkdownRenderer } from 'vue-markdown-suite'

const components = {
  h1: 'h2',
  a: MyLink,
  pre: MyCodeBlock,
}
</script>

<template>
  <MarkdownRenderer :source="source" :components="components" />
</template>
```

A component receives `node` and renders its children through the default slot.
Keep overrides CSS-independent and SSR-safe.

## Unstyled mode

Do not import the stylesheet. The markup stays semantic and accessible, and all
behavior — heading IDs, TOC, filtering, link policy, plugin lifecycle — is
unchanged.

## Accessibility

- Headings keep deterministic IDs, so in-page navigation works.
- The TOC renders as a labelled `nav` with `aria-current` on the active item.
- Links that open in a new tab get `rel="noopener noreferrer"`.
- Images fall back to their alt text when loading fails.
- The error region uses `role="alert"`.

## Next

- [Headless usage](headless.md) for fully custom markup.
- [Raw HTML and security](security.md) before enabling HTML.
