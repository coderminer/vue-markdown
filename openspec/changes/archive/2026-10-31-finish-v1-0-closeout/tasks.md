## 1. Reactive default slot

- [x] 1.1 Update `MarkdownRenderer` to keep the slot-derived source in a ref and refresh it from the existing raw-slot reader in `onUpdated`, guarded by an equality check; verify the renderer still avoids the outside-render slot warning.
- [x] 1.2 Add a renderer test where a reactive parent changes the default slot text after mount and assert the rendered heading updates without a `source` prop; verify the test passes.
- [x] 1.3 Add coverage that a bound `source` prop still wins when the slot changes and that the slot does not cause repeated parses when its text is unchanged; verify both cases.
- [x] 1.4 Update `README.md` and `docs/migration.md` to describe the default slot as reactive text input and `source` as the controlled prop; verify the wording matches the new tests.

## 2. Heading anchors

- [x] 2.1 Implement the default heading anchor in `MarkdownHeading`: read the heading ID from the normalized node, render the `heading-anchor` part with the `headingAnchor` label, and omit it when no ID exists; verify with a standalone component test.
- [x] 2.2 Add a renderer integration test that a generated heading ID produces an anchor link with `href="#id"`, the documented part, and the accessible label; verify the test passes.
- [x] 2.3 Confirm a host `components.h1`–`h6` replacement suppresses the default anchor and that headings without IDs render no anchor; verify both cases.
- [x] 2.4 Update the heading anchor documentation and print/accessibility notes in `README.md` and `docs/styled.md`; verify the docs no longer describe anchors as v1.x-only.

## 3. MarkdownHtml boundary

- [x] 3.1 Add a renderer test that raw HTML enabled through `rehype-raw` renders normal element components and does not produce an `html` part; verify the test passes.
- [x] 3.2 Add a standalone `MarkdownHtml` test that text renders in the documented `html` part without Markdown parsing; verify the test passes.
- [x] 3.3 Align `README.md`, `docs/migration.md`, and the node-catalog task wording with the standalone `MarkdownHtml` contract; verify no doc presents it as the raw-HTML default path.

## 4. CSS compatibility pass

- [x] 4.1 Replace `:where(:root)` with `:root` in `tokens.css` and update the token specificity note in `docs/styled.md`; verify tokens still apply and host class/attribute overrides win.
- [x] 4.2 Add physical-property fallbacks before the logical properties in `components.css` for margin, padding, border, inset, and scroll-margin declarations; verify a static CSS check finds every documented pair.
- [x] 4.3 Add the `text-align: left` fallback, `:focus` fallback for the heading anchor, and `position: -webkit-sticky` fallback; verify the fallback declarations are present in source order.
- [x] 4.4 Add the `margin-top`/`margin-bottom` fallback for `margin-block` in `math.css`; verify the math stylesheet still loads through the library build.
- [x] 4.5 Pin `vite.lib.config.ts` `cssTarget` to the shared baseline and leave the demo target unchanged; verify the library build succeeds and the emitted CSS keeps the fallbacks.
- [x] 4.6 Add a node test that reads the source stylesheets and asserts the documented physical/`left`/`:focus`/`-webkit-sticky` fallbacks exist; verify the test fails if a fallback is removed.
- [x] 4.7 Update `README.md`, `AGENTS.md`, and `docs/styled.md` so the styled baseline matches the runtime baseline and the remaining progressive enhancements are named; verify the compatibility statements agree.

## 5. Closeout verification

- [x] 5.1 Run `npm run typecheck` and verify it passes.
- [x] 5.2 Run `npm test` and verify all existing and new tests pass.
- [x] 5.3 Run `npm run lint` and verify it passes.
- [x] 5.4 Run `npm run build:lib` and `npm run build:demo`, then `npm run size` and `npm run bench`; verify the builds succeed and the reports are reasonable.
- [x] 5.5 Run `openspec validate "finish-v1-0-closeout" --strict` and verify the change is valid; note that archive still requires `add-vue-markdown-component-suite` to have created the target specs first.
- [x] 5.6 Confirm `add-vue-markdown-component-suite` is archived before archiving this closeout change so the MODIFIED deltas apply to existing capability specs.
