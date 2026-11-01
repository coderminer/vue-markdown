---
description: CommonMark and GFM syntax coverage and conformance.
---

# CommonMark and GFM

The official pipeline parses CommonMark by default. GFM is opt-in through
`gfmPlugin`.

## CommonMark

```vue
<MarkdownRenderer :source="source" />
```

This covers headings, paragraphs, emphasis, strong, links, images, lists,
blockquotes, code, thematic breaks, hard breaks, and inline HTML (dropped by
default).

## GFM

```ts
import { gfmPlugin } from '@coderminer/vue-markdown/plugins'
```

```vue
<MarkdownRenderer :source="source" :plugins="[gfmPlugin]" />
```

`gfmPlugin` adds `remark-gfm`:

- Tables with alignment
- Strikethrough
- Task list items
- Autolinks

To keep the default plugins as well:

```ts
import { defaultPlugins, gfmPlugin } from '@coderminer/vue-markdown/plugins'

const plugins = [...defaultPlugins, gfmPlugin]
```

Or use `fullPlugins`, which also enables frontmatter.

## Tables

Tables render as `MarkdownTable`, `MarkdownTableSection`, `MarkdownTableRow`,
and `MarkdownTableCell`. Cells receive `align` from the delimiter row and set
`text-align`. Header cells get `scope="col"`.

## Task lists

Task list items render a disabled checkbox parsed from `remark-gfm`.
`MarkdownTaskItem` adds the accessible checkbox wrapper and `task-change` event.

## Frontmatter

```ts
import { frontmatterPlugin } from '@coderminer/vue-markdown/plugins'

const plugins = [frontmatterPlugin]
```

Frontmatter is captured into `document.frontmatter` and removed from the body.
It is available on `getDocument()` and on the `ready` event.

## Conformance

The test suite runs the CommonMark spec and a curated GFM fixture set:

- CommonMark: 576/576 applicable examples pass. 76 examples are skipped because
  they depend on raw HTML, comments, or active content, which the suite drops or
  sanitizes by design.
- GFM: 6/6 fixtures pass (tables, alignment, strikethrough, task lists,
  autolinks).

Run them with:

```bash
npm test
```

The suite fails when a fixture regresses.

## Next

- [Raw HTML and security](security.md)
- [Plugins](plugins.md)
