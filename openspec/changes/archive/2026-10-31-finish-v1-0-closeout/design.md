## Context

See `proposal.md` for motivation. The relevant current state is:

- `MarkdownRenderer` reads the default slot once in setup through `instance.vnode.children.default` to avoid Vue's outside-render slot warning. `effectiveSource` is a computed over the `source` prop and that one-time value.
- `MarkdownHeading` renders only the heading element and slot children. `PARTS.headingAnchor`, the `headingAnchor` label, CSS hover/focus styles, and print hiding already exist.
- `MarkdownHtml` is exported and renders text in the `html` part, but the normalize/render path has no `html` node kind. Raw HTML enabled by `rehype-raw` becomes normal element nodes.
- `tokens.css` uses `:where(:root)`. `components.css` and `math.css` use logical properties, `:focus-visible`, `position: sticky`, and `text-align: start`. `vite.lib.config.ts` pins `cssTarget` to Chrome 87+/Safari 14.1+ while the runtime targets the Vue 3 baseline.
- The change's delta specs use MODIFIED requirements, but the target main specs do not exist yet because `add-vue-markdown-component-suite` is still active.

## Goals / Non-Goals

**Goals:**

- Make the default slot reactive without weakening the controlled `source` prop.
- Turn the existing heading-anchor parts, labels, and styles into a real default behavior.
- Make the `MarkdownHtml` boundary explicit and tested without inventing a second raw-HTML path.
- Bring the optional stylesheet to the same browser baseline as the runtime using additive fallbacks, not a visual redesign.
- Keep the change small enough to finish as a v1.0 closeout.

**Non-Goals:**

- No v1.x host `regions`, host `nodeComponents`, function renderers, named slots, presets, manifests, or customization inspector.
- No code-block toolbar, highlighter, math, Mermaid, or editor work.
- No reimplementation of `toc`/`code`/`link` as disableable plugins.
- No visual redesign and no removal of modern CSS declarations.
- The demo stylesheet is not part of the published baseline; demo-only `gap` usage is out of scope.

## Decisions

### Reactive slot through an update-time re-read

`MarkdownRenderer` will keep a `ref` for the slot-derived source and refresh it in `onUpdated` with the same `readSlotSource()` helper, guarded by an equality check. It will not adopt a computed over the `slots` proxy because invoking slot functions outside a render context can trigger Vue's warning, and raw vnode slot access is not reactive. A watcher on `instance.vnode` is also not viable because `instance.vnode` is not a reactive source.

`source` remains controlled. `effectiveSource` still prefers a non-empty `source` prop, so slot refreshes do not reparse when the host supplies `source`. When `source` is absent, a changed slot text updates `slotSource`, which updates `effectiveSource`, which triggers the existing parse watcher. The equality guard prevents update loops.

Alternative considered: re-read the slot on every render without a ref. Rejected because it couples parsing to unrelated render updates and makes the source value harder to reason about.

### Heading anchors in the default heading component

`MarkdownHeading` will read the normalized `node.attrs.id` and the render context labels. When an ID is present, it renders the slot children followed by an anchor link with `data-vmd-part="heading-anchor"`, `class="vmd-heading-anchor"`, `href="#<id>"`, and `aria-label` from `labels.headingAnchor`. A `#` glyph is decorative; the accessible name comes from the label. The CSS already hides the anchor until heading hover or anchor focus and hides it in print.

The anchor is omitted when there is no ID. A host that replaces the heading through `components.h1`–`h6` owns the anchor behavior. This keeps heading IDs and TOC extraction untouched because the anchor is added at render time, not in the document model.

Alternative considered: add anchors during normalization. Rejected because anchors are presentation, would pollute text extraction and search segments, and would change the serializable model.

### `MarkdownHtml` stays standalone

No `html` node kind will be added. `rehype-raw` continues to produce normal element nodes and the element components render them. `MarkdownHtml` remains a direct host component that renders escaped text in the `html` part. Tests will assert both paths: raw HTML through `rehype-raw` produces element components and no `html` part; a direct `MarkdownHtml` mount produces the `html` part.

Alternative considered: route raw nodes through `MarkdownHtml` when raw parsing is disabled. Rejected because raw HTML is dropped by default and `rehype-raw` is the documented enabling mechanism, so the branch would be unreachable in normal use and would create a second sanitization path.

### Additive CSS fallbacks, shared baseline

The stylesheet will keep modern declarations and add baseline-compatible declarations before them:

- `:root` as the fallback for `:where(:root)`; the token contract no longer claims zero specificity.
- Physical `margin-*`, `padding-*`, `border-left`, `top`, and `scroll-margin-top` declarations before the existing logical properties.
- `text-align: left` before `text-align: start`.
- `[data-vmd-part='heading-anchor']:focus` alongside `:focus-visible`.
- `position: -webkit-sticky` before `position: sticky`.
- `color-scheme`, `prefers-color-scheme`, `text-underline-offset`, and `forced-colors` remain progressive enhancements.

`vite.lib.config.ts` will pin `cssTarget` to `['chrome54', 'edge15', 'firefox52', 'safari10.1', 'ios10.3']`, matching `browserslist` and the runtime baseline. The library `build.target` stays `es2016`. The demo keeps its own modern target and is not part of the published support claim.

Alternative considered: fully replace logical properties with physical properties. Rejected because it would remove RTL-correct behavior in modern browsers and create a larger visual regression surface. Additive fallbacks preserve both.

### CSS compatibility guard

Add a small static test that reads the source CSS and checks the documented fallback pairs for the known baseline-sensitive declarations. This catches a future edit that adds a logical property without a physical fallback without requiring a legacy browser in CI. The test is a guard, not a full browser matrix.

## Risks / Trade-offs

- `onUpdated` slot re-reads can be triggered by unrelated child updates. → Equality guard; reading text is cheap; tests cover unchanged and changed slot content.
- Slot content that is not text (components, nested markup) is flattened to text. → Keep the existing documented text-only slot contract; `source` is the path for richer input.
- Heading anchors add DOM and a small amount of visual noise. → Hidden until hover/focus, hidden in print, omitted without an ID, and removable by replacing the heading component.
- `:root` has higher specificity than `:where(:root)`. → Document the change; host class/attribute overrides still win, and root-level overrides are expected to be ordered after the library.
- Physical fallbacks can drift from logical declarations. → The CSS compatibility test checks the known pairs.
- Baseline support is asserted through fallbacks, not a legacy browser matrix. → Document the guarantee precisely and keep modern declarations as progressive enhancement.
- MODIFIED deltas cannot archive until the main v1.0 change has created the target specs. → Archive `add-vue-markdown-component-suite` first, then archive this closeout change.

## Migration Plan

1. Land the closeout behavior without removing any public API.
2. Hosts that want the previous heading markup can replace the heading component or omit the new anchor through their own component.
3. Existing `MarkdownHtml` imports keep working; it remains a standalone component.
4. After implementation and validation, archive `add-vue-markdown-component-suite` before `finish-v1-0-closeout` so the MODIFIED deltas have target specs.
