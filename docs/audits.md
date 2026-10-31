# Accessibility, compatibility, and cleanup audits

## Semantics and keyboard paths

- The renderer preserves heading hierarchy, exposes the TOC as a labeled
  navigation landmark, marks the active item with `aria-current`, and keeps
  heading IDs stable.
- Task items expose a native checkbox and report `task-change`; footnote
  references and notes use `role="doc-endnotes"` and accessible labels.
- Code actions are native buttons. Copy, download, retry, zoom, fullscreen, and
  editor resize controls have labels or `aria-label` values.
- The editor divider is `role="separator"` with `aria-valuenow`, supports
  ArrowLeft/ArrowRight, and Home resets the ratio.
- Slots receive the same actions as the default regions, so a custom keyboard
  path can reuse the built-in handlers.

Component tests cover focus-visible fallbacks, checkbox changes, editor
keyboard resizing, fullscreen state, TOC navigation, and slot actions.

## Reduced motion, print, and forced colors

The stylesheet keeps the `prefers-reduced-motion` override, hides the TOC and
heading anchors in print, and uses `LinkText`/`CanvasText` in forced-colors
mode. New v1.x parts are covered by the same print and forced-colors blocks.

## RTL and tokens

Layout uses logical properties with physical fallbacks. New parts use
`--vmd-*` tokens for color, spacing, radius, code, math, and Mermaid surfaces;
`data-vmd-theme` modes continue to apply without component-specific overrides.

## Resource cleanup

Editors destroy their CodeMirror view on unmount, Mermaid and editor keydown
listeners are removed, copy feedback timers are cleared, and object URLs are
revoked. Plugin scopes still dispose on unmount and reconfiguration.
