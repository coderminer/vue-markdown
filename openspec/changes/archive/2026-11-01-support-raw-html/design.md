## Context

`remark-rehype` runs with `allowDangerousHtml: true`, so raw HTML always reaches
the pipeline as `raw` nodes. Before this change, a host could parse those nodes
by adding `rehype-raw` to `rehypePlugins`; the pipeline then inserted
`rehype-sanitize`. That worked, but the switch was implicit, `skipHtml` could no
longer remove parsed elements, and the sanitizer used GitHub's schema rather
than the library's own tag and attribute policy.

## Decisions

### Raw HTML is a plugin capability, not a renderer prop

`htmlPlugin()` lives in its own entry because `rehype-raw` + `parse5` add about
61 KB gzip to a bundle. A renderer prop would force every consumer to carry the
parser. A plugin keeps the main and pipeline entries unchanged and lets the
host opt in with one import:

```ts
import { htmlPlugin } from '@coderminer/vue-markdown/html'
const plugins = [htmlPlugin()]
```

The plugin declares `html: true` and contributes `rehype-raw`. The official
pipeline takes every `html: true` plugin's rehype contributions by reference,
runs them before sanitization, and removes them from the host rehype list. This
avoids relying on a function name and lets multiple html-aware plugins
contribute a parser or a schema extension without order-dependent behavior.

### Manual `rehype-raw` is neutralized, not just detected

A manual parser would run after sanitization. When no html plugin is present,
the official pipeline drops `raw` nodes immediately after `remark-rehype` and
before any host rehype plugin. A manual `rehype-raw` therefore has nothing to
parse, even when it is wrapped or minified beyond name detection. A raw-like
plugin that is detectable by name is also removed and reported with an
`html-plugin` warning. The supported path is always `htmlPlugin()`.

### `skipHtml` is removed

Raw HTML is dropped by default. Because there is no "render HTML as text" mode,
`skipHtml` duplicated `html: false` and misled users once raw parsing was
enabled. `allowHtml` and `PipelineCapabilities.html` are removed for the same
reason: the plugin is the single source of truth.

### The built-in schema is closed and add-only

The schema starts from `defaultSchema` but:

- uses `ALLOWED_TAGS` as its tag allowlist;
- uses `DANGEROUS_TAGS` as `strip`, so `<style>` content cannot leak as text;
- replaces the tag-specific `className` restrictions with an unconstrained
  definition, because `hast-util-sanitize` resolves tag-specific definitions
  before the `'*'` fallback (this keeps math classes and raw HTML classes);
- adds `className`, `data*`, `role`, `hidden`, and common ARIA properties;
- allows `target`/`rel`/`download` on links and responsive image attributes;
- allows `data:` for `src`, relying on the core URL policy to reject SVG and
  non-image data URLs;
- parses `srcset` candidates without splitting commas inside a `data:` URL and
  validates each candidate with the image policy.

Extension tags are ignored when they appear in `DANGEROUS_TAGS`; membership in
`tagNames` short-circuits the sanitizer's strip list, so this check is required
to keep the contract true at the sanitizer stage, not only in the model builder.
Extension properties named `on*`, `style`, or `srcdoc` are ignored for the same
reason.

`htmlPlugin({ schema })` can add tags and properties. It cannot remove the strip
list, change the URL protocol policy, or bypass `on*`, `style`, and unsafe-URL
rejection in the model builder.

ARIA properties are converted to their real attribute names:
`ariaLabelledBy` becomes `aria-labelledby`, not `aria-labelled-by`.

### Static export keeps link-target parity

Normalization adds the same default `rel="noopener noreferrer"` to a raw
`_blank` link that the link component applies, so export and rendered output
agree.

### Existing sanitizer ordering is preserved

`rehype-raw` -> `rehype-sanitize` -> heading IDs -> host rehype plugins. Library
and host plugins still run after sanitization, and core normalization remains
the final safety pass.

## Risks

- **Bundle size**: the parser is an optional peer, so only the `html` entry
  requires it. The size guard includes the entry and the main graph stays clean.
- **Schema drift**: the schema derives from the same `ALLOWED_TAGS` and
  `DANGEROUS_TAGS` constants as the model builder. Parity tests cover class,
  data, ARIA, image data URLs, and style stripping.
- **Behavior change**: hosts using `skipHtml` must remove it; raw HTML now
  always requires `htmlPlugin()`. This is acceptable before publication.
